-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `email_verified_at` DATETIME(3) NULL,
    `password` VARCHAR(255) NOT NULL,
    `remember_token` VARCHAR(100) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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
    `openai_conversation_id` VARCHAR(255) NULL,

    INDEX `chats_wa_number_idx`(`wa_number`),
    INDEX `chats_device_id_idx`(`device_id`),
    INDEX `chats_last_active_at_idx`(`last_active_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `messages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `chat_id` INTEGER NOT NULL,
    `source` ENUM('SYSTEM', 'USER', 'MODEL') NOT NULL,
    `direction` ENUM('IN', 'OUT') NOT NULL,
    `type` ENUM('TEXT', 'EXTENDED_TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'VOICE', 'DOCUMENT', 'STICKER', 'LOCATION', 'LIVE_LOCATION', 'CONTACT', 'CONTACTS', 'BUTTON_REPLY', 'LIST_REPLY', 'INTERACTIVE', 'REACTION', 'POLL', 'PRODUCT', 'GROUP_INVITE', 'VIEW_ONCE', 'EPHEMERAL', 'OTHER') NOT NULL DEFAULT 'TEXT',
    `body` TEXT NULL,
    `media` JSON NULL,
    `meta` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `messages_chat_id_created_at_idx`(`chat_id`, `created_at`),
    INDEX `messages_source_idx`(`source`),
    INDEX `messages_direction_idx`(`direction`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reminders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `chat_id` INTEGER NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `time_of_day` ENUM('MORNING', 'AFTERNOON', 'EVENING', 'CUSTOM') NOT NULL,
    `custom_time` VARCHAR(8) NULL,
    `tz` VARCHAR(50) NOT NULL DEFAULT 'Asia/Jakarta',
    `last_run_at` DATETIME(3) NULL,
    `next_run_message` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `reminders_chat_id_idx`(`chat_id`),
    UNIQUE INDEX `reminders_chat_id_time_of_day_key`(`chat_id`, `time_of_day`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reminder_jobs` (
    `id` VARCHAR(191) NOT NULL,
    `reminder_id` INTEGER NOT NULL,
    `status` ENUM('WAITING', 'DELAYED', 'ACTIVE', 'COMPLETED', 'FAILED', 'PAUSED', 'STALLED', 'RETRY', 'REMOVED') NOT NULL DEFAULT 'WAITING',
    `scheduled_for` DATETIME(3) NOT NULL,
    `started_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `failed_at` DATETIME(3) NULL,
    `message` TEXT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `max_attempts` INTEGER NOT NULL DEFAULT 3,
    `error_message` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `reminder_jobs_reminder_id_idx`(`reminder_id`),
    INDEX `reminder_jobs_status_scheduled_for_idx`(`status`, `scheduled_for`),
    INDEX `reminder_jobs_scheduled_for_idx`(`scheduled_for`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reminder_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `reminder_id` INTEGER NOT NULL,
    `status` ENUM('SCHEDULED', 'DISPATCHED', 'STARTED', 'SENT', 'SKIPPED', 'FAILED') NOT NULL DEFAULT 'SCHEDULED',
    `scheduled_for` DATETIME(3) NOT NULL,
    `executed_at` DATETIME(3) NULL,
    `message_sent` TEXT NULL,
    `error_message` TEXT NULL,
    `job_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `reminder_logs_reminder_id_idx`(`reminder_id`),
    INDEX `reminder_logs_status_scheduled_for_idx`(`status`, `scheduled_for`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `consultations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `chat_id` INTEGER NOT NULL,
    `message` TEXT NULL,
    `answer` TEXT NULL,
    `status` ENUM('WAITING', 'VIEWED', 'ANSWERED') NOT NULL DEFAULT 'WAITING',
    `viewed_at` DATETIME(3) NULL,
    `answered_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `consultations_chat_id_idx`(`chat_id`),
    INDEX `consultations_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_request_logs` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `chat_id` INTEGER NULL,
    `device_id` INTEGER NULL,
    `provider` VARCHAR(50) NOT NULL DEFAULT 'openai',
    `endpoint` ENUM('CHAT_COMPLETIONS_CREATE', 'COMPLETIONS_CREATE', 'EMBEDDINGS_CREATE', 'IMAGES_GENERATE', 'AUDIO_TRANSCRIPTIONS_CREATE', 'AUDIO_TRANSLATIONS_CREATE', 'MODERATIONS_CREATE') NOT NULL,
    `model` ENUM('GPT_4O_MINI', 'GPT_4O', 'GPT_4_TURBO', 'GPT_3_5_TURBO', 'CLAUDE_3_5_SONNET', 'CLAUDE_3_HAIKU', 'GEMINI_PRO', 'GEMINI_FLASH') NOT NULL,
    `request_payload` JSON NOT NULL,
    `response_payload` JSON NULL,
    `response_text` TEXT NULL,
    `input_tokens` INTEGER NOT NULL DEFAULT 0,
    `output_tokens` INTEGER NOT NULL DEFAULT 0,
    `total_tokens` INTEGER NOT NULL DEFAULT 0,
    `input_cost_usd` DECIMAL(10, 6) NOT NULL DEFAULT 0,
    `output_cost_usd` DECIMAL(10, 6) NOT NULL DEFAULT 0,
    `total_cost_usd` DECIMAL(10, 6) NOT NULL DEFAULT 0,
    `latency_ms` INTEGER NOT NULL DEFAULT 0,
    `retries` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('PENDING', 'SUCCESS', 'ERROR', 'TIMEOUT', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `error_message` TEXT NULL,
    `error_code` VARCHAR(100) NULL,
    `project` VARCHAR(100) NULL,
    `tags` JSON NULL,
    `meta` JSON NULL,
    `response_format` VARCHAR(50) NULL,
    `stream` BOOLEAN NOT NULL DEFAULT false,
    `tool_calling_used` BOOLEAN NOT NULL DEFAULT false,
    `prompt_caching_used` BOOLEAN NOT NULL DEFAULT false,
    `requested_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `responded_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `ai_request_logs_chat_id_idx`(`chat_id`),
    INDEX `ai_request_logs_device_id_idx`(`device_id`),
    INDEX `ai_request_logs_provider_model_idx`(`provider`, `model`),
    INDEX `ai_request_logs_status_idx`(`status`),
    INDEX `ai_request_logs_requested_at_idx`(`requested_at`),
    INDEX `ai_request_logs_project_idx`(`project`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_response_chunks` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `request_log_id` BIGINT NOT NULL,
    `chunk_index` INTEGER NOT NULL,
    `content` TEXT NOT NULL,
    `finish_reason` VARCHAR(50) NULL,
    `tokens` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ai_response_chunks_request_log_id_chunk_index_idx`(`request_log_id`, `chunk_index`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `chats` ADD CONSTRAINT `chats_device_id_fkey` FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `messages_chat_id_fkey` FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reminders` ADD CONSTRAINT `reminders_chat_id_fkey` FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reminder_jobs` ADD CONSTRAINT `reminder_jobs_reminder_id_fkey` FOREIGN KEY (`reminder_id`) REFERENCES `reminders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reminder_logs` ADD CONSTRAINT `reminder_logs_reminder_id_fkey` FOREIGN KEY (`reminder_id`) REFERENCES `reminders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `consultations` ADD CONSTRAINT `consultations_chat_id_fkey` FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_request_logs` ADD CONSTRAINT `ai_request_logs_device_id_fkey` FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_request_logs` ADD CONSTRAINT `ai_request_logs_chat_id_fkey` FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_response_chunks` ADD CONSTRAINT `ai_response_chunks_request_log_id_fkey` FOREIGN KEY (`request_log_id`) REFERENCES `ai_request_logs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
