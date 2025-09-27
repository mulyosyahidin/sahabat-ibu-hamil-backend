/*
  Warnings:

  - You are about to drop the `airequestlog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `airesponsechunk` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `airesponsechunk` DROP FOREIGN KEY `AiResponseChunk_requestId_fkey`;

-- DropTable
DROP TABLE `airequestlog`;

-- DropTable
DROP TABLE `airesponsechunk`;
