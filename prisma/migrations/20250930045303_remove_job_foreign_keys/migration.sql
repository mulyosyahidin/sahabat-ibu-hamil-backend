/*
  Warnings:

  - You are about to drop the column `chat_id` on the `jobs` table. All the data in the column will be lost.
  - You are about to drop the column `device_id` on the `jobs` table. All the data in the column will be lost.
  - You are about to drop the column `reminder_id` on the `jobs` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `jobs` DROP FOREIGN KEY `jobs_chat_id_fkey`;

-- DropForeignKey
ALTER TABLE `jobs` DROP FOREIGN KEY `jobs_device_id_fkey`;

-- DropForeignKey
ALTER TABLE `jobs` DROP FOREIGN KEY `jobs_reminder_id_fkey`;

-- DropIndex
DROP INDEX `jobs_chat_id_idx` ON `jobs`;

-- DropIndex
DROP INDEX `jobs_device_id_idx` ON `jobs`;

-- DropIndex
DROP INDEX `jobs_reminder_id_idx` ON `jobs`;

-- AlterTable
ALTER TABLE `jobs` DROP COLUMN `chat_id`,
    DROP COLUMN `device_id`,
    DROP COLUMN `reminder_id`;
