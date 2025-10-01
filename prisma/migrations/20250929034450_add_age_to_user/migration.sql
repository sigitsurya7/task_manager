-- AlterTable
-- Ensure role column exists on correct-cased table name for Ubuntu (case-sensitive FS)
ALTER TABLE `User` ADD COLUMN IF NOT EXISTS `role` ENUM('ADMIN','MEMBER') NULL;

-- Backfill and enforce not-null to match schema expectation
UPDATE `User` SET `role` = 'MEMBER' WHERE `role` IS NULL;

ALTER TABLE `User` MODIFY `role` ENUM('ADMIN','MEMBER') NOT NULL;
