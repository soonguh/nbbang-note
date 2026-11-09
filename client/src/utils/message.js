// 카카오톡 등에 붙여 넣을 송금 안내문 만들기

/**
 * 송금 안내문 한 건을 만든다.
 * 정산 탭의 [안내문] 버튼과 [전체 안내문 복사]에서 사용한다.
 */
export function buildTransferMessage(group, settlement, toAccount) {
  // ====== TODO(USER-3): 카톡용 송금 안내문 문자열 만들기 ======
  // 입력: group      = { id, name, meeting_date }            예) { name: '강원도 MT', meeting_date: '2026-11-07' }
  //       settlement = { id, from_member_id, to_member_id, from_name, to_name, amount, is_paid, paid_at }
  //                    예) { from_name: '이영희', to_name: '홍길동', amount: 37500, is_paid: false }
  //       toAccount  = { bank_name, account_number, holder_name } 또는 null (받는 사람이 비회원이거나 계좌 미등록)
  // 출력: 줄바꿈(\n)이 들어간 문자열
  //       예) "[강원도 MT 정산 안내]\n이영희님 → 홍길동님\n37,500원\n카카오뱅크 3333-01-1234567 (홍길동)\n확인 후 입금 부탁드려요!"
  // 힌트: - 금액은 amount.toLocaleString('ko-KR') 로 천 단위 쉼표
  //       - toAccount가 null 이면 계좌 줄 대신 "계좌는 총무에게 문의해 주세요" 같은 문구
  //       - is_paid가 true면 "입금 완료" 표시를 넣을지 직접 결정
  //       - 템플릿 리터럴(`...${변수}...`)과 배열.join('\n') 을 쓰면 편하다
  // ====== END TODO(USER-3) ======
  void group;
  void settlement;
  void toAccount;
  return 'TODO';
}
