/**
 * Device Service
 * 
 * This service handles device-related business logic including
 * device creation, retrieval, updating, and deletion operations.
 * 
 * @author Sahabat Ibu Hamil Team
 * @version 1.0.0
 */

import { PrismaClient } from '../generated/prisma';
import type { CreateDeviceRequest, UpdateDeviceRequest } from '../models/requests/device.request';
import type { DeviceDto } from '../models/dto/device.dto';
import { NotFoundError, BadRequestError } from '../utils/error.util';
import { generateDeviceCode } from '../utils/code.util';
import { PaginatedResponseHelper, type PaginatedResponse } from '../models/responses/paginated.response';

export class DeviceService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Create a new device
   */
  async createDevice(data: CreateDeviceRequest): Promise<DeviceDto> {
    // Generate unique device code
    let deviceCode: string;
    let isCodeUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    // Keep generating codes until we find a unique one
    do {
      deviceCode = generateDeviceCode();
      const existingDevice = await this.prisma.device.findUnique({
        where: { code: deviceCode }
      });
      
      isCodeUnique = !existingDevice;
      attempts++;
      
      if (attempts >= maxAttempts && !isCodeUnique) {
        throw new BadRequestError('Gagal membuat kode device yang unik. Silakan coba lagi.');
      }
    } while (!isCodeUnique);

    // Create device in database
    const device = await this.prisma.device.create({
      data: {
        name: data.name,
        code: deviceCode,
        status: 'draft', 
      }
    });

    // Convert to DTO format
    return {
      id: device.id,
      name: device.name,
      code: device.code,
      status: device.status as any,
      phone_number: device.phone_number,
      created_at: device.created_at,
      updated_at: device.updated_at,
      deleted_at: device.deleted_at,
    };
  }

  /**
   * Get all devices with pagination
   */
  async getAllDevices(page: number = 1, limit: number = 10): Promise<PaginatedResponse<DeviceDto>> {
    // Calculate pagination offsets
    const offset = (page - 1) * limit;

    // Get devices with pagination
    const devices = await this.prisma.device.findMany({
      where: {
        deleted_at: null,
      },
      skip: offset,
      take: limit,
    });

    // Get total count
    const total = await this.prisma.device.count({
      where: {
        deleted_at: null,
      }
    });

    // Convert to DTO format
    const deviceDtos: DeviceDto[] = devices.map(device => ({
      id: device.id,
      name: device.name,
      code: device.code,
      status: device.status as any,
      phone_number: device.phone_number,
      created_at: device.created_at,
      updated_at: device.updated_at,
      deleted_at: device.deleted_at,
    }));

    // Return paginated response using helper
    return PaginatedResponseHelper.create(deviceDtos, page, limit, total);
  }

  /**
   * Get device by ID
   */
  async getDeviceById(id: number): Promise<DeviceDto | null> {
    const device = await this.prisma.device.findUnique({
      where: {
        id: id,
        deleted_at: null,
      }
    });

    if (!device) {
      throw new NotFoundError('Device tidak ditemukan');
    }

    return {
      id: device.id,
      name: device.name,
      code: device.code,
      status: device.status as any,
      phone_number: device.phone_number,
      created_at: device.created_at,
      updated_at: device.updated_at,
      deleted_at: device.deleted_at,
    };
  }

  /**
   * Get device by code
   */
  async getDeviceByCode(code: string): Promise<DeviceDto | null> {
    // TODO: Implement get device by code
    // - Find device by unique code
    // - Return device or null if not found
    throw new Error('Method not implemented');
  }

  /**
   * Update device by ID
   */
  async updateDevice(id: number, data: UpdateDeviceRequest): Promise<DeviceDto> {
    const device = await this.prisma.device.findUnique({
      where: {
        id: id,
        deleted_at: null,
      }
    });

    if (!device) {
      throw new NotFoundError('Device tidak ditemukan');
    }

    const updatedDevice = await this.prisma.device.update({
      where: {
        id
      },
      data: {
        name: data.name,
        updated_at: new Date(),
      }
    });

    return {
      id: updatedDevice.id,
      name: updatedDevice.name,
      code: updatedDevice.code,
      status: updatedDevice.status as any,
      phone_number: updatedDevice.phone_number,
      created_at: updatedDevice.created_at,
      updated_at: updatedDevice.updated_at,
      deleted_at: updatedDevice.deleted_at,
    };
  }

  /**
   * Delete device by ID (soft delete)
   */
  async deleteDevice(id: number): Promise<void> {
    const device = await this.prisma.device.findUnique({
      where: {
        id: id,
        deleted_at: null,
      }
    });

    if (!device) {
      throw new NotFoundError('Device tidak ditemukan');
    }

    await this.prisma.device.update({
      where: {
        id
      },
      data: {
        deleted_at: new Date(),
      }
    });
  }

  /**
   * Permanently delete device by ID
   */
  async permanentlyDeleteDevice(id: number): Promise<boolean> {
    // TODO: Implement permanent device deletion
    // - Check if device exists
    // - Permanently remove from database
    // - Return success status
    throw new Error('Method not implemented');
  }

  /**
   * Restore soft deleted device
   */
  async restoreDevice(id: number): Promise<DeviceDto> {
    // TODO: Implement device restoration
    // - Check if device exists and is soft deleted
    // - Set deleted_at to null
    // - Return restored device
    throw new Error('Method not implemented');
  }
}