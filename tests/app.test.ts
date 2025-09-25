import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import createApp from '../src/app';

describe('App', () => {
  let appInstance: ReturnType<typeof createApp>;
  let server: any;

  beforeEach(() => {
    appInstance = createApp(3001);
  });

  afterEach(() => {
    if (server) {
      server.close();
    }
  });

  describe('createApp function', () => {
    it('should create an app instance with default port 3000', () => {
      const defaultApp = createApp();
      expect(defaultApp.getPort()).toBe(3000);
    });

    it('should create an app instance with custom port', () => {
      expect(appInstance.getPort()).toBe(3001);
    });

    it('should return Express application instance', () => {
      const expressApp = appInstance.getApp();
      expect(expressApp).toBeDefined();
      expect(typeof expressApp).toBe('function');
    });
  });

  describe('Routes', () => {
    it('should respond with Hello World message on GET /api/', async () => {
      const response = await request(appInstance.getApp())
        .get('/api/')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Selamat datang di API Sahabat Ibu Hamil',
        data: {
          version: '1.0.0',
          environment: expect.any(String)
        }
      });
    });

    it('should respond with health status on GET /api/health', async () => {
      const response = await request(appInstance.getApp())
        .get('/api/health')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Server dalam kondisi sehat',
        data: expect.objectContaining({
          status: 'OK',
          timestamp: expect.any(String),
          uptime: expect.any(Number),
          memory: expect.any(Object),
          version: expect.any(String)
        })
      });
    });

    it('should return 404 for unknown routes', async () => {
      await request(appInstance.getApp())
        .get('/unknown-route')
        .expect(404);
    });
  });

  describe('Middleware', () => {
    it('should parse JSON requests', async () => {
      const response = await request(appInstance.getApp())
        .get('/api/')
        .set('Content-Type', 'application/json')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Selamat datang di API Sahabat Ibu Hamil');
    });
  });
});