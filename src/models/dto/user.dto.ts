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