// 카카오톡 등에 붙여 넣을 송금 안내문 만들기

/**
 * 송금 안내문 한 건을 만든다.
 * 정산 탭의 [안내문] 버튼과 [전체 안내문 복사]에서 사용한다.
 */
export function buildTransferMessage(group, settlement, toAccount) {
  // ====== TODO(USER-3): 카톡용 송금 안내문 문자열 만들기 (구현 완료) ======
  // 입력: group      = { id, name, meeting_date }            예) { name: '강원도 MT', meeting_date: '2026-11-07' }
  //       settlement = { id, from_member_id, to_member_id, from_name, to_name, amount, is_paid, paid_at }
  //                    예) { from_name: '이영희', to_name: '홍길동', amount: 37500, is_paid: false }
  //       toAccount  = { bank_name, account_number, holder_name } 또는 null (받는 사람이 비회원이거나 계좌 미등록)
  // 출력: 줄바꿈(\n)이 들어간 문자열. 예)
  //       [강원도 MT] 정산 안내
  //       모임일: 2026-11-07
  //
  //       보내는 분: 이영희
  //       받는 분: 홍길동
  //       금액: 37,500원
  //       계좌: 카카오뱅크 3333-01-1234567 (예금주 홍길동)
  //
  //       확인 후 입금 부탁드려요!
  // - 모임일이 없으면 그 줄은 생략, 계좌가 없으면 "계좌는 직접 문의"
  // - 이미 입금 완료된 항목이면 마지막 줄을 "입금 완료된 항목이에요. 감사합니다!"로 바꾼다
  const amount = Number(settlement?.amount || 0).toLocaleString('ko-KR');
  const hasAccount = Boolean(toAccount?.bank_name && toAccount?.account_number);
  const holder = toAccount?.holder_name ? ` (예금주 ${toAccount.holder_name})` : '';
  const accountLine = hasAccount ? `${toAccount.bank_name} ${toAccount.account_number}${holder}` : '계좌는 직접 문의';

  return [
    `[${group?.name ?? '모임'}] 정산 안내`,
    ...(group?.meeting_date ? [`모임일: ${group.meeting_date}`] : []),
    '',
    `보내는 분: ${settlement?.from_name ?? ''}`,
    `받는 분: ${settlement?.to_name ?? ''}`,
    `금액: ${amount}원`,
    `계좌: ${accountLine}`,
    '',
    settlement?.is_paid ? '입금 완료된 항목이에요. 감사합니다!' : '확인 후 입금 부탁드려요!',
  ].join('\n');
  // ====== END TODO(USER-3) (구현 완료) ======
}
