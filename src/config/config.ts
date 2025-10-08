/**
 * Application Configuration
 * 
 * This module contains all application configuration settings loaded from
 * environment variables with proper defaults and validation.
 * 
 * @author Sahabat Ibu Hamil Team
 * @version 1.0.0
 */

/**
 * Server configuration
 */
export const serverConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  publicUrl: process.env.PUBLIC_URL || 'http://localhost:3000/public',
};

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

/**
 * JWT configuration
 */
export const jwtConfig = {
  secret: process.env.JWT_SECRET || 'default-secret-key',
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',
};

/**
 * Database configuration
 */
export const databaseConfig = {
  url: process.env.DATABASE_URL || '',
  mysqlRootPassword: process.env.MYSQL_ROOT_PASSWORD || '',
};

/**
 * Redis configuration
 */
export const redisConfig = {
  password: process.env.REDIS_PASSWORD || '',
};

/**
 * Default user configuration (for seeding)
 */
export const defaultUserConfig = {
  name: process.env.DEFAULT_USER_NAME || '',
  email: process.env.DEFAULT_USER_EMAIL || '',
  password: process.env.DEFAULT_USER_PASSWORD || '',
};

/**
 * OpenAI configuration
 */
export const openaiConfig = {
  apiKey: process.env.OPENAI_API_KEY || '',
  model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  projectName: process.env.OPENAI_PROJECT_NAME || '',
  enabled: process.env.OPENAI_ENABLE === 'true',
};

/**
 * Combined application configuration
 */
export const config = {
  server: serverConfig,
  cors: corsConfig,
  jwt: jwtConfig,
  database: databaseConfig,
  redis: redisConfig,
  defaultUser: defaultUserConfig,
  openai: openaiConfig,
};

export default config;