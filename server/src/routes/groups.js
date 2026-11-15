// 모임 / 멤버
//   GET    /api/groups                        → { owned: [group], joined: [group] }
//   POST   /api/groups                        body: { name, meeting_date, member_names: [] } → group
//   GET    /api/groups/:id                    → group
//   PATCH  /api/groups/:id                    body: { name, meeting_date }   → group
//   DELETE /api/groups/:id                    → { id }
//   POST   /api/groups/:id/members            body: { display_name }         → member
//   DELETE /api/groups/:id/members/:memberId  → { id }
// group = { ...`groups` 행, owner_name, members: [group_members 행], total_amount }
// ※ members 에는 계좌 정보를 넣지 않는다 (계좌는 정산 화면에서 같은 모임 멤버에게만)
import { Router } from 'express';
import { lockGroup, pool, withTransaction } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { loadEditableGroup, loadGroupForUser } from '../middleware/permission.js';

const router = Router();
router.use('/groups', requireAuth);

const text = (v) => (typeof v === 'string' ? v.trim() : '');
// schema.sql 컬럼 길이와 맞춤: `groups`.name VARCHAR(100), group_members.display_name VARCHAR(50)
const GROUP_NAME_MAX = 100;
const NAME_MAX = 50;

function validDate(value) {
  if (value === undefined || value === null || value === '') return null;
  // 형식 + 실제 존재하는 날짜인지 (2026-02-30 처럼 넘치는 날짜는 Date 가 다음 달로 넘기므로 되돌려 비교)
  const d = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00Z`) : null;
  if (!d || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) {
    throw new HttpError(400, '날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)');
  }
  return value;
}

function validName(value, label, max = NAME_MAX) {
  const name = text(value);
  if (!name) throw new HttpError(400, `${label}을(를) 입력해 주세요.`);
  if (name.length > max) throw new HttpError(400, `${label}은(는) ${max}자 이하로 입력해 주세요.`);
  return name;
}

// 여러 모임의 상세(총무 이름, 멤버, 총 지출)를 한 번에 붙인다
async function withDetails(db, groups) {
  if (groups.length === 0) return [];
  const ids = groups.map((g) => g.id);
  const [members] = await db.query(
    'SELECT id, group_id, user_id, display_name FROM group_members WHERE group_id IN (?) ORDER BY id',
    [ids],
  );
  const [totals] = await db.query(
    'SELECT group_id, COALESCE(SUM(amount), 0) AS total FROM expenses WHERE group_id IN (?) GROUP BY group_id',
    [ids],
  );
  const totalOf = new Map(totals.map((t) => [t.group_id, Number(t.total)]));
  return groups.map(({ is_owner: _o, is_member: _m, ...g }) => ({
    ...g,
    members: members.filter((m) => m.group_id === g.id),
    total_amount: totalOf.get(g.id) ?? 0,
  }));
}

async function getGroupDetail(db, groupId) {
  const [rows] = await db.execute(
    `SELECT g.id, g.name, g.meeting_date, g.owner_id, g.created_at, u.name AS owner_name
       FROM \`groups\` g JOIN users u ON u.id = g.owner_id
      WHERE g.id = ?`,
    [groupId],
  );
  const [detail] = await withDetails(db, rows);
  return detail;
}

router.get(
  '/groups',
  asyncHandler(async (req, res) => {
    const me = req.user.id;
    const [rows] = await pool.execute(
      `SELECT g.id, g.name, g.meeting_date, g.owner_id, g.created_at, u.name AS owner_name
         FROM \`groups\` g JOIN users u ON u.id = g.owner_id
        WHERE g.owner_id = ?
           OR EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = g.id AND gm.user_id = ?)
        ORDER BY g.meeting_date IS NULL, g.meeting_date DESC, g.id DESC`,
      [me, me],
    );
    const groups = await withDetails(pool, rows);
    res.json({
      owned: groups.filter((g) => g.owner_id === me),
      joined: groups.filter((g) => g.owner_id !== me),
    });
  }),
);

