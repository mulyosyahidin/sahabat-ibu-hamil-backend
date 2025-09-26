/**
 * Express application factory and configuration
 * 
 * This module creates and configures the Express application with middleware,
 * routes, and provides methods for server management.
 */

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import router from './routes/router';
import { WhatsAppService } from './services/whatsapp.service';

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
  port: number;
  getApp: () => express.Application;
  getServer: () => any;
  getIO: () => SocketIOServer;
  getWhatsAppService: () => WhatsAppService;
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

  // Initialize WhatsApp service with Socket.IO
  const whatsappService = new WhatsAppService(io);
  
  // Load existing WhatsApp sessions from storage
  whatsappService.loadSessionsFromStorage();
  
  // Set up middleware and routes
  initializeMiddlewares(app);
  initializeRoutes(app);

  // Socket.IO connection handling
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);
    
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
    
    // Handle client requesting device connection
    socket.on('request-device-connection', async (data) => {
      try {
        const { deviceId } = data;
        if (!deviceId) {
          socket.emit('error', { message: 'Device ID is required' });
          return;
        }
        
        await whatsappService.requestDeviceConnection(deviceId);
      } catch (error) {
        socket.emit('error', { 
          message: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });
  });

  return {
    app,
    server,
    io,
    whatsappService,
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
     * Start the HTTP server with Socket.IO
     * Begins listening on the configured port
     */
    listen: (): void => {
      server.listen(port, (): void => {
        // eslint-disable-next-line no-console
        console.log(`Server is running on port ${port}`);
        console.log(`Socket.IO server is ready for connections`);
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