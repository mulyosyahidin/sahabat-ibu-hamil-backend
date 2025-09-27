import { Server as SocketIOServer } from 'socket.io';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState
} from '@whiskeysockets/baileys';
import type { WASocket } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import path from 'path';
import fs from 'fs';
import type { PrismaClient } from '@prisma/client';
import { NotFoundError } from '@/utils';

export class WhatsAppService {
  private io: SocketIOServer;
  private sessions: Map<string, WASocket> = new Map();
  private sessionsDir: string;
  private prisma: PrismaClient;

  constructor(io: SocketIOServer, prisma: PrismaClient) {
    this.io = io;
    this.sessionsDir = path.join(process.cwd(), 'sessions');
    this.prisma = prisma;

    // Create sessions directory if it doesn't exist
    if (!fs.existsSync(this.sessionsDir)) {
      fs.mkdirSync(this.sessionsDir, { recursive: true });
    }
  }

  /**
   * Reconnect device using existing session files
   * @param deviceCode - Kode device yang akan direconnect
   */
  async reconnectDevice(deviceCode: string): Promise<void> {
    // try {
    //   console.log(`🔄 Attempting to reconnect device: ${deviceCode}`);

    //   // Check if device exists in database
    //   const device = await this.prisma.device.findUnique({
    //     where: { code: deviceCode }
    //   });

    //   if (!device) {
    //     throw new NotFoundError(`Device with code ${deviceCode} not found`);
    //   }

    //   // Check if session files exist
    //   const sessionPath = path.join(this.sessionsDir, deviceCode);
    //   if (!fs.existsSync(sessionPath)) {
    //     throw new NotFoundError(`No session files found for device ${deviceCode}. Please scan QR code again.`);
    //   }

    //   // Check if session is already active
    //   if (this.sessions.has(deviceCode)) {
    //     console.log(`⚠️ Session for device ${deviceCode} is already active`);
    //     return;
    //   }

    //   // Emit reconnection started event
    //   this.emitToDeviceRoom(deviceCode, 'connection-status', {
    //     deviceCode,
    //     status: 'reconnecting',
    //     message: 'Mencoba menghubungkan kembali menggunakan session yang tersimpan...',
    //     timestamp: new Date().toISOString()
    //   });

    //   // Update device status to connecting
    //   await this.prisma.device.update({
    //     where: {
    //       code: deviceCode,
    //     },
    //     data: {
    //       status: 'reconnecting',
    //     }
    //   });

    //   // Start session using existing files
    //   // await this.startSession(deviceCode);

    //   console.log(`✅ Reconnection initiated for device: ${deviceCode}`);

    // } catch (error) {
    //   console.error(`❌ Failed to reconnect device ${deviceCode}:`, error);

    //   // Emit error event
    //   this.emitToDeviceRoom(deviceCode, 'connection-error', {
    //     deviceCode,
    //     error: error instanceof Error ? error.message : 'Reconnection failed',
    //     timestamp: new Date().toISOString()
    //   });

    //   // Update device status back to disconnected
    //   await this.prisma.device.update({
    //     where: { code: deviceCode },
    //     data: { status: 'disconnected' }
    //   });

    //   throw error;
    // }
  }

  /**
   * Emit event ke room spesifik device
   * @param deviceCode - Kode device untuk menentukan room
   * @param eventName - Nama event yang akan di-emit
   * @param data - Data yang akan dikirim
   */
  private emitToDeviceRoom(deviceCode: string, eventName: string, data: any): void {
    const roomName = `device-${deviceCode}`;
    console.log(`📡 Emitting '${eventName}' to room: ${roomName}`);
    this.io.to(roomName).emit(eventName, data);
  }

  /**
   * Start WhatsApp session untuk device tertentu
   * @param deviceCode - Kode unik device
   */
  async startSession(deviceCode: string): Promise<void> {
    try {
      console.log(`🚀 Starting WhatsApp session for device: ${deviceCode}`);

      if (this.sessions.has(deviceCode)) {
        console.log(`⚠️ Session for device ${deviceCode} already exists`);

        return;
      }

      const sessionPath = path.join(this.sessionsDir, deviceCode);

      // Load auth state from storage
      const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

      const device = await this.prisma.device.findUnique({
        where: {
          code: deviceCode,
        }
      });

      if (!device) {
        throw new NotFoundError(`Device with code ${deviceCode} not found`);
      }

      // Create WhatsApp socket
      const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: [device.name, 'Chrome', '1.0.0'],
      });

      // Store session
      this.sessions.set(deviceCode, sock);

