-- CreateTable
CREATE TABLE `jobs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `type` ENUM('REMINDER', 'EMAIL', 'NOTIFICATION', 'CLEANUP', 'BACKUP', 'OTHER') NOT NULL DEFAULT 'OTHER',
    `queue_name` VARCHAR(100) NOT NULL,
    `job_id` VARCHAR(255) NULL,
    `payload` JSON NULL,
    `options` JSON NULL,
    `scheduled_at` DATETIME(3) NULL,
    `delay_ms` INTEGER NULL,
    `repeat_pattern` VARCHAR(255) NULL,
    `status` ENUM('PENDING', 'ACTIVE', 'COMPLETED', 'FAILED', 'DELAYED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `max_attempts` INTEGER NOT NULL DEFAULT 3,
    `started_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `failed_at` DATETIME(3) NULL,
    `result` JSON NULL,
    `error_message` TEXT NULL,
    `error_stack` TEXT NULL,
    `progress` INTEGER NOT NULL DEFAULT 0,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `tags` JSON NULL,
    `meta` JSON NULL,
    `chat_id` INTEGER NULL,
    `device_id` INTEGER NULL,
    `reminder_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `jobs_job_id_key`(`job_id`),
    INDEX `jobs_type_idx`(`type`),
    INDEX `jobs_status_idx`(`status`),
    INDEX `jobs_queue_name_idx`(`queue_name`),
    INDEX `jobs_scheduled_at_idx`(`scheduled_at`),
    INDEX `jobs_chat_id_idx`(`chat_id`),
    INDEX `jobs_device_id_idx`(`device_id`),
    INDEX `jobs_reminder_id_idx`(`reminder_id`),
    INDEX `jobs_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `jobs` ADD CONSTRAINT `jobs_chat_id_fkey` FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `jobs` ADD CONSTRAINT `jobs_device_id_fkey` FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `jobs` ADD CONSTRAINT `jobs_reminder_id_fkey` FOREIGN KEY (`reminder_id`) REFERENCES `reminders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
