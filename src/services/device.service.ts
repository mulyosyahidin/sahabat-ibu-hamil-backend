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

    // Check if session exists for this device
    let updatedStatus = device.status;
    if (device.status === 'connected') {
      const whatsappService = appInstanceManager.getWhatsAppService();
      if (whatsappService) {
        const session = whatsappService.getSession(device.code);
        
        // If session doesn't exist but device status is connected, update to disconnected
        if (!session) {
          console.log(`Session not found for device ${device.code}, updating status to disconnected`);
          
          await this.prisma.device.update({
            where: { id: device.id },
            data: { 
              status: 'disconnected',
              updated_at: new Date()
            }
          });
          
          updatedStatus = 'disconnected';
        }
      }
    }

    return {
      id: device.id,
      name: device.name,
      code: device.code,
      status: updatedStatus as any,
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

  /**
   * Request device connection via WhatsApp
   * @param deviceId - Device ID to request connection for
   */
  async requestDeviceConnection(deviceId: number): Promise<void> {
    // First, verify the device exists and belongs to the user
    const device = await this.getDeviceById(deviceId);
    if (!device) {
      throw new NotFoundError('Device tidak ditemukan');
    }

    // Get WhatsApp service instance
    const whatsappService = appInstanceManager.getWhatsAppService();
    
    // Request connection using device code as session ID instead of device ID
    await whatsappService.requestDeviceConnection(device.code);
  }

  /**
   * Update device when connection is established
   * @param deviceCode - Device code (session ID)
   * @param phoneNumber - Phone number from WhatsApp session
   */
  async updateDeviceOnConnection(deviceCode: string, phoneNumber: string | null): Promise<void> {
    try {
      const updateData: any = {
        status: 'connected',
        updated_at: new Date()
      };

      // Add phone number if available
      if (phoneNumber) {
        updateData.phone_number = phoneNumber;
      }

      await this.prisma.device.update({
        where: { code: deviceCode },
        data: updateData
      });

      console.log(`Device ${deviceCode} status updated to connected${phoneNumber ? ` with phone number: ${phoneNumber}` : ''}`);
    } catch (error) {
      console.error(`Failed to update device ${deviceCode} on connection:`, error);
      throw error;
    }
  }

  /**
   * Check if phone number is already registered by another device
   * @param phoneNumber - Phone number to check
   * @param excludeDeviceCode - Device code to exclude from check (current device)
   * @returns true if phone number is already registered, false otherwise
   */
  async isPhoneNumberAlreadyRegistered(phoneNumber: string, excludeDeviceCode?: string): Promise<boolean> {
    try {
      const whereCondition: any = {
        phone_number: phoneNumber,
        deleted_at: null, // Only check active devices
        status: {
          in: ['connected', 'disconnected'] // Exclude draft devices
        }
      };

      // Exclude current device from check
      if (excludeDeviceCode) {
        whereCondition.code = {
          not: excludeDeviceCode
        };
      }

      const existingDevice = await this.prisma.device.findFirst({
        where: whereCondition
      });

      return existingDevice !== null;
    } catch (error) {
      console.error(`Failed to check phone number registration for ${phoneNumber}:`, error);
      throw error;
    }
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

    // Check if session exists
    const session = whatsappService.getSession(device.code);
    if (!session) {
      throw new BadRequestError('Session tidak ditemukan untuk device ini');
    }

    try {
      // Import deleteSession from wa-multi-session
      const { deleteSession } = await import('wa-multi-session');
      
      // Delete the session
      await deleteSession(device.code);
      console.log(`Session ${device.code} successfully deleted`);

      // Update device status to disconnected
      await this.prisma.device.update({
        where: { id: deviceId },
        data: { 
          status: 'disconnected',
          updated_at: new Date()
        }
      });

      console.log(`Device ${device.code} status updated to disconnected`);
    } catch (error) {
      console.error(`Failed to disconnect device ${device.code}:`, error);
      throw new InternalServerError('Gagal melakukan disconnect device');
    }
  }
}