/**
 * Login Endpoint Tests
 * 
 * Comprehensive test suite for the login endpoint covering both positive
 * and negative scenarios including validation, authentication, and error handling.
 * 
 * @author Sahabat Ibu Hamil Team
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '../../src/generated/prisma';
import createApp from '../../src/app';
import * as bcrypt from 'bcrypt';

describe('POST /api/auth/login', () => {
  let appInstance: ReturnType<typeof createApp>;
  let prisma: PrismaClient;
  let testUserId: number;
  let testUserEmail: string;
  let testUserPassword: string;

  beforeAll(async () => {
    // Initialize Prisma client
    prisma = new PrismaClient();
    
    // Create app instance
    appInstance = createApp(3002);

    // Setup test user data
    testUserEmail = 'test.login@example.com';
    testUserPassword = 'testpassword123';
    const hashedPassword = await bcrypt.hash(testUserPassword, 10);

    // Create test user
    const testUser = await prisma.user.create({
      data: {
        name: 'Test Login User',
        email: testUserEmail,
        password: hashedPassword,
      }
    });
    testUserId = testUser.id;
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

  describe('Positive Flow - Successful Login', () => {
    it('should login successfully with valid credentials', async () => {
      const loginData = {
        email: testUserEmail,
        password: testUserPassword
      };

      const response = await request(appInstance.getApp())
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      // Verify response structure
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Berhasil login');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');

      // Verify user data
      const user = response.body.data.user;
      expect(user).toHaveProperty('id', testUserId);
      expect(user).toHaveProperty('name', 'Test Login User');
      expect(user).toHaveProperty('email', testUserEmail);
      expect(user).toHaveProperty('created_at');
      expect(user).toHaveProperty('updated_at');

      // Verify sensitive data is not included
      expect(user).not.toHaveProperty('password');
      expect(user).not.toHaveProperty('remember_token');

      // Verify token is a string
      expect(typeof response.body.data.token).toBe('string');
      expect(response.body.data.token.length).toBeGreaterThan(0);
    });

    it('should handle email case insensitivity', async () => {
      const loginData = {
        email: testUserEmail.toUpperCase(),
        password: testUserPassword
      };

      const response = await request(appInstance.getApp())
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(testUserEmail);
    });

    it('should update remember_token on successful login', async () => {
      const loginData = {
        email: testUserEmail,
        password: testUserPassword
      };

      // Login first time
      const response1 = await request(appInstance.getApp())
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      // Get user from database to check remember_token
      const userAfterFirstLogin = await prisma.user.findUnique({
        where: { id: testUserId }
      });

      expect(userAfterFirstLogin?.remember_token).not.toBeNull();
      const firstRememberToken = userAfterFirstLogin?.remember_token;

      // Login second time
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to ensure different token
      
      const response2 = await request(appInstance.getApp())
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      // Get user from database again
      const userAfterSecondLogin = await prisma.user.findUnique({
        where: { id: testUserId }
      });

      expect(userAfterSecondLogin?.remember_token).not.toBeNull();
      expect(userAfterSecondLogin?.remember_token).not.toBe(firstRememberToken);
    });
  });

  describe('Negative Flow - Authentication Errors', () => {
    it('should reject login with invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: testUserPassword
      };

      const response = await request(appInstance.getApp())
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Email atau password salah!');
      expect(response.body).not.toHaveProperty('data');
    });

    it('should reject login with invalid password', async () => {
      const loginData = {
        email: testUserEmail,
        password: 'wrongpassword'
      };

      const response = await request(appInstance.getApp())
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Email atau password salah!');
      expect(response.body).not.toHaveProperty('data');
    });

    it('should reject login with both invalid email and password', async () => {
      const loginData = {
        email: 'wrong@example.com',
        password: 'wrongpassword'
      };

      const response = await request(appInstance.getApp())
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Email atau password salah!');
    });
  });

  describe('Negative Flow - Validation Errors', () => {
    it('should reject login with missing email', async () => {
      const loginData = {
        password: testUserPassword
      };

      const response = await request(appInstance.getApp())
        .post('/api/auth/login')
        .send(loginData)
        .expect(422);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Validasi gagal');
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toHaveProperty('email');
    });

    it('should reject login with missing password', async () => {
      const loginData = {
        email: testUserEmail
      };

      const response = await request(appInstance.getApp())
        .post('/api/auth/login')
        .send(loginData)
        .expect(422);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Validasi gagal');
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toHaveProperty('password');
    });

    it('should reject login with empty email', async () => {
      const loginData = {
        email: '',
        password: testUserPassword
      };

      const response = await request(appInstance.getApp())
        .post('/api/auth/login')
        .send(loginData)
        .expect(422);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.errors).toHaveProperty('email');
    });

    it('should reject login with empty password', async () => {
      const loginData = {
        email: testUserEmail,
        password: ''
      };

      const response = await request(appInstance.getApp())
        .post('/api/auth/login')
        .send(loginData)
        .expect(422);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.errors).toHaveProperty('password');
    });

    it('should reject login with invalid email format', async () => {
      const loginData = {
        email: 'invalid-email',
        password: testUserPassword
      };

      const response = await request(appInstance.getApp())
        .post('/api/auth/login')
        .send(loginData)
        .expect(422);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.errors).toHaveProperty('email');
      expect(response.body.errors.email).toContain('Email tidak valid');
    });

    it('should reject login with email too short', async () => {
      const loginData = {
        email: 'a@b.co', // Less than 12 characters
        password: testUserPassword
      };

      const response = await request(appInstance.getApp())
        .post('/api/auth/login')
        .send(loginData)
        .expect(422);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.errors).toHaveProperty('email');
      expect(response.body.errors.email).toContain('Email minimal 12 karakter');
    });

    it('should reject login with password too short', async () => {
      const loginData = {
        email: testUserEmail,
        password: '12345' // Less than 6 characters
      };

      const response = await request(appInstance.getApp())
        .post('/api/auth/login')
        .send(loginData)
        .expect(422);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.errors).toHaveProperty('password');
      expect(response.body.errors.password).toContain('Password minimal 6 karakter');
    });

    it('should reject login with password too long', async () => {
      const loginData = {
        email: testUserEmail,
        password: 'a'.repeat(101) // More than 100 characters
      };

      const response = await request(appInstance.getApp())
        .post('/api/auth/login')
        .send(loginData)
        .expect(422);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.errors).toHaveProperty('password');
      expect(response.body.errors.password).toContain('Password maksimal 100 karakter');
    });

    it('should reject login with whitespace-only email', async () => {
      const loginData = {
        email: '   ',
        password: testUserPassword
      };

      const response = await request(appInstance.getApp())
        .post('/api/auth/login')
        .send(loginData)
        .expect(422);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.errors).toHaveProperty('email');
    });

    it('should handle multiple validation errors', async () => {
      const loginData = {
        email: 'invalid',
        password: '123'
      };

      const response = await request(appInstance.getApp())
        .post('/api/auth/login')
        .send(loginData)
        .expect(422);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toHaveProperty('email');
      expect(response.body.errors).toHaveProperty('password');
    });
  });

  describe('Negative Flow - Request Format Errors', () => {
    it('should reject login with invalid JSON', async () => {
      const response = await request(appInstance.getApp())
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      // Express default error handling for malformed JSON
      expect(response.body).toEqual({});
    });

    it('should reject login with non-object data', async () => {
      const response = await request(appInstance.getApp())
        .post('/api/auth/login')
        .send('string data')
        .expect(422);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should handle request with extra fields gracefully', async () => {
      const loginData = {
        email: testUserEmail,
        password: testUserPassword,
        extraField: 'should be ignored',
        anotherField: 123
      };

      const response = await request(appInstance.getApp())
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.user.email).toBe(testUserEmail);
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent login requests', async () => {
      const loginData = {
        email: testUserEmail,
        password: testUserPassword
      };

      // Make multiple concurrent requests
      const promises = Array(5).fill(null).map(() =>
        request(appInstance.getApp())
          .post('/api/auth/login')
          .send(loginData)
      );

      const responses = await Promise.all(promises);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.user.email).toBe(testUserEmail);
      });

      // Each should have a different token (due to different remember_tokens)
      const tokens = responses.map(r => r.body.data.token);
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(tokens.length);
    });

    it('should handle email with leading/trailing whitespace', async () => {
      const loginData = {
        email: `  ${testUserEmail}  `,
        password: testUserPassword
      };

      const response = await request(appInstance.getApp())
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(testUserEmail);
    });
  });
});