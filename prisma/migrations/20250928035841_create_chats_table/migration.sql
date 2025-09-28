-- CreateTable
CREATE TABLE `chats` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `device_id` INTEGER NOT NULL,
    `wa_number` VARCHAR(20) NOT NULL,
    `name` VARCHAR(255) NULL,
    `age` INTEGER NULL,
    `consent_at` DATETIME(3) NULL,
    `scene_stack` JSON NOT NULL,
    `ctx` JSON NOT NULL,
    `last_active_at` TIMESTAMP(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `chats_wa_number_idx`(`wa_number`),
    INDEX `chats_device_id_idx`(`device_id`),
    INDEX `chats_last_active_at_idx`(`last_active_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `chats` ADD CONSTRAINT `chats_device_id_fkey` FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
