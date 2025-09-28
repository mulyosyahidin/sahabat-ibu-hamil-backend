/*
  Warnings:

  - You are about to drop the column `intent_label` on the `messages` table. All the data in the column will be lost.
  - You are about to drop the column `intent_score` on the `messages` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `messages` DROP COLUMN `intent_label`,
    DROP COLUMN `intent_score`;
