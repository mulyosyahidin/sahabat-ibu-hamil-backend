/**
 * Consultation Validation Schemas
 * 
 * This file defines Zod validation schemas for consultation endpoints.
 * These schemas ensure data integrity and provide type-safe validation
 * for incoming requests.
 * 
 * @author Sahabat Ibu Hamil Team
 * @version 1.0.0
 */

import { z } from 'zod';

/**
 * Update Consultation Status Request Validation Schema
 * Validates status field for consultation status updates
 */
export const updateConsultationStatusValidationSchema = z.object({
  status: z
    .enum(['WAITING', 'VIEWED', 'ANSWERED'], { 
      message: "Status harus salah satu dari: WAITING, VIEWED, ANSWERED" 
    })
});

/**
 * Answer Consultation Request Validation Schema
 * Validates answer field for consultation responses
 */
export const answerConsultationValidationSchema = z.object({
  answer: z
    .string({ message: "Jawaban tidak boleh kosong" })
    .trim()
    .min(1, { message: "Jawaban tidak boleh kosong" })
    .min(10, { message: "Jawaban minimal 10 karakter" })
    .max(5000, { message: "Jawaban maksimal 5000 karakter" })
});

/**
 * Type inference from the validation schemas
 */
export type UpdateConsultationStatusValidationInput = z.infer<typeof updateConsultationStatusValidationSchema>;
export type AnswerConsultationValidationInput = z.infer<typeof answerConsultationValidationSchema>;