/*
  Warnings:

  - You are about to drop the column `custom_time` on the `reminder_logs` table. All the data in the column will be lost.
  - You are about to drop the column `finished_at` on the `reminder_logs` table. All the data in the column will be lost.
  - You are about to drop the column `message_snapshot` on the `reminder_logs` table. All the data in the column will be lost.
  - You are about to drop the column `started_at` on the `reminder_logs` table. All the data in the column will be lost.
  - You are about to drop the column `time_of_day` on the `reminder_logs` table. All the data in the column will be lost.
  - You are about to drop the column `tz` on the `reminder_logs` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `reminder_logs` table. All the data in the column will be lost.
  - You are about to drop the `bull_job_attempts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `bull_job_events` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `bull_jobs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `bull_queues` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `bull_repeatables` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `scheduled_for` on table `reminder_logs` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `bull_job_attempts` DROP FOREIGN KEY `bull_job_attempts_job_id_fkey`;

-- DropForeignKey
ALTER TABLE `bull_job_events` DROP FOREIGN KEY `bull_job_events_job_id_fkey`;

-- DropForeignKey
ALTER TABLE `bull_jobs` DROP FOREIGN KEY `bull_jobs_queue_id_fkey`;

-- DropForeignKey
ALTER TABLE `bull_repeatables` DROP FOREIGN KEY `bull_repeatables_queue_id_fkey`;

-- DropForeignKey
ALTER TABLE `reminder_logs` DROP FOREIGN KEY `reminder_logs_job_id_fkey`;

-- DropIndex
DROP INDEX `reminder_logs_job_id_idx` ON `reminder_logs`;

-- AlterTable
ALTER TABLE `reminder_logs` DROP COLUMN `custom_time`,
    DROP COLUMN `finished_at`,
    DROP COLUMN `message_snapshot`,
    DROP COLUMN `started_at`,
    DROP COLUMN `time_of_day`,
    DROP COLUMN `tz`,
    DROP COLUMN `updated_at`,
    ADD COLUMN `executed_at` DATETIME(3) NULL,
    ADD COLUMN `message_sent` TEXT NULL,
    MODIFY `scheduled_for` DATETIME(3) NOT NULL;

-- DropTable
DROP TABLE `bull_job_attempts`;

-- DropTable
DROP TABLE `bull_job_events`;

-- DropTable
DROP TABLE `bull_jobs`;

-- DropTable
DROP TABLE `bull_queues`;

-- DropTable
DROP TABLE `bull_repeatables`;

-- CreateTable
CREATE TABLE `reminder_jobs` (
    `id` VARCHAR(191) NOT NULL,
    `reminder_id` INTEGER NOT NULL,
    `status` ENUM('WAITING', 'DELAYED', 'ACTIVE', 'COMPLETED', 'FAILED', 'PAUSED', 'STALLED', 'RETRY', 'REMOVED') NOT NULL DEFAULT 'WAITING',
    `scheduled_for` DATETIME(3) NOT NULL,
    `started_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `failed_at` DATETIME(3) NULL,
    `message` TEXT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `max_attempts` INTEGER NOT NULL DEFAULT 3,
    `error_message` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `reminder_jobs_reminder_id_idx`(`reminder_id`),
    INDEX `reminder_jobs_status_scheduled_for_idx`(`status`, `scheduled_for`),
    INDEX `reminder_jobs_scheduled_for_idx`(`scheduled_for`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `reminder_jobs` ADD CONSTRAINT `reminder_jobs_reminder_id_fkey` FOREIGN KEY (`reminder_id`) REFERENCES `reminders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
