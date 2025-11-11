/**
 * Documents API
 */
import { apiClient, ApiResponse } from './client';

export interface Document {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'QUARANTINED';
  extractedText?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentListResponse {
  documents: Document[];
  total: number;
  page: number;
  pages: number;
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  s3Key: string;
  expiresIn: number;
}

export const documentsApi = {
  /**
   * Get presigned URL for upload
   */
  async getPresignedUrl(fileName: string, fileType: string, fileSize: number): Promise<ApiResponse<PresignedUrlResponse>> {
    return apiClient.post<PresignedUrlResponse>('/upload/presigned-url', {
      fileName,
      fileType,
      fileSize,
    });
  },

  /**
   * Complete upload after file is uploaded to S3
   */
  async completeUpload(
    s3Key: string,
    fileName: string,
    fileType: string,
    fileSize: number,
    fileHash: string
  ): Promise<ApiResponse<{ document: Document }>> {
    return apiClient.post<{ document: Document }>('/upload/complete', {
      s3Key,
      fileName,
      fileType,
      fileSize,
      fileHash,
    });
  },

  /**
   * List documents
   */
  async listDocuments(params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<ApiResponse<DocumentListResponse>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);

    const query = queryParams.toString();
    return apiClient.get<DocumentListResponse>(`/documents${query ? `?${query}` : ''}`);
  },

  /**
   * Get document by ID
   */
  async getDocument(id: string): Promise<ApiResponse<{ document: Document }>> {
    return apiClient.get<{ document: Document }>(`/documents/${id}`);
  },

  /**
   * Delete document
   */
  async deleteDocument(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/documents/${id}`);
  },

  /**
   * Download document
   */
  async downloadDocument(id: string): Promise<Blob | null> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`http://localhost:3001/api/v1/documents/${id}/download`, {
        headers,
      });

      if (!response.ok) {
        return null;
      }

      return await response.blob();
    } catch {
      return null;
    }
  },
};

