-- AlterTable
ALTER TABLE `messages` MODIFY `type` ENUM('text', 'image', 'audio', 'document', 'video', 'other') NOT NULL DEFAULT 'text';
