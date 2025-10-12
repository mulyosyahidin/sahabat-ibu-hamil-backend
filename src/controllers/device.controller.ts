/**
 * Device Controller
 * 
 * This controller handles HTTP requests for device endpoints including
 * device creation, retrieval, updating, and deletion functionality.
 * 
 * @author Sahabat Ibu Hamil Team
 * @version 1.0.0
 */

import type { Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import { PrismaClient } from '@/generated/prisma';
import { DeviceService } from '@/services';
import { ApiResponse, toDeviceData, toDeviceResponseData, type DevicesListData } from '@/models/responses';
import { validateAndRespond } from '@/utils';
import type { CreateDeviceRequest, UpdateDeviceRequest } from '@/models/requests';
import { createDeviceValidationSchema, updateDeviceValidationSchema } from '@/validations';
import { AppError, appInstanceManager } from '@/utils';

export class DeviceController {
  private deviceService: DeviceService;

  constructor() {
    const prisma = new PrismaClient();
    this.deviceService = new DeviceService(prisma);
    
    // Register device service in app instance manager
    appInstanceManager.setDeviceService(this.deviceService);
  }

  /**
   * Create device endpoint
   * POST /devices
   */
  create = async (
    req: Request<ParamsDictionary, unknown, CreateDeviceRequest, ParsedQs>,
    res: Response
  ): Promise<void> => {
    try {
      // Validate request body using validation utility
      const validatedData = validateAndRespond(createDeviceValidationSchema, req.body, res);
      
      if (!validatedData) {
        // Validation failed, response already sent with 422 status
        return;
      }

      // Create device using service
      const device = await this.deviceService.createDevice(validatedData);
      
      // Transform to response format
      const responseData = toDeviceResponseData(device);
      
      res.status(201).json(ApiResponse.success('Berhasil menambahkan data device', responseData));
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json(ApiResponse.error(error.message));
      } else {
        console.error('Device creation error:', error);
        res.status(500).json(ApiResponse.error('Terjadi kesalahan internal server'));
      }
    }
  };

  /**
   * Get all devices endpoint
   * GET /devices
   */
  getAll = async (
    req: Request<ParamsDictionary, unknown, unknown, ParsedQs>,
    res: Response
  ): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const paginatedResult = await this.deviceService.getAllDevices(page, limit);
      
      // Transform the result to match DevicesListData structure
      const devicesListData: DevicesListData = {
        items: paginatedResult.items.map(toDeviceData),
        pagination: paginatedResult.pagination
      };

      res.json(ApiResponse.success('Berhasil mendapatkan data device', devicesListData));
    } catch (error) {
      console.error('Get all devices error:', error);
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json(ApiResponse.error(error.message));
        return;
      }

      res.status(500).json(ApiResponse.error('Internal server error'));
    }
  };

  /**
   * Get device by ID endpoint
   * GET /devices/:id
   */
  getById = async (
    req: Request<{ id: string }, unknown, unknown, ParsedQs>,
    res: Response
  ): Promise<void> => {
    try {
      const deviceId = parseInt(req.params.id);
      
      if (isNaN(deviceId)) {
        res.status(400).json(ApiResponse.error('Invalid device ID'));
        return;
      }
      
      // find device by ID
      const device = await this.deviceService.getDeviceById(deviceId);
      
      res.json(ApiResponse.success('Berhasil mendapatkan data device', device));
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json(ApiResponse.error(error.message));
        return;
      }

      res.status(500).json(ApiResponse.error('Internal server error'));
    }
  };

  /**
   * Update device endpoint
   * PUT /devices/:id
   */
  update = async (
    req: Request<{ id: string }, unknown, UpdateDeviceRequest, ParsedQs>,
    res: Response
  ): Promise<void> => {
    try {
      // Validate ID parameter
      const deviceId = parseInt(req.params.id);
      
      if (isNaN(deviceId)) {
        res.status(400).json(ApiResponse.error('Invalid device ID'));
        return;
      }
      
      // Validate request body using validation utility
      const validatedData = validateAndRespond(updateDeviceValidationSchema, req.body, res);
      
      if (!validatedData) {
        // Validation failed, response already sent with 422 status
        return;
      }
      
      const device = await this.deviceService.updateDevice(deviceId, validatedData);
      
      res.json(ApiResponse.success('Berhasil memperbarui data device', toDeviceResponseData(device)));
    } catch (error) {
      console.error('Update device error:', error);
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json(ApiResponse.error(error.message));
        return;
      }

      res.status(500).json(ApiResponse.error('Internal server error'));
    }
  };

  /**
   * Delete device endpoint (soft delete)
   * DELETE /devices/:id
   */
  delete = async (
    req: Request<{ id: string }, unknown, unknown, ParsedQs>,
    res: Response
  ): Promise<void> => {
    try {
      const deviceId = parseInt(req.params.id);
      
      if (isNaN(deviceId)) {
        res.status(400).json(ApiResponse.error('Invalid device ID'));
        return;
      }
      
      await this.deviceService.deleteDevice(deviceId);
      
      res.json(ApiResponse.success('Berhasil menghapus device'));
    } catch (error) {
      console.error('Delete device error:', error);
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json(ApiResponse.error(error.message));
        return;
      }

      res.status(500).json(ApiResponse.error('Internal server error'));
    }
  };

  /**
   * Request device connection
   * POST /devices/:id/request-connection
   */
  requestConnection = async (
    req: Request<{ deviceCode: string }, unknown, unknown, ParsedQs>,
    res: Response
  ): Promise<void> => {
    try {
      if (!req.params.deviceCode) {
        res.status(400).json(ApiResponse.error('Device code is required'));
        return;
      }
      
      await this.deviceService.requestDeviceConnection(req.params.deviceCode);
      
      res.json(ApiResponse.success('Request koneksi perangkat berhasil dikirim'));
    } catch (error) {
      console.error('Request device connection error:', error);
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json(ApiResponse.error(error.message));
        return;
      }

      res.status(500).json(ApiResponse.error('Internal server error'));
    }
  };

  /**
   * Disconnect device
   * POST /devices/:id/disconnect
   */
  disconnect = async (
    req: Request<{ id: string }, unknown, unknown, ParsedQs>,
    res: Response
  ): Promise<void> => {
    try {
      const deviceId = parseInt(req.params.id);
      
      if (isNaN(deviceId)) {
        res.status(400).json(ApiResponse.error('Invalid device ID'));
        return;
      }
      
      await this.deviceService.disconnectDevice(deviceId);
      
      res.json(ApiResponse.success('Device berhasil didisconnect'));
    } catch (error) {
      console.error('Disconnect device error:', error);
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json(ApiResponse.error(error.message));
        return;
      }

      res.status(500).json(ApiResponse.error('Internal server error'));
    }
  };
}