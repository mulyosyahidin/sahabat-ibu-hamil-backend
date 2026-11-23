/**
 * Logout Endpoint Tests
 * 
 * Comprehensive test suite for the /auth/logout endpoint covering both positive
 * and negative scenarios including authentication, authorization, and error handling.
 * 
 * @author Sahabat Ibu Hamil Team
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '../../src/generated/prisma';
import createApp from '../../src/app';
import * as bcrypt from 'bcrypt';
import { generateToken } from '../../src/utils/jwt.util';

describe('DELETE /api/auth/logout', () => {
  let appInstance: ReturnType<typeof createApp>;
  let prisma: PrismaClient;
  let testUserId: number;
  let testUserEmail: string;
  let testUserPassword: string;
  let testUserName: string;
  let validToken: string;
  let validRememberToken: string;

  beforeAll(async () => {
    // Initialize Prisma client
    prisma = new PrismaClient();
    
    // Create app instance
    appInstance = createApp(3004);

    // Setup test user data
    testUserEmail = 'test.logout@example.com';
    testUserPassword = 'testpassword123';
    testUserName = 'Test Logout User';
    const hashedPassword = await bcrypt.hash(testUserPassword, 10);

    // Generate remember token
    validRememberToken = require('crypto').randomBytes(32).toString('hex');

    // Create test user
    const testUser = await prisma.user.create({
      data: {
        name: testUserName,
        email: testUserEmail,
        password: hashedPassword,
        remember_token: validRememberToken,
      }
    });
    testUserId = testUser.id;

    // Generate valid JWT token
    validToken = generateToken({
      id: testUserId,
      email: testUserEmail
    }, validRememberToken);
  });

  afterAll(async () => {
    // Clean up test user
    if (testUserId) {
      await prisma.user.delete({
        where: { id: testUserId }
      });
    }
    
    // Disconnect Prisma
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Reset remember token before each test
    await prisma.user.update({
      where: { id: testUserId },
      data: { remember_token: validRememberToken }
    });
  });

  describe('Positive Flow - Successful Logout', () => {
    it('should logout user successfully with valid token', async () => {
      const response = await request(appInstance.getApp())
        .delete('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      // Verify response structure
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Berhasil logout');

      // Verify remember_token is nullified in database
      const user = await prisma.user.findUnique({
        where: { id: testUserId }
      });
      expect(user?.remember_token).toBeNull();
    });

    it('should handle multiple logout requests gracefully', async () => {
      // First logout
      await request(appInstance.getApp())
        .delete('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      // Second logout should still work (idempotent)
      const response = await request(appInstance.getApp())
        .delete('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Token tidak valid atau sudah kedaluwarsa');
    });

    it('should handle logout with case-insensitive Authorization header', async () => {
      const response = await request(appInstance.getApp())
        .delete('/api/auth/logout')
        .set('authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Berhasil logout');
    });

    it('should handle logout with extra whitespace in Authorization header', async () => {
      const response = await request(appInstance.getApp())
        .delete('/api/auth/logout')
        .set('Authorization', `  Bearer   ${validToken}  `)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Berhasil logout');
    });
  });

  describe('Negative Flow - Authentication Errors', () => {
    it('should reject request without Authorization header', async () => {
      const response = await request(appInstance.getApp())
        .delete('/api/auth/logout')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Token otorisasi diperlukan');
    });

    it('should reject request with empty Authorization header', async () => {
      const response = await request(appInstance.getApp())
        .delete('/api/auth/logout')
        .set('Authorization', '')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Token otorisasi diperlukan');
    });

    it('should reject request with malformed Authorization header', async () => {
      const response = await request(appInstance.getApp())
        .delete('/api/auth/logout')
        .set('Authorization', 'InvalidFormat')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Token otorisasi diperlukan');
    });

    it('should reject request with Bearer but no token', async () => {
      const response = await request(appInstance.getApp())
        .delete('/api/auth/logout')
        .set('Authorization', 'Bearer ')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Token otorisasi diperlukan');
    });

    it('should reject request with invalid JWT token', async () => {
      const response = await request(appInstance.getApp())
        .delete('/api/auth/logout')
        .set('Authorization', 'Bearer invalid.jwt.token')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toMatch(/Token tidak valid|Invalid or expired token/);
    });

    it('should reject request with expired JWT token', async () => {
      // Generate expired token (expires in -1 hour)
      const jwt = require('jsonwebtoken');
      const secret = process.env.JWT_SECRET;
      const expiredToken = jwt.sign({
        userId: testUserId,
        email: testUserEmail,
        rememberToken: validRememberToken
      }, secret, { expiresIn: '-1h' });

      const response = await request(appInstance.getApp())
        .delete('/api/auth/logout')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toMatch(/Token tidak valid|Invalid or expired token/);
    });

    it('should reject request with valid JWT but invalid remember token', async () => {
      // Generate token with wrong remember token
      const tokenWithWrongRememberToken = generateToken({
        id: testUserId,
        email: testUserEmail
      }, 'wrong-remember-token');

      const response = await request(appInstance.getApp())
        .delete('/api/auth/logout')
        .set('Authorization', `Bearer ${tokenWithWrongRememberToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Token tidak valid atau sudah kedaluwarsa');
    });

    it('should reject request with valid JWT but non-existent user', async () => {
      // Generate token with non-existent user ID
      const tokenWithNonExistentUser = generateToken({
        id: 99999,
        email: 'nonexistent@example.com'
      }, validRememberToken);

      const response = await request(appInstance.getApp())
        .delete('/api/auth/logout')
        .set('Authorization', `Bearer ${tokenWithNonExistentUser}`)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Token tidak valid atau sudah kedaluwarsa');
    });

    it('should reject request with case-sensitive Bearer keyword', async () => {
      const response = await request(appInstance.getApp())
        .delete('/api/auth/logout')
        .set('Authorization', `BEARER ${validToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Token otorisasi diperlukan');
    });

    it('should reject request with lowercase bearer keyword', async () => {
      const response = await request(appInstance.getApp())
        .delete('/api/auth/logout')
        .set('Authorization', `bearer ${validToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Token otorisasi diperlukan');
    });
  });

  describe('Negative Flow - Authorization Errors', () => {
    it('should reject request when user remember_token is already null', async () => {
      // Nullify remember token first
      await prisma.user.update({
        where: { id: testUserId },
        data: { remember_token: null }
      });

      const response = await request(appInstance.getApp())
        .delete('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Token tidak valid atau sudah kedaluwarsa');
    });

    it('should reject request when remember_token has changed', async () => {
      // Change remember token to simulate login from another device
      const newRememberToken = require('crypto').randomBytes(32).toString('hex');
      await prisma.user.update({
        where: { id: testUserId },
        data: { remember_token: newRememberToken }
      });

      const response = await request(appInstance.getApp())
        .delete('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Token tidak valid atau sudah kedaluwarsa');
    });
  });

  describe('Edge Cases', () => {
    it('should handle logout after user data is updated', async () => {
      // Update user name
      const newName = 'Updated Logout User';
      await prisma.user.update({
        where: { id: testUserId },
        data: { name: newName }
      });

      const response = await request(appInstance.getApp())
        .delete('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Berhasil logout');

      // Verify user data is updated and remember_token is nullified
      const user = await prisma.user.findUnique({
        where: { id: testUserId }
      });
      expect(user?.name).toBe(newName);
      expect(user?.remember_token).toBeNull();
    });

    it('should invalidate token after logout', async () => {
      // First logout
      await request(appInstance.getApp())
        .delete('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      // Try to access protected endpoint with same token
      const response = await request(appInstance.getApp())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Token tidak valid atau sudah kedaluwarsa');
    });
  });

  describe('HTTP Method Validation', () => {
    it('should reject GET request to /logout endpoint', async () => {
      const response = await request(appInstance.getApp())
        .get('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(404);

      // Express returns 404 for unsupported methods on existing routes
      expect(response.status).toBe(404);
    });

    it('should reject POST request to /logout endpoint', async () => {
      const response = await request(appInstance.getApp())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(404);

      expect(response.status).toBe(404);
    });

    it('should reject PUT request to /logout endpoint', async () => {
      const response = await request(appInstance.getApp())
        .put('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(404);

      expect(response.status).toBe(404);
    });
  });

  describe('Response Format Validation', () => {
    it('should return response in correct JSON format', async () => {
      const response = await request(appInstance.getApp())
        .delete('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200)
        .expect('Content-Type', /json/);

      // Verify response can be parsed as JSON
      expect(typeof response.body).toBe('object');
      expect(response.body).not.toBeNull();
    });

    it('should include proper HTTP headers', async () => {
      const response = await request(appInstance.getApp())
        .delete('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should not include sensitive data in response', async () => {
      const response = await request(appInstance.getApp())
        .delete('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      // Verify no sensitive data is exposed
      expect(response.body).not.toHaveProperty('password');
      expect(response.body).not.toHaveProperty('remember_token');
      expect(response.body).not.toHaveProperty('userId');
      expect(response.body).not.toHaveProperty('token');
    });
  });

  describe('Database State Validation', () => {
    it('should verify remember_token is properly nullified', async () => {
      // Get initial state
      const userBefore = await prisma.user.findUnique({
        where: { id: testUserId }
      });
      expect(userBefore?.remember_token).toBe(validRememberToken);

      // Logout
      await request(appInstance.getApp())
        .delete('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      // Verify state after logout
      const userAfter = await prisma.user.findUnique({
        where: { id: testUserId }
      });
      expect(userAfter?.remember_token).toBeNull();
      expect(userAfter?.id).toBe(testUserId);
      expect(userAfter?.email).toBe(testUserEmail);
    });

    it('should not affect other user data during logout', async () => {
      // Get initial user data
      const userBefore = await prisma.user.findUnique({
        where: { id: testUserId }
      });

      // Logout
      await request(appInstance.getApp())
        .delete('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      // Verify other data remains unchanged
      const userAfter = await prisma.user.findUnique({
        where: { id: testUserId }
      });
      
      expect(userAfter?.id).toBe(userBefore?.id);
      expect(userAfter?.name).toBe(userBefore?.name);
      expect(userAfter?.email).toBe(userBefore?.email);
      expect(userAfter?.password).toBe(userBefore?.password);
      expect(userAfter?.created_at).toEqual(userBefore?.created_at);
      // Only remember_token should be different (null)
      expect(userAfter?.remember_token).toBeNull();
    });
  });
});