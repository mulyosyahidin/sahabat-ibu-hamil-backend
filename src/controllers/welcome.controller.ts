/**
 * Welcome Controller
 * 
 * Handles basic application endpoints including welcome message and health checks.
 * These endpoints provide essential information about the API status and basic functionality.
 */

import type { Request, Response } from 'express';
import { ApiResponse } from '../models/responses';
import type { WelcomeData, HealthData } from '../models/responses/welcome.response';

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
   * uptime, memory usage, and Node.js version for monitoring purposes.
   * 
   * @param req - Express request object
   * @param res - Express response object
   */
  static getHealth(req: Request, res: Response): void {
    const healthData: HealthData = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version
    };
    
    const response = ApiResponse.success('Server dalam kondisi sehat', healthData);
    res.json(response);
  }
}