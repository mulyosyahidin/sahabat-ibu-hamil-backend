-- CreateTable
CREATE TABLE `reminders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `chat_id` INTEGER NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `time_of_day` VARCHAR(50) NULL,
    `tz` VARCHAR(50) NOT NULL DEFAULT 'Asia/Jakarta',
    `next_run_at` DATETIME(3) NULL,
    `last_run_at` DATETIME(3) NULL,
    `next_run_message` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `reminders_active_next_run_at_idx`(`active`, `next_run_at`),
    INDEX `reminders_chat_id_idx`(`chat_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `reminders` ADD CONSTRAINT `reminders_chat_id_fkey` FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