router.post(
  '/groups',
  asyncHandler(async (req, res) => {
    const name = validName(req.body.name, '모임 이름', GROUP_NAME_MAX);
    const meeting_date = validDate(req.body.meeting_date);
    const memberNames = Array.isArray(req.body.member_names) ? req.body.member_names : [];

    const groupId = await withTransaction(async (conn) => {
      const [[owner]] = await conn.execute('SELECT id, name FROM users WHERE id = ?', [req.user.id]);
      if (!owner) throw new HttpError(401, '로그인이 필요합니다.');
      const [result] = await conn.execute('INSERT INTO `groups` (name, meeting_date, owner_id) VALUES (?, ?, ?)', [
        name,
        meeting_date,
        owner.id,
      ]);
      // 총무 본인은 회원 멤버로 자동 추가, 나머지는 비회원(user_id = NULL). 이름 중복은 건너뜀
      await conn.execute('INSERT INTO group_members (group_id, user_id, display_name) VALUES (?, ?, ?)', [
        result.insertId,
        owner.id,
        owner.name,
      ]);
      const used = new Set([owner.name]);
      for (const raw of memberNames) {
        const display_name = text(raw);
        if (!display_name || used.has(display_name)) continue;
        if (display_name.length > NAME_MAX) throw new HttpError(400, `멤버 이름은 ${NAME_MAX}자 이하로 입력해 주세요.`);
        used.add(display_name);
        await conn.execute('INSERT INTO group_members (group_id, user_id, display_name) VALUES (?, NULL, ?)', [
          result.insertId,
          display_name,
        ]);
      }
      return result.insertId;
    });
    res.status(201).json(await getGroupDetail(pool, groupId));
  }),
);

router.get(
  '/groups/:id',
  asyncHandler(async (req, res) => {
    const group = await loadGroupForUser(pool, req.params.id, req.user);
    res.json(await getGroupDetail(pool, group.id));
  }),
);

router.patch(
  '/groups/:id',
  asyncHandler(async (req, res) => {
    const group = await loadEditableGroup(pool, req.params.id, req.user);
    const name = req.body.name === undefined ? group.name : validName(req.body.name, '모임 이름', GROUP_NAME_MAX);
    const meeting_date = req.body.meeting_date === undefined ? group.meeting_date : validDate(req.body.meeting_date);
    await pool.execute('UPDATE `groups` SET name = ?, meeting_date = ? WHERE id = ?', [name, meeting_date, group.id]);
    res.json(await getGroupDetail(pool, group.id));
  }),
);

router.delete(
  '/groups/:id',
  asyncHandler(async (req, res) => {
    const group = await loadEditableGroup(pool, req.params.id, req.user);
    // 자식 테이블은 CASCADE 지만, expenses → group_members 참조 때문에 순서를 명시적으로 지운다
    await withTransaction(async (conn) => {
      await lockGroup(conn, group.id);
      await conn.execute('DELETE FROM settlements WHERE group_id = ?', [group.id]);
      await conn.execute('DELETE FROM expenses WHERE group_id = ?', [group.id]); // expense_splits 는 CASCADE
      await conn.execute('DELETE FROM `groups` WHERE id = ?', [group.id]); // group_members 는 CASCADE
    });
    res.json({ id: group.id });
  }),
);

router.post(
  '/groups/:id/members',
  asyncHandler(async (req, res) => {
    const group = await loadEditableGroup(pool, req.params.id, req.user);
    const display_name = validName(req.body.display_name, '멤버 이름');
    const [dup] = await pool.execute('SELECT id FROM group_members WHERE group_id = ? AND display_name = ?', [
      group.id,
      display_name,
    ]);
    if (dup.length > 0) throw new HttpError(409, '같은 이름의 멤버가 이미 있습니다.');
    const [result] = await pool.execute('INSERT INTO group_members (group_id, user_id, display_name) VALUES (?, NULL, ?)', [
      group.id,
      display_name,
    ]);
    res.status(201).json({ id: result.insertId, group_id: group.id, user_id: null, display_name });
  }),
);

router.delete(
  '/groups/:id/members/:memberId',
  asyncHandler(async (req, res) => {
    const group = await loadEditableGroup(pool, req.params.id, req.user);
    const [[member]] = await pool.execute('SELECT * FROM group_members WHERE id = ? AND group_id = ?', [
      Number(req.params.memberId) || 0,
      group.id,
    ]);
    if (!member) throw new HttpError(404, '멤버를 찾을 수 없습니다.');
    if (member.user_id === group.owner_id) throw new HttpError(400, '총무는 모임에서 제외할 수 없습니다.');
    const [[used]] = await pool.execute(
      `SELECT EXISTS(SELECT 1 FROM expenses WHERE payer_member_id = ?)
           OR EXISTS(SELECT 1 FROM expense_splits WHERE member_id = ?) AS used`,
      [member.id, member.id],
    );
    if (used.used) throw new HttpError(409, '지출 내역에 포함된 멤버는 제외할 수 없습니다. 관련 지출을 먼저 수정해 주세요.');
    await withTransaction(async (conn) => {
      await lockGroup(conn, group.id);
      await conn.execute('DELETE FROM settlements WHERE from_member_id = ? OR to_member_id = ?', [member.id, member.id]);
      await conn.execute('DELETE FROM group_members WHERE id = ?', [member.id]);
    });
    res.json({ id: member.id });
  }),
);

export default router;
