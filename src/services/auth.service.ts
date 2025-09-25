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
      throw new Error('Email atau password salah!');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Email atau password salah!');
    }

    // Generate remember token
    const rememberToken = crypto.randomBytes(32).toString('hex');

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
  async me(token: string): Promise<Omit<User, 'password' | 'remember_token'>> {
    try {
      // Verify and decode token
      const payload: JwtPayload = verifyToken(token);

      // Find user by ID from token
      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId }
      });

      if (!user) {
        throw new Error('Pengguna tidak ditemukan');
      }

      // Verify remember token matches
      if (!user.remember_token || user.remember_token !== payload.rememberToken) {
        throw new Error('Token tidak valid atau sudah kedaluwarsa');
      }

      // Return user without password and remember_token
      const { password: _password, remember_token: _rememberToken, ...userWithoutSensitiveData } = user;
      
      return userWithoutSensitiveData;
    } catch {
      throw new Error('Token tidak valid atau sudah kedaluwarsa');
    }
  }

  /**
   * Logout user (nullify remember_token to invalidate all tokens)
   */
  async logout(token: string): Promise<{ message: string }> {
    try {
      // Verify token is valid
      const payload: JwtPayload = verifyToken(token);
      
      // Find user by ID from token
      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId }
      });

      if (!user) {
        throw new Error('Token tidak valid');
      }

      // Verify remember token matches
      if (!user.remember_token || user.remember_token !== payload.rememberToken) {
        throw new Error('Token tidak valid');
      }

      // Nullify remember token to invalidate all tokens
      await this.prisma.user.update({
        where: { id: user.id },
        data: { remember_token: null }
      });
      
      return {
        message: 'Berhasil logout'
      };
    } catch {
      throw new Error('Token tidak valid');
    }
  }

  /**
   * Verify if token is valid and return user info
   */
  async verifyTokenAndGetUser(token: string): Promise<Omit<User, 'password' | 'remember_token'> | null> {
    try {
      const payload: JwtPayload = verifyToken(token);
      
      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId }
      });

      if (!user) {
        return null;
      }

      // Verify remember token matches
      if (!user.remember_token || user.remember_token !== payload.rememberToken) {
        return null;
      }

      const { password: _password, remember_token: _rememberToken, ...userWithoutSensitiveData } = user;
      return userWithoutSensitiveData;
    } catch {
      return null;
    }
  }
}