/**
 * Letters API
 */
import { apiClient, ApiResponse } from './client';

export interface Letter {
  id: string;
  firmId: string;
  createdBy: string;
  documentId?: string;
  templateId?: string;
  title: string;
  content: any; // JSON content (TipTap)
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'SENT' | 'ARCHIVED';
  version: number;
  metadata?: any;
  aiPrompt?: string;
  aiResponse?: string;
  exportedAt?: string;
  exportFormat?: string;
  createdAt: string;
  updatedAt: string;
  sourceDocuments?: Array<{
    id: string;
    documentId: string;
    order: number;
    role?: string;
    document: {
      id: string;
      fileName: string;
      mimeType: string;
      fileSize: number;
      extractedText?: string;
      createdAt: string;
    };
  }>;
}

export interface LetterListResponse {
  letters: Letter[];
  total: number;
  page: number;
  pages: number;
}

export interface LetterVersion {
  id: string;
  letterId: string;
  version: number;
  content: any;
  changes?: any;
  createdBy: string;
  createdAt: string;
}

export interface UpdateLetterData {
  title?: string;
  content?: any;
  status?: Letter['status'];
  metadata?: any;
}

export const lettersApi = {
  /**
   * List letters
   */
  async listLetters(params?: {
    page?: number;
    limit?: number;
    status?: string;
    createdBy?: string;
    search?: string;
    templateId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<LetterListResponse>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.createdBy) queryParams.append('createdBy', params.createdBy);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.templateId) queryParams.append('templateId', params.templateId);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);

    const query = queryParams.toString();
    return apiClient.get<LetterListResponse>(`/letters${query ? `?${query}` : ''}`);
  },

  /**
   * Get letter by ID
   */
  async getLetter(id: string): Promise<ApiResponse<{ letter: Letter }>> {
    return apiClient.get<{ letter: Letter }>(`/letters/${id}`);
  },

  /**
   * Update letter
   */
  async updateLetter(id: string, data: UpdateLetterData): Promise<ApiResponse<{ letter: Letter }>> {
    return apiClient.put<{ letter: Letter }>(`/letters/${id}`, data);
  },

  /**
   * Delete letter
   */
  async deleteLetter(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/letters/${id}`);
  },

  /**
   * Get letter versions
   */
  async getVersions(id: string): Promise<ApiResponse<{ versions: LetterVersion[] }>> {
    return apiClient.get<{ versions: LetterVersion[] }>(`/letters/${id}/versions`);
  },

  /**
   * Get document IDs associated with letter
   */
  async getDocumentIds(id: string): Promise<ApiResponse<{ documentIds: string[] }>> {
    return apiClient.get<{ documentIds: string[] }>(`/letters/${id}/documents`);
  },

  /**
   * Get letter statistics
   */
  async getStats(): Promise<ApiResponse<{
    stats: {
      total: number;
      byStatus: Record<string, number>;
      thisMonth: number;
      thisWeek: number;
    };
  }>> {
    return apiClient.get<{
      stats: {
        total: number;
        byStatus: Record<string, number>;
        thisMonth: number;
        thisWeek: number;
      };
    }>('/letters/stats');
  },
};

