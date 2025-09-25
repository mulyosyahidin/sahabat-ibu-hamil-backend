import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import createApp from '../../src/app';
import bcrypt from 'bcrypt';
import { PrismaClient } from '../../src/generated/prisma';

describe('POST /api/auth/logout', () => {
  let appInstance: ReturnType<typeof createApp>;
  let prisma: PrismaClient;
  let testUserId: number;
  let validToken: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    appInstance = createApp(3001);
    
    // Create a test user
    const hashedPassword = await bcrypt.hash('password123', 10);
    const testUser = await prisma.user.create({
      data: {
        name: 'Test User',
        email: 'test@example.com',
        password: hashedPassword,
        remember_token: null
      }
    });
    testUserId = testUser.id;

    // Login to get a valid token
    const loginResponse = await request(appInstance.getApp())
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });
    
    validToken = loginResponse.body.data.token;
  });

  afterEach(async () => {
    // Clean up test user
    if (testUserId) {
      await prisma.user.delete({
        where: { id: testUserId }
      });
    }
  });

  describe('Positive Scenarios', () => {
    it('should logout successfully with valid token', async () => {
      const response = await request(appInstance.getApp())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Berhasil logout'
      });
    });

    it('should nullify remember_token in database after successful logout', async () => {
      // Verify remember_token exists before logout
      const userBefore = await prisma.user.findUnique({
        where: { id: testUserId }
      });
      expect(userBefore?.remember_token).toBeTruthy();

      // Logout
      await request(appInstance.getApp())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      // Verify remember_token is nullified after logout
      const userAfter = await prisma.user.findUnique({
        where: { id: testUserId }
      });
      expect(userAfter?.remember_token).toBeNull();
    });

    it('should invalidate token after logout', async () => {
      // First logout
      await request(appInstance.getApp())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      // Try to use the same token again - should fail
      const response = await request(appInstance.getApp())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        message: 'Token tidak valid'
      });
    });

    it('should invalidate token for /me endpoint after logout', async () => {
      // Logout
      await request(appInstance.getApp())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      // Try to access /me endpoint with the same token - should fail
      const response = await request(appInstance.getApp())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        message: 'Token tidak valid atau sudah kedaluwarsa'
      });
    });
  });

  describe('Negative Scenarios - Missing Authorization', () => {
    it('should return 401 when Authorization header is missing', async () => {
      const response = await request(appInstance.getApp())
        .post('/api/auth/logout')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        message: 'Token otorisasi diperlukan'
      });
    });

    it('should return 401 when Authorization header is empty', async () => {
      const response = await request(appInstance.getApp())
        .post('/api/auth/logout')
        .set('Authorization', '')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        message: 'Token otorisasi diperlukan'
      });
    });

    it('should return 401 when Authorization header does not start with Bearer', async () => {
      const response = await request(appInstance.getApp())
        .post('/api/auth/logout')
        .set('Authorization', `Basic ${validToken}`)
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        message: 'Token otorisasi diperlukan'
      });
    });

    it('should return 401 when Authorization header has Bearer but no token', async () => {
      const response = await request(appInstance.getApp())
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer ')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        message: 'Token otorisasi diperlukan'
      });
    });

    it('should return 401 when Authorization header has Bearer but token is just spaces', async () => {
      const response = await request(appInstance.getApp())
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer    ')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        message: 'Token otorisasi diperlukan'
      });
    });
  });

  describe('Negative Scenarios - Invalid Tokens', () => {
    it('should return 401 when token is malformed', async () => {
      const response = await request(appInstance.getApp())
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        message: 'Token tidak valid'
      });
    });

    it('should return 401 when token has invalid signature', async () => {
      const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJlbWVtYmVyVG9rZW4iOiJ0ZXN0IiwiaWF0IjoxNjAwMDAwMDAwfQ.invalid_signature';
      
      const response = await request(appInstance.getApp())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        message: 'Token tidak valid'
      });
    });

    it('should return 401 when token is expired', async () => {
      // Create an expired token (this would need to be a token with past exp claim)
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJlbWVtYmVyVG9rZW4iOiJ0ZXN0IiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE2MDAwMDAwMDF9.test';
      
      const response = await request(appInstance.getApp())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/Token tidak valid/);
    });

    it('should return 401 when user does not exist', async () => {
      // Delete the user but keep the token
      await prisma.user.delete({
        where: { id: testUserId }
      });
      testUserId = 0; // Prevent cleanup from failing

      const response = await request(appInstance.getApp())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        message: 'Token tidak valid'
      });
    });

    it('should return 401 when remember_token does not match', async () => {
      // Manually change the remember_token in database
      await prisma.user.update({
        where: { id: testUserId },
        data: { remember_token: 'different_token' }
      });

      const response = await request(appInstance.getApp())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        message: 'Token tidak valid'
      });
    });

    it('should return 401 when remember_token is already null', async () => {
      // Manually set remember_token to null
      await prisma.user.update({
        where: { id: testUserId },
        data: { remember_token: null }
      });

      const response = await request(appInstance.getApp())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        message: 'Token tidak valid'
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple logout attempts gracefully', async () => {
      // First logout - should succeed
      const firstResponse = await request(appInstance.getApp())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(firstResponse.body.success).toBe(true);

      // Second logout with same token - should fail
      const secondResponse = await request(appInstance.getApp())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(401);

      expect(secondResponse.body.success).toBe(false);
    });

    it('should handle logout after new login invalidates previous token', async () => {
      // Login again to get a new token (this should invalidate the previous one)
      const newLoginResponse = await request(appInstance.getApp())
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      const newToken = newLoginResponse.body.data.token;

      // Try to logout with the old token - should fail
      const oldTokenResponse = await request(appInstance.getApp())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(401);

      expect(oldTokenResponse.body.success).toBe(false);

      // Logout with the new token - should succeed
      const newTokenResponse = await request(appInstance.getApp())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${newToken}`)
        .expect(200);

      expect(newTokenResponse.body.success).toBe(true);
    });

    it('should handle case-sensitive Bearer keyword', async () => {
      const response = await request(appInstance.getApp())
        .post('/api/auth/logout')
        .set('Authorization', `bearer ${validToken}`)
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        message: 'Token otorisasi diperlukan'
      });
    });

    it('should handle extra spaces in Authorization header', async () => {
      const response = await request(appInstance.getApp())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer  ${validToken}  `)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});