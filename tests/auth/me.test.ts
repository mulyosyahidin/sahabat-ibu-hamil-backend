/**
 * Me Endpoint Tests
 * 
 * Comprehensive test suite for the /auth/me endpoint covering both positive
 * and negative scenarios including authentication, authorization, and error handling.
 * 
 * @author Sahabat Ibu Hamil Team
 * @version 1.0.0
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '../../src/generated/prisma';
import createApp from '../../src/app';
import * as bcrypt from 'bcrypt';
import { generateToken } from '../../src/utils/jwt.util';

describe('GET /api/auth/me', () => {
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
    appInstance = createApp(3003);

    // Setup test user data
    testUserEmail = 'test.me@example.com';
    testUserPassword = 'testpassword123';
    testUserName = 'Test Me User';
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

  describe('Positive Flow - Successful Profile Retrieval', () => {
    it('should return user profile with valid token', async () => {
      const response = await request(appInstance.getApp())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      // Verify response structure
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Data user berhasil diambil');
      expect(response.body).toHaveProperty('data');

      // Verify user data
      const user = response.body.data;
      expect(user).toHaveProperty('id', testUserId);
      expect(user).toHaveProperty('name', testUserName);
      expect(user).toHaveProperty('email', testUserEmail);
      expect(user).toHaveProperty('created_at');
      expect(user).toHaveProperty('updated_at');

      // Verify sensitive data is not included
      expect(user).not.toHaveProperty('password');
      expect(user).not.toHaveProperty('remember_token');
    });

    it('should handle token with different case in Authorization header', async () => {
      const response = await request(appInstance.getApp())
        .get('/api/auth/me')
        .set('authorization', `bearer ${validToken}`) // lowercase
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Token otorisasi diperlukan');
    });

    it('should return consistent user data on multiple requests', async () => {
      const response1 = await request(appInstance.getApp())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      const response2 = await request(appInstance.getApp())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response1.body.data).toEqual(response2.body.data);
    });
  });

  describe('Negative Flow - Authentication Errors', () => {
    it('should reject request without Authorization header', async () => {
      const response = await request(appInstance.getApp())
        .get('/api/auth/me')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Token otorisasi diperlukan');
      expect(response.body).not.toHaveProperty('data');
    });

    it('should reject request with empty Authorization header', async () => {
      const response = await request(appInstance.getApp())
        .get('/api/auth/me')
        .set('Authorization', '')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Token otorisasi diperlukan');
    });

    it('should reject request with malformed Authorization header', async () => {
      const response = await request(appInstance.getApp())
        .get('/api/auth/me')
        .set('Authorization', 'InvalidFormat')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Token otorisasi diperlukan');
    });

    it('should reject request with Bearer but no token', async () => {
      const response = await request(appInstance.getApp())
        .get('/api/auth/me')
        .set('Authorization', 'Bearer ')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Token otorisasi diperlukan');
    });

    it('should reject request with invalid JWT token', async () => {
      const response = await request(appInstance.getApp())
        .get('/api/auth/me')
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
        .get('/api/auth/me')
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
        .get('/api/auth/me')
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
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tokenWithNonExistentUser}`)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Token tidak valid atau sudah kedaluwarsa');
    });
  });

  describe('Negative Flow - Authorization Errors', () => {
    it('should reject request when user remember_token is null', async () => {
      // Update user to have null remember_token (simulating logout)
      await prisma.user.update({
        where: { id: testUserId },
        data: { remember_token: null }
      });

      const response = await request(appInstance.getApp())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Token tidak valid atau sudah kedaluwarsa');

      // Restore remember_token for other tests
      await prisma.user.update({
        where: { id: testUserId },
        data: { remember_token: validRememberToken }
      });
    });

    it('should reject request when remember_token is changed', async () => {
      // Change remember_token (simulating login from another device)
      const newRememberToken = require('crypto').randomBytes(32).toString('hex');
      await prisma.user.update({
        where: { id: testUserId },
        data: { remember_token: newRememberToken }
      });

      const response = await request(appInstance.getApp())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Token tidak valid atau sudah kedaluwarsa');

      // Restore original remember_token for other tests
      await prisma.user.update({
        where: { id: testUserId },
        data: { remember_token: validRememberToken }
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent requests with same token', async () => {
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
        expect(response.body.data.id).toBe(testUserId);
      });

      // All should return the same user data
      const userData = responses[0].body.data;
      responses.forEach(response => {
        expect(response.body.data).toEqual(userData);
      });
    });

    it('should handle request with extra whitespace in Authorization header', async () => {
      const response = await request(appInstance.getApp())
        .get('/api/auth/me')
        .set('Authorization', `  Bearer   ${validToken}  `)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testUserId);
    });

    it('should handle case-insensitive Bearer keyword', async () => {
      const response = await request(appInstance.getApp())
        .get('/api/auth/me')
        .set('Authorization', `BEARER ${validToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Token otorisasi diperlukan');
    });

    it('should return proper timestamp formats', async () => {
      const response = await request(appInstance.getApp())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      const user = response.body.data;
      
      // Verify timestamp formats (ISO 8601)
      expect(user.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(user.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      
      // Verify timestamps are valid dates
      expect(new Date(user.created_at)).toBeInstanceOf(Date);
      expect(new Date(user.updated_at)).toBeInstanceOf(Date);
    });

    it('should handle request after user data is updated', async () => {
      // Update user name
      const newName = 'Updated Test User';
      await prisma.user.update({
        where: { id: testUserId },
        data: { name: newName }
      });

      const response = await request(appInstance.getApp())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(newName);

      // Restore original name
      await prisma.user.update({
        where: { id: testUserId },
        data: { name: testUserName }
      });
    });
  });

  describe('HTTP Method Validation', () => {
    it('should reject POST request to /me endpoint', async () => {
      const response = await request(appInstance.getApp())
        .post('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(404);

      // Express returns 404 for unsupported methods on existing routes
    });

    it('should reject PUT request to /me endpoint', async () => {
      const response = await request(appInstance.getApp())
        .put('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(404);
    });

    it('should reject DELETE request to /me endpoint', async () => {
      const response = await request(appInstance.getApp())
        .delete('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(404);
    });
  });

  describe('Response Format Validation', () => {
    it('should return response in correct JSON format', async () => {
      const response = await request(appInstance.getApp())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200)
        .expect('Content-Type', /json/);

      // Verify response can be parsed as JSON
      expect(typeof response.body).toBe('object');
      expect(response.body).not.toBeNull();
    });

    it('should include proper HTTP headers', async () => {
      const response = await request(appInstance.getApp())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });
});