import { PrismaClient } from '@/generated/prisma';
import type { ConsultationService, DeviceService } from '@/services';
import type { ChatEngine } from '@/services/app/chat-engine';
import type { WhatsAppService } from '@/services/app/whatsapp';
import type { HealthCheckService } from '@/services/app/health-check.service';

/**
 * Global app instance manager
 * Provides access to shared services across the application
 */
class AppInstanceManager {
  private static instance: AppInstanceManager;
  private whatsappService: WhatsAppService | null = null;
  private deviceService: DeviceService | null = null;
  private consultationService: ConsultationService | null = null;
  private chatEngine: ChatEngine | null = null;
  private healthCheckService: HealthCheckService | null = null;

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
  setChatEngine(service: ChatEngine): void {
    this.chatEngine = service;
  }

  /**
   * Get Chat service instance
   */
  getChatEngine(): ChatEngine | null {
    return this.chatEngine;
  }

  /**
   * Check if Chat service is initialized
   */
  isChatEngineInitialized(): boolean {
    return this.chatEngine !== null;
  }

  /**
   * Set Health Check service instance
   */
  setHealthCheckService(service: HealthCheckService): void {
    this.healthCheckService = service;
  }

  /**
   * Get Health Check service instance
   */
  getHealthCheckService(): HealthCheckService | null {
    return this.healthCheckService;
  }

  /**
   * Check if Health Check service is initialized
   */
  isHealthCheckServiceInitialized(): boolean {
    return this.healthCheckService !== null;
  }

  /**
   * Set Consultation service instance
   */
  setConsultationService(service: ConsultationService): void {
    this.consultationService = service;
  }

  /**
   * Get Consultation service instance
   */
  getConsultationService(): ConsultationService | null {
    return this.consultationService;
  }

  /**
   * Check if Consultation service is initialized
   */
  isConsultationServiceInitialized(): boolean {
    return this.consultationService !== null;
  }
}

export const appInstanceManager = AppInstanceManager.getInstance();