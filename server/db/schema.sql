
CREATE DATABASE IF NOT EXISTS nbbang_note_20413
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_0900_ai_ci;

USE nbbang_note_20413;

DROP TABLE IF EXISTS settlements;
DROP TABLE IF EXISTS expense_splits;
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS group_members;
DROP TABLE IF EXISTS `groups`;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email          VARCHAR(255)    NOT NULL,
  password_hash  VARCHAR(255)    NOT NULL,
  name           VARCHAR(50)     NOT NULL,
  bank_name      VARCHAR(30)     NULL,
  account_number VARCHAR(50)     NULL,
  created_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

CREATE TABLE `groups` (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name         VARCHAR(100)    NOT NULL,
  meeting_date DATE            NULL,
  owner_id     BIGINT UNSIGNED NOT NULL,
  created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_groups_owner (owner_id),
  CONSTRAINT fk_groups_owner
    FOREIGN KEY (owner_id) REFERENCES users (id)
) ENGINE=InnoDB;

CREATE TABLE group_members (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  group_id     BIGINT UNSIGNED NOT NULL,
  user_id      BIGINT UNSIGNED NULL,
  display_name VARCHAR(50)     NOT NULL,
  PRIMARY KEY (id),
  KEY idx_members_group (group_id),
  KEY idx_members_user (user_id),
  CONSTRAINT fk_members_group
    FOREIGN KEY (group_id) REFERENCES `groups` (id) ON DELETE CASCADE,
  CONSTRAINT fk_members_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE expenses (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  group_id        BIGINT UNSIGNED NOT NULL,
  payer_member_id BIGINT UNSIGNED NOT NULL,
  title           VARCHAR(100)    NOT NULL,
  category        VARCHAR(20)     NOT NULL DEFAULT '기타',
  amount          BIGINT          NOT NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_expenses_group (group_id),
  KEY idx_expenses_payer (payer_member_id),
  CONSTRAINT chk_expenses_amount CHECK (amount >= 0),
  CONSTRAINT fk_expenses_group
    FOREIGN KEY (group_id) REFERENCES `groups` (id) ON DELETE CASCADE,
  CONSTRAINT fk_expenses_payer
    FOREIGN KEY (payer_member_id) REFERENCES group_members (id)
) ENGINE=InnoDB;

CREATE TABLE expense_splits (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  expense_id   BIGINT UNSIGNED NOT NULL,
  member_id    BIGINT UNSIGNED NOT NULL,
  share_amount BIGINT          NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_split_expense_member (expense_id, member_id),
  KEY idx_splits_member (member_id),
  CONSTRAINT chk_splits_share CHECK (share_amount >= 0),
  CONSTRAINT fk_splits_expense
    FOREIGN KEY (expense_id) REFERENCES expenses (id) ON DELETE CASCADE,
  CONSTRAINT fk_splits_member
    FOREIGN KEY (member_id) REFERENCES group_members (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE settlements (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  group_id       BIGINT UNSIGNED NOT NULL,
  from_member_id BIGINT UNSIGNED NOT NULL,
  to_member_id   BIGINT UNSIGNED NOT NULL,
  amount         BIGINT          NOT NULL,
  is_paid        TINYINT(1)      NOT NULL DEFAULT 0,
  paid_at        DATETIME        NULL,
  PRIMARY KEY (id),
  KEY idx_settlements_group (group_id),
  KEY idx_settlements_from (from_member_id),
  KEY idx_settlements_to (to_member_id),
  CONSTRAINT chk_settlements_amount CHECK (amount > 0),
  CONSTRAINT chk_settlements_diff CHECK (from_member_id <> to_member_id),
  CONSTRAINT fk_settlements_group
    FOREIGN KEY (group_id) REFERENCES `groups` (id) ON DELETE CASCADE,
  CONSTRAINT fk_settlements_from
    FOREIGN KEY (from_member_id) REFERENCES group_members (id) ON DELETE CASCADE,
  CONSTRAINT fk_settlements_to
    FOREIGN KEY (to_member_id) REFERENCES group_members (id) ON DELETE CASCADE
) ENGINE=InnoDB;