      sock.ev.on('connection.update', async (update: any) => {
        const { connection, lastDisconnect, qr } = update;

        console.log(`📱 Connection update for ${deviceCode}:`, { connection });

        console.log(`KONEKSI: ${connection}`)
        if (connection === 'connecting') {
          console.log(`🔄 Connecting to WhatsApp for device: ${deviceCode}`);
        }
        else if (connection === 'close') {
          console.log(`❌ Connection closed for device: ${deviceCode}`);

          const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
          const disconnectReason = (lastDisconnect?.error as Boom)?.output?.statusCode;

          console.log(`Disconnect reason: ${disconnectReason}`)

          if (disconnectReason === DisconnectReason.timedOut) {
            this.emitToDeviceRoom(deviceCode, 'connection-status', {
              deviceCode,
              status: 'time-out',
              message: 'Koneksi dengan WhatsApp terputus, coba lagi',
              timestamp: new Date().toISOString()
            });
          }
          else if (disconnectReason === DisconnectReason.connectionLost) {
            this.emitToDeviceRoom(deviceCode, 'connection-status', {
              deviceCode,
              status: 'connection-lost',
              message: 'Koneksi dengan WhatsApp terputus, coba lagi',
              timestamp: new Date().toISOString()
            });
          }
          else if (disconnectReason === DisconnectReason.restartRequired) {
            console.log(`🔄 Restart required for device: ${deviceCode}, restarting session...`);

            // Remove current session
            this.sessions.delete(deviceCode);

            // Emit status bahwa sedang restart
            this.emitToDeviceRoom(deviceCode, 'connection-status', {
              deviceCode,
              status: 'scan-success',
              message: 'Menghubungkan ke WhatsApp...',
              timestamp: new Date().toISOString()
            });

            // Restart session setelah delay singkat
            setTimeout(async () => {
              try {
                await this.startSession(deviceCode);
              } catch (error) {
                console.error(`❌ Failed to restart session for device ${deviceCode}:`, error);

                this.emitToDeviceRoom(deviceCode, 'connection-error', {
                  deviceCode,
                  error: 'Gagal restart session setelah scan QR code',
                  timestamp: new Date().toISOString()
                });
              }
            }, 1000);
          }
          else if (disconnectReason === DisconnectReason.loggedOut) {
            this.sessions.delete(deviceCode);
            this.deleteSessionFiles(deviceCode);

            await this.prisma.device.update({
              where: {
                code: deviceCode
              },
              data: {
                status: 'disconnected',
              }
            });

            this.emitToDeviceRoom(deviceCode, 'device-disconnected', {
              deviceCode,
              reason: 'logged-out',
              message: 'Anda telah logout dari WhatsApp, silahkan login kembali',
              timestamp: new Date().toISOString()
            });
          }
        }
        else if (connection === 'open') {
          console.log(`✅ WhatsApp connected successfully for device: ${deviceCode}`);

          // Get WhatsApp user info
          const userInfo = sock.user;
          const phoneNumber = userInfo?.id?.split(':')[0] || 'Unknown';

          await this.prisma.device.update({
            where: {
              code: deviceCode
            },
            data: {
              status: 'connected',
              phone_number: phoneNumber,
              device_id: userInfo?.id,
            }
          });

          this.emitToDeviceRoom(deviceCode, 'device-connected', {
            deviceCode,
            message: 'Berhasil terhubung ke WhatsApp',
            user: {
              id: userInfo?.id,
              name: userInfo?.name,
              phone: phoneNumber
            },
            timestamp: new Date().toISOString()
          });
        }
        else if (qr) {
          console.log(`📱 QR Code generated for device: ${deviceCode}`);
          this.emitToDeviceRoom(deviceCode, 'qr-updated', {
            deviceCode,
            qr,
            timestamp: new Date().toISOString()
          });

          await this.prisma.device.update({
            where: {
              code: deviceCode,
            },
            data: {
              status: 'pending_connect',
            }
          });
        }
      });

