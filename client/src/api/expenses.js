// 지출 API (server 연동)
//   GET    /api/groups/:groupId/expenses  → [expense]
//   POST   /api/groups/:groupId/expenses  → expense (+ warning)   body: { title, category, amount, payer_member_id, participant_ids }
//   PATCH  /api/expenses/:id              → expense (+ warning)   body: 위와 같음
//   DELETE /api/expenses/:id              → { id, warning }
// expense = { ...expenses 행, payer_name, splits: [{ ...expense_splits 행, display_name }] }
// warning: 이미 입금 완료된 정산이 있는데 지출이 바뀌어 정산이 다시 계산된 경우의 안내 문구 (없으면 null)
import { del, get, patch, post } from './http.js';

const body = ({ title, category, amount, payer_member_id, participant_ids }) => ({
  title,
  category,
  amount: Number(amount),
  payer_member_id: Number(payer_member_id),
  participant_ids: (participant_ids || []).map(Number),
});

export function getExpenses(groupId) {
  return get(`/groups/${groupId}/expenses`);
}

export function createExpense(groupId, data) {
  return post(`/groups/${groupId}/expenses`, body(data));
}

export function updateExpense(expenseId, data) {
  return patch(`/expenses/${expenseId}`, body(data));
}

export function deleteExpense(expenseId) {
  return del(`/expenses/${expenseId}`);
}
