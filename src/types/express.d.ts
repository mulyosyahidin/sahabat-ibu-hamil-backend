/**
 * Express Type Extensions
 * 
 * This file extends the Express Request interface to include custom properties
 * added by middleware, such as user authentication data.
 */

import type { AuthPayload } from "./auth";

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export {};