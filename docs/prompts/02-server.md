<!-- 사용법: 1단계(client)가 끝나고 USER-1~3을 직접 채워 검증한 뒤, 새 세션(또는 /clear)에서 이 파일 내용 전체를 붙여 넣기.
     실행 전 확인: MySQL이 켜져 있고 nbbang_note_20413 DB가 있으며, schema.sql이 /server/db/schema.sql 에 복사되어 있어야 함. -->

# [2단계] server 개발 + MySQL 연동 + client 연결

CLAUDE.md 규칙에 따라 /server 폴더에 Express + MySQL 백엔드를 만들고, /client/src/api/ 의 Mock 구현을 실제 API 호출로 교체해줘.
/client의 UI 컴포넌트·페이지와, 내가 작성한 /client/src/utils/settle.js, message.js는 수정하지 마. 바꿀 수 있는 client 파일은 /client/src/api/ 와 Vite proxy 설정(vite.config.js), axios 설치뿐이야.

## DB 상태 (중요)
- DB `nbbang_note_20413`와 6개 테이블은 이미 만들어져 있어. 테이블을 다시 만들거나 구조를 바꾸지 마.
- /server/db/schema.sql 을 읽어서 컬럼·제약을 그대로 따라줘. `groups`는 예약어라 SQL에서 항상 백틱으로 감쌀 것.
- 제약 참고: users.email은 UNIQUE, `groups`.owner_id는 users를 참조(삭제 시 CASCADE 없음), group_members.user_id는 회원 삭제 시 NULL로 바뀜, 나머지 자식 테이블은 ON DELETE CASCADE.
- 지금 테이블은 비어 있어. 시드는 /server/db/seed.sql 로 따로 만들어줘 (비밀번호 해시는 bcrypt로 만든 실제 해시 문자열 사용, 평문 비밀번호는 README에 "테스트용"이라고 명시).

## 폴더 구조
server/
├─ db/ (schema.sql, seed.sql)
├─ src/
│  ├─ index.js (앱 기동)
│  ├─ db.js (mysql2 커넥션 풀)
│  ├─ middleware/ (auth.js, permission.js, errorHandler.js)
│  ├─ routes/ (auth.js, groups.js, expenses.js, settlements.js, stats.js)
│  └─ services/ (settlementService.js)
├─ .env.example
└─ package.json

## 작업 순서 (각 항목 완료 시 동작 확인 결과를 보고하고, 다음 항목으로 넘어가기 전에 멈추지 말고 이어서 진행)
1. /server 초기화 (express, mysql2, bcrypt, jsonwebtoken, cors, dotenv)와 .env.example (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME=nbbang_note_20413, JWT_SECRET, PORT). 실제 .env는 만들지 마
2. mysql2 커넥션 풀(db.js), 공통 에러 핸들러, GET /health (DB 연결 확인)
3. 인증: POST /auth/signup(bcrypt), POST /auth/login(JWT), 인증 미들웨어, GET /me, PATCH /me/account
4. 모임: GET/POST /groups, GET/PATCH/DELETE /groups/:id, POST /groups/:id/members, DELETE /groups/:id/members/:memberId
   - 목록은 "내가 총무인 모임"과 "참여 중인 모임"을 구분해서 응답
   - 총무(owner)만 수정·삭제 가능 (permission.js 사용)
5. 지출: GET/POST /groups/:id/expenses, PATCH/DELETE /expenses/:id
   - expenses와 expense_splits는 하나의 트랜잭션으로 저장
6. 정산: GET /groups/:id/settlement, PATCH /settlements/:id/paid
   - 지출이 추가·수정·삭제되면 settlements를 다시 계산하고, 이미 입금 처리된 건이 있으면 응답에 경고 플래그(warning)를 포함해
   - 계산은 client의 settle.js 로직을 서버로 옮기지 말고, 내가 작성할 USER-4 자리에서 처리 (아래 참고)
7. 통계: GET /groups/:id/stats (카테고리별 합계)
8. client 연결: /client/src/api/ 의 Mock 구현을 axios 기반 실제 호출로 교체 (함수 이름·시그니처·반환 모양 유지), Vite proxy(/api → 서버 포트), 토큰은 localStorage에 저장하고 요청 헤더에 자동으로 붙이기

## 내가 직접 작성할 부분 (TODO(USER)로 비워둘 것)
- USER-4: /server/src/services/settlementService.js 의 `saveSettlements(conn, groupId, results)`
  (재계산 시 기존 입금 상태를 유지할지, 초기화할지 결정하는 로직)
  입력: DB 연결(트랜잭션 중), 모임 id, 계산된 정산 결과 [{from_member_id, to_member_id, amount}] / 출력: 저장된 settlements 행 목록
  stub: 기존 settlements 삭제 후 results를 is_paid=0으로 그대로 INSERT
- USER-5: /server/src/routes/stats.js 의 카테고리별 합계 SQL 쿼리 문자열
  입력: group_id / 출력: [{category, total}]
  stub: 빈 배열을 돌려주는 쿼리
- USER-6: /server/src/middleware/permission.js 의 `canEditGroup(user, group)` 권한 규칙
  입력: 로그인한 사용자, 모임 / 출력: boolean
  stub: 항상 owner_id === user.id 만 true
각 블록에는 입력/출력/힌트 주석을 자세히 적어줘.

## 완료 기준
- schema.sql은 이미 적용된 상태에서 seed.sql 실행 → `cd server && npm run dev` → `cd client && npm run dev` → 브라우저에서 가입·로그인·모임·지출·정산·통계 전체 플로우 동작
- 보안 점검: 모든 SQL은 파라미터 바인딩, 비밀번호는 bcrypt 해시, 계좌번호는 같은 모임 멤버에게만 노출, JWT_SECRET은 환경변수
- CLAUDE.md 형식의 TODO 표(파일 경로, 줄 번호)를 grep 결과로 보고
- 로컬 실행 방법(MySQL 접속 정보 설정, seed 실행, 서버·클라이언트 기동 명령)을 /README.md에 정리