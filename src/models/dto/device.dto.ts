/**
 * Device Data Transfer Object (DTO)
 * 
 * This file defines the Device DTO which represents the device entity structure
 * for data transfer between application layers.
 * 
 * @author Sahabat Ibu Hamil Team
 * @version 1.0.0
 */

import type { devices_status } from "@/generated/prisma";

export enum DeviceStatus {
  Draft = 'draft',
  PendingConnect = 'pending_connect',
  Connected = 'connected',
  Disconnected = 'disconnected',
  Reconnecting = 'reconnecting',
  FailedConnect = 'failed_connect',
}

/**
 * Device DTO - represents the device entity structure
 */
export interface DeviceDto {
  id: number;
  name: string;
  code: string;
  status: devices_status;
  phone_number: string | null;
  device_id: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}
