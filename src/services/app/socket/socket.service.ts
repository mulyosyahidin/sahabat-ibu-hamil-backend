import { Server as SocketIOServer } from 'socket.io';

export class SocketService {
  private io: SocketIOServer;

  constructor(io: SocketIOServer) {
    this.io = io;
  }

  /**
   * Emit event ke room spesifik device
   * @param deviceCode - Kode device untuk menentukan room
   * @param eventName - Nama event yang akan di-emit
   * @param data - Data yang akan dikirim
   */
  emitToDeviceRoom(deviceCode: string, eventName: string, data: any): void {
    const roomName = `device-${deviceCode}`;
    console.log(`📡 Emitting '${eventName}' to room: ${roomName}`, data);
    this.io.to(roomName).emit(eventName, data);
  }

  /**
   * Emit event ke semua client yang terhubung
   * @param eventName - Nama event yang akan di-emit
   * @param data - Data yang akan dikirim
   */
  emitToAll(eventName: string, data: any): void {
    console.log(`📡 Broadcasting '${eventName}' to all clients`, data);
    this.io.emit(eventName, data);
  }

  /**
   * Emit event ke socket spesifik
   * @param socketId - ID socket yang akan menerima event
   * @param eventName - Nama event yang akan di-emit
   * @param data - Data yang akan dikirim
   */
  emitToSocket(socketId: string, eventName: string, data: any): void {
    console.log(`📡 Emitting '${eventName}' to socket: ${socketId}`, data);
    this.io.to(socketId).emit(eventName, data);
  }

  /**
   * Get jumlah client dalam room tertentu
   * @param roomName - Nama room
   * @returns Promise<number> - Jumlah client dalam room
   */
  async getRoomSize(roomName: string): Promise<number> {
    const sockets = await this.io.in(roomName).fetchSockets();
    
    return sockets.length;
  }

  /**
   * Get daftar socket ID dalam room tertentu
   * @param roomName - Nama room
   * @returns Promise<string[]> - Array socket ID dalam room
   */
  async getSocketsInRoom(roomName: string): Promise<string[]> {
    const sockets = await this.io.in(roomName).fetchSockets();

    return sockets.map(socket => socket.id);
  }

  /**
   * Emit connection status ke room device
   * @param deviceCode - Kode device
   * @param status - Status koneksi
   * @param message - Pesan tambahan
   */
  emitConnectionStatus(deviceCode: string, status: string, message?: string): void {
    this.emitToDeviceRoom(deviceCode, 'connection-status', {
      deviceCode,
      status,
      message,
      timestamp: new Date().toISOString()
    });
  }
}