/**
 * Application Configuration
 * 
 * This module contains CORS configuration settings loaded from
 * environment variables with proper defaults and validation.
 * 
 * @author Sahabat Ibu Hamil Team
 * @version 1.0.0
 */

/**
 * CORS configuration
 * Supports multiple origins separated by comma
 */
export const corsConfig = {
  origins: process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
    : ['http://localhost:3000', 'http://localhost:4000', 'http://127.0.0.1:3000', 'http://127.0.0.1:4000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};