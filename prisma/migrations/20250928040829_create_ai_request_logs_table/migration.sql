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
ALTER TABLE `ai_request_logs` ADD CONSTRAINT `ai_request_logs_device_id_fkey` FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_request_logs` ADD CONSTRAINT `ai_request_logs_chat_id_fkey` FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_response_chunks` ADD CONSTRAINT `ai_response_chunks_request_log_id_fkey` FOREIGN KEY (`request_log_id`) REFERENCES `ai_request_logs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
