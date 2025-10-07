/**
 * Chat Request Models
 * 
 * This file defines the request structures for chat endpoints.
 * These interfaces ensure type safety for incoming request data.
 * 
 * @author Sahabat Ibu Hamil Team
 * @version 1.0.0
 */

/**
 * Get All Chats Request - represents query parameters for retrieving chats with pagination
 */
export interface GetAllChatsRequest {
  page?: number;
  limit?: number;
  search?: string;
}

/**
 * Get Chat By ID Request - represents path parameters for retrieving a specific chat
 */
export interface GetChatByIdRequest {
  id: number;
}