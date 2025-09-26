/**
 * Paginated Response Models
 * 
 * Provides standardized pagination structures that can be extended
 * by other response models for consistent paginated API responses.
 */

/**
 * Base pagination metadata interface
 */
export interface PaginationMeta {
  /** Current page number (1-based) */
  page: number;
  /** Number of items per page */
  limit: number;
  /** Total number of items across all pages */
  total: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there is a next page */
  hasNext: boolean;
  /** Whether there is a previous page */
  hasPrev: boolean;
}

/**
 * Generic paginated response interface
 * 
 * @template T - Type of the items in the data array
 */
export interface PaginatedResponse<T> {
  /** Array of items for the current page */
  data: T[];
  /** Pagination metadata */
  pagination: PaginationMeta;
}

/**
 * Helper class to create paginated responses
 */
export class PaginatedResponseHelper {
  /**
   * Create a paginated response with metadata
   * 
   * @template T - Type of the items
   * @param data - Array of items for current page
   * @param page - Current page number
   * @param limit - Items per page
   * @param total - Total number of items
   * @returns Paginated response with metadata
   */
  static create<T>(
    data: T[],
    page: number,
    limit: number,
    total: number
  ): PaginatedResponse<T> {
    const totalPages = Math.ceil(total / limit);
    
    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }
}