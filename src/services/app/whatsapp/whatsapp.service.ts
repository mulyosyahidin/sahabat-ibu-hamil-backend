import { Server as SocketIOServer } from 'socket.io';
import {
  makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import type { WASocket } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import path from 'path';
import fs from 'fs';
import type { PrismaClient } from '@prisma/client';
import { NotFoundError } from '@/utils';
import { ChatEngine } from '@/services/app/chat-engine';
import { DeviceStatus } from '@/generated/prisma';

export class WhatsAppService {
  private io: SocketIOServer;
  private sessions: Map<string, WASocket> = new Map();
  private startingSessions: Set<string> = new Set();
  private lastQrByDevice = new Map<string, string>();
  private scannedPending = new Set<string>();
  private connectedNow = new Set<string>();
  private disconnecting = new Set<string>();
  private forceLogoutOnOpen = new Set<string>();
  private sessionsDir: string;
  private prisma: PrismaClient;
  private ChatEngine!: ChatEngine;

  constructor(io: SocketIOServer, prisma: PrismaClient) {
    this.io = io;
    this.sessionsDir = path.join(process.cwd(), 'sessions');
    this.prisma = prisma;

    if (!fs.existsSync(this.sessionsDir)) {
      fs.mkdirSync(this.sessionsDir, { recursive: true });
    }
  }

  /**
   * Set ChatEngine instance (called after construction to avoid circular dependency)
   */
  setChatEngine(chatEngine: ChatEngine): void {
    this.ChatEngine = chatEngine;
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
   * @param n - Nomor urut sesi (opsional, untuk logging)
   * @param totalSessions - Total sesi yang dimuat (opsional, untuk logging)
   */
  async startSession(deviceCode: string, n?: number, totalSessions?: number): Promise<void> {
    const number = n ? `[${n}${totalSessions ? `/${totalSessions}: ${deviceCode}` : ''}]` : '';

    const existing = this.sessions.get(deviceCode);
    if (this.startingSessions.has(deviceCode)) {
      console.log(`⚠️ ${number} Sedang inisialisasi, abaikan duplikasi`);

      return;
    }

    if (existing) {
      const isActive = this.connectedNow.has(deviceCode);
      if (isActive) {
        console.log(`⚠️ ${number} Sesi aktif, abaikan inisialisasi`);
        return;
      }
      
      try { existing.end?.(undefined); } catch { }
      this.sessions.delete(deviceCode);
    }

    this.startingSessions.add(deviceCode);

    try {
      console.log(`🔄 ${number} Melakukan inisialisasi sesi`);

      const device = await this.prisma.device.findFirst({
        where: {
          code: deviceCode,
          deleted_at: null
        },
        select: {
          status: true,
          name: true,
        },
      });

      const sessionPath = path.join(this.sessionsDir, deviceCode);

      if (!device) {
        console.log(`❌ ${number} Device sudah dihapus, hentikan inisialisasi sesi`);

        return;
      }

      if (device.status === DeviceStatus.DISCONNECTED) {
        console.log(`❌ ${number} Status device adalah DISCONNECTED, hentikan inisialisasi sesi`);

        return;
      }

      if (device.status === DeviceStatus.FAILED_CONNECT) {
        console.log(`♻️  ${number} FAILED_CONNECT → start fresh pairing`);

        // bersihkan state lokal
        this.sessions.delete(deviceCode);
        this.connectedNow.delete(deviceCode);
        this.lastQrByDevice.delete(deviceCode);
        this.scannedPending.delete(deviceCode);

        // hapus folder creds biar QR benar2 fresh
        this.safeDeleteSessionFolder(sessionPath);
      }

      const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
      const { version } = await fetchLatestBaileysVersion();

      const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        browser: [device.name, 'Chrome', '1.0.0'],
      });

      sock.ev.on('connection.update', async (update: any) => {
        const { connection, lastDisconnect, qr } = update;

        console.log(`📱 ${number} Koneksi update`, { connection });

        if (connection === 'open') {
          console.log(`✅ ${number} connection:open`);

          if (this.forceLogoutOnOpen.has(deviceCode)) {
            try {
              await sock.logout();
            } catch (e) {
              console.warn(`⚠️ logout on open gagal: ${deviceCode}`, e);
            } finally {
              this.forceLogoutOnOpen.delete(deviceCode);
            }

            return;
          }

          const user = sock.user;
          const phone = user?.id ? user.id.split(':')[0] : null;

          // 1) Idempotent transition
          const res = await this.prisma.device.updateMany({
            where: {
              code: deviceCode,
              status: {
                in: [DeviceStatus.PENDING_CONNECT, DeviceStatus.RECONNECTING, DeviceStatus.FAILED_CONNECT]
              },
            },
            data: {
              status: DeviceStatus.CONNECTED,
              updated_at: new Date(),
            },
          });

          // 2) Selalu refresh metadata (tanpa mengubah status kalau sudah CONNECTED)
          await this.prisma.device.update({
            where: { code: deviceCode },
            data: {
              phone_number: phone ?? undefined,
              device_id: user?.id ?? undefined,
              updated_at: new Date(),
            },
          });

          // 3) Emit hanya saat benar-benar transisi
          if (res.count > 0) {
            this.emitToDeviceRoom(deviceCode, 'device-connected', {
              deviceCode,
              message: 'Berhasil terhubung ke WhatsApp',
              user: { id: user?.id, name: user?.name, phone },
              timestamp: new Date().toISOString(),
            });
          }

          // 4) Rapikan state lokal SELALU
          this.lastQrByDevice.delete(deviceCode);
          this.scannedPending.delete(deviceCode);
          this.connectedNow.add(deviceCode);

          return;
        }

        if (connection == 'close') {
          console.log(`❌ ${number} connection:close`);

          const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
          const disconnectReason = (lastDisconnect?.error as Boom)?.output?.statusCode;
          const hadOpen = this.connectedNow.has(deviceCode);

          console.log(`❌ ${number} Alasan disconnect:`, disconnectReason);
          console.log(`❌ ${number} Bisa reconnect?`, shouldReconnect);
          console.log(`❌ ${number} Sebelumnya connected?`, hadOpen);

          if (disconnectReason === DisconnectReason.timedOut) {
            console.log(`🔄 ${number} Alasan disconnect: timedOut`);

            // Matikan socket & bersihkan state dasar
            try { sock.end?.(undefined); } catch { }
            this.sessions.delete(deviceCode);
            this.connectedNow.delete(deviceCode);
            this.lastQrByDevice.delete(deviceCode);
            this.scannedPending.delete(deviceCode);

            // update status DB ke FAILED_CONNECT
            await this.prisma.device.updateMany({
              where: {
                code: deviceCode,
                status: {
                  not: DeviceStatus.DISCONNECTED
                }
              },
              data: {
                status: DeviceStatus.FAILED_CONNECT,
                updated_at: new Date()
              }
            });

            console.log(`❌ ${number} Status device ${deviceCode} menjadi FAILED_CONNECT`);

            this.emitToDeviceRoom(deviceCode, 'connection-status', {
              deviceCode,
              status: 'time-out',
              message: 'QR kedaluwarsa. Silahkan coba lagi.',
              timestamp: new Date().toISOString(),
            });

            return;
          }
          else if (disconnectReason === DisconnectReason.connectionLost) {
            console.log(`🔄 ${number} Alasan disconnect: connectionLost`);
          }
          else if (disconnectReason === DisconnectReason.restartRequired) {
            console.log(`🔄 ${number} Alasan disconnect: restartRequired`);

            try {
              sock.end?.(undefined);
            }
            catch { }

            this.sessions.delete(deviceCode);

            if (this.lastQrByDevice.has(deviceCode)) {
              this.scannedPending.add(deviceCode);
            }

            this.lastQrByDevice.delete(deviceCode);

            this.emitToDeviceRoom(deviceCode, 'connection-status', {
              deviceCode,
              status: 'reconnecting',
              message: 'Restart session…',
              timestamp: new Date().toISOString()
            });

            await this.prisma.device.updateMany({
              where: {
                code: deviceCode,
                status: {
                  not: DeviceStatus.DISCONNECTED
                }
              },
              data: {
                status: DeviceStatus.RECONNECTING,
                updated_at: new Date()
              }
            });

            const current = await this.prisma.device.findFirst({
              where: { code: deviceCode },
              select: { status: true, deleted_at: true },
            });

            if (!current || current.deleted_at || current.status === DeviceStatus.DISCONNECTED) {
              console.log(`🛑 Batalkan retry: device tidak eligible`);

              return;
            }

            const delayMs = 1000;
            setTimeout(() => {
              this.startSession(deviceCode).catch(() => { });
            }, delayMs);

            return;
          }
          else if (disconnectReason === DisconnectReason.loggedOut) {
            // Pusat cleanup
            try { sock.end?.(undefined); } catch { }
            this.sessions.delete(deviceCode);
            this.connectedNow.delete(deviceCode);
            this.lastQrByDevice.delete(deviceCode);
            this.scannedPending.delete(deviceCode);
            this.safeDeleteSessionFolder(path.join(this.sessionsDir, deviceCode));

            const res = await this.prisma.device.updateMany({
              where: { code: deviceCode, deleted_at: null, status: { not: DeviceStatus.DISCONNECTED } },
              data: { status: DeviceStatus.DISCONNECTED, updated_at: new Date() },
            });

            // Emit hanya jika BUKAN manual-disconnect in-progress
            if (!this.disconnecting.has(deviceCode) && res.count > 0) {
              this.emitToDeviceRoom(deviceCode, 'device-disconnected', {
                deviceCode,
                reason: 'logged-out',
                message: 'Anda telah logout dari WhatsApp. Silakan scan ulang untuk terhubung kembali.',
                timestamp: new Date().toISOString(),
              });
            }

            return;
          }

          if (shouldReconnect) {
            console.log(`🔄 ${number} Status device ${deviceCode} menjadi RECONNECTING`);

            await this.prisma.device.updateMany({
              where: {
                code: deviceCode,
              },
              data: {
                status: DeviceStatus.RECONNECTING,
                updated_at: new Date(),
              },
            });

            try { sock.end?.(undefined); } catch { }
            this.sessions.delete(deviceCode);
            this.connectedNow.delete(deviceCode);
            this.lastQrByDevice.delete(deviceCode);
            this.scannedPending.delete(deviceCode);

            console.log(`🔄 ${number} Mencoba reconnect dalam 5 detik...`);
            setTimeout(() => {
              this.startSession(deviceCode);
            }, 5000);

            return;
          }

          this.connectedNow.delete(deviceCode);
          return;
        }

        if (connection == 'connecting') {
          console.log(`🔄 ${number} connection:connecting`);

          if (this.scannedPending.has(deviceCode)) {
            this.emitToDeviceRoom(deviceCode, 'connection-status', {
              deviceCode,
              status: 'scan-success',
              message: 'Mengubungkan ke WhatsApp…',
              timestamp: new Date().toISOString(),
            });

            this.scannedPending.delete(deviceCode);
          }
        }

        if (qr) {
          console.log(`📸 ${number} QR code diterima`);

          if (this.connectedNow.has(deviceCode) || sock.user?.id) {
            this.lastQrByDevice.delete(deviceCode);

            return;
          }

          const last = this.lastQrByDevice.get(deviceCode);
          if (last !== qr) {
            this.lastQrByDevice.set(deviceCode, qr);

            this.emitToDeviceRoom(deviceCode, 'qr-updated', {
              deviceCode,
              qr,
              expiresAt: new Date(Date.now() + 20_000).toISOString(),
              timestamp: new Date().toISOString(),
            });

            await this.prisma.device.updateMany({
              where: {
                code: deviceCode,
                status: {
                  not: DeviceStatus.CONNECTED,
                },
              },
              data: {
                status: DeviceStatus.PENDING_CONNECT,
                updated_at: new Date()
              },
            });

            console.log(`📸 ${number} QR dikirim ke client & status → PENDING_CONNECT`);
          }

          this.scannedPending.delete(deviceCode);
          return;
        }
      });

      sock.ev.on('creds.update', saveCreds);

      sock.ev.on('messages.upsert', async (m) => {
        const messages = m.messages;

        for (const message of messages) {
          await this.ChatEngine.handleIncomingMessage(deviceCode, message);
        }
      });

      if (!this.sessions.has(deviceCode)) {
        this.sessions.set(deviceCode, sock);

        console.log(`🧠 ${number} Session disimpan di memory`);
      }

      console.log(`✅ ${number} Sesi selesai diinisialisasi`);
    }
    catch (error) {
      console.error(`❌ Error memulai sesi untuk device ${deviceCode}:`, error);
    }
    finally {
      this.startingSessions.delete(deviceCode);
    }
  }

  /**
  * Cek kesehatan folder sesi (kredensial Baileys) untuk sebuah device.
  * Menganggap sehat minimal jika:
  *  - folder device ada
  *  - file creds.json ada
  * (Folder "keys" tidak wajib dicek keberadaannya di sini — Baileys akan membuat/merapikannya.)
  *
  * @param sessionPath - Path absolut folder sesi (…/sessions/<deviceCode>)
  * @returns true jika sehat, false jika tidak/korup/tidak ada
  */
  isSessionFolderHealthy(sessionPath: string): boolean {
    try {
      if (!fs.existsSync(sessionPath)) return false;

      const creds = path.join(sessionPath, "creds.json");
      const keysDir = path.join(sessionPath, "keys");

      if (!fs.existsSync(creds)) return false;

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Menghapus folder sesi secara aman (idempotent).
   * Gunakan saat melakukan "fresh pairing" atau saat device tidak lagi eligible.
   *
   * @param sessionPath - Path absolut folder sesi (…/sessions/<deviceCode>)
   */
  safeDeleteSessionFolder(sessionPath: string): void {
    try {
      if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
      }
    } catch (e) {
      console.warn("⚠️ Gagal hapus folder sesi:", sessionPath, e);
    }
  }

  /**
   * Menghapus semua folder sesi yang tidak lagi "eligible" menurut DB.
   * Definisi orphan:
   *  - Folder ada di disk, tapi device code-nya tidak ada di hasil query eligible (deleted/disabled/unknown).
   *
   * Dipanggil saat boot untuk menjaga hygiene storage.
   *
   * @param sessionsDir - Root folder semua sesi (mis. …/sessions)
   * @param eligibleCodesFromDB - Set berisi deviceCode yang masih eligible menurut DB
   */
  async reconcileOrphanSessionFolders(
    sessionsDir: string,
    eligibleCodesFromDB: Set<string>
  ): Promise<void> {
    if (!fs.existsSync(sessionsDir)) return;

    const dirents = fs.readdirSync(sessionsDir, { withFileTypes: true });
    for (const d of dirents) {
      if (!d.isDirectory()) continue;

      const code = d.name;
      if (!eligibleCodesFromDB.has(code)) {
        const p = path.join(sessionsDir, code);
        this.safeDeleteSessionFolder(p);

        console.log(`🧹 Hapus folder sesi yatim: ${code}`);
      }
    }
  }

  /**
   * Menjaga konsistensi status DB ↔️ kondisi folder kredensial di disk.
   * - Jika DB bilang CONNECTED tetapi folder sesi tidak sehat/hilang,
   *   turunkan status ke PENDING_CONNECT agar aplikasi menerbitkan QR ulang.
   *
   * @param device - Minimal info device (code + status)
   */
  async ensureCredsConsistency(
    device: { code: string; status: string }
  ): Promise<void> {
    const sessionPath = path.join(this.sessionsDir, device.code);
    const healthy = this.isSessionFolderHealthy(sessionPath);

    // CONNECTED tapi folder creds hilang/korup → paksa PENDING_CONNECT
    if (device.status === "CONNECTED" && !healthy) {
      await this.prisma.device.update({
        where: { code: device.code },
        data: { status: "PENDING_CONNECT" },
      });
      console.log(
        `🔻 Downgrade ${device.code}: CONNECTED → PENDING_CONNECT (folder kredensial hilang/korup)`
      );
    }
  }

  /**
   * Boot-time routine:
   *  1) Ambil daftar device "eligible" dari DB (CONNECTED, PENDING_CONNECT, RECONNECTING, FAILED_CONNECT)
   *  2) Hapus folder sesi yatim (yang tidak ada di daftar eligible)
   *  3) Sinkronkan status DB jika kredensial disk tidak sehat (CONNECTED → PENDING_CONNECT)
   *  4) Start session untuk tiap device secara serialized (biar log rapi & hindari lonjakan I/O)
   *
   * Catatan desain:
   *  - Tidak memproses DISCONNECTED & deleted_at != null
   *  - FAILED_CONNECT tetap ikut: startSession akan melakukan "fresh pairing"
   */
  async loadExistingSessions() {
    console.log("🔄 Rekonsiliasi DB ↔️ folder sessions…");

    type BootDevice = { code: string; status: DeviceStatus; name: string | null };

    // Hanya device yang masuk pipeline pairing/connected
    const devices: BootDevice[] = await this.prisma.device.findMany({
      where: {
        deleted_at: null,
        status: {
          in: [
            DeviceStatus.CONNECTED,
            DeviceStatus.PENDING_CONNECT,
            DeviceStatus.RECONNECTING,
            DeviceStatus.FAILED_CONNECT,
          ],
        },
      },
      select: {
        code: true,
        status: true,
        name: true,
      },
    });

    console.log(`🧩 Ditemukan ${devices.length} device eligible di DB`);

    // (1) Bersihkan folder yatim di disk agar storage tetap higienis
    const eligibleSet = new Set<string>(devices.map((d) => d.code));
    await this.reconcileOrphanSessionFolders(this.sessionsDir, eligibleSet);

    // (2) Perbaiki mismatch DB vs disk untuk kasus kredensial hilang
    for (const d of devices) {
      await this.ensureCredsConsistency({
        code: d.code,
        status: d.status,
      });
    }

    // (3) Start session satu per satu
    let i = 1;
    for (const d of devices) {
      console.log(`🔄 [${i}/${devices.length}] Memuat sesi ${d.code} (${d.status})`);
      try {
        await this.startSession(d.code, i, devices.length);
      } catch (e) {
        console.error(`❌ Gagal start ${d.code}:`, e);
      }
      i++;
    }

    console.log("✅ Selesai rekonsiliasi & boot.");
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
  * Disconnect device secara manual (admin action).
  * Syarat: status di DB HARUS CONNECTED.
  * Langkah:
  *  1) Verifikasi device & status CONNECTED (dan belum dihapus).
  *  2) Kalau ada session socket → logout() lalu end().
  *  3) Bersihkan semua state lokal (maps/flags).
  *  4) Hapus folder kredensial (jika ada).
  *  5) Update DB → DISCONNECTED.
  *  6) Emit event ke UI.
  * Idempotent: aman dipanggil berulang, tidak akan meledak.
  */
  async disconnectDevice(deviceCode: string): Promise<void> {
    console.log(`🔌 Disconnecting device: ${deviceCode}`);

    if (this.disconnecting.has(deviceCode)) return;
    this.disconnecting.add(deviceCode);

    try {
      const device = await this.prisma.device.findFirst({
        where: { code: deviceCode, deleted_at: null },
        select: { status: true },
      });
      if (!device) throw new NotFoundError(`Device ${deviceCode} tidak ditemukan / sudah dihapus`);

      if (device.status !== DeviceStatus.CONNECTED) {
        console.log(`🛑 ${deviceCode} status=${device.status}, skip manual disconnect (no-op)`);
        return;
      }

      // 1) Kalau ada session aktif: cukup logout → nanti close:401 beresin
      const live = this.sessions.get(deviceCode);
      if (live) {
        try { await live.logout(); console.log(`🚪 logout() dikirim: ${deviceCode}`); }
        catch (e) { console.warn(`⚠️ logout() gagal ${deviceCode}:`, e); }

        // Jangan cleanup/emit di sini. Tunggu close:401.
        return;
      }

      // 2) Tidak ada session aktif: minta socket baru login lalu langsung logout saat open
      const sessionPath = path.join(this.sessionsDir, deviceCode);
      if (fs.existsSync(sessionPath)) {
        this.forceLogoutOnOpen.add(deviceCode);
        // Gunakan jalur normal supaya handler connection.update terpasang
        // Pastikan startSession TIDAK menolak status CONNECTED
        // (punyamu sudah boleh start utk CONNECTED).
        await this.startSession(deviceCode);
        // Setelah open → handler akan logout, lalu close:401 → cleanup terpusat
      } else {
        // Tidak ada creds → tidak bisa logout programatik, biarkan UI HP refresh/hapus manual
        console.log(`ℹ️ Tidak ada folder creds untuk ${deviceCode}, tidak bisa logout programatik`);
        // Boleh optionally jadikan DISCONNECTED di DB + emit, tapi kamu bilang cleanup di handler close,
        // jadi di sini kita no-op & biarkan status tetap. Atau:
        // await this.prisma.device.updateMany({ where: { code: deviceCode, deleted_at: null },
        //   data: { status: DeviceStatus.DISCONNECTED, updated_at: new Date() } });
        // (Terserah kebijakanmu.)
      }
    } finally {
      // selesai: biarkan handler close:401 yang emit/cleanup
      this.disconnecting.delete(deviceCode);
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
   * @param media - URL string gambar
   */
  async sendImageMessage(deviceCode: string, phoneNumber: string, caption: string, media: string): Promise<void> {
    try {
      console.log(`📤 Sending image message from device ${deviceCode} to ${phoneNumber}`);

      // Get active session for the device
      const session = this.getSession(deviceCode);
      if (!session) {
        throw new NotFoundError(`No active session found for device: ${deviceCode}`);
      }

      // Format phone number for WhatsApp (add @s.whatsapp.net)
      const formattedNumber = `${phoneNumber}@s.whatsapp.net`;

      // Send image message with URL
      await session.sendMessage(formattedNumber, {
        image: { url: media },
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
  async sendVideoMessage(deviceCode: string, phoneNumber: string, caption: string, youtubeVideoId: string): Promise<void> {
    try {
      console.log(`📤 Sending YouTube video link from device ${deviceCode} to ${phoneNumber}`);

      // Get active session for the device
      const session = this.getSession(deviceCode);
      if (!session) {
        throw new NotFoundError(`No active session found for device: ${deviceCode}`);
      }

      // Format phone number for WhatsApp (add @s.whatsapp.net)
      const formattedNumber = `${phoneNumber}@s.whatsapp.net`;

      // Get YouTube thumbnail URL (high quality)
      const thumbnailUrl = `https://img.youtube.com/vi/${youtubeVideoId}/maxresdefault.jpg`;
      const youtubeUrl = `https://youtu.be/${youtubeVideoId}`;

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
}
