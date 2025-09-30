/**
 * Welcome Response Types
 * 
 * Defines TypeScript interfaces for response data structures used by the
 * WelcomeController. These interfaces ensure type safety and provide clear
 * contracts for API response data.
 */

/**
 * Welcome endpoint response data structure
 * 
 * Contains basic API information returned by the welcome endpoint
 */
export interface WelcomeData {
  /** API version string */
  version: string;
  /** Current environment (development, production, etc.) */
  environment: string;
}

/**
 * Memory usage statistics structure
 * 
 * Represents Node.js memory usage information
 */
export interface MemoryUsage {
  /** Resident Set Size - total memory allocated for the process */
  rss: number;
  /** Heap total - total size of the allocated heap */
  heapTotal: number;
  /** Heap used - actual memory used during the execution */
  heapUsed: number;
  /** External memory usage */
  external: number;
  /** Array buffers memory usage */
  arrayBuffers: number;
}

/**
 * Health check endpoint response data structure
 * 
 * Contains comprehensive server health and system information
 */
export interface HealthData {
  /** Server status indicator */
  status: 'OK' | 'ERROR' | 'WARNING' | 'DEGRADED';
  /** ISO timestamp of when the health check was performed */
  timestamp: string;
  /** Server uptime in seconds */
  uptime: number;
  /** Node.js memory usage statistics */
  memory: MemoryUsage;
  /** Node.js version string */
  version: string;
  /** Database and Redis connection status */
  services?: {
    database?: {
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
    redis?: {
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
}