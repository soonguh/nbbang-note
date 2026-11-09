// 정산 계산 유틸
// 금액은 모두 원 단위 정수다. 소수점이 생기면 안 된다.

/**
 * 지출 금액을 참여자들에게 나눈다.
 * 결과는 지출 저장 시 expense_splits.share_amount 로 그대로 저장된다.
 */
export function splitEvenly(amount, memberIds) {
  // ====== TODO(USER-2): 지출 금액을 참여자 수로 나누고 1원 단위 나머지를 처리하는 규칙 작성 ======
  // 입력: amount (정수, 원) 예) 10000
  //       memberIds (참여 멤버 id 배열, group_members.id) 예) [3, 5, 7]
  // 출력: [{ member_id, share_amount }] 배열. share_amount의 합은 반드시 amount와 같아야 한다.
  //       예) [{ member_id: 3, share_amount: 3334 }, { member_id: 5, share_amount: 3333 }, { member_id: 7, share_amount: 3333 }]
  // 힌트: - 기본 몫은 Math.floor(amount / n), 남는 금액은 amount - 기본 몫 * n (0 ~ n-1원)
  //       - 나머지를 누구에게 줄지는 직접 결정한다 (예: 배열 앞쪽 사람부터 1원씩 / 결제자에게 몰아주기 / 버리지 않기)
  //       - memberIds가 빈 배열이면 빈 배열을 반환한다 (0으로 나누기 주의)
  //       - 결과를 정수로 유지할 것: Number.isInteger(share_amount) 가 항상 true
  // ====== END TODO(USER-2) ======
  if (!memberIds || memberIds.length === 0) return [];
  const base = Math.floor(amount / memberIds.length);
  return memberIds.map((member_id) => ({ member_id, share_amount: base }));
}

/**
 * 멤버별 순액(낸 돈 - 부담할 돈)을 기준으로 "누가 누구에게 얼마"를 계산한다.
 */
export function calculateSettlements(members, expenses) {
  // ====== TODO(USER-1): 멤버와 지출 목록으로 최소한의 송금 목록(누가 누구에게 얼마) 계산 ======
  // 입력: members  = [{ id, display_name, user_id }]   (group_members 행)
  //       expenses = [{ id, title, amount, payer_member_id,
  //                     splits: [{ member_id, share_amount }] }]  (splits는 splitEvenly 결과로 저장된 값)
  // 출력: [{ from, to, amount }]  from/to는 group_members.id, amount는 1 이상 정수
  //       예) [{ from: 3, to: 1, amount: 37500 }]  → 3번 멤버가 1번 멤버에게 37,500원 보냄
  // 힌트: 1) 멤버별 잔액 = (내가 결제한 금액 합) - (splits에서 내 share_amount 합)
  //       2) 잔액 > 0 이면 받을 사람(채권자), < 0 이면 보낼 사람(채무자). 잔액 합은 0이어야 정상
  //          (splitEvenly가 나머지를 버리면 합이 0이 안 될 수 있으니 USER-2부터 확인)
  //       3) 채무자/채권자를 금액 큰 순으로 정렬하고, 서로 min(보낼 금액, 받을 금액)만큼 매칭하며 줄여 나가면
  //          송금 횟수가 적은 결과가 나온다 (그리디)
  //       4) 금액이 0인 항목은 결과에 넣지 않는다. 지출이 없으면 빈 배열
  // ====== END TODO(USER-1) ======
  void members;
  void expenses;
  return [];
}
