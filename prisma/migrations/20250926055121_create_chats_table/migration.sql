-- CreateTable
CREATE TABLE `chats` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `deviceId` INTEGER NOT NULL,
    `waNumber` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `age` INTEGER NULL,
    `gravida` INTEGER NULL,
    `gestWeeks` INTEGER NULL,
    `consentAt` DATETIME(3) NULL,
    `sceneStack` JSON NOT NULL,
    `ctx` JSON NOT NULL,
    `lastActiveAt` TIMESTAMP(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `chats_waNumber_idx`(`waNumber`),
    UNIQUE INDEX `chats_deviceId_waNumber_key`(`deviceId`, `waNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `messages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `chatId` INTEGER NOT NULL,
    `waNumber` VARCHAR(191) NOT NULL,
    `source` ENUM('system', 'model') NOT NULL,
    `direction` ENUM('in', 'out') NOT NULL,
    `type` ENUM('text', 'image', 'audio', 'document', 'other') NOT NULL DEFAULT 'text',
    `body` VARCHAR(191) NULL,
    `intentLabel` VARCHAR(191) NULL,
    `intentScore` DOUBLE NULL,
    `meta` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `messages_chatId_createdAt_idx`(`chatId`, `createdAt`),
    INDEX `messages_waNumber_createdAt_idx`(`waNumber`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reminders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `chatId` INTEGER NOT NULL,
    `waNumber` VARCHAR(191) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `timeOfDay` VARCHAR(191) NULL,
    `tz` VARCHAR(191) NOT NULL DEFAULT 'Asia/Jakarta',
    `nextRunAt` DATETIME(3) NULL,
    `lastRunAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `reminders_active_nextRunAt_idx`(`active`, `nextRunAt`),
    INDEX `reminders_chatId_idx`(`chatId`),
    INDEX `reminders_waNumber_idx`(`waNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `category` ENUM('ANEMIA', 'TTD', 'TIPS_GIZI', 'MITOS', 'SUAMI_KELUARGA', 'FAQ') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `bodyMd` VARCHAR(191) NOT NULL,
    `tags` JSON NULL,
    `published` BOOLEAN NOT NULL DEFAULT true,
    `order` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `contents_code_key`(`code`),
    INDEX `contents_category_published_idx`(`category`, `published`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `faq_intents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `samples` JSON NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `faq_intents_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `chats` ADD CONSTRAINT `chats_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `devices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `messages_chatId_fkey` FOREIGN KEY (`chatId`) REFERENCES `chats`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reminders` ADD CONSTRAINT `reminders_chatId_fkey` FOREIGN KEY (`chatId`) REFERENCES `chats`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
