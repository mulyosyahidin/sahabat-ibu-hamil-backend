/*
  Warnings:

  - You are about to drop the column `gestWeeks` on the `chats` table. All the data in the column will be lost.
  - You are about to drop the column `gravida` on the `chats` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `chats` DROP COLUMN `gestWeeks`,
    DROP COLUMN `gravida`;
