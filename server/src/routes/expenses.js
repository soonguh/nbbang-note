// 지출
//   GET    /api/groups/:id/expenses  → [expense]
//   POST   /api/groups/:id/expenses  body: { title, category, amount, payer_member_id, participant_ids } → expense
//   PATCH  /api/expenses/:id         body: 위와 같음 → expense
//   DELETE /api/expenses/:id         → { id, warning }
// expense = { ...expenses 행, payer_name, splits: [{ ...expense_splits 행, display_name }] }
// 저장 응답에는 warning(이미 입금 완료된 정산이 있었는지)이 추가된다.
// expenses + expense_splits + settlements 재계산은 하나의 트랜잭션으로 처리한다.
import { Router } from 'express';
import { pool, withTransaction } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { loadEditableGroup, loadGroupForUser } from '../middleware/permission.js';
import { recalculateSettlements } from '../services/settlementService.js';
// 1/N 분배 규칙도 client 와 같은 함수를 그대로 사용
import { splitEvenly } from '../../../client/src/utils/settle.js';

const router = Router();
router.use(['/groups/:id/expenses', '/expenses'], requireAuth);

export const CATEGORIES = ['식비', '숙박', '교통', '기타'];
const MAX_AMOUNT = 1_000_000_000_000; // 1조원 (BIGINT 범위 안, 오입력 방지)

async function getExpenseDetails(db, where, params) {
  const [expenses] = await db.execute(
    `SELECT e.*, gm.display_name AS payer_name
       FROM expenses e JOIN group_members gm ON gm.id = e.payer_member_id
      WHERE ${where}
      ORDER BY e.id DESC`,
    params,
  );
  if (expenses.length === 0) return [];
  const [splits] = await db.query(
    `SELECT s.id, s.expense_id, s.member_id, s.share_amount, gm.display_name
       FROM expense_splits s JOIN group_members gm ON gm.id = s.member_id
      WHERE s.expense_id IN (?) ORDER BY s.id`,
    [expenses.map((e) => e.id)],
  );
  return expenses.map((e) => ({ ...e, splits: splits.filter((s) => s.expense_id === e.id) }));
}

// 입력 검사 (client Mock 과 같은 규칙)
async function validate(db, groupId, body) {
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const category = body.category;
  const amount = Number(body.amount);
  const payer = Number(body.payer_member_id);
  const participants = [...new Set((Array.isArray(body.participant_ids) ? body.participant_ids : []).map(Number))];

  if (!title) throw new HttpError(400, '지출 제목을 입력해 주세요.');
  if (title.length > 100) throw new HttpError(400, '지출 제목은 100자 이하로 입력해 주세요.');
  if (!CATEGORIES.includes(category)) throw new HttpError(400, '카테고리를 선택해 주세요.');
  if (!Number.isInteger(amount) || amount <= 0 || amount > MAX_AMOUNT) throw new HttpError(400, '금액은 1원 이상의 정수로 입력해 주세요.');

  const [rows] = await db.execute('SELECT id FROM group_members WHERE group_id = ?', [groupId]);
  const memberIds = new Set(rows.map((r) => r.id));
  if (!memberIds.has(payer)) throw new HttpError(400, '결제자를 선택해 주세요.');
  if (participants.length === 0) throw new HttpError(400, '참여자를 한 명 이상 선택해 주세요.');
  if (participants.some((id) => !memberIds.has(id))) throw new HttpError(400, '모임 멤버가 아닌 참여자가 있습니다.');
  return { title, category, amount, payer, participants };
}

async function writeSplits(conn, expenseId, amount, participants) {
  await conn.execute('DELETE FROM expense_splits WHERE expense_id = ?', [expenseId]);
  const shares = splitEvenly(amount, participants);
  // 분배 결과가 합계와 다르면 저장하지 않는다 (splitEvenly 규칙 위반 방지)
  if (shares.reduce((s, x) => s + x.share_amount, 0) !== amount || shares.some((x) => !Number.isInteger(x.share_amount))) {
    throw new Error('splitEvenly 결과의 합계가 지출 금액과 다릅니다.');
  }
  for (const { member_id, share_amount } of shares) {
    await conn.execute('INSERT INTO expense_splits (expense_id, member_id, share_amount) VALUES (?, ?, ?)', [
      expenseId,
      member_id,
      share_amount,
    ]);
  }
}

// 지출을 불러오고 해당 모임의 수정 권한 확인
async function loadEditableExpense(db, expenseId, user) {
  const [[expense]] = await db.execute('SELECT * FROM expenses WHERE id = ?', [Number(expenseId) || 0]);
  if (!expense) throw new HttpError(404, '지출을 찾을 수 없습니다.');
  await loadEditableGroup(db, expense.group_id, user);
  return expense;
}

router.get(
  '/groups/:id/expenses',
  asyncHandler(async (req, res) => {
    const group = await loadGroupForUser(pool, req.params.id, req.user);
    res.json(await getExpenseDetails(pool, 'e.group_id = ?', [group.id]));
  }),
);

router.post(
  '/groups/:id/expenses',
  asyncHandler(async (req, res) => {
    const { expenseId, warning } = await withTransaction(async (conn) => {
      const group = await loadEditableGroup(conn, req.params.id, req.user);
      const v = await validate(conn, group.id, req.body);
      const [result] = await conn.execute(
        'INSERT INTO expenses (group_id, payer_member_id, title, category, amount) VALUES (?, ?, ?, ?, ?)',
        [group.id, v.payer, v.title, v.category, v.amount],
      );
      await writeSplits(conn, result.insertId, v.amount, v.participants);
      const recalculated = await recalculateSettlements(conn, group.id);
      return { expenseId: result.insertId, warning: recalculated.warning };
    });
    const [expense] = await getExpenseDetails(pool, 'e.id = ?', [expenseId]);
    res.status(201).json({ ...expense, warning });
  }),
);

router.patch(
  '/expenses/:id',
  asyncHandler(async (req, res) => {
    const { expenseId, warning } = await withTransaction(async (conn) => {
      const expense = await loadEditableExpense(conn, req.params.id, req.user);
      const v = await validate(conn, expense.group_id, req.body);
      await conn.execute('UPDATE expenses SET title = ?, category = ?, amount = ?, payer_member_id = ? WHERE id = ?', [
        v.title,
        v.category,
        v.amount,
        v.payer,
        expense.id,
      ]);
      await writeSplits(conn, expense.id, v.amount, v.participants);
      const recalculated = await recalculateSettlements(conn, expense.group_id);
      return { expenseId: expense.id, warning: recalculated.warning };
    });
    const [expense] = await getExpenseDetails(pool, 'e.id = ?', [expenseId]);
    res.json({ ...expense, warning });
  }),
);

router.delete(
  '/expenses/:id',
  asyncHandler(async (req, res) => {
    const result = await withTransaction(async (conn) => {
      const expense = await loadEditableExpense(conn, req.params.id, req.user);
      await conn.execute('DELETE FROM expense_splits WHERE expense_id = ?', [expense.id]);
      await conn.execute('DELETE FROM expenses WHERE id = ?', [expense.id]);
      const recalculated = await recalculateSettlements(conn, expense.group_id);
      return { id: expense.id, warning: recalculated.warning };
    });
    res.json(result);
  }),
);

export default router;
