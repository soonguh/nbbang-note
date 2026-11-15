// 정산 계산 유틸
// 금액은 모두 원 단위 정수다. 소수점이 생기면 안 된다.

/**
 * 지출 금액을 참여자들에게 나눈다.
 * 결과는 지출 저장 시 expense_splits.share_amount 로 그대로 저장된다.
 */
export function splitEvenly(amount, memberIds) {
  // ====== TODO(USER-2): 지출 금액을 참여자 수로 나누고 1원 단위 나머지를 처리하는 규칙 작성 (구현 완료) ======
  // 입력: amount (정수, 원) 예) 10000
  //       memberIds (참여 멤버 id 배열, group_members.id) 예) [3, 5, 7]
  // 출력: [{ member_id, share_amount }] 배열. share_amount의 합은 반드시 amount와 같아야 한다.
  //       예) 10000원 / 3명 → 3,333.3 → 반올림 3,333 ×3 = 9,999 (1원 부족) → [3334, 3333, 3333]
  //           50000원 / 3명 → 16,666.7 → 반올림 16,667 ×3 = 50,001 (1원 초과) → [16666, 16667, 16667]
  // 규칙: 1) 1인 몫 = Math.round(amount / n)  (소수점 반올림)
  //       2) 차액 = amount - 1인 몫 × n  (반올림 특성상 |차액| ≤ n/2 이므로 한 사람당 최대 1원만 조정됨)
  //       3) 차액만큼 배열 앞쪽 참여자부터 1원씩 더하거나(부족할 때) 뺀다(초과할 때)
  // 엣지케이스: 빈 배열 → [] / 1명 → 금액 전부 / 0원 → 전원 0원
  if (!Array.isArray(memberIds) || memberIds.length === 0) return [];
  const n = memberIds.length;
  const share = Math.round(amount / n);
  const diff = amount - share * n;
  const step = Math.sign(diff); // +1: 부족분을 더함, -1: 초과분을 뺌
  // 앞쪽부터 조정하는 이유: 결제자 정보가 없는 시그니처에서 입력 순서만으로 결과가 정해지고(같은 입력 = 같은 결과), 누구도 다른 사람과 1원 넘게 차이 나지 않기 때문
  return memberIds.map((member_id, i) => ({
    member_id,
    share_amount: share + (i < Math.abs(diff) ? step : 0),
  }));
  // ====== END TODO(USER-2) (구현 완료) ======
}

/**
 * 멤버별 순액(낸 돈 - 부담할 돈)을 기준으로 "누가 누구에게 얼마"를 계산한다.
 */
export function calculateSettlements(members, expenses) {
  // ====== TODO(USER-1): 멤버와 지출 목록으로 최소한의 송금 목록(누가 누구에게 얼마) 계산 (구현 완료) ======
  // 입력: members  = [{ id, display_name, user_id }]   (group_members 행)
  //       expenses = [{ id, title, amount, payer_member_id,
  //                     splits: [{ member_id, share_amount }] }]  (splits는 splitEvenly 결과로 저장된 값)
  // 출력: [{ from, to, amount }]  from/to는 group_members.id, amount는 1 이상 정수
  //       예) [{ from: 3, to: 1, amount: 37500 }]  → 3번 멤버가 1번 멤버에게 37,500원 보냄
  // 방법: 1) 멤버별 순잔액 = (내가 결제한 금액 합) - (splits에서 내 share_amount 합)
  //          > 0 이면 받을 사람(채권자), < 0 이면 보낼 사람(채무자)
  //       2) 보낼 금액과 받을 금액이 정확히 같은 사람끼리 먼저 1:1로 짝짓는다 (송금 1번으로 둘 다 끝남)
  //       3) 남은 사람은 금액 큰 순으로 채무자·채권자를 매칭하며 min(보낼, 받을)만큼 송금 (그리디)
  //       - 금액이 같으면 member id 오름차순으로 정렬 → 같은 입력이면 항상 같은 결과
  //       - 입력 배열은 수정하지 않는다
  const balances = new Map();
  (members ?? []).forEach((m) => balances.set(m.id, 0));
  const add = (id, value) => balances.set(id, (balances.get(id) ?? 0) + value);
  (expenses ?? []).forEach((e) => {
    add(e.payer_member_id, Number(e.amount) || 0);
    (e.splits ?? []).forEach((s) => add(s.member_id, -(Number(s.share_amount) || 0)));
  });

  // 금액 큰 순, 같으면 id 오름차순 (id가 문자열이어도 안정적으로 정렬)
  const byAmountThenId = (a, b) =>
    b.amount - a.amount || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const creditors = [];
  const debtors = [];
  balances.forEach((value, id) => {
    if (value > 0) creditors.push({ id, amount: value });
    else if (value < 0) debtors.push({ id, amount: -value });
  });
  creditors.sort(byAmountThenId);
  debtors.sort(byAmountThenId);

  const result = [];
  const transfer = (debtor, creditor, amount) => {
    result.push({ from: debtor.id, to: creditor.id, amount });
    debtor.amount -= amount;
    creditor.amount -= amount;
  };

  // 2) 금액이 딱 맞는 쌍 먼저 정리
  debtors.forEach((d) => {
    const match = creditors.find((c) => c.amount > 0 && c.amount === d.amount);
    if (match) transfer(d, match, d.amount);
  });

  // 3) 남은 금액은 큰 순으로 그리디 매칭
  const remaining = (list) => list.filter((x) => x.amount > 0).sort(byAmountThenId);
  let ds = remaining(debtors);
  let cs = remaining(creditors);
  while (ds.length > 0 && cs.length > 0) {
    transfer(ds[0], cs[0], Math.min(ds[0].amount, cs[0].amount));
    ds = remaining(ds);
    cs = remaining(cs);
  }
  return result;
  // ====== END TODO(USER-1) (구현 완료) ======
}
