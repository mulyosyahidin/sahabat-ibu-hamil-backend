/**
 * User Data Transfer Object (DTO)
 * 
 * This file defines the User DTO which represents the user entity structure
 * for data transfer between application layers.
 * 
 * @author Sahabat Ibu Hamil Team
 * @version 1.0.0
 */

/**
 * User DTO - represents the user entity structure
 */
export interface UserDto {
  id: number;
  name: string;
  email: string;
  email_verified_at: Date | null;
  remember_token: string | null;
  created_at: Date;
  updated_at: Date;
}