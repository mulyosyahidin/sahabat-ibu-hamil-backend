import * as whatsapp from 'wa-multi-session';
import { Server as SocketIOServer } from 'socket.io';

export class WhatsAppService {
  private io: SocketIOServer;

  constructor(io: SocketIOServer) {
    this.io = io;
    this.initializeListeners();
  }

  /**
   * Initialize WhatsApp event listeners
   */
  private initializeListeners(): void {
    // Listen for QR code updates and emit to frontend
    whatsapp.onQRUpdated(({ sessionId, qr }) => {
      console.log(`QR Code updated for session: ${sessionId}`);
      this.io.emit('qr-code', {
        sessionId,
        qr,
        timestamp: new Date().toISOString()
      });
    });

    // Listen for session connection status
    whatsapp.onConnected(async (sessionId) => {
      console.log(`WhatsApp session connected: ${sessionId}`);
      
      try {
        // Get phone number from connected session
        const session = this.getSession(sessionId);
        let phoneNumber = null;
        
        if (session && session.user && session.user.id) {
          // Extract phone number from user ID (format: phonenumber@s.whatsapp.net or phonenumber:xx@s.whatsapp.net)
          let rawPhoneNumber = session.user.id.split('@')[0];
          
          // Remove any suffix after colon (e.g., :19)
          phoneNumber = rawPhoneNumber.split(':')[0];
        }
        
        // Validate if phone number is already registered
        if (phoneNumber) {
          const { appInstanceManager } = await import('../utils/app-instance.util');
          const deviceService = appInstanceManager.getDeviceService();
          
          if (deviceService) {
            const isAlreadyRegistered = await deviceService.isPhoneNumberAlreadyRegistered(phoneNumber, sessionId);
            
            if (isAlreadyRegistered) {
              console.log(`Phone number ${phoneNumber} is already registered, declining connection for session ${sessionId}`);
              
              // Emit connection declined event
              this.io.emit('connection-declined', {
                sessionId,
                phoneNumber,
                message: 'Nomor sudah terdaftar, silahkan gunakan device lain',
                timestamp: new Date().toISOString()
              });
              
              // Delete/logout the session to properly disconnect
              try {
                await whatsapp.deleteSession(sessionId);
                console.log(`Session ${sessionId} deleted successfully`);
              } catch (deleteError) {
                console.error(`Failed to delete session ${sessionId}:`, deleteError);
              }
              
              // Note: Session has been deleted, so we won't update the database
              return;
            }
          }
        }
        
        // Update device in database
        await this.updateDeviceOnConnection(sessionId, phoneNumber);
        
        this.io.emit('session-connected', {
          sessionId,
          status: 'connected',
          phoneNumber,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error(`Error updating device on connection for session ${sessionId}:`, error);
        this.io.emit('session-connected', {
          sessionId,
          status: 'connected',
          phoneNumber: null,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Listen for incoming messages
    whatsapp.onMessageReceived((msg) => {
      console.log(`New message received on session: ${msg.sessionId}`);
      this.io.emit('message-received', {
        sessionId: msg.sessionId,
        message: msg,
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Start a new WhatsApp session for a device
   * @param deviceId - The device ID to use as session ID
   * @returns Promise<any> - Session data
   */
  async startSession(deviceId: string): Promise<any> {
    try {
      console.log(`Starting WhatsApp session for device: ${deviceId}`);
      const session = await whatsapp.startSession(deviceId, {
        printQR: false,
      });
      
      // Emit session started event
      this.io.emit('session-started', {
        sessionId: deviceId,
        status: 'started',
        timestamp: new Date().toISOString()
      });

      return session;
    } catch (error) {
      console.error(`Failed to start WhatsApp session for device ${deviceId}:`, error);
      
      // Emit session error event
      this.io.emit('session-error', {
        sessionId: deviceId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }

  /**
   * Get session data by device ID
   * @param deviceId - The device ID
   * @returns Session data or null
   */
  getSession(deviceId: string): any {
    try {
      return whatsapp.getSession(deviceId);
    } catch (error) {
      console.error(`Failed to get session for device ${deviceId}:`, error);
      return null;
    }
  }

  /**
   * Get all active session IDs
   * @returns Array of session IDs
   */
  getAllSessions(): string[] {
    try {
      return whatsapp.getAllSession();
    } catch (error) {
      console.error('Failed to get all sessions:', error);
      return [];
    }
  }

  /**
   * Load saved sessions from storage
   */
  loadSessionsFromStorage(): void {
    try {
      whatsapp.loadSessionsFromStorage();
      console.log('Loaded sessions from storage');
    } catch (error) {
      console.error('Failed to load sessions from storage:', error);
    }
  }

  /**
   * Send text message via WhatsApp
   * @param sessionId - Device/Session ID
   * @param to - Phone number with country code
   * @param text - Message text
   * @returns Promise<any>
   */
  async sendTextMessage(sessionId: string, to: string, text: string): Promise<any> {
    try {
      return await whatsapp.sendTextMessage({
        sessionId,
        to,
        text
      });
    } catch (error) {
      console.error(`Failed to send text message from session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Send typing indicator
   * @param sessionId - Device/Session ID
   * @param to - Phone number with country code
   * @param duration - Duration in milliseconds
   * @returns Promise<any>
   */
  async sendTyping(sessionId: string, to: string, duration: number = 3000): Promise<any> {
    try {
      return await whatsapp.sendTyping({
        sessionId,
        to,
        duration
      });
    } catch (error) {
      console.error(`Failed to send typing indicator from session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Read/mark message as read
   * @param sessionId - Device/Session ID
   * @param key - Message key
   * @returns Promise<any>
   */
  async readMessage(sessionId: string, key: any): Promise<any> {
    try {
      return await whatsapp.readMessage({
        sessionId,
        key
      });
    } catch (error) {
      console.error(`Failed to read message from session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Set custom credentials directory
   * @param dir - Directory path
   */
  setCredentialsDir(dir: string): void {
    whatsapp.setCredentialsDir(dir);
  }

  /**
   * Check if session is connected
   * @param deviceId - Device ID
   * @returns boolean
   */
  isSessionConnected(deviceId: string): boolean {
    const session = this.getSession(deviceId);
    return session !== null && session !== undefined;
  }

  /**
   * Request device connection - starts session and waits for QR scan
   * @param deviceId - Device ID
   * @returns Promise<void>
   */
  async requestDeviceConnection(deviceId: string): Promise<void> {
    try {
      // Check if session already exists and is connected
      if (this.isSessionConnected(deviceId)) {
        console.log(`Device ${deviceId} is already connected`);
        this.io.emit('session-already-connected', {
          sessionId: deviceId,
          status: 'already-connected',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Start new session - this will trigger QR code generation
      await this.startSession(deviceId);
      
      console.log(`Connection request initiated for device: ${deviceId}`);
    } catch (error) {
      console.error(`Failed to request device connection for ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Update device in database when connection is established
   * @param deviceCode - Device code (session ID)
   * @param phoneNumber - Phone number from WhatsApp session
   */
  private async updateDeviceOnConnection(deviceCode: string, phoneNumber: string | null): Promise<void> {
    try {
      const { appInstanceManager } = await import('../utils/app-instance.util');
      const deviceService = appInstanceManager.getDeviceService();
      
      if (deviceService) {
        await deviceService.updateDeviceOnConnection(deviceCode, phoneNumber);
        console.log(`Device ${deviceCode} updated with phone number: ${phoneNumber}`);
      } else {
        console.error('Device service not available for updating device connection');
      }
    } catch (error) {
      console.error(`Failed to update device ${deviceCode} in database:`, error);
      throw error;
    }
  }
}