/**
 * Welcome Controller
 * 
 * Handles basic application endpoints including welcome message and health checks.
 * These endpoints provide essential information about the API status and basic functionality.
 */

import type { Request, Response } from 'express';
import { ApiResponse } from '@/models/responses';
import type { WelcomeData, HealthData } from '@/models/responses';
import { appInstanceManager } from '@/utils/app-instance.util';

/**
 * Controller class for welcome and health check endpoints
 */
export class WelcomeController {
  /**
   * Handle GET / route - returns welcome message with API information
   * 
   * Provides a friendly welcome message along with basic API metadata
   * including version and environment information.
   * 
   * @param req - Express request object
   * @param res - Express response object
   */
  static getWelcome(req: Request, res: Response): void {
    const welcomeData: WelcomeData = {
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };
    
    const response = ApiResponse.success('Selamat datang di API Sahabat Ibu Hamil', welcomeData);
    res.json(response);
  }

  /**
   * Handle GET /health route - returns server health status
   * 
   * Provides comprehensive health information including server status,
   * uptime, memory usage, Node.js version, and service connectivity status
   * for monitoring purposes.
   * 
   * @param req - Express request object
   * @param res - Express response object
   */
  static async getHealth(req: Request, res: Response): Promise<void> {
    try {
      // Get health check service from app instance manager
      const healthCheckService = appInstanceManager.getHealthCheckService();
      
      if (!healthCheckService) {
        // Fallback to basic health check if service not available
        const healthData: HealthData = {
          status: 'OK',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          version: process.version
        };
        
        const response = ApiResponse.success('Server dalam kondisi sehat (basic check)', healthData);
        res.json(response);
        return;
      }

      // Perform comprehensive health check
      const healthCheckResult = await healthCheckService.performHealthCheck();
      
      const healthData: HealthData = {
        status: healthCheckResult.status === 'healthy' ? 'OK' : 'DEGRADED',
        timestamp: healthCheckResult.timestamp,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version,
        services: healthCheckResult.services
      };
      
      const message = healthCheckResult.status === 'healthy' 
        ? 'Server dalam kondisi sehat' 
        : 'Server berjalan dengan beberapa masalah konektivitas';
      
      const response = ApiResponse.success(message, healthData);
      res.json(response);
    } catch (error) {
      console.error('Health check error:', error);
      
      // Return error response with basic server info
      const healthData: HealthData = {
        status: 'ERROR',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version
      };
      
      const response = ApiResponse.error('Gagal melakukan health check', healthData);
      res.status(500).json(response);
    }
  }
}