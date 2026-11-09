// 정산 / 통계 API (Mock)
// 2단계 교체 대상 엔드포인트(예정):
//   GET   /api/groups/:groupId/settlement  → { group_id, total_amount, balances, settlements }
//   PATCH /api/settlements/:id/paid        → settlement   body: { is_paid }
//   GET   /api/groups/:groupId/stats       → { group_id, total_amount, by_category, by_payer }
//
// settlement 행 = { ...settlements 행, from_name, to_name, to_account: { bank_name, account_number, holder_name } | null }
import { ApiError, delay, loadDb, nextId, now, saveDb } from '../mock/db.js';
import { requireUser } from './auth.js';
import { findAccessibleGroup } from './groups.js';
import { calculateSettlements } from '../utils/settle.js';
import { CATEGORIES } from '../utils/constants.js';

function groupExpensesWithSplits(db, groupId) {
  return db.expenses
    .filter((e) => e.group_id === groupId)
    .map((e) => ({
      id: e.id,
      title: e.title,
      category: e.category,
      amount: e.amount,
      payer_member_id: e.payer_member_id,
      splits: db.expense_splits
        .filter((s) => s.expense_id === e.id)
        .map(({ member_id, share_amount }) => ({ member_id, share_amount })),
    }));
}

function withDetail(db, row) {
  const member = (id) => db.group_members.find((m) => m.id === id);
  const from = member(row.from_member_id);
  const to = member(row.to_member_id);
  const toUser = to?.user_id ? db.users.find((u) => u.id === to.user_id) : null;
  const to_account =
    toUser && toUser.bank_name && toUser.account_number
      ? { bank_name: toUser.bank_name, account_number: toUser.account_number, holder_name: toUser.name }
      : null;
  return { ...row, from_name: from?.display_name ?? '', to_name: to?.display_name ?? '', to_account };
}

/**
 * 정산 결과 조회.
 * calculateSettlements(USER-1) 로 다시 계산하고, 기존 settlements 행과 비교해
 * (보내는 사람, 받는 사람, 금액)이 같은 행은 입금 상태(is_paid, paid_at)를 유지한다.
 */
export async function getSettlement(groupId) {
  await delay();
  const db = loadDb();
  const user = requireUser(db);
  const group = findAccessibleGroup(db, groupId, user);
  const members = db.group_members.filter((m) => m.group_id === group.id);
  const expenses = groupExpensesWithSplits(db, group.id);

  // 멤버별 낸 돈 / 부담액 요약
  const balances = members.map((m) => {
    const paid = expenses.filter((e) => e.payer_member_id === m.id).reduce((sum, e) => sum + e.amount, 0);
    const owed = expenses.reduce((sum, e) => sum + (e.splits.find((s) => s.member_id === m.id)?.share_amount ?? 0), 0);
    return { member_id: m.id, display_name: m.display_name, paid, owed, balance: paid - owed };
  });

  const computed = calculateSettlements(members, expenses) ?? [];
  const existing = db.settlements.filter((s) => s.group_id === group.id);
  const used = new Set();
  const next = computed
    .filter((c) => Number(c.amount) > 0)
    .map((c) => {
      const keep = existing.find(
        (s) => !used.has(s.id) && s.from_member_id === c.from && s.to_member_id === c.to && s.amount === c.amount,
      );
      if (keep) {
        used.add(keep.id);
        return keep;
      }
      return {
        id: nextId(db, 'settlements'),
        group_id: group.id,
        from_member_id: c.from,
        to_member_id: c.to,
        amount: c.amount,
        is_paid: false,
        paid_at: null,
      };
    });
  db.settlements = [...db.settlements.filter((s) => s.group_id !== group.id), ...next];
  saveDb(db);

  return {
    group_id: group.id,
    total_amount: expenses.reduce((sum, e) => sum + e.amount, 0),
    balances,
    settlements: next.map((s) => withDetail(db, s)),
  };
}

export async function markPaid(settlementId, isPaid) {
  await delay();
  const db = loadDb();
  const user = requireUser(db);
  const row = db.settlements.find((s) => s.id === Number(settlementId));
  if (!row) throw new ApiError('정산 항목을 찾을 수 없습니다.', 404);
  findAccessibleGroup(db, row.group_id, user, { ownerOnly: true });
  row.is_paid = Boolean(isPaid);
  row.paid_at = row.is_paid ? now() : null;
  saveDb(db);
  return withDetail(db, row);
}

export async function getStats(groupId) {
  await delay();
  const db = loadDb();
  const user = requireUser(db);
  const group = findAccessibleGroup(db, groupId, user);
  const expenses = db.expenses.filter((e) => e.group_id === group.id);
  const by_category = CATEGORIES.map((category) => ({
    category,
    total: expenses.filter((e) => e.category === category).reduce((sum, e) => sum + e.amount, 0),
    count: expenses.filter((e) => e.category === category).length,
  }));
  const by_payer = db.group_members
    .filter((m) => m.group_id === group.id)
    .map((m) => ({
      member_id: m.id,
      display_name: m.display_name,
      total: expenses.filter((e) => e.payer_member_id === m.id).reduce((sum, e) => sum + e.amount, 0),
    }));
  return {
    group_id: group.id,
    total_amount: expenses.reduce((sum, e) => sum + e.amount, 0),
    by_category,
    by_payer,
  };
}
