/*
  Warnings:

  - You are about to drop the column `waNumber` on the `reminders` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `reminders_waNumber_idx` ON `reminders`;

-- AlterTable
ALTER TABLE `reminders` DROP COLUMN `waNumber`;
