<!-- 사용법: 새 세션(또는 /clear) 후 이 파일 내용 전체를 Claude Code에 붙여 넣기. CLAUDE.md가 프로젝트 루트에 있어야 함. -->

# [1단계] client 개발 (Mock 데이터 기반)

CLAUDE.md 규칙에 따라 /client 폴더에 프론트엔드만 만들어줘. /server 폴더와 DB 관련 코드는 만들지 마.

## 목표
서버 없이 동작하는 완성형 화면. Vite + React 프로젝트를 /client에 만들고, 데이터는 /client/src/api/ 아래의 api 함수들이 localStorage 기반 Mock으로 처리해.
함수는 모두 `async`로 만들고 서버 응답과 같은 모양의 객체를 반환해서, 2단계에서 구현 내용만 axios 호출로 바꾸면 되게 해줘.
(예: getGroups(), createGroup(data), updateGroup(id, data), deleteGroup(id), addMember(groupId, name), removeMember(groupId, memberId), getExpenses(groupId), createExpense(groupId, data), updateExpense(id, data), deleteExpense(id), getSettlement(groupId), markPaid(settlementId, isPaid), getStats(groupId), login(), signup(), getMe(), updateAccount(data))

## 폴더 구조
- client/src/api/ : Mock api (localStorage). 파일 하나에 몰지 말고 auth.js, groups.js, expenses.js, settlements.js로 나눠줘
- client/src/pages/ : Login, Signup, Groups, GroupDetail, Profile
- client/src/components/ : 모달, 탭, 지출 폼, 정산 카드, 차트 등
- client/src/utils/ : settle.js, message.js (아래 TODO 참고)
- client/src/mock/ : 시드 데이터

## 화면 (React Router)
1. /login, /signup: 이메일·비밀번호·이름 (Mock 인증). 로그인 전에는 /login으로 이동시키기
2. /groups: 모임 목록 (내가 총무인 모임 / 참여 중인 모임 구분), 모임 만들기 모달
   (이름, 날짜, 멤버 이름 입력. 비회원 멤버도 이름만으로 추가 가능). 모임 이름 수정, 멤버 추가/제외, 삭제도 가능하게
3. /groups/:id: 탭 3개
   - 지출 탭: 목록, 등록·수정·삭제 (제목, 카테고리[식비/숙박/교통/기타], 금액, 결제자, 참여자 체크박스. 기본은 전원)
   - 정산 탭: "누가 누구에게 얼마" 목록, 항목별 [미입금]→[입금 완료] 토글, 송금 안내문 생성 + 클립보드 복사 버튼
   - 통계 탭: 카테고리별 지출 파이 차트 (Recharts)
4. /profile: 은행명·계좌번호 저장

## 데이터 모델 (필드명은 DB 컬럼명과 동일하게)
users, groups, group_members(user_id는 null 허용), expenses, expense_splits, settlements(is_paid, paid_at)
- 금액은 정수(원). 소수점 금지
- 지출을 저장할 때 expense_splits도 함께 만들어줘 (참여자별 share_amount는 splitEvenly 결과 사용)

## 내가 직접 작성할 부분 (TODO(USER)로 비워둘 것)
- USER-1: /client/src/utils/settle.js 의 `calculateSettlements(members, expenses)`
  입력: 멤버 목록, 지출 목록(결제자·금액·참여자) / 출력: [{from, to, amount}]
  stub: 빈 배열 반환
- USER-2: 같은 파일의 `splitEvenly(amount, memberIds)` (1원 단위 나머지 처리 규칙은 내가 결정)
  stub: 단순 Math.floor 균등 분배
- USER-3: /client/src/utils/message.js 의 `buildTransferMessage(group, settlement, toAccount)`
  (카톡용 송금 안내문 포맷)
  stub: "TODO" 문자열 반환
각 블록에는 입력/출력/힌트 주석을 자세히 적어줘. 나머지 모든 코드는 네가 완성해줘.

## 완료 기준
- `cd client && npm install && npm run dev`로 모든 화면이 Mock 데이터로 동작 (정산 결과는 USER 함수가 stub이라 비어 있는 것이 정상)
- `npm run build`가 에러 없이 통과
- CLAUDE.md 형식의 TODO 표(파일 경로, 줄 번호)를 grep 결과로 보고
- 내가 TODO를 채운 뒤 확인할 수 있게, 예시 모임 시드 데이터와 기대 정산 결과를 /client/README-test.md에 적어줘
  (예: 1차 삼겹살 결제자 홍길동 120,000원 / 2차 카페 결제자 김철수 30,000원, 4명 균등 기준)
- 한 번에 한 기능씩 만들고, 만들 때마다 실행·빌드 확인 결과를 알려줘
