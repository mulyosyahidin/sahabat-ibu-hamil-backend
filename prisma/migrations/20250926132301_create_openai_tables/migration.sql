-- CreateTable
CREATE TABLE `AiRequestLog` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `project` VARCHAR(191) NULL,
    `sessionId` VARCHAR(191) NULL,
    `chatExternalId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NULL,
    `deviceId` INTEGER NULL,
    `endpoint` VARCHAR(191) NOT NULL,
    `model` VARCHAR(191) NOT NULL,
    `apiKeyAlias` VARCHAR(191) NULL,
    `clientVersion` VARCHAR(191) NULL,
    `requestId` VARCHAR(191) NULL,
    `responseFormat` VARCHAR(191) NULL,
    `stream` BOOLEAN NOT NULL DEFAULT false,
    `toolCallingUsed` BOOLEAN NOT NULL DEFAULT false,
    `promptCachingUsed` BOOLEAN NOT NULL DEFAULT false,
    `requestPayload` JSON NOT NULL,
    `responsePayload` JSON NULL,
    `responseText` TEXT NULL,
    `inputTokens` INTEGER NOT NULL DEFAULT 0,
    `outputTokens` INTEGER NOT NULL DEFAULT 0,
    `cachedInputTokens` INTEGER NOT NULL DEFAULT 0,
    `reasoningTokens` INTEGER NOT NULL DEFAULT 0,
    `totalTokens` INTEGER NOT NULL DEFAULT 0,
    `inputPricePerMTokUsd` DECIMAL(9, 4) NULL,
    `outputPricePerMTokUsd` DECIMAL(9, 4) NULL,
    `cachedPricePerMTokUsd` DECIMAL(9, 4) NULL,
    `fxRateUsdIdr` DECIMAL(12, 4) NULL,
    `costInputUsd` DECIMAL(18, 6) NULL,
    `costOutputUsd` DECIMAL(18, 6) NULL,
    `costCachedUsd` DECIMAL(18, 6) NULL,
    `costTotalUsd` DECIMAL(18, 6) NULL,
    `costTotalIdr` DECIMAL(18, 2) NULL,
    `latencyMs` INTEGER NULL,
    `retries` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL,
    `httpStatusCode` INTEGER NULL,
    `errorCode` VARCHAR(191) NULL,
    `errorMessage` TEXT NULL,
    `tags` JSON NULL,
    `meta` JSON NULL,

    UNIQUE INDEX `AiRequestLog_requestId_key`(`requestId`),
    INDEX `AiRequestLog_model_createdAt_idx`(`model`, `createdAt`),
    INDEX `AiRequestLog_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `AiRequestLog_sessionId_createdAt_idx`(`sessionId`, `createdAt`),
    INDEX `AiRequestLog_chatExternalId_idx`(`chatExternalId`),
    INDEX `AiRequestLog_endpoint_createdAt_idx`(`endpoint`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AiResponseChunk` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `requestId` BIGINT NOT NULL,
    `seq` INTEGER NOT NULL,
    `event` VARCHAR(191) NULL,
    `chunkType` VARCHAR(191) NULL,
    `content` TEXT NULL,
    `payload` JSON NULL,

    INDEX `AiResponseChunk_requestId_seq_idx`(`requestId`, `seq`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AiResponseChunk` ADD CONSTRAINT `AiResponseChunk_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `AiRequestLog`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
