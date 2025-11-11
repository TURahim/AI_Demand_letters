/**
 * Comments API
 */
import { apiClient, ApiResponse } from './client';

export interface Comment {
  id: string;
  letterId: string;
  userId: string;
  parentId?: string;
  content: string;
  position?: {
    line?: number;
    column?: number;
    offset?: number;
  };
  isResolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  resolver?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  replies?: Comment[];
}

export interface CreateCommentDto {
  content: string;
  parentId?: string;
  position?: {
    line?: number;
    column?: number;
    offset?: number;
  };
}

export interface UpdateCommentDto {
  content?: string;
  position?: {
    line?: number;
    column?: number;
    offset?: number;
  };
}

export const commentsApi = {
  /**
   * Create a comment on a letter
   */
  async createComment(
    letterId: string,
    data: CreateCommentDto
  ): Promise<ApiResponse<{ comment: Comment }>> {
    return apiClient.post<{ comment: Comment }>(`/letters/${letterId}/comments`, data);
  },

  /**
   * Get comments for a letter
   */
  async getComments(
    letterId: string,
    options?: {
      includeResolved?: boolean;
      parentId?: string | null;
    }
  ): Promise<ApiResponse<{ comments: Comment[] }>> {
    const params = new URLSearchParams();
    if (options?.includeResolved !== undefined) {
      params.append('includeResolved', options.includeResolved.toString());
    }
    if (options?.parentId !== undefined) {
      params.append('parentId', options.parentId === null ? 'null' : options.parentId);
    }

    const query = params.toString();
    return apiClient.get<{ comments: Comment[] }>(
      `/letters/${letterId}/comments${query ? `?${query}` : ''}`
    );
  },

  /**
   * Get a single comment
   */
  async getComment(commentId: string): Promise<ApiResponse<{ comment: Comment }>> {
    return apiClient.get<{ comment: Comment }>(`/comments/${commentId}`);
  },

  /**
   * Update a comment
   */
  async updateComment(
    commentId: string,
    data: UpdateCommentDto
  ): Promise<ApiResponse<{ comment: Comment }>> {
    return apiClient.put<{ comment: Comment }>(`/comments/${commentId}`, data);
  },

  /**
   * Delete a comment
   */
  async deleteComment(commentId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/comments/${commentId}`);
  },

  /**
   * Resolve a comment
   */
  async resolveComment(commentId: string): Promise<ApiResponse<{ comment: Comment }>> {
    return apiClient.post<{ comment: Comment }>(`/comments/${commentId}/resolve`);
  },

  /**
   * Unresolve a comment
   */
  async unresolveComment(commentId: string): Promise<ApiResponse<{ comment: Comment }>> {
    return apiClient.post<{ comment: Comment }>(`/comments/${commentId}/unresolve`);
  },

  /**
   * Get comment count for a letter
   */
  async getCommentCount(
    letterId: string,
    includeResolved: boolean = true
  ): Promise<ApiResponse<{ count: number }>> {
    const params = new URLSearchParams({ includeResolved: includeResolved.toString() });
    return apiClient.get<{ count: number }>(
      `/letters/${letterId}/comments/count?${params.toString()}`
    );
  },
};

