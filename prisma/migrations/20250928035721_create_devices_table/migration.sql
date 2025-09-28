-- CreateTable
CREATE TABLE `devices` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `code` VARCHAR(20) NOT NULL,
    `status` ENUM('DRAFT', 'PENDING_CONNECT', 'FAILED_CONNECT', 'CONNECTED', 'DISCONNECTED', 'RECONNECTING') NOT NULL DEFAULT 'DRAFT',
    `phone_number` VARCHAR(20) NULL,
    `device_id` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `devices_code_key`(`code`),
    INDEX `devices_status_idx`(`status`),
    INDEX `devices_code_idx`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
