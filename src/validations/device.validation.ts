/**
 * Device Validation Schemas
 * 
 * This file defines Zod validation schemas for device endpoints.
 * These schemas ensure data integrity and provide type-safe validation
 * for incoming requests.
 * 
 * @author Sahabat Ibu Hamil Team
 * @version 1.0.0
 */

import { z } from 'zod';

/**
 * Create Device Request Validation Schema
 * Validates required fields for device creation
 */
export const createDeviceValidationSchema = z.object({
  name: z
    .string({ message: "Nama device tidak boleh kosong" })
    .trim()
    .min(1, { message: "Nama device tidak boleh kosong" })
    .min(3, { message: "Nama device minimal 3 karakter" })
    .max(100, { message: "Nama device maksimal 100 karakter" })

});

/**
 * Update Device Request Validation Schema
 * Validates fields for device updates (all fields optional except those being updated)
 */
export const updateDeviceValidationSchema = z.object({
  name: z
    .string({ message: "Nama device tidak boleh kosong" })
    .trim()
    .min(1, { message: "Nama device tidak boleh kosong" })
    .min(3, { message: "Nama device minimal 3 karakter" })
    .max(100, { message: "Nama device maksimal 100 karakter" })

}).refine(
  (data) => Object.keys(data).length > 0,
  { message: "Minimal satu field harus diisi untuk update" }
);

/**
 * Type inference from the validation schemas
 */
export type CreateDeviceValidationInput = z.infer<typeof createDeviceValidationSchema>;
export type UpdateDeviceValidationInput = z.infer<typeof updateDeviceValidationSchema>;