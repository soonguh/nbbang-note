// 지출 API (Mock)
// 2단계 교체 대상 엔드포인트(예정):
//   GET    /api/groups/:groupId/expenses  → [expense]
//   POST   /api/groups/:groupId/expenses  → expense   body: { title, category, amount, payer_member_id, participant_ids }
//   PUT    /api/expenses/:id              → expense   body: 위와 같음
//   DELETE /api/expenses/:id              → { id }
// expense = { ...expenses 행, payer_name, splits: [{ ...expense_splits 행, display_name }] }
import { ApiError, delay, loadDb, nextId, now, saveDb } from '../mock/db.js';
import { requireUser } from './auth.js';
import { findAccessibleGroup } from './groups.js';
import { splitEvenly } from '../utils/settle.js';
import { CATEGORIES } from '../utils/constants.js';

function withDetail(db, expense) {
  const memberName = (id) => db.group_members.find((m) => m.id === id)?.display_name ?? '(알 수 없음)';
  return {
    ...expense,
    payer_name: memberName(expense.payer_member_id),
    splits: db.expense_splits
      .filter((s) => s.expense_id === expense.id)
      .map((s) => ({ ...s, display_name: memberName(s.member_id) })),
  };
}

// 입력값 검사 후 정리된 값을 돌려준다 (서버에서도 같은 규칙으로 검사할 것)
function validate(db, groupId, { title, category, amount, payer_member_id, participant_ids }) {
  title = (title || '').trim();
  amount = Number(amount);
  payer_member_id = Number(payer_member_id);
  const memberIds = new Set(db.group_members.filter((m) => m.group_id === groupId).map((m) => m.id));
  const participants = [...new Set((participant_ids || []).map(Number))];

  if (!title) throw new ApiError('지출 제목을 입력해 주세요.');
  if (!CATEGORIES.includes(category)) throw new ApiError('카테고리를 선택해 주세요.');
  if (!Number.isInteger(amount) || amount <= 0) throw new ApiError('금액은 1원 이상의 정수로 입력해 주세요.');
  if (!memberIds.has(payer_member_id)) throw new ApiError('결제자를 선택해 주세요.');
  if (participants.length === 0) throw new ApiError('참여자를 한 명 이상 선택해 주세요.');
  if (participants.some((id) => !memberIds.has(id))) throw new ApiError('모임 멤버가 아닌 참여자가 있습니다.');
  return { title, category, amount, payer_member_id, participants };
}

// splitEvenly 결과로 expense_splits 를 새로 만든다
function writeSplits(db, expenseId, amount, participants) {
  db.expense_splits = db.expense_splits.filter((s) => s.expense_id !== expenseId);
  splitEvenly(amount, participants).forEach(({ member_id, share_amount }) => {
    db.expense_splits.push({ id: nextId(db, 'expense_splits'), expense_id: expenseId, member_id, share_amount });
  });
}

function findExpenseForOwner(db, expenseId, user) {
  const expense = db.expenses.find((e) => e.id === Number(expenseId));
  if (!expense) throw new ApiError('지출을 찾을 수 없습니다.', 404);
  findAccessibleGroup(db, expense.group_id, user, { ownerOnly: true });
  return expense;
}

export async function getExpenses(groupId) {
  await delay();
  const db = loadDb();
  const user = requireUser(db);
  const group = findAccessibleGroup(db, groupId, user);
  return db.expenses
    .filter((e) => e.group_id === group.id)
    .sort((a, b) => b.id - a.id)
    .map((e) => withDetail(db, e));
}

export async function createExpense(groupId, data) {
  await delay();
  const db = loadDb();
  const user = requireUser(db);
  const group = findAccessibleGroup(db, groupId, user, { ownerOnly: true });
  const v = validate(db, group.id, data);
  const expense = {
    id: nextId(db, 'expenses'),
    group_id: group.id,
    payer_member_id: v.payer_member_id,
    title: v.title,
    category: v.category,
    amount: v.amount,
    created_at: now(),
  };
  db.expenses.push(expense);
  writeSplits(db, expense.id, v.amount, v.participants);
  saveDb(db);
  return withDetail(db, expense);
}

export async function updateExpense(expenseId, data) {
  await delay();
  const db = loadDb();
  const user = requireUser(db);
  const expense = findExpenseForOwner(db, expenseId, user);
  const v = validate(db, expense.group_id, data);
  Object.assign(expense, { title: v.title, category: v.category, amount: v.amount, payer_member_id: v.payer_member_id });
  writeSplits(db, expense.id, v.amount, v.participants);
  saveDb(db);
  return withDetail(db, expense);
}

export async function deleteExpense(expenseId) {
  await delay();
  const db = loadDb();
  const user = requireUser(db);
  const expense = findExpenseForOwner(db, expenseId, user);
  db.expense_splits = db.expense_splits.filter((s) => s.expense_id !== expense.id);
  db.expenses = db.expenses.filter((e) => e.id !== expense.id);
  saveDb(db);
  return { id: expense.id };
}
