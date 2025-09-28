-- CreateTable
CREATE TABLE `messages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `chat_id` INTEGER NOT NULL,
    `source` ENUM('SYSTEM', 'USER', 'MODEL') NOT NULL,
    `direction` ENUM('IN', 'OUT') NOT NULL,
    `type` ENUM('TEXT', 'EXTENDED_TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'VOICE', 'DOCUMENT', 'STICKER', 'LOCATION', 'LIVE_LOCATION', 'CONTACT', 'CONTACTS', 'BUTTON_REPLY', 'LIST_REPLY', 'INTERACTIVE', 'REACTION', 'POLL', 'PRODUCT', 'GROUP_INVITE', 'VIEW_ONCE', 'EPHEMERAL', 'OTHER') NOT NULL DEFAULT 'TEXT',
    `body` TEXT NULL,
    `intent_label` VARCHAR(255) NULL,
    `intent_score` DOUBLE NULL,
    `meta` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `messages_chat_id_created_at_idx`(`chat_id`, `created_at`),
    INDEX `messages_source_idx`(`source`),
    INDEX `messages_direction_idx`(`direction`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `messages_chat_id_fkey` FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
