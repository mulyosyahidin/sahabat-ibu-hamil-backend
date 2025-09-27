-- CreateTable
CREATE TABLE `ai_request_logs` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `sessionId` VARCHAR(255) NULL,
    `chatExternalId` VARCHAR(255) NULL,
    `deviceId` INTEGER NULL,
    `userId` INTEGER NULL,
    `provider` VARCHAR(50) NOT NULL DEFAULT 'openai',
    `endpoint` ENUM('chat_completions_create', 'completions_create', 'embeddings_create', 'images_generate', 'audio_transcriptions_create', 'audio_translations_create', 'moderations_create') NOT NULL,
    `model` ENUM('gpt_4o_mini', 'gpt_4o', 'gpt_4_turbo', 'gpt_3_5_turbo', 'claude_3_5_sonnet', 'claude_3_haiku', 'gemini_pro', 'gemini_flash') NOT NULL,
    `requestPayload` JSON NOT NULL,
    `responsePayload` JSON NULL,
    `responseText` TEXT NULL,
    `inputTokens` INTEGER NOT NULL DEFAULT 0,
    `outputTokens` INTEGER NOT NULL DEFAULT 0,
    `totalTokens` INTEGER NOT NULL DEFAULT 0,
    `inputCostUsd` DECIMAL(10, 6) NOT NULL DEFAULT 0,
    `outputCostUsd` DECIMAL(10, 6) NOT NULL DEFAULT 0,
    `totalCostUsd` DECIMAL(10, 6) NOT NULL DEFAULT 0,
    `latencyMs` INTEGER NOT NULL DEFAULT 0,
    `retries` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('pending', 'success', 'error', 'timeout', 'cancelled') NOT NULL DEFAULT 'pending',
    `errorMessage` TEXT NULL,
    `errorCode` VARCHAR(100) NULL,
    `project` VARCHAR(100) NULL,
    `tags` JSON NULL,
    `meta` JSON NULL,
    `responseFormat` VARCHAR(50) NULL,
    `stream` BOOLEAN NOT NULL DEFAULT false,
    `toolCallingUsed` BOOLEAN NOT NULL DEFAULT false,
    `promptCachingUsed` BOOLEAN NOT NULL DEFAULT false,
    `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `respondedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ai_request_logs_sessionId_idx`(`sessionId`),
    INDEX `ai_request_logs_chatExternalId_idx`(`chatExternalId`),
    INDEX `ai_request_logs_deviceId_idx`(`deviceId`),
    INDEX `ai_request_logs_provider_model_idx`(`provider`, `model`),
    INDEX `ai_request_logs_status_idx`(`status`),
    INDEX `ai_request_logs_requestedAt_idx`(`requestedAt`),
    INDEX `ai_request_logs_project_idx`(`project`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_response_chunks` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `requestLogId` BIGINT NOT NULL,
    `chunkIndex` INTEGER NOT NULL,
    `content` TEXT NOT NULL,
    `finishReason` VARCHAR(50) NULL,
    `tokens` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ai_response_chunks_requestLogId_chunkIndex_idx`(`requestLogId`, `chunkIndex`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_cost_summaries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `provider` VARCHAR(50) NOT NULL,
    `model` ENUM('gpt_4o_mini', 'gpt_4o', 'gpt_4_turbo', 'gpt_3_5_turbo', 'claude_3_5_sonnet', 'claude_3_haiku', 'gemini_pro', 'gemini_flash') NULL,
    `project` VARCHAR(100) NULL,
    `deviceId` INTEGER NULL,
    `totalRequests` INTEGER NOT NULL DEFAULT 0,
    `successRequests` INTEGER NOT NULL DEFAULT 0,
    `errorRequests` INTEGER NOT NULL DEFAULT 0,
    `totalInputTokens` INTEGER NOT NULL DEFAULT 0,
    `totalOutputTokens` INTEGER NOT NULL DEFAULT 0,
    `totalTokens` INTEGER NOT NULL DEFAULT 0,
    `totalCostUsd` DECIMAL(10, 6) NOT NULL DEFAULT 0,
    `avgLatencyMs` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ai_cost_summaries_date_idx`(`date`),
    INDEX `ai_cost_summaries_provider_idx`(`provider`),
    INDEX `ai_cost_summaries_deviceId_idx`(`deviceId`),
    UNIQUE INDEX `ai_cost_summaries_date_provider_model_project_deviceId_key`(`date`, `provider`, `model`, `project`, `deviceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ai_request_logs` ADD CONSTRAINT `ai_request_logs_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `devices`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_response_chunks` ADD CONSTRAINT `ai_response_chunks_requestLogId_fkey` FOREIGN KEY (`requestLogId`) REFERENCES `ai_request_logs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_cost_summaries` ADD CONSTRAINT `ai_cost_summaries_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `devices`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
