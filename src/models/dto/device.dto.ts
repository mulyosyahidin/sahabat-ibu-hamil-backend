/**
 * Device Data Transfer Object (DTO)
 * 
 * This file defines the Device DTO which represents the device entity structure
 * for data transfer between application layers.
 * 
 * @author Sahabat Ibu Hamil Team
 * @version 1.0.0
 */

export enum DeviceStatus {
  Draft = 'draft',
  PendingConnect = 'pending_connect',
  Connected = 'connected',
  Disconnected = 'disconnected',
}

/**
 * Device DTO - represents the device entity structure
 */
export interface DeviceDto {
  id: number;
  name: string;
  code: string;
  status: DeviceStatus;
  phone_number: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}
