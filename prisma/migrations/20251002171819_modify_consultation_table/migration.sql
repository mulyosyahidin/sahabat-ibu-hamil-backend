/*
  Warnings:

  - You are about to drop the `consultation` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `consultation` DROP FOREIGN KEY `Consultation_chat_id_fkey`;

-- DropTable
DROP TABLE `consultation`;

-- CreateTable
CREATE TABLE `consultations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `chat_id` INTEGER NOT NULL,
    `message` TEXT NULL,
    `answer` TEXT NULL,
    `status` ENUM('WAITING', 'VIEWED', 'ANSWERED') NOT NULL DEFAULT 'WAITING',
    `viewed_at` DATETIME(3) NULL,
    `answered_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `consultations_chat_id_idx`(`chat_id`),
    INDEX `consultations_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `consultations` ADD CONSTRAINT `consultations_chat_id_fkey` FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
