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
import { ChatEngine } from '@/services/chat-engine';
import { DeviceStatus } from '@/generated/prisma';

export class WhatsAppService {
  private io: SocketIOServer;
  private sessions: Map<string, WASocket> = new Map();
  private sessionsDir: string;
  private prisma: PrismaClient;
  private ChatEngine: ChatEngine;

  constructor(io: SocketIOServer, prisma: PrismaClient) {
    this.io = io;
    this.sessionsDir = path.join(process.cwd(), 'sessions');
    this.prisma = prisma;
    this.ChatEngine = new ChatEngine(prisma, this);

    // Create sessions directory if it doesn't exist
    if (!fs.existsSync(this.sessionsDir)) {
      fs.mkdirSync(this.sessionsDir, { recursive: true });
    }
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
                status: DeviceStatus.DISCONNECTED,
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
              status: DeviceStatus.CONNECTED,
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
              status: DeviceStatus.PENDING_CONNECT,
            }
          });
        }
      });

      sock.ev.on('creds.update', saveCreds);

      // Handle incoming messages
      sock.ev.on('messages.upsert', async (m) => {
        const messages = m.messages;
        for (const message of messages) {
          await this.ChatEngine.handleIncomingMessage(deviceCode, message);
        }
      });

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
            status: DeviceStatus.DISCONNECTED,
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
   * Send text message via WhatsApp
   * @param deviceCode - Kode device yang akan mengirim pesan
   * @param phoneNumber - Nomor telepon tujuan (format: 62xxx)
   * @param text - Teks pesan yang akan dikirim
   */
  async sendTextMessage(deviceCode: string, phoneNumber: string, text: string): Promise<void> {
    try {
      console.log(`📤 Sending text message from device ${deviceCode} to ${phoneNumber}`);

      // Get active session for the device
      const session = this.getSession(deviceCode);
      if (!session) {
        throw new NotFoundError(`No active session found for device: ${deviceCode}`);
      }

      // Format phone number for WhatsApp (add @s.whatsapp.net)
      const formattedNumber = `${phoneNumber}@s.whatsapp.net`;

      // Send text message
      await session.sendMessage(formattedNumber, { text });

      console.log(`✅ Text message sent successfully from device ${deviceCode} to ${phoneNumber}`);
    } catch (error) {
      console.error(`❌ Failed to send text message from device ${deviceCode} to ${phoneNumber}:`, error);
      throw error;
    }
  }

  /**
   * Send image message via WhatsApp
   * @param deviceCode - Kode device yang akan mengirim pesan
   * @param phoneNumber - Nomor telepon tujuan (format: 62xxx)
   * @param caption - Caption untuk gambar
   * @param media - Buffer atau string path gambar
   */
  async sendImageMessage(deviceCode: string, phoneNumber: string, caption: string, media: Buffer | string): Promise<void> {
    try {
      console.log(`📤 Sending image message from device ${deviceCode} to ${phoneNumber}`);

      // Get active session for the device
      const session = this.getSession(deviceCode);
      if (!session) {
        throw new NotFoundError(`No active session found for device: ${deviceCode}`);
      }

      // Format phone number for WhatsApp (add @s.whatsapp.net)
      const formattedNumber = `${phoneNumber}@s.whatsapp.net`;

      // Prepare media for WAMediaUpload format
      let imageMedia;
      if (Buffer.isBuffer(media)) {
        // If media is Buffer, use it directly
        imageMedia = media;
      } else {
        // If media is string (URL or path), wrap it in WAMediaPayloadURL format
        imageMedia = { url: media };
      }

      // Send image message
      await session.sendMessage(formattedNumber, {
        image: imageMedia,
        caption: caption
      });

      console.log(`✅ Image message sent successfully from device ${deviceCode} to ${phoneNumber}`);
    } catch (error) {
      console.error(`❌ Failed to send image message from device ${deviceCode} to ${phoneNumber}:`, error);
      throw error;
    }
  }

  /**
   * Send YouTube video link with thumbnail via WhatsApp
   * @param deviceCode - Kode device yang akan mengirim pesan
   * @param phoneNumber - Nomor telepon tujuan (format: 62xxx)
   * @param caption - Caption untuk video
   * @param youtubeUrl - URL YouTube video
   */
  async sendVideoMessage(deviceCode: string, phoneNumber: string, caption: string, youtubeUrl: string): Promise<void> {
    try {
      console.log(`📤 Sending YouTube video link from device ${deviceCode} to ${phoneNumber}`);

      // Get active session for the device
      const session = this.getSession(deviceCode);
      if (!session) {
        throw new NotFoundError(`No active session found for device: ${deviceCode}`);
      }

      // Format phone number for WhatsApp (add @s.whatsapp.net)
      const formattedNumber = `${phoneNumber}@s.whatsapp.net`;

      // Extract YouTube video ID from URL
      const videoId = this.extractYouTubeVideoId(youtubeUrl);
      if (!videoId) {
        throw new Error('Invalid YouTube URL provided');
      }

      // Get YouTube thumbnail URL (high quality)
      const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

      // Send message with YouTube link and thumbnail
      await session.sendMessage(formattedNumber, {
        text: `${caption}\n\n🎥 *Video YouTube:*\n${youtubeUrl}`,
        linkPreview: {
          title: caption,
          description: 'Video YouTube',
          jpegThumbnail: await this.fetchYouTubeThumbnail(thumbnailUrl),
          "canonical-url": youtubeUrl,
          "matched-text": youtubeUrl
        }
      });

      console.log(`✅ YouTube video link sent successfully from device ${deviceCode} to ${phoneNumber}`);
    } catch (error) {
      console.error(`❌ Failed to send YouTube video link from device ${deviceCode} to ${phoneNumber}:`, error);
      throw error;
    }
  }

  /**
   * Extract YouTube video ID from URL
   * @param url - YouTube URL
   * @returns Video ID or null if invalid
   */
  private extractYouTubeVideoId(url: string): string | null {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    
    return match && match[1] ? match[1] : null;
  }

  /**
   * Fetch YouTube thumbnail as Buffer
   * @param thumbnailUrl - YouTube thumbnail URL
   * @returns Buffer of thumbnail image
   */
  private async fetchYouTubeThumbnail(thumbnailUrl: string): Promise<Buffer> {
    try {
      const response = await fetch(thumbnailUrl);
      if (!response.ok) {
        // Fallback to default quality thumbnail
        const fallbackUrl = thumbnailUrl.replace('maxresdefault', 'hqdefault');
        const fallbackResponse = await fetch(fallbackUrl);
        if (!fallbackResponse.ok) {
          throw new Error('Failed to fetch YouTube thumbnail');
        }
        return Buffer.from(await fallbackResponse.arrayBuffer());
      }
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      console.error('Error fetching YouTube thumbnail:', error);
      // Return empty buffer if thumbnail fetch fails
      return Buffer.alloc(0);
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