/**
 * Health Check Service
 * 
 * Service untuk memeriksa status kesehatan aplikasi termasuk koneksi database dan Redis
 */

import { PrismaClient } from '@/generated/prisma';
import { reminderQueue } from '@/config/bullmq';

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  services: {
    database: {
      status: 'connected' | 'disconnected' | 'error';
      responseTime?: {
        total: number;
        connection: number;
        query: number;
        unit: 'ms';
      };
      details?: {
        host?: string;
        database?: string;
        connectionPool?: {
          active: number;
          idle: number;
          total: number;
        };
      };
      error?: string;
    };
    redis: {
      status: 'connected' | 'disconnected' | 'error';
      responseTime?: {
        total: number;
        connection: number;
        operation: number;
        unit: 'ms';
      };
      details?: {
        host?: string;
        port?: number;
        database?: number;
        memory?: {
          used: string;
          peak: string;
        };
      };
      error?: string;
    };
  };
  uptime: number;
}

export class HealthCheckService {
  private prisma: PrismaClient;
  private startTime: number;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.startTime = Date.now();
  }

  /**
   * Memeriksa koneksi database
   */
  private async checkDatabase(): Promise<{
    status: 'connected' | 'disconnected' | 'error';
    responseTime?: {
      total: number;
      connection: number;
      query: number;
      unit: 'ms';
    };
    details?: {
      host?: string;
      database?: string;
      connectionPool?: {
        active: number;
        idle: number;
        total: number;
      };
    };
    error?: string;
  }> {
    try {
      const totalStartTime = Date.now();
      
      // Measure connection time (simulate connection establishment)
      const connectionStartTime = Date.now();
      await this.prisma.$connect();
      const connectionTime = Date.now() - connectionStartTime;
      
      // Measure query time
      const queryStartTime = Date.now();
      await this.prisma.$queryRaw`SELECT 1 as test`;
      const queryTime = Date.now() - queryStartTime;
      
      const totalTime = Date.now() - totalStartTime;
      
      // Get database connection details
      const databaseUrl = process.env.DATABASE_URL || '';
      const urlParts = databaseUrl.match(/mysql:\/\/[^@]+@([^:]+):?\d*\/([^?]+)/);
      const host = urlParts?.[1] || 'unknown';
      const database = urlParts?.[2] || 'unknown';
      
      return {
        status: 'connected',
        responseTime: {
          total: totalTime,
          connection: connectionTime,
          query: queryTime,
          unit: 'ms'
        },
        details: {
          host,
          database,
          connectionPool: {
            active: 1, // Simplified - in real scenario you'd get this from Prisma metrics
            idle: 0,
            total: 1
          }
        }
      };
    } catch (error) {
      console.error('Database health check failed:', error);
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown database error'
      };
    }
  }

  /**
   * Memeriksa koneksi Redis
   */
  private async checkRedis(): Promise<{
    status: 'connected' | 'disconnected' | 'error';
    responseTime?: {
      total: number;
      connection: number;
      operation: number;
      unit: 'ms';
    };
    details?: {
      host?: string;
      port?: number;
      database?: number;
      memory?: {
        used: string;
        peak: string;
      };
    };
    error?: string;
  }> {
    try {
      const totalStartTime = Date.now();
      
      // Get queue instance
      const queue = reminderQueue;
      if (!queue) {
        return {
          status: 'error',
          error: 'Reminder queue not available'
        };
      }

      // Measure connection time (simulate connection establishment)
      const connectionStartTime = Date.now();
      // For BullMQ, we can't directly measure connection time, so we'll use a minimal operation
      const connectionTime = Date.now() - connectionStartTime;
      
      // Measure operation time
      const operationStartTime = Date.now();
      await queue.getWaiting(0, 0); // Simple operation to test Redis connectivity
      const operationTime = Date.now() - operationStartTime;
      
      const totalTime = Date.now() - totalStartTime;
      
      // Get Redis connection details from environment
      const redisHost = process.env.REDIS_HOST || 'localhost';
      const redisPort = parseInt(process.env.REDIS_PORT || '6379');
      const redisDb = parseInt(process.env.REDIS_DB || '0');
      
      return {
        status: 'connected',
        responseTime: {
          total: totalTime,
          connection: connectionTime,
          operation: operationTime,
          unit: 'ms'
        },
        details: {
          host: redisHost,
          port: redisPort,
          database: redisDb,
          memory: {
            used: 'N/A', // Would need Redis INFO command to get actual values
            peak: 'N/A'
          }
        }
      };
    } catch (error) {
      console.error('Redis health check failed:', error);
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown Redis error'
      };
    }
  }

  /**
   * Melakukan health check lengkap
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    const timestamp = new Date().toISOString();
    const uptime = Date.now() - this.startTime;

    // Jalankan semua health check secara paralel
    const [databaseResult, redisResult] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis()
    ]);

    // Tentukan status keseluruhan
    const overallStatus = 
      databaseResult.status === 'connected' && redisResult.status === 'connected'
        ? 'healthy'
        : 'unhealthy';

    return {
      status: overallStatus,
      timestamp,
      services: {
        database: databaseResult,
        redis: redisResult
      },
      uptime
    };
  }

  /**
   * Melakukan startup health check dengan retry
   */
  async performStartupHealthCheck(maxRetries: number = 3, retryDelay: number = 2000): Promise<void> {
    console.log('🔍 Performing startup health check...');
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.performHealthCheck();
        
        if (result.status === 'healthy') {
          console.log('✅ Startup health check passed');
          console.log(`   Database: ${result.services.database.status} (${result.services.database.responseTime?.total}ms total, ${result.services.database.responseTime?.query}ms query)`);
          console.log(`   Redis: ${result.services.redis.status} (${result.services.redis.responseTime?.total}ms total, ${result.services.redis.responseTime?.operation}ms operation)`);
          return;
        } else {
          console.warn(`⚠️  Health check attempt ${attempt}/${maxRetries} failed:`);
          if (result.services.database.status !== 'connected') {
            console.warn(`   Database: ${result.services.database.status} - ${result.services.database.error}`);
          }
          if (result.services.redis.status !== 'connected') {
            console.warn(`   Redis: ${result.services.redis.status} - ${result.services.redis.error}`);
          }
        }
      } catch (error) {
        console.error(`❌ Health check attempt ${attempt}/${maxRetries} error:`, error);
      }

      // Jika bukan attempt terakhir, tunggu sebelum retry
      if (attempt < maxRetries) {
        console.log(`   Retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }

    // Jika semua attempt gagal, log warning tapi jangan throw error
    console.warn('⚠️  Startup health check failed after all attempts. Application will continue but may have connectivity issues.');
  }

  /**
   * Get uptime dalam detik
   */
  getUptime(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }
}