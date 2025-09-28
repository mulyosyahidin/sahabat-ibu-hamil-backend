/**
 * Auth Service
 * 
 * This service handles authentication-related business logic including
 * user login, token verification, and user profile retrieval.
 * 
 * @author Sahabat Ibu Hamil Team
 * @version 1.0.0
 */

import { PrismaClient } from '../generated/prisma';
import type { User } from '../generated/prisma';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { generateToken, verifyToken, type JwtPayload } from '../utils/jwt.util';
import { NotFoundError, UnauthorizedError } from '../utils/error.util';

export class AuthService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Login user with email and password
   */
  async login(email: string, password: string): Promise<{
    user: Omit<User, 'password' | 'remember_token'>;
    token: string;
  }> {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw new UnauthorizedError('Email atau password salah!');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Email atau password salah!');
    }

    // Generate remember token (16 characters with mixed case, numbers, and symbols)
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let rememberToken = '';
    for (let i = 0; i < 16; i++) {
      const randomIndex = crypto.randomInt(0, chars.length);
      rememberToken += chars[randomIndex];
    }

    // Update user with remember token
    await this.prisma.user.update({
      where: { id: user.id },
      data: { remember_token: rememberToken }
    });

    // Generate JWT token with remember token
    const token = generateToken({
      id: user.id,
      email: user.email
    }, rememberToken);

    // Return user without password and remember_token
    const { password: _password, remember_token: _rememberToken, ...userWithoutSensitiveData } = user;
    
    return {
      user: userWithoutSensitiveData,
      token
    };
  }

  /**
   * Get current user profile by token
   */
  async me(userId: number): Promise<Omit<User, 'password' | 'remember_token'>> {
    // Find user by ID from token
      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new NotFoundError('Pengguna tidak ditemukan');
      }

      // Return user without password and remember_token
      const { password: _password, remember_token: _rememberToken, ...userWithoutSensitiveData } = user;
      
      return userWithoutSensitiveData;
  }

  /**
   * Logout user (nullify remember_token to invalidate all tokens)
   */
  async logout(userId: number): Promise<{ message: string }> {
    try { 
      // Find user by ID
      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      });

      // Nullify remember token to invalidate all tokens
      await this.prisma.user.update({
        where: { id: userId },
        data: { remember_token: null }
      });
      
      return {
        message: 'Berhasil logout'
      };
    } catch {
      throw new Error('Token tidak valid');
    }
  }
}