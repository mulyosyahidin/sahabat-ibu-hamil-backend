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
import { NotFoundError, BadRequestError, InternalServerError } from '../utils/error.util';
import { generateDeviceCode } from '../utils/code.util';
import { PaginatedResponseHelper, type PaginatedResponse } from '../models/responses/paginated.response';
import { appInstanceManager } from '../utils/app-instance.util';

export class DeviceService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Reconnect device using existing session files
   * @param deviceCode - Device code to reconnect
   */
  async reconnectDevice(deviceCode: string): Promise<void> {
    // Get WhatsApp service instance
    const whatsappService = appInstanceManager.getWhatsAppService();
    if (!whatsappService) {
      throw new InternalServerError('WhatsApp service tidak tersedia');
    }

    // Use WhatsApp service reconnect method
    await whatsappService.reconnectDevice(deviceCode);
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
      status: device.status,
      phone_number: device.phone_number,
      device_id: device.device_id,
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
      status: device.status,
      phone_number: device.phone_number,
      device_id: device.device_id,
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
      status: device.status,
      phone_number: device.phone_number,
      device_id: device.device_id,
      created_at: device.created_at,
      updated_at: device.updated_at,
      deleted_at: device.deleted_at,
    };
  }

  /**
   * Get device by code
   */
  async getDeviceByCode(code: string): Promise<DeviceDto | null> {
    const device = await this.prisma.device.findUnique({
      where: {
        code: code,
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
      status: device.status,
      phone_number: device.phone_number,
      device_id: device.device_id,
      created_at: device.created_at,
      updated_at: device.updated_at,
      deleted_at: device.deleted_at,
    };
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
      status: updatedDevice.status,
      phone_number: updatedDevice.phone_number,
      device_id: device.device_id,
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

    const whatsappService = appInstanceManager.getWhatsAppService();
    if (!whatsappService) {
      throw new InternalServerError('WhatsApp service tidak tersedia');
    }

    try {
      // Use WhatsApp service to disconnect the device
      if (device.status == 'connected') {
        await whatsappService.disconnectDevice(device.code);
      }
      console.log(`Device ${device.code} successfully disconnected via WhatsApp service`);
    } catch (error) {
      console.error(`Failed to disconnect device ${device.code}:`, error);
      throw new InternalServerError('Gagal melakukan disconnect device');
    }
  }

  /**
   * Request device connection via WhatsApp
   * @param deviceId - Device ID to request connection for
   */
  async requestDeviceConnection(deviceCode: string): Promise<void> {
    const device = await this.getDeviceByCode(deviceCode);
    if (!device) {
      throw new NotFoundError('Device tidak ditemukan');
    }

    const whatsappService = appInstanceManager.getWhatsAppService();
    await whatsappService.requestDeviceConnection(device.code);
  }

  /**
   * Disconnect device
   * Only allows disconnection if device status is 'connected' and session exists
   * @param deviceId - Device ID to disconnect
   */
  async disconnectDevice(deviceId: number): Promise<void> {
    // First, verify the device exists
    const device = await this.getDeviceById(deviceId);
    if (!device) {
      throw new NotFoundError('Device tidak ditemukan');
    }

    // Check if device status is connected
    if (device.status !== 'connected') {
      throw new BadRequestError('Device tidak dalam status connected');
    }

    // Get WhatsApp service instance
    const whatsappService = appInstanceManager.getWhatsAppService();
    if (!whatsappService) {
      throw new InternalServerError('WhatsApp service tidak tersedia');
    }

    try {
      // Use WhatsApp service to disconnect the device
      await whatsappService.disconnectDevice(device.code);
      console.log(`Device ${device.code} successfully disconnected via WhatsApp service`);
    } catch (error) {
      console.error(`Failed to disconnect device ${device.code}:`, error);
      throw new InternalServerError('Gagal melakukan disconnect device');
    }
  }
}