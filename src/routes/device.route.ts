/**
 * Device Routes
 * 
 * This file defines the device routes including CRUD operations
 * for device management endpoints.
 * 
 * @author Sahabat Ibu Hamil Team
 * @version 1.0.0
 */

import { Router } from 'express';
import { DeviceController } from '../controllers/device.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
const deviceController = new DeviceController();

/**
 * POST /devices
 * Create a new device (requires authentication)
 */
router.post('/', authMiddleware, deviceController.create.bind(deviceController));

/**
 * GET /devices
 * Get all devices with pagination (requires authentication)
 */
router.get('/', authMiddleware, deviceController.getAll);

/**
 * GET /devices/:id
 * Get device by ID (requires authentication)
 */
router.get('/:id', authMiddleware, deviceController.getById);

/**
 * PUT /devices/:id
 * Update device by ID (requires authentication)
 */
router.put('/:id', authMiddleware, deviceController.update);

/**
 * DELETE /devices/:id
 * Soft delete device by ID (requires authentication)
 */
router.delete('/:id', authMiddleware, deviceController.delete);

export default router;