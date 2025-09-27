-- AlterTable
ALTER TABLE `devices` MODIFY `status` ENUM('draft', 'pending_connect', 'connected', 'disconnected', 'reconnecting') NOT NULL DEFAULT 'draft';
