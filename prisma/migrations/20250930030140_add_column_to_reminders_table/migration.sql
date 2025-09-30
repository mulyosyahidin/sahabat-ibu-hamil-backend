-- AlterTable
ALTER TABLE `reminders` ADD COLUMN `custom_time` VARCHAR(8) NULL,
    MODIFY `time_of_day` ENUM('MORNING', 'AFTERNOON', 'EVENING', 'CUSTOM') NOT NULL;
