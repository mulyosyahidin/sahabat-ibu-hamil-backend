/**
 * Device Response Models
 * 
 * This file defines the response structures for device endpoints.
 * These interfaces ensure consistent response formats for device-related operations.
 * 
 * @author Sahabat Ibu Hamil Team
 * @version 1.0.0
 */

import type { DeviceDto } from '../dto';
import type { BaseResponse } from './base.response';
import type { PaginatedResponse } from './paginated.response';

/**
 * Device data structure for API responses
 * Excludes sensitive or internal fields from the DTO
 */
export interface DeviceResponseData {
  id: number;
  name: string;
  code: string;
  status: string;
  phone_number: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Single Device Response - for create, update, and get by ID operations
 */
export interface DeviceResponse extends BaseResponse<DeviceResponseData> {
  success: true;
  message: string;
  data: DeviceResponseData;
}

/**
 * Paginated devices list data structure
 * Extends the generic PaginatedResponse for devices
 */
export interface DevicesListData extends PaginatedResponse<DeviceResponseData> {}

/**
 * Devices List Response - for get all devices operation
 */
export interface DevicesListResponse extends BaseResponse<DevicesListData> {
  success: true;
  message: string;
  data: DevicesListData;
}

/**
 * Device Delete Response - for delete operations
 */
export interface DeviceDeleteResponse extends BaseResponse {
  success: true;
  message: string;
}

/**
 * Utility function to convert DeviceDto to DeviceResponseData
 * Transforms internal DTO to public API response format
 */
export function toDeviceResponseData(device: DeviceDto): DeviceResponseData {
  return {
    id: device.id,
    name: device.name,
    code: device.code,
    status: device.status,
    phone_number: device.phone_number,
    created_at: device.created_at,
    updated_at: device.updated_at,
  };
}