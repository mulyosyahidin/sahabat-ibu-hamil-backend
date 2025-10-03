/**
 * Consultation Data Transfer Object
 * 
 * This interface defines the structure for consultation data
 * used throughout the application.
 * 
 * @author Sahabat Ibu Hamil Team
 * @version 1.0.0
 */

export interface ConsultationDto {
  id: number;
  chat_id: number;
  message: string | null;
  answer: string | null;
  status: string;
  viewed_at: Date | null;
  answered_at: Date | null;
  created_at: Date;
  updated_at: Date;
  chat: {
    name: string | null;
    age: number | null;
    wa_number: string;
  };
}