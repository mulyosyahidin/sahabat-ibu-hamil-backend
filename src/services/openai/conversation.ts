/**
 * OpenAI Conversation Service
 * 
 * This service provides functions to manage OpenAI conversations using the Conversations API.
 * It integrates with the Chat model to create and manage conversation sessions.
 * 
 * @author Sahabat Ibu Hamil Team
 * @version 1.0.0
 */

import OpenAI from "openai";
import type { Chat } from "../../generated/prisma";
import { openaiConfig } from "../../config/openai";

// Types for OpenAI Conversation API
export interface ConversationCreateParams {
  chat: Chat;
  metadata?: Record<string, any>;
}

export interface ConversationResponse {
  id: string;
  object: string;
  created_at: number;
  metadata?: Record<string, any>;
}

export interface ConversationListResponse {
  object: string;
  data: ConversationResponse[];
  first_id?: string;
  last_id?: string;
  has_more: boolean;
}

/**
 * OpenAI Conversation Service Class
 */
export class ConversationService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: openaiConfig.apiKey,
      project: openaiConfig.projectName || undefined,
    });
  }

  /**
   * Create a new conversation for a chat
   * This function will be called when creating a new chat
   * 
   * @param params - Parameters including Chat object and optional metadata
   * @returns Promise<ConversationResponse>
   */
  async create(params: ConversationCreateParams): Promise<ConversationResponse | null> {
    if (!openaiConfig.enabled) {
      return null;
    }
    
    const { chat, metadata = {} } = params;

    try {
      // Prepare metadata with chat information (filter out undefined values)
      const baseMetadata = {
        chat_id: chat.id.toString(),
        device_id: chat.device_id.toString(),
        wa_number: chat.wa_number,
        created_at: chat.created_at.toISOString(),
        project: openaiConfig.projectName || 'sahabat-ibu-hamil',
        ...metadata
      };

      // Create conversation using OpenAI Conversations API
      const conversation = await this.client.conversations.create({
        metadata: baseMetadata
      });

      return conversation as ConversationResponse;
    } catch (error) {
      console.error('Error creating OpenAI conversation:', error);
      throw new Error(`Failed to create conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get conversation by ID
   * 
   * @param conversationId - The OpenAI conversation ID
   * @returns Promise<ConversationResponse>
   */
  async getById(conversationId: string): Promise<ConversationResponse> {
    try {
      const conversation = await this.client.conversations.retrieve(conversationId);
      return conversation as ConversationResponse;
    } catch (error) {
      console.error(`Error retrieving conversation ${conversationId}:`, error);
      throw new Error(`Failed to retrieve conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get the OpenAI client instance
   * Useful for advanced operations not covered by this service
   * 
   * @returns OpenAI client instance
   */
  getClient(): OpenAI {
    return this.client;
  }
}

// Export a default instance
export const conversationService = new ConversationService();

// Export individual functions for convenience
export const createConversation = (params: ConversationCreateParams) => conversationService.create(params);
export const getConversationById = (conversationId: string) => conversationService.getById(conversationId);
