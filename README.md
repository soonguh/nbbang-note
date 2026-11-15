# N빵노트 (nbbang-note)

모임 정산 & 입금 현황 관리 웹앱

- client: React(Vite) + React Router + TanStack Query + Recharts
- server: Node.js(Express 5) + mysql2 + JWT + bcrypt
- DB: MySQL 8, DB명 `nbbang_note_20413` (schema.sql 이 이미 적용된 상태)

## 로컬 실행

### 0. 준비물
- Node.js 20 이상 (개발: 22)
- MySQL 8 실행 중 + `nbbang_note_20413` DB와 6개 테이블 생성 완료
  > ⚠ `server/db/schema.sql` 은 맨 앞에서 **`DROP TABLE` 로 6개 테이블을 지우고 다시 만듭니다.**
  > 이미 적용된 DB에 다시 실행하면 데이터가 모두 사라지니 실행하지 마세요.

### 1. 서버 환경변수 (.env)
```bash
cd server
cp .env.example .env      # Windows PowerShell: Copy-Item .env.example .env
```
`server/.env` 를 열어 실제 값을 채웁니다. 이 파일은 git에 올라가지 않습니다.

| 키 | 설명 | 예 |
|---|---|---|
| PORT | API 포트 (client proxy 대상과 같아야 함) | 5000 |
| DB_HOST / DB_PORT | MySQL 주소 | localhost / 3306 |
| DB_USER / DB_PASSWORD | MySQL Workbench 계정(학번) / 비밀번호 | 본인 계정 |
| DB_NAME | DB 이름 (바꾸지 말 것) | nbbang_note_20413 |
| JWT_SECRET | JWT 서명 키, 길고 무작위인 문자열 | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` 결과 |

선택 항목 (없으면 기본값 사용): `JWT_EXPIRES_IN`(기본 7d), `CORS_ORIGIN`(기본 http://localhost:5173)

### 2. 의존성 설치 + 시드 데이터
```bash
cd server
npm install
npm run db:seed           # ⚠ 6개 테이블의 기존 데이터를 지우고 시드로 다시 채움
```
mysql CLI 가 없어도 동작합니다 (`server/db/runSeed.js` 가 `.env` 접속 정보로 `seed.sql` 실행).
MySQL Workbench 에서 `server/db/seed.sql` 을 직접 실행해도 됩니다.

### 3. 서버 실행
```bash
cd server
npm run dev               # http://localhost:5000  (파일 변경 시 자동 재시작)
```
확인: http://localhost:5000/health → `{"ok":true,"db":"up"}`

### 4. 클라이언트 실행
```bash
cd client
npm install
npm run dev               # http://localhost:5173
```
Vite proxy 가 `/api` 요청을 `http://localhost:5000` 으로 전달합니다 (`client/vite.config.js`).

### 테스트용 계정 (seed.sql)
> ⚠ **테스트용**입니다. DB에는 bcrypt 해시만 저장되어 있습니다.

| 이메일 | 비밀번호 | 이름 | 비고 |
|---|---|---|---|
| demo@example.com | test1234 | 홍길동 | `강원도 MT` 총무, `금요일 점심` 참여자 |
| kim@example.com | test1234 | 김철수 | `금요일 점심` 총무 |

시나리오와 기대 정산 결과는 `client/README-test.md` 참고.

### client 단위 테스트
```bash
cd client
npm test                  # vitest: 정산·분배·안내문
```

## API 요약 (모두 `/api` 아래, 인증 필요 API는 `Authorization: Bearer <JWT>`)

| 메서드 | 경로 | 설명 | 권한 |
|---|---|---|---|
| GET | /health | DB 연결 확인 | - |
| POST | /auth/signup, /auth/login | 가입 / 로그인 → `{ token, user }` | - |
| GET / PATCH | /me, /me/account | 내 정보 / 계좌 저장 | 로그인 |
| GET / POST | /groups | 목록 `{ owned, joined }` / 생성 | 로그인 |
| GET | /groups/:id | 모임 상세 | 총무·회원 멤버 |
| PATCH / DELETE | /groups/:id | 수정 / 삭제 | canEditGroup |
| POST / DELETE | /groups/:id/members[/:memberId] | 멤버 추가 / 제외 | canEditGroup |
| GET / POST | /groups/:id/expenses | 지출 목록 / 등록 (+정산 재계산) | 조회: 멤버, 등록: canEditGroup |
| PATCH / DELETE | /expenses/:id | 지출 수정 / 삭제 (+정산 재계산) | canEditGroup |
| GET | /groups/:id/settlement | 멤버별 요약 + 송금 목록(받는 사람 계좌 포함) | 총무·회원 멤버 |
| PATCH | /settlements/:id/paid | 입금 완료 토글 `{ is_paid }` | canEditGroup |
| GET | /groups/:id/stats | 카테고리별·결제자별 합계 | 총무·회원 멤버 |

- 지출 저장 응답의 `warning`: 이미 입금 완료된 정산이 있었는데 지출이 바뀌어 다시 계산된 경우의 안내 문구 (없으면 `null`)
- 정산 계산(`calculateSettlements`)과 1/N 분배(`splitEvenly`)는 서버가 `client/src/utils/settle.js` 를 그대로 import 해서 사용합니다 (규칙이 한 곳에만 존재)

## 보안 메모
- 모든 SQL은 `?` 파라미터 바인딩 (사용자 입력을 SQL 문자열에 이어 붙이지 않음)
- 비밀번호는 bcrypt(cost 10) 해시로 저장, 응답에 `password_hash` 미포함
- 계좌번호는 같은 모임을 볼 수 있는 사람(총무·회원 멤버)의 정산 응답에만 포함
- `JWT_SECRET` 등 비밀값은 `server/.env` 로만 관리 (코드·저장소에 쓰지 않음)
