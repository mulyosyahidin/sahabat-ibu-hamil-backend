import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import createApp from '../../src/app';
import bcrypt from 'bcrypt';
import { PrismaClient } from '../../src/generated/prisma';

describe('POST /api/auth/login', () => {
    let appInstance: ReturnType<typeof createApp>;
    let prisma: PrismaClient;
    let testUserId: number;
    let emailVerifiedAt: Date;
    let rememberToken: string;

    beforeAll(async () => {
        prisma = new PrismaClient();
        await prisma.$connect();
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    beforeEach(async () => {
        appInstance = createApp(3001);

        // Initialize test data
        emailVerifiedAt = new Date();
        rememberToken = 'test-remember-token-' + Date.now();

        // Create a test user
        const hashedPassword = await bcrypt.hash('password123', 10);
        const testUser = await prisma.user.create({
            data: {
                name: 'Test User',
                email: 'test@example.com',
                password: hashedPassword,
                remember_token: rememberToken,
                email_verified_at: emailVerifiedAt,
            }
        });
        testUserId = testUser.id;
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
        it('should login successfully with valid credentials', async () => {
            const response = await request(appInstance.getApp())
                .post('/api/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'password123'
                })
                .expect(200);

            expect(response.body).toEqual({
                success: true,
                message: 'Berhasil login',
                data: {
                    user: {
                        id: testUserId,
                        name: 'Test User',
                        email: 'test@example.com',
                        email_verified_at: emailVerifiedAt.toISOString(),
                        remember_token: rememberToken,
                        created_at: expect.any(String),
                        updated_at: expect.any(String)
                    },
                    token: expect.any(String)
                }
            });

            // Verify token is a valid JWT format
            expect(response.body.data.token).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
        });

        it('should generate and store remember_token in database on successful login', async () => {
            await request(appInstance.getApp())
                .post('/api/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'password123'
                })
                .expect(200);

            // Check that remember_token was generated and stored
            const user = await prisma.user.findUnique({
                where: { id: testUserId }
            });

            expect(user?.remember_token).toBeTruthy();
            expect(user?.remember_token).toHaveLength(64);
        });

        it('should update remember_token on subsequent logins', async () => {
            // First login
            await request(appInstance.getApp())
                .post('/api/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'password123'
                })
                .expect(200);

            const firstToken = await prisma.user.findUnique({
                where: { id: testUserId },
                select: { remember_token: true }
            });

            // Second login
            await request(appInstance.getApp())
                .post('/api/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'password123'
                })
                .expect(200);

            const secondToken = await prisma.user.findUnique({
                where: { id: testUserId },
                select: { remember_token: true }
            });

            // Remember tokens should be different
            expect(firstToken?.remember_token).not.toBe(secondToken?.remember_token);
        });
    });

    describe('Negative Scenarios - Validation Errors', () => {
        it('should return 422 when email is missing', async () => {
            const response = await request(appInstance.getApp())
                .post('/api/auth/login')
                .send({
                    password: 'password123'
                })
                .expect(422);

            expect(response.body).toEqual({
                success: false,
                message: 'Validasi gagal',
                errors: {
                    email: ['Email tidak boleh kosong']
                }
            });
        });

        it('should return 422 when password is missing', async () => {
            const response = await request(appInstance.getApp())
                .post('/api/auth/login')
                .send({
                    email: 'test@example.com'
                })
                .expect(422);

            expect(response.body).toEqual({
                success: false,
                message: 'Validasi gagal',
                errors: {
                    password: ['Password tidak boleh kosong']
                }
            });
        });

        it('should return 422 when both email and password are missing', async () => {
            const response = await request(appInstance.getApp())
                .post('/api/auth/login')
                .send({})
                .expect(422);

            expect(response.body).toEqual({
                success: false,
                message: 'Validasi gagal',
                errors: {
                    email: ['Email tidak boleh kosong'],
                    password: ['Password tidak boleh kosong']
                }
            });
        });

        it('should return 422 when email format is invalid', async () => {
            const response = await request(appInstance.getApp())
                .post('/api/auth/login')
                .send({
                    email: 'invalid-email',
                    password: 'password123'
                })
                .expect(422);

            expect(response.body).toEqual({
                success: false,
                message: 'Validasi gagal',
                errors: {
                    email: ['Email tidak valid']
                }
            });
        });

        it('should return 422 when email is too short', async () => {
            const response = await request(appInstance.getApp())
                .post('/api/auth/login')
                .send({
                    email: 'a@b.co',
                    password: 'password123'
                })
                .expect(422);

            expect(response.body).toEqual({
                success: false,
                message: 'Validasi gagal',
                errors: {
                    email: ['Email minimal 12 karakter']
                }
            });
        });

        it('should return 422 when password is too short', async () => {
            const response = await request(appInstance.getApp())
                .post('/api/auth/login')
                .send({
                    email: 'test@example.com',
                    password: '12345'
                })
                .expect(422);

            expect(response.body).toEqual({
                success: false,
                message: 'Validasi gagal',
                errors: {
                    password: ['Password minimal 6 karakter']
                }
            });
        });

        it('should return 422 when password is too long', async () => {
            const longPassword = 'a'.repeat(101);
            const response = await request(appInstance.getApp())
                .post('/api/auth/login')
                .send({
                    email: 'test@example.com',
                    password: longPassword
                })
                .expect(422);

            expect(response.body).toEqual({
                success: false,
                message: 'Validasi gagal',
                errors: {
                    password: ['Password maksimal 100 karakter']
                }
            });
        });
    });

    describe('Negative Scenarios - Authentication Errors', () => {
        it('should return 401 when user does not exist', async () => {
            const response = await request(appInstance.getApp())
                .post('/api/auth/login')
                .send({
                    email: 'nonexistent@example.com',
                    password: 'password123'
                })
                .expect(401);

            expect(response.body).toEqual({
                success: false,
                message: 'Email atau password salah!'
            });
        });

        it('should return 401 when password is incorrect', async () => {
            const response = await request(appInstance.getApp())
                .post('/api/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'wrongpassword'
                })
                .expect(401);

            expect(response.body).toEqual({
                success: false,
                message: 'Email atau password salah!'
            });
        });

        it('should return 401 when email exists but password is empty string', async () => {
            const response = await request(appInstance.getApp())
                .post('/api/auth/login')
                .send({
                    email: 'test@example.com',
                    password: ''
                })
                .expect(422);

            expect(response.body).toEqual({
                success: false,
                message: 'Validasi gagal',
                errors: {
                    password: ['Password minimal 6 karakter']
                }
            });
        });
    });

    describe('Edge Cases', () => {
        it('should handle email with extra whitespace', async () => {
            const response = await request(appInstance.getApp())
                .post('/api/auth/login')
                .send({
                    email: '  test@example.com  ',
                    password: 'password123'
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.user.email).toBe('test@example.com');
        });

        it('should be case sensitive for email', async () => {
            const response = await request(appInstance.getApp())
                .post('/api/auth/login')
                .send({
                    email: 'TEST@EXAMPLE.COM',
                    password: 'password123'
                })
                .expect(200);

            expect(response.body).toEqual({
                success: true,
                message: 'Berhasil login',
                data: expect.objectContaining({
                    user: expect.objectContaining({
                        email: 'test@example.com'
                    }),
                    token: expect.any(String)
                })
            });
        });

        it('should handle special characters in password', async () => {
            // Create user with special character password
            const specialPassword = 'p@ssw0rd!#$%';
            const hashedPassword = await bcrypt.hash(specialPassword, 10);

            await prisma.user.update({
                where: { id: testUserId },
                data: { password: hashedPassword }
            });

            const response = await request(appInstance.getApp())
                .post('/api/auth/login')
                .send({
                    email: 'test@example.com',
                    password: specialPassword
                })
                .expect(200);

            expect(response.body.success).toBe(true);
        });
    });
});