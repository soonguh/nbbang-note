-- N빵노트 개발용 시드 데이터 (DB: nbbang_note_20413, schema.sql 이 이미 적용된 상태에서 실행)
-- ⚠ 실행하면 6개 테이블의 기존 데이터를 모두 지우고 시드로 다시 채웁니다. (테이블 구조는 바꾸지 않음)
-- 실행: cd server && npm run db:seed   (또는 MySQL Workbench 에서 이 파일 실행)
--
-- 테스트 계정 (비밀번호는 bcrypt 해시로 저장, 평문은 README.md 참고)
--   demo@example.com  홍길동
--   kim@example.com   김철수
-- 시나리오와 기대 정산 결과는 client/README-test.md 와 같습니다.

SET NAMES utf8mb4;
START TRANSACTION;

-- 자식 테이블부터 비우기
DELETE FROM settlements;
DELETE FROM expense_splits;
DELETE FROM expenses;
DELETE FROM group_members;
DELETE FROM `groups`;
DELETE FROM users;

-- users (password_hash = bcrypt cost 10)
INSERT INTO users (id, email, password_hash, name, bank_name, account_number) VALUES
  (1, 'demo@example.com', '$2b$10$C5/PaQlLCv9.ZltnHcJa8.eKX/VtYeh31gW99zDM1ZzsPClwWVnCa', '홍길동', '카카오뱅크', '3333-01-1234567'),
  (2, 'kim@example.com',  '$2b$10$C5/PaQlLCv9.ZltnHcJa8.eKX/VtYeh31gW99zDM1ZzsPClwWVnCa', '김철수', '국민은행', '123456-01-234567');

-- 시나리오 A: 강원도 MT (총무 홍길동, 4명 균등)
-- 시나리오 B: 금요일 점심 (총무 김철수, 홍길동은 참여자, 반올림 차액 발생)
INSERT INTO `groups` (id, name, meeting_date, owner_id) VALUES
  (1, '강원도 MT',   '2026-11-07', 1),
  (2, '금요일 점심', '2026-11-06', 2);

-- user_id 가 NULL 이면 비회원 멤버
INSERT INTO group_members (id, group_id, user_id, display_name) VALUES
  (1, 1, 1,    '홍길동'),
  (2, 1, 2,    '김철수'),
  (3, 1, NULL, '이영희'),
  (4, 1, NULL, '박민수'),
  (5, 2, 2,    '김철수'),
  (6, 2, 1,    '홍길동'),
  (7, 2, NULL, '최지우');

INSERT INTO expenses (id, group_id, payer_member_id, title, category, amount) VALUES
  (1, 1, 1, '1차 삼겹살', '식비', 120000),
  (2, 1, 2, '2차 카페',   '식비', 30000),
  (3, 2, 5, '점심 식사',  '식비', 50000),
  (4, 2, 6, '택시',       '교통', 10000);

-- share_amount 는 splitEvenly 규칙(반올림 + 앞쪽부터 1원 조정) 결과
INSERT INTO expense_splits (expense_id, member_id, share_amount) VALUES
  (1, 1, 30000), (1, 2, 30000), (1, 3, 30000), (1, 4, 30000),
  (2, 1, 7500),  (2, 2, 7500),  (2, 3, 7500),  (2, 4, 7500),
  (3, 5, 16666), (3, 6, 16667), (3, 7, 16667),
  (4, 6, 5000),  (4, 7, 5000);

-- calculateSettlements 결과 (서버는 지출이 바뀔 때마다 다시 계산)
INSERT INTO settlements (group_id, from_member_id, to_member_id, amount, is_paid, paid_at) VALUES
  (1, 3, 1, 37500, 0, NULL),
  (1, 4, 1, 37500, 0, NULL),
  (1, 2, 1, 7500,  0, NULL),
  (2, 7, 5, 21667, 0, NULL),
  (2, 6, 5, 11667, 0, NULL);

COMMIT;
