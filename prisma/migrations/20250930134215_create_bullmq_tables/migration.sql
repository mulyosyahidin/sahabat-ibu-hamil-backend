/*
  Warnings:

  - You are about to drop the `jobs` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE `jobs`;

-- CreateTable
CREATE TABLE `reminder_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `reminder_id` INTEGER NOT NULL,
    `time_of_day` ENUM('MORNING', 'AFTERNOON', 'EVENING', 'CUSTOM') NOT NULL,
    `custom_time` VARCHAR(8) NULL,
    `tz` VARCHAR(50) NOT NULL,
    `job_id` VARCHAR(191) NULL,
    `status` ENUM('SCHEDULED', 'DISPATCHED', 'STARTED', 'SENT', 'SKIPPED', 'FAILED') NOT NULL DEFAULT 'SCHEDULED',
    `scheduled_for` DATETIME(3) NULL,
    `started_at` DATETIME(3) NULL,
    `finished_at` DATETIME(3) NULL,
    `message_snapshot` TEXT NULL,
    `error_message` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `reminder_logs_reminder_id_idx`(`reminder_id`),
    INDEX `reminder_logs_job_id_idx`(`job_id`),
    INDEX `reminder_logs_status_scheduled_for_idx`(`status`, `scheduled_for`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bull_queues` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `prefix` VARCHAR(100) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `bull_queues_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bull_jobs` (
    `id` VARCHAR(191) NOT NULL,
    `queue_id` INTEGER NOT NULL,
    `name` VARCHAR(100) NULL,
    `state` ENUM('WAITING', 'DELAYED', 'ACTIVE', 'COMPLETED', 'FAILED', 'PAUSED', 'STALLED', 'RETRY', 'REMOVED') NOT NULL DEFAULT 'WAITING',
    `data` JSON NOT NULL,
    `opts` JSON NULL,
    `attempts_made` INTEGER NOT NULL DEFAULT 0,
    `attempts_max` INTEGER NOT NULL DEFAULT 0,
    `delay_ms` INTEGER NOT NULL DEFAULT 0,
    `priority` INTEGER NULL,
    `backoff` JSON NULL,
    `scheduled_at` DATETIME(3) NULL,
    `started_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `failed_at` DATETIME(3) NULL,
    `fail_reason` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `dedup_key` VARCHAR(191) NULL,
    `correlation_id` VARCHAR(191) NULL,

    INDEX `bull_jobs_queue_id_state_idx`(`queue_id`, `state`),
    INDEX `bull_jobs_scheduled_at_idx`(`scheduled_at`),
    INDEX `bull_jobs_dedup_key_idx`(`dedup_key`),
    INDEX `bull_jobs_correlation_id_idx`(`correlation_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bull_job_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `job_id` VARCHAR(191) NOT NULL,
    `event` ENUM('ADDED', 'WAITING', 'DELAYED', 'ACTIVE', 'PROGRESS', 'COMPLETED', 'FAILED', 'STALLED', 'RETRY', 'REMOVED') NOT NULL,
    `payload` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `bull_job_events_job_id_event_idx`(`job_id`, `event`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bull_job_attempts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `job_id` VARCHAR(191) NOT NULL,
    `attempt_no` INTEGER NOT NULL,
    `started_at` DATETIME(3) NULL,
    `finished_at` DATETIME(3) NULL,
    `error_name` VARCHAR(191) NULL,
    `error_msg` TEXT NULL,
    `error_stack` TEXT NULL,

    INDEX `bull_job_attempts_job_id_idx`(`job_id`),
    UNIQUE INDEX `bull_job_attempts_job_id_attempt_no_key`(`job_id`, `attempt_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bull_repeatables` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `queue_id` INTEGER NOT NULL,
    `repeat_key` VARCHAR(191) NOT NULL,
    `name` VARCHAR(100) NULL,
    `cron` VARCHAR(100) NULL,
    `tz` VARCHAR(50) NULL,
    `every_ms` INTEGER NULL,
    `limit` INTEGER NULL,
    `next_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `bull_repeatables_repeat_key_key`(`repeat_key`),
    INDEX `bull_repeatables_queue_id_idx`(`queue_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `reminder_logs` ADD CONSTRAINT `reminder_logs_reminder_id_fkey` FOREIGN KEY (`reminder_id`) REFERENCES `reminders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reminder_logs` ADD CONSTRAINT `reminder_logs_job_id_fkey` FOREIGN KEY (`job_id`) REFERENCES `bull_jobs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bull_jobs` ADD CONSTRAINT `bull_jobs_queue_id_fkey` FOREIGN KEY (`queue_id`) REFERENCES `bull_queues`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bull_job_events` ADD CONSTRAINT `bull_job_events_job_id_fkey` FOREIGN KEY (`job_id`) REFERENCES `bull_jobs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bull_job_attempts` ADD CONSTRAINT `bull_job_attempts_job_id_fkey` FOREIGN KEY (`job_id`) REFERENCES `bull_jobs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bull_repeatables` ADD CONSTRAINT `bull_repeatables_queue_id_fkey` FOREIGN KEY (`queue_id`) REFERENCES `bull_queues`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