      sock.ev.on('creds.update', saveCreds);
      console.log(`✅ WhatsApp session initialized for device: ${deviceCode}`);
    }
    catch (error) {
      console.error(`❌ Failed to start session for device ${deviceCode}:`, error);

      // Remove failed session
      this.sessions.delete(deviceCode);

      // Emit error status
      this.emitToDeviceRoom(deviceCode, 'connection-error', {
        deviceCode,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  }

  /**
   * Load existing sessions from storage on startup
   */
  async loadExistingSessions(): Promise<void> {
    try {
      console.log('🔄 Loading existing WhatsApp sessions...');

      if (!fs.existsSync(this.sessionsDir)) {
        console.log('📁 Sessions directory not found, creating...');
        return;
      }

      const sessionFolders = fs.readdirSync(this.sessionsDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      console.log(`📂 Found ${sessionFolders.length} existing session folders`);

      for (const deviceCode of sessionFolders) {
        try {
          console.log(`🔄 Loading session for device: ${deviceCode}`);
          await this.startSession(deviceCode);
        } catch (error) {
          console.error(`❌ Failed to load session for device ${deviceCode}:`, error);
        }
      }

      console.log('✅ Finished loading existing sessions');
    } catch (error) {
      console.error('❌ Error loading existing sessions:', error);
    }
  }

  /**
   * Request device connection - memulai proses koneksi WhatsApp untuk device tertentu
   * @param deviceCode - Kode unik device yang akan dikoneksikan
   */
  async requestDeviceConnection(deviceCode: string): Promise<void> {
    try {
      console.log(`📱 Memulai request koneksi untuk device: ${deviceCode}`);

      // Emit event ke room spesifik device bahwa proses koneksi dimulai
      this.emitToDeviceRoom(deviceCode, 'connection-requested', {
        deviceCode,
        status: 'requested',
        message: 'Server sedang meminta koneksi ke WhatsApp...',
        timestamp: new Date().toISOString()
      });

      // Start WhatsApp session
      await this.startSession(deviceCode);

      console.log(`✅ Request koneksi berhasil diinisialisasi untuk device: ${deviceCode}`);

    } catch (error) {
      console.error(`❌ Gagal request koneksi untuk device ${deviceCode}:`, error);

      // Emit error event ke room spesifik device
      this.emitToDeviceRoom(deviceCode, 'connection-error', {
        deviceCode,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  }

  /**
   * Get active session for device
   * @param deviceCode - Kode device
   */
  getSession(deviceCode: string): WASocket | undefined {
    return this.sessions.get(deviceCode);
  }

  /**
   * Get all active sessions
   */
  getAllSessions(): Map<string, WASocket> {
    return this.sessions;
  }

  /**
   * Disconnect device - close socket connection and remove session
   * @param deviceCode - Kode device yang akan didisconnect
   */
  async disconnectDevice(deviceCode: string): Promise<void> {
    try {
      console.log(`🔌 Disconnecting device: ${deviceCode}`);

      // Get active session
      const session = this.sessions.get(deviceCode);

      if (!session) {
        console.log(`⚠️ No active session found for device: ${deviceCode}`);
        throw new NotFoundError(`No active session found for device ${deviceCode}`);
      }

      // Send logout command to WhatsApp before closing connection
      try {
        await session.logout();
        console.log(`🚪 Logout command sent to WhatsApp for device: ${deviceCode}`);

        // Close the socket connection
        session.end(undefined);
        console.log(`🔌 Socket connection closed for device: ${deviceCode}`);

        // Remove session from memory
        this.sessions.delete(deviceCode);
        console.log(`🗑️ Session removed from memory for device: ${deviceCode}`);

        // Delete session files from disk
        await this.deleteSessionFiles(deviceCode);

        // Update device status in database
        await this.prisma.device.update({
          where: { code: deviceCode },
          data: {
            status: 'disconnected',
            updated_at: new Date()
          }
        });

        console.log(`✅ Device ${deviceCode} successfully disconnected`);
      } catch (logoutError) {
        console.warn(`⚠️ Failed to send logout command for device ${deviceCode}:`, logoutError);
      }
    } catch (error) {
      console.error(`❌ Failed to disconnect device ${deviceCode}:`, error);

      // Emit error event
      this.emitToDeviceRoom(deviceCode, 'connection-error', {
        deviceCode,
        error: error instanceof Error ? error.message : 'Disconnect failed',
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  }

  /**
   * Delete session files from disk
   * @param deviceCode - Kode device
   */
  private async deleteSessionFiles(deviceCode: string): Promise<void> {
    try {
      const sessionPath = path.join(this.sessionsDir, deviceCode);

      if (fs.existsSync(sessionPath)) {
        console.log(`🗑️ Deleting session files for device: ${deviceCode}`);

        // Remove all files in the session directory
        const files = fs.readdirSync(sessionPath);
        for (const file of files) {
          const filePath = path.join(sessionPath, file);
          fs.unlinkSync(filePath);
        }

        // Don't remove the directory itself, just clear its contents
        console.log(`✅ Session files deleted successfully for device: ${deviceCode}`);
      } else {
        console.log(`⚠️ Session directory not found for device: ${deviceCode}`);
      }
    } catch (error) {
      console.error(`❌ Failed to delete session files for device ${deviceCode}:`, error);
    }
  }
}