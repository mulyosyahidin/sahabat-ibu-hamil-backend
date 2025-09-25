import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import createApp from '../../src/app';
import bcrypt from 'bcrypt';
import { PrismaClient } from '../../src/generated/prisma';

describe('GET /api/auth/me', () => {
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
    it('should return user profile with valid token', async () => {
      const response = await request(appInstance.getApp())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Profil pengguna berhasil diambil',
        data: {
          user: {
            id: testUserId,
            name: 'Test User',
            email: 'test@example.com',
            email_verified_at: null,
            created_at: expect.any(String),
            updated_at: expect.any(String)
          }
        }
      });
    });

    it('should return updated user profile after user data changes', async () => {
      // Update user data
      await prisma.user.update({
        where: { id: testUserId },
        data: { name: 'Updated Test User' }
      });

      const response = await request(appInstance.getApp())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.data.user.name).toBe('Updated Test User');
      expect(response.body.data.user.email).toBe('test@example.com');
    });

    it('should work with freshly generated token', async () => {
      // Login again to get a fresh token
      const newLoginResponse = await request(appInstance.getApp())
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      const newToken = newLoginResponse.body.data.token;

      const response = await request(appInstance.getApp())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${newToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('test@example.com');
    });
  });

  describe('Negative Scenarios - Missing Authorization', () => {
    it('should return 401 when Authorization header is missing', async () => {
      const response = await request(appInstance.getApp())
        .get('/api/auth/me')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        message: 'Token otorisasi diperlukan'
      });
    });

    it('should return 401 when Authorization header is empty', async () => {
      const response = await request(appInstance.getApp())
        .get('/api/auth/me')
        .set('Authorization', '')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        message: 'Token otorisasi diperlukan'
      });
    });

    it('should return 401 when Authorization header does not start with Bearer', async () => {
      const response = await request(appInstance.getApp())
        .get('/api/auth/me')
        .set('Authorization', `Basic ${validToken}`)
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        message: 'Token otorisasi diperlukan'
      });
    });

    it('should return 401 when Authorization header has Bearer but no token', async () => {
      const response = await request(appInstance.getApp())
        .get('/api/auth/me')
        .set('Authorization', 'Bearer ')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        message: 'Token otorisasi diperlukan'
      });
    });

    it('should return 401 when Authorization header has Bearer but token is just spaces', async () => {
      const response = await request(appInstance.getApp())
        .get('/api/auth/me')
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
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        message: 'Token tidak valid atau sudah kedaluwarsa'
      });
    });

    it('should return 401 when token has invalid signature', async () => {
      const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJlbWVtYmVyVG9rZW4iOiJ0ZXN0IiwiaWF0IjoxNjAwMDAwMDAwfQ.invalid_signature';
      
      const response = await request(appInstance.getApp())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        message: 'Token tidak valid atau sudah kedaluwarsa'
      });
    });

    it('should return 401 when token is expired', async () => {
      // Create an expired token (this would need to be a token with past exp claim)
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJlbWVtYmVyVG9rZW4iOiJ0ZXN0IiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE2MDAwMDAwMDF9.test';
      
      const response = await request(appInstance.getApp())
        .get('/api/auth/me')
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
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        message: 'Token tidak valid atau sudah kedaluwarsa'
      });
    });

    it('should return 401 when remember_token does not match', async () => {
      // Manually change the remember_token in database
      await prisma.user.update({
        where: { id: testUserId },
        data: { remember_token: 'different_token' }
      });

      const response = await request(appInstance.getApp())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        message: 'Token tidak valid atau sudah kedaluwarsa'
      });
    });

    it('should return 401 when remember_token is null', async () => {
      // Manually set remember_token to null
      await prisma.user.update({
        where: { id: testUserId },
        data: { remember_token: null }
      });

      const response = await request(appInstance.getApp())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        message: 'Token tidak valid atau sudah kedaluwarsa'
      });
    });

    it('should return 401 after user logs out', async () => {
      // Logout first
      await request(appInstance.getApp())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      // Try to access /me endpoint - should fail
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

  describe('Edge Cases', () => {
    it('should handle token invalidation after new login', async () => {
      // Login again to get a new token (this should invalidate the previous one)
      const newLoginResponse = await request(appInstance.getApp())
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      const newToken = newLoginResponse.body.data.token;

      // Try to access /me with the old token - should fail
      const oldTokenResponse = await request(appInstance.getApp())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(401);

      expect(oldTokenResponse.body.success).toBe(false);

      // Access /me with the new token - should succeed
      const newTokenResponse = await request(appInstance.getApp())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${newToken}`)
        .expect(200);

      expect(newTokenResponse.body.success).toBe(true);
    });

    it('should handle case-sensitive Bearer keyword', async () => {
      const response = await request(appInstance.getApp())
        .get('/api/auth/me')
        .set('Authorization', `bearer ${validToken}`)
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        message: 'Token otorisasi diperlukan'
      });
    });

    it('should handle extra spaces in Authorization header', async () => {
      const response = await request(appInstance.getApp())
        .get('/api/auth/me')
        .set('Authorization', `Bearer  ${validToken}  `)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return consistent user data structure', async () => {
      const response = await request(appInstance.getApp())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      const user = response.body.data.user;
      
      // Verify all expected fields are present
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('name');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('created_at');
      expect(user).toHaveProperty('updated_at');
      
      // Verify sensitive fields are not exposed
      expect(user).not.toHaveProperty('password');
      expect(user).not.toHaveProperty('remember_token');
      
      // Verify data types
      expect(typeof user.id).toBe('number');
      expect(typeof user.name).toBe('string');
      expect(typeof user.email).toBe('string');
      expect(typeof user.created_at).toBe('string');
      expect(typeof user.updated_at).toBe('string');
    });

    it('should handle multiple concurrent requests with same token', async () => {
      // Make multiple concurrent requests
      const promises = Array(5).fill(null).map(() =>
        request(appInstance.getApp())
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${validToken}`)
      );

      const responses = await Promise.all(promises);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.user.email).toBe('test@example.com');
      });
    });

    it('should handle user with special characters in name', async () => {
      // Update user with special characters
      await prisma.user.update({
        where: { id: testUserId },
        data: { name: 'Test User with Special Chars: àáâãäåæçèéêë' }
      });

      const response = await request(appInstance.getApp())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.data.user.name).toBe('Test User with Special Chars: àáâãäåæçèéêë');
    });
  });
});