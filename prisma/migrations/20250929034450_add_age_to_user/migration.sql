-- AlterTable
-- Cross‑platform safe migration for MySQL/MariaDB (no IF NOT EXISTS)
-- 1) Add column `role` on table `User` only if it does not exist
SET @col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'User'
    AND COLUMN_NAME = 'role'
);

SET @ddl := IF(
  @col_exists = 0,
  'ALTER TABLE `User` ADD COLUMN `role` ENUM(''ADMIN'',''MEMBER'') NULL',
  'SELECT 1'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2) Backfill existing rows to a valid value (required before NOT NULL)
UPDATE `User` SET `role` = 'MEMBER' WHERE `role` IS NULL OR `role` NOT IN ('ADMIN','MEMBER');

-- 3) Enforce type + NOT NULL (idempotent if already set)
ALTER TABLE `User` MODIFY `role` ENUM('ADMIN','MEMBER') NOT NULL;
