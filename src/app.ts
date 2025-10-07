/**
 * Express application factory and configuration
 * 
 * This module creates and configures the Express application with middleware,
 * routes, and provides methods for server management.
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import router from './routes/router';
import { WhatsAppService } from './services/app/whatsapp/whatsapp.service';
import { DeviceService } from './services/device.service';
import { SocketService } from './services/app/socket/socket.service';
import { PrismaClient } from './generated/prisma';
import { appInstanceManager } from './utils/app-instance.util';
import { ChatEngine } from './services/app/chat-engine/chat.engine';
import { QueueService } from './services/app/queue.service';
import { HealthCheckService } from './services/app/health-check.service';
import { ConsultationService } from './services';
import { OverviewService } from './services/overview.service';

const __dirname = (() => {
  try {
    const __filename = fileURLToPath(import.meta.url);
    return path.dirname(__filename);
  } catch {
    return path.dirname(__filename);
  }
})();

/**
 * Initialize application middleware
 * Sets up JSON parsing, CORS, and other essential middleware
 * 
 * @param app - Express application instance
 */
const initializeMiddlewares = (app: express.Application): void => {
  // Configure CORS to allow all requests from localhost on any port
  const corsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // Allow all localhost requests regardless of port
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
      
      // Reject other origins
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true, // Allow cookies and credentials
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  };

  app.use(cors(corsOptions));
  app.use(express.json());
  
  // Serve static files from public directory
  app.use('/public', express.static(path.join(__dirname, '../public')));
};

/**
 * Initialize application routes
 * Mounts the main router under the /api prefix
 * 
 * @param app - Express application instance
 */
const initializeRoutes = (app: express.Application): void => {
  app.use('/api', router);
};

/**
 * Application factory function
 * Creates and configures an Express application with Socket.IO and WhatsApp integration
 * 
 * @param port - Port number for the server (defaults to 3000)
 * @returns Object containing the app instance, server, socket.io, and utility methods
 */
export const createApp = (port: number = 3000): {
  app: express.Application;
  server: any;
  io: SocketIOServer;
  whatsappService: WhatsAppService;
  socketService: SocketService;
  healthCheckService: HealthCheckService;
  port: number;
  getApp: () => express.Application;
  getServer: () => any;
  getIO: () => SocketIOServer;
  getWhatsAppService: () => WhatsAppService;
  getSocketService: () => SocketService;
  getHealthCheckService: () => HealthCheckService;
  listen: () => void;
  getPort: () => number;
} => {
  const app = express();
  const server = createServer(app);
  
  // Initialize Socket.IO with CORS configuration
  const io = new SocketIOServer(server, {
    cors: {
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps)
        if (!origin) return callback(null, true);
        
        // Allow all localhost requests regardless of port
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
          return callback(null, true);
        }
        
        // Reject other origins
        callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
      methods: ['GET', 'POST']
    }
  });

  // Initialize services
  const prisma = new PrismaClient();
  const socketService = new SocketService(io);
  const whatsappService = new WhatsAppService(io, prisma);
  const deviceService = new DeviceService(prisma);
  const queueService = new QueueService(prisma);
  const chatEngine = new ChatEngine(prisma, whatsappService, queueService);
  const healthCheckService = new HealthCheckService(prisma);
  const consultationService = new ConsultationService(prisma);
  const overviewService = new OverviewService(prisma);
  
  // Set ChatEngine in WhatsAppService to avoid circular dependency
  whatsappService.setChatEngine(chatEngine);
  
  // Set services in app instance manager
  appInstanceManager.setWhatsAppService(whatsappService);
  appInstanceManager.setDeviceService(deviceService);
  appInstanceManager.setChatEngine(chatEngine);
  appInstanceManager.setHealthCheckService(healthCheckService);
  appInstanceManager.setConsultationService(consultationService);
  appInstanceManager.setOverviewService(overviewService);
  
  // Set up middleware and routes
  initializeMiddlewares(app);
  initializeRoutes(app);
  
  // Socket.IO connection handling
  io.on('connection', (socket) => {
    console.log(`🔌 Socket client connected: ${socket.id}`);
    
    socket.on('join-device-room', (data: { deviceCode: string }) => {
      const { deviceCode } = data;
      const roomName = `device-${deviceCode}`;
      
      console.log(`📱 Client ${socket.id} joining device room: ${roomName}`);
      
      // Join the device-specific room
      socket.join(roomName);
      
      // Confirm room join to client
      socket.emit('device-room-joined', {
        deviceCode,
        roomName,
        socketId: socket.id,
        timestamp: new Date().toISOString()
      });
      
      console.log(`✅ Client ${socket.id} successfully joined room: ${roomName}`);
    });
    
    // Handle leave device room
    socket.on('leave-device-room', (data: { deviceCode: string }) => {
      const { deviceCode } = data;
      const roomName = `device-${deviceCode}`;
      
      console.log(`📱 Client ${socket.id} leaving device room: ${roomName}`);
      
      // Leave the device-specific room
      socket.leave(roomName);
      
      // Confirm room leave to client
      socket.emit('device-room-left', {
        deviceCode,
        roomName,
        socketId: socket.id,
        timestamp: new Date().toISOString()
      });
      
      console.log(`✅ Client ${socket.id} successfully left room: ${roomName}`);
    });
    
    socket.on('disconnect', (reason) => {
      console.log(`🔌 Socket client disconnected: ${socket.id} (${reason})`);
    });
  });

  return {
    app,
    server,
    io,
    whatsappService,
    socketService,
    healthCheckService,
    port,
    /**
     * Get the Express application instance
     * @returns Express application
     */
    getApp: (): express.Application => app,
    /**
     * Get the HTTP server instance
     * @returns HTTP server
     */
    getServer: () => server,
    /**
     * Get the Socket.IO server instance
     * @returns Socket.IO server
     */
    getIO: (): SocketIOServer => io,
    /**
     * Get the WhatsApp service instance
     * @returns WhatsApp service
     */
    getWhatsAppService: (): WhatsAppService => whatsappService,
    /**
     * Get the Socket service instance
     * @returns Socket service
     */
    getSocketService: (): SocketService => socketService,
    /**
     * Get the Health Check service instance
     * @returns Health Check service
     */
    getHealthCheckService: (): HealthCheckService => healthCheckService,
    /**
     * Start the HTTP server with Socket.IO
     * Begins listening on the configured port
     */
    listen: (): void => {
      server.listen(port, async (): Promise<void> => {
        // eslint-disable-next-line no-console
        console.log(`Server is running on port ${port}`);
        console.log(`Socket.IO server is ready for connections`);
        
        // Perform startup health check
        await healthCheckService.performStartupHealthCheck();
        
        // Initialize Queue Service
        try {
          console.log('🔄 Initializing Queue Service...');
          await queueService.initialize();
          console.log('✅ Queue Service initialization completed');
        } catch (error) {
          console.error('❌ Failed to initialize Queue Service:', error);
        }
        
        // Initialize WhatsApp sessions from storage
        try {
          console.log('🔄 Initializing WhatsApp sessions...');
          await whatsappService.loadExistingSessions();
          console.log('✅ WhatsApp sessions initialization completed');
        } catch (error) {
          console.error('❌ Failed to initialize WhatsApp sessions:', error);
        }
        
        // Initialize services
        console.log('🚀 Initializing services...');
      });
    },
    /**
     * Get the configured port number
     * @returns Port number
     */
    getPort: (): number => port
  };
};

export default createApp;