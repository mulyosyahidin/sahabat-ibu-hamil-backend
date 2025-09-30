import type { Redis } from 'ioredis';
import IORedis from 'ioredis';

// Redis configuration interface
interface RedisConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  db?: number;
  retryDelayOnFailover?: number;
  maxRetriesPerRequest?: number;
  lazyConnect?: boolean;
}

// Get Redis configuration from environment variables
const getRedisConfig = (): RedisConfig => {
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    ...(process.env.REDIS_USERNAME && { username: process.env.REDIS_USERNAME }),
    ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD }),
    db: 0,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  };
};

// Create Redis connection instance
const createRedisConnection = (): Redis => {
  const config = getRedisConfig();
  
  const redis = new IORedis(config);

  // Event listeners for connection monitoring
  redis.on('connect', () => {
    console.log('✅ Redis connected successfully');
  });

  redis.on('ready', () => {
    console.log('🚀 Redis is ready to accept commands');
  });

  redis.on('error', (error) => {
    console.error('❌ Redis connection error:', error);
  });

  redis.on('close', () => {
    console.log('🔌 Redis connection closed');
  });

  redis.on('reconnecting', () => {
    console.log('🔄 Redis reconnecting...');
  });

  return redis;
};

// Create default Redis connection
export const redisClient = createRedisConnection();

// Create separate Redis connection for BullMQ
export const createBullMQRedisConnection = (): Redis => {
  const config = getRedisConfig();
  return new IORedis({
    ...config,
    maxRetriesPerRequest: null, // BullMQ requires this to be null
  });
};

// Redis utility functions
export const redisUtils = {
  // Test Redis connection
  async testConnection(): Promise<boolean> {
    try {
      const result = await redisClient.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis connection test failed:', error);
      return false;
    }
  },

  // Get Redis info
  async getInfo(): Promise<string> {
    try {
      return await redisClient.info();
    } catch (error) {
      console.error('Failed to get Redis info:', error);
      throw error;
    }
  },

  // Gracefully close Redis connection
  async closeConnection(): Promise<void> {
    try {
      await redisClient.quit();
      console.log('✅ Redis connection closed gracefully');
    } catch (error) {
      console.error('Error closing Redis connection:', error);
    }
  },
};

// Export Redis configuration for external use
export { getRedisConfig };
export default redisClient;