# 프로젝트: 총무의 일지 (chongmu-diary) — 모임 정산 & 입금 현황 관리 웹앱

## 스택과 구조
- 프론트(/client): React(Vite) + React Router + TanStack Query + Recharts
- 백엔드(/server): Node.js(Express) + mysql2 + JWT + bcrypt
- DB: MySQL 8, DB명 `chongmu_diary` (이미 생성되어 있고 schema.sql이 적용된 상태)
- 구조: /client (프론트), /server (백엔드), /server/db (schema.sql, seed.sql)
- 금액은 모두 원 단위 정수(소수점 금지), DB는 BIGINT
- 한국어 UI, 코드 주석은 한국어

## DB 현황 (이미 만들어져 있음. 테이블을 새로 설계하거나 바꾸지 마)
- users(id, email UNIQUE, password_hash, name, bank_name, account_number, created_at)
- `groups`(id, name, meeting_date, owner_id → users, created_at)  ※ MySQL 예약어라 SQL에서 항상 백틱
- group_members(id, group_id → groups CASCADE, user_id → users NULL 허용 SET NULL, display_name)
- expenses(id, group_id, payer_member_id → group_members, title, category, amount, created_at)
- expense_splits(id, expense_id, member_id, share_amount, UNIQUE(expense_id, member_id))
- settlements(id, group_id, from_member_id, to_member_id, amount, is_paid, paid_at)
- 정확한 정의는 /server/db/schema.sql 을 읽어서 확인할 것

## 작업 규칙
1. 진행 순서: [1단계 client(Mock 데이터)] → [2단계 server + MySQL 연동]. 내가 지시하기 전에는 다음 단계로 넘어가지 마. client 작업 중에는 /server를, server 작업 중에는 내가 허락한 부분 외의 /client를 건드리지 마.
2. 내가 직접 작성할 부분은 코드를 구현하지 말고 아래 형식의 빈 블록으로 남겨둬.
   // ====== TODO(USER-n): 한 줄 설명 ======
   // 입력: ... / 출력: ... / 힌트: ...
   // ====== END TODO(USER-n) ======
   블록 바로 아래에는 앱이 깨지지 않도록 임시 반환값(stub)을 둬.
3. 각 단계가 끝나면 `grep -n "TODO(USER" -r client/src server` 를 실제로 실행해서 아래 표 형식으로 보고해. 줄 번호는 반드시 최종 파일 기준이어야 해. 기억으로 쓰지 말고 grep 결과를 써.
   | 번호 | 파일 경로 | 시작~끝 줄 | 내가 할 일 | 입력/출력 | 확인 방법 |
4. 파일을 수정해서 줄 번호가 바뀌면, 보고 직전에 grep을 다시 실행해서 표를 갱신해.
5. 한 번에 한 기능씩 만들고, 만들 때마다 실행·빌드 확인 결과를 알려줘.
6. 비밀번호·API 키·실제 .env 값은 어떤 파일에도 쓰지 마. .env.example만 만들고 .env는 .gitignore에 넣어.
7. 데이터 필드 이름은 DB 컬럼명(snake_case)과 동일하게 쓴다. client의 Mock 데이터와 server 응답의 모양이 같아야 나중에 교체가 쉽다.

## 커밋 규칙
- 커밋은 내가 직접 한다. `git add`, `git commit`, `git push` 등 git 쓰기 명령은 절대 실행하지 마. (`git status`, `git diff` 같은 읽기 명령은 괜찮아)
- 한 단계나 한 기능이 끝나 커밋하기 좋은 시점이 되면, "지금 커밋하면 좋아요"라고 알리고 커밋 메시지만 제안해줘. 형식은 `feat: 한 줄 요약`처럼 한국어로 짧게.
- 제외할 파일(*.md, docs/, .env 등)은 .gitignore가 처리하니 신경 쓰지 마.