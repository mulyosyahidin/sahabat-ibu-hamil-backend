/**
 * Device Request Models
 * 
 * This file defines the request structures for device endpoints.
 * These interfaces ensure type safety for incoming request data.
 * 
 * @author Sahabat Ibu Hamil Team
 * @version 1.0.0
 */

/**
 * Create Device Request - represents the structure for creating a new device
 */
export interface CreateDeviceRequest {
  name: string;
}

/**
 * Update Device Request - represents the structure for updating an existing device
 */
export interface UpdateDeviceRequest {
  name: string;
}