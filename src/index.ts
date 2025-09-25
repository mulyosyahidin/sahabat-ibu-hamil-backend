/**
 * Main entry point for the Sahabat Ibu Hamil API server
 * 
 * This file initializes the Express application with environment configuration
 * and starts the HTTP server on the specified port.
 */

import dotenv from 'dotenv';
import createApp from './app';

// Load environment variables from .env file
dotenv.config();

// Get port from environment variable or default to 3000
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// Create and start the application instance
const appInstance = createApp(PORT);
appInstance.listen();