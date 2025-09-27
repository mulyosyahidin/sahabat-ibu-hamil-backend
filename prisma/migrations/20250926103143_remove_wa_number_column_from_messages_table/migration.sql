/*
  Warnings:

  - You are about to drop the column `waNumber` on the `messages` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `messages_waNumber_createdAt_idx` ON `messages`;

-- AlterTable
ALTER TABLE `messages` DROP COLUMN `waNumber`;
