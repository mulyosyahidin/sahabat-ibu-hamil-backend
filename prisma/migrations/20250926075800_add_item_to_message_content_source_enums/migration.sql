-- AlterTable
ALTER TABLE `messages` MODIFY `source` ENUM('system', 'model', 'user') NOT NULL;
