import { WhatsAppService } from '../services/whatsapp.service';
import { DeviceService } from '../services/device.service';
import { ChatService } from '../services/chat.service';

/**
 * Global app instance manager
 * Provides access to shared services across the application
 */
class AppInstanceManager {
  private static instance: AppInstanceManager;
  private whatsappService: WhatsAppService | null = null;
  private deviceService: DeviceService | null = null;
  private chatService: ChatService | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): AppInstanceManager {
    if (!AppInstanceManager.instance) {
      AppInstanceManager.instance = new AppInstanceManager();
    }
    return AppInstanceManager.instance;
  }

  /**
   * Set WhatsApp service instance
   */
  setWhatsAppService(service: WhatsAppService): void {
    this.whatsappService = service;
  }

  /**
   * Get WhatsApp service instance
   */
  getWhatsAppService(): WhatsAppService {
    if (!this.whatsappService) {
      throw new Error('WhatsApp service not initialized. Make sure to call setWhatsAppService first.');
    }
    return this.whatsappService;
  }

  /**
   * Set Device service instance
   */
  setDeviceService(service: DeviceService): void {
    this.deviceService = service;
  }

  /**
   * Get Device service instance
   */
  getDeviceService(): DeviceService | null {
    return this.deviceService;
  }

  /**
   * Check if WhatsApp service is initialized
   */
  isWhatsAppServiceInitialized(): boolean {
    return this.whatsappService !== null;
  }

  /**
   * Check if Device service is initialized
   */
  isDeviceServiceInitialized(): boolean {
    return this.deviceService !== null;
  }

  /**
   * Set Chat service instance
   */
  setChatService(service: ChatService): void {
    this.chatService = service;
  }

  /**
   * Get Chat service instance
   */
  getChatService(): ChatService | null {
    return this.chatService;
  }

  /**
   * Check if Chat service is initialized
   */
  isChatServiceInitialized(): boolean {
    return this.chatService !== null;
  }
}

export const appInstanceManager = AppInstanceManager.getInstance();