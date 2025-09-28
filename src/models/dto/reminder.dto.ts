/**
 * Reminder Data Transfer Object (DTO)
 * 
 * This file defines the Reminder DTO which represents the reminder entity structure
 * for data transfer between application layers.
 * 
 * @author Sahabat Ibu Hamil Team
 * @version 1.0.0
 */

/**
 * Reminder DTO - represents the reminder entity structure
 */
export interface ReminderDto {
  id: number;
  chat_id: number;
  active: boolean;
  time_of_day: string | null;
  tz: string;
  next_run_at: Date | null;
  last_run_at: Date | null;
  next_run_message: string | null;
  created_at: Date;
  updated_at: Date;
}