/*
  Warnings:

  - A unique constraint covering the columns `[date,provider,model,project]` on the table `ai_cost_summaries` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `ai_cost_summaries_date_provider_model_project_deviceId_key` ON `ai_cost_summaries`;

-- CreateIndex
CREATE UNIQUE INDEX `ai_cost_summaries_date_provider_model_project_key` ON `ai_cost_summaries`(`date`, `provider`, `model`, `project`);
