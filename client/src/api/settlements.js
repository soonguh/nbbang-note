// 정산 / 통계 API (server 연동)
//   GET   /api/groups/:groupId/settlement  → { group_id, total_amount, balances, settlements }
//   PATCH /api/settlements/:id/paid        → settlement   body: { is_paid }
//   GET   /api/groups/:groupId/stats       → { group_id, total_amount, by_category, by_payer }
// settlement = { ...settlements 행, is_paid(boolean), from_name, to_name,
//                to_account: { bank_name, account_number, holder_name } | null }
import { get, patch } from './http.js';

export function getSettlement(groupId) {
  return get(`/groups/${groupId}/settlement`);
}

export function markPaid(settlementId, isPaid) {
  return patch(`/settlements/${settlementId}/paid`, { is_paid: Boolean(isPaid) });
}

export function getStats(groupId) {
  return get(`/groups/${groupId}/stats`);
}
