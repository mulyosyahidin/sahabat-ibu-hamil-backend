/**
 * Consultation Routes
 * 
 * This file defines the consultation routes including retrieval,
 * status updates, and answering operations for consultation management endpoints.
 * 
 * @author Sahabat Ibu Hamil Team
 * @version 1.0.0
 */

import { Router } from 'express';
import { ConsultationController } from '@/controllers';
import { authMiddleware } from '@/middlewares';

const router = Router();
const consultationController = new ConsultationController();

/**
 * GET /consultations
 * Get all consultations with pagination (requires authentication)
 */
router.get('/', authMiddleware, consultationController.getAll);

/**
 * GET /consultations/:id
 * Get consultation by ID (requires authentication)
 */
router.get('/:id', authMiddleware, consultationController.getById);

/**
 * PUT /consultations/:id/status
 * Update consultation status from WAITING to VIEWED (requires authentication)
 */
router.put('/:id/status', authMiddleware, consultationController.updateStatus);

/**
 * PUT /consultations/:id/answer
 * Answer consultation and set status to ANSWERED (requires authentication)
 */
router.put('/:id/answer', authMiddleware, consultationController.answer);

export default router;