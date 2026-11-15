USE nbbang_note_20413;

INSERT INTO users (id, email, password_hash, name, bank_name, account_number) VALUES
  (1, 'hong@example.com', '$2b$10$BwRoE5F3pM9NxT5FBqyLyuPFDy0Le0XLY4mV25iAh6WAUVCmfSOhq', '홍길동', '국민은행', '123-456-7890'),
  (2, 'kim@example.com',  '$2b$10$BwRoE5F3pM9NxT5FBqyLyuPFDy0Le0XLY4mV25iAh6WAUVCmfSOhq', '김철수', '신한은행', '110-222-333444'),
  (3, 'lee@example.com',  '$2b$10$BwRoE5F3pM9NxT5FBqyLyuPFDy0Le0XLY4mV25iAh6WAUVCmfSOhq', '이영희', NULL, NULL);

INSERT INTO `groups` (id, name, meeting_date, owner_id) VALUES
  (1, '강릉 우정 여행', '2026-11-15', 1);

INSERT INTO group_members (id, group_id, user_id, display_name) VALUES
  (1, 1, 1,    '홍길동'),
  (2, 1, 2,    '김철수'),
  (3, 1, 3,    '이영희'),
  (4, 1, NULL, '박민수');

INSERT INTO expenses (id, group_id, payer_member_id, title, category, amount) VALUES
  (1, 1, 1, '1차 삼겹살', '식비', 120000),
  (2, 1, 2, '2차 카페',   '식비',  30000);

INSERT INTO expense_splits (expense_id, member_id, share_amount) VALUES
  (1, 1, 30000), (1, 2, 30000), (1, 3, 30000), (1, 4, 30000),
  (2, 1,  7500), (2, 2,  7500), (2, 3,  7500), (2, 4,  7500);

INSERT INTO settlements (group_id, from_member_id, to_member_id, amount, is_paid) VALUES
  (1, 3, 1, 37500, 0),
  (1, 4, 1, 37500, 0),
  (1, 2, 1,  7500, 0);

SELECT id, email, name, bank_name, account_number, created_at
FROM users;

SELECT id, email, name, bank_name, account_number
FROM users
WHERE email = 'hong@example.com';

SELECT id, name, meeting_date, owner_id
FROM `groups`
ORDER BY meeting_date;

SELECT gm.id, gm.display_name, IF(gm.user_id IS NULL, '비회원', '회원') AS member_type
FROM group_members gm
WHERE gm.group_id = 1;

SELECT e.id, e.title, e.category, e.amount, gm.display_name AS payer
FROM expenses e
JOIN group_members gm ON gm.id = e.payer_member_id
WHERE e.group_id = 1
ORDER BY e.id;

SELECT s.id, f.display_name AS from_name, t.display_name AS to_name, s.amount, s.is_paid, s.paid_at
FROM settlements s
JOIN group_members f ON f.id = s.from_member_id
JOIN group_members t ON t.id = s.to_member_id
WHERE s.group_id = 1;

SELECT category, SUM(amount) AS total
FROM expenses
WHERE group_id = 1
GROUP BY category;

SELECT u.name AS owner_name, u.email, g.name AS group_name, g.meeting_date
FROM users u
JOIN `groups` g ON g.owner_id = u.id
ORDER BY g.meeting_date;

INSERT INTO users (email, password_hash, name, bank_name, account_number)
VALUES ('new@example.com', '$2b$10$BwRoE5F3pM9NxT5FBqyLyuPFDy0Le0XLY4mV25iAh6WAUVCmfSOhq', '신규회원', '카카오뱅크', '3333-01-1234567');

INSERT INTO `groups` (name, meeting_date, owner_id)
VALUES ('동아리 송년회', '2026-12-20', 2);

UPDATE users
SET bank_name = '토스뱅크',
    account_number = '1000-1234-5678'
WHERE email = 'new@example.com';

UPDATE `groups`
SET name = '동아리 송년회 (최종)',
    meeting_date = '2026-12-27'
WHERE name = '동아리 송년회';

UPDATE settlements
SET is_paid = 1, paid_at = NOW()
WHERE id = 1;

UPDATE settlements
SET is_paid = 0, paid_at = NULL
WHERE id = 1;

DELETE FROM users
WHERE email = 'new@example.com';

DELETE FROM `groups`
WHERE name = '동아리 송년회 (최종)';
