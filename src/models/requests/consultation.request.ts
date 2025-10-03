/**
 * Consultation Request Models
 * 
 * This file defines the request structures for consultation endpoints.
 * These interfaces ensure type safety for incoming request data.
 * 
 * @author Sahabat Ibu Hamil Team
 * @version 1.0.0
 */

/**
 * Update Consultation Status Request - represents the structure for updating consultation status
 */
export interface UpdateConsultationStatusRequest {
  status: 'WAITING' | 'VIEWED' | 'ANSWERED';
}

/**
 * Answer Consultation Request - represents the structure for answering a consultation
 */
export interface AnswerConsultationRequest {
  answer: string;
}