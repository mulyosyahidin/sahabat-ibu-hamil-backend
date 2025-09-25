/**
 * Express application factory and configuration
 * 
 * This module creates and configures the Express application with middleware,
 * routes, and provides methods for server management.
 */

import express from 'express';
import router from './routes/router';

/**
 * Initialize application middleware
 * Sets up JSON parsing and other essential middleware
 * 
 * @param app - Express application instance
 */
const initializeMiddlewares = (app: express.Application): void => {
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
 * Creates and configures an Express application with all necessary setup
 * 
 * @param port - Port number for the server (defaults to 3000)
 * @returns Object containing the app instance and utility methods
 */
export const createApp = (port: number = 3000): {
  app: express.Application;
  port: number;
  getApp: () => express.Application;
  listen: () => void;
  getPort: () => number;
} => {
  const app = express();
  
  // Set up middleware and routes
  initializeMiddlewares(app);
  initializeRoutes(app);

  return {
    app,
    port,
    /**
     * Get the Express application instance
     * @returns Express application
     */
    getApp: (): express.Application => app,
    /**
     * Start the HTTP server
     * Begins listening on the configured port
     */
    listen: (): void => {
      app.listen(port, (): void => {
        // eslint-disable-next-line no-console
        console.log(`Server is running on port ${port}`);
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