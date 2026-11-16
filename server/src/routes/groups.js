// 모임 / 멤버
//   GET    /api/groups                        → { owned: [group], joined: [group] }
//   POST   /api/groups                        body: { name, meeting_date, member_names: [], member_emails: [] } → group
//   GET    /api/groups/:id                    → group
//   PATCH  /api/groups/:id                    body: { name, meeting_date }   → group
//   DELETE /api/groups/:id                    → { id }
//   POST   /api/groups/:id/members            body: { display_name } | { email[, link_member_id] } → member
//   PATCH  /api/groups/:id/members/:memberId  body: { display_name }         → member
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

// 이메일 정리: 소문자 + 형식 검사 (형식이 아니면 빈 문자열)
function normEmail(value) {
  const email = text(value).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

// 가입한 회원 찾기 (없으면 404). 계좌 등 개인정보는 읽지 않는다
async function findUserByEmail(db, email) {
  const [[user]] = await db.execute('SELECT id, name FROM users WHERE email = ?', [email]);
  if (!user) throw new HttpError(404, `가입한 회원이 아니에요: ${email}`);
  return user;
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
    const memberEmails = [...new Set((Array.isArray(req.body.member_emails) ? req.body.member_emails : []).map(normEmail).filter(Boolean))];

    const groupId = await withTransaction(async (conn) => {
      const [[owner]] = await conn.execute('SELECT id, name FROM users WHERE id = ?', [req.user.id]);
      if (!owner) throw new HttpError(401, '로그인이 필요합니다.');
      const [result] = await conn.execute('INSERT INTO `groups` (name, meeting_date, owner_id) VALUES (?, ?, ?)', [
        name,
        meeting_date,
        owner.id,
      ]);
      // 총무 본인은 회원 멤버로 자동 추가
      await conn.execute('INSERT INTO group_members (group_id, user_id, display_name) VALUES (?, ?, ?)', [
        result.insertId,
        owner.id,
        owner.name,
      ]);
      const used = new Set([owner.name]);
      // 1) 가입한 회원(이메일) → 회원 멤버(user_id 연결). 이름은 회원 이름 사용
      for (const email of memberEmails) {
        const user = await findUserByEmail(conn, email);
        if (user.id === owner.id) continue; // 총무 본인은 이미 포함
        if (used.has(user.name)) throw new HttpError(409, `같은 이름의 멤버가 이미 있어요: ${user.name} (${email})`);
        used.add(user.name);
        await conn.execute('INSERT INTO group_members (group_id, user_id, display_name) VALUES (?, ?, ?)', [
          result.insertId,
          user.id,
          user.name,
        ]);
      }
      // 2) 이름만 → 비회원(user_id = NULL). 이미 있는 이름(회원 포함)은 건너뜀
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

// 멤버 추가 (총무만)
// - body { display_name }                   → 비회원 멤버 추가
// - body { email }                          → 가입한 회원을 회원 멤버로 추가 (이름은 회원 이름)
// - body { email, link_member_id }          → 같은 이름의 비회원 멤버를 그 회원과 연결 (지출·정산 기록을 이어받음)
router.post(
  '/groups/:id/members',
  asyncHandler(async (req, res) => {
    const group = await loadEditableGroup(pool, req.params.id, req.user);
    if (req.body.email !== undefined) {
      const email = normEmail(req.body.email);
      if (!email) throw new HttpError(400, '이메일 형식이 올바르지 않습니다.');
      const linkId = req.body.link_member_id === undefined ? null : Number(req.body.link_member_id);
      const { member, linked } = await withTransaction(async (conn) => {
        await lockGroup(conn, group.id); // 같은 회원을 동시에 두 번 추가하는 경우 방지
        const user = await findUserByEmail(conn, email);
        const [[already]] = await conn.execute('SELECT id FROM group_members WHERE group_id = ? AND user_id = ?', [group.id, user.id]);
        if (already) throw new HttpError(409, `이미 모임에 있는 회원이에요: ${user.name} (${email})`);

        if (linkId !== null) {
          // 비회원 멤버를 이 회원과 연결: 행은 그대로, user_id 만 채운다 → 그 멤버의 지출·정산이 회원 것이 됨
          const [[target]] = await conn.execute('SELECT * FROM group_members WHERE id = ? AND group_id = ?', [linkId || 0, group.id]);
          if (!target) throw new HttpError(404, '연결할 멤버를 찾을 수 없습니다.');
          if (target.user_id !== null) throw new HttpError(409, '이미 회원과 연결된 멤버입니다.');
          await conn.execute('UPDATE group_members SET user_id = ? WHERE id = ?', [user.id, target.id]);
          return { member: { ...target, user_id: user.id }, linked: true };
        }

        const [[sameName]] = await conn.execute('SELECT id, user_id FROM group_members WHERE group_id = ? AND display_name = ?', [
          group.id,
          user.name,
        ]);
        if (sameName && sameName.user_id === null) {
          // 예전에 이름으로만 넣어 둔 비회원일 수 있으니, 연결할지 화면에서 묻도록 정보를 함께 보낸다
          throw new HttpError(409, `같은 이름의 비회원 '${user.name}'이(가) 이미 있어요.`, {
            code: 'NAME_CONFLICT',
            member_id: sameName.id,
            member_name: user.name,
          });
        }
        if (sameName) throw new HttpError(409, `같은 이름의 회원 멤버가 이미 있어요: ${user.name}`);
        const [result] = await conn.execute('INSERT INTO group_members (group_id, user_id, display_name) VALUES (?, ?, ?)', [
          group.id,
          user.id,
          user.name,
        ]);
        return { member: { id: result.insertId, group_id: group.id, user_id: user.id, display_name: user.name }, linked: false };
      });
      return res.status(linked ? 200 : 201).json({ ...member, linked });
    }

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

// 멤버 이름 수정 (총무만). 지출·정산은 member id 로 연결되어 있어 바뀐 이름이 바로 반영된다.
router.patch(
  '/groups/:id/members/:memberId',
  asyncHandler(async (req, res) => {
    const group = await loadEditableGroup(pool, req.params.id, req.user);
    const display_name = validName(req.body.display_name, '멤버 이름');
    const memberId = Number(req.params.memberId) || 0;
    const member = await withTransaction(async (conn) => {
      await lockGroup(conn, group.id); // 동시에 같은 이름으로 바꾸는 경우 방지
      const [[found]] = await conn.execute('SELECT * FROM group_members WHERE id = ? AND group_id = ?', [memberId, group.id]);
      if (!found) throw new HttpError(404, '멤버를 찾을 수 없습니다.');
      const [dup] = await conn.execute('SELECT id FROM group_members WHERE group_id = ? AND display_name = ? AND id <> ?', [
        group.id,
        display_name,
        found.id,
      ]);
      if (dup.length > 0) throw new HttpError(409, '같은 이름의 멤버가 이미 있습니다.');
      await conn.execute('UPDATE group_members SET display_name = ? WHERE id = ?', [display_name, found.id]);
      return { ...found, display_name };
    });
    res.json(member);
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
