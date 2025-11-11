/**
 * Export API
 */
import { apiClient, ApiResponse } from './client';

export interface LetterExport {
  id: string;
  letterId: string;
  format: 'DOCX' | 'PDF' | 'HTML';
  s3Key: string;
  s3Bucket: string;
  fileSize: number;
  downloadCount: number;
  expiresAt?: string;
  createdAt: string;
}

export interface ExportOptions {
  format?: 'DOCX' | 'PDF' | 'HTML';
  includeHeader?: boolean;
  includeFooter?: boolean;
  firmBranding?: boolean;
}

export interface ExportResponse {
  exportId: string;
  downloadUrl: string;
  expiresIn: number;
}

export interface DownloadUrlResponse {
  downloadUrl: string;
  fileName: string;
  expiresIn: number;
}

export const exportApi = {
  /**
   * Generate export for a letter
   */
  async generateExport(
    letterId: string,
    options?: ExportOptions
  ): Promise<ApiResponse<ExportResponse>> {
    return apiClient.post<ExportResponse>(`/letters/${letterId}/export`, {
      format: options?.format || 'DOCX',
      includeHeader: options?.includeHeader ?? true,
      includeFooter: options?.includeFooter ?? true,
      firmBranding: options?.firmBranding ?? true,
    });
  },

  /**
   * Get download URL for export
   */
  async getDownloadUrl(exportId: string): Promise<ApiResponse<DownloadUrlResponse>> {
    return apiClient.get<DownloadUrlResponse>(`/exports/${exportId}/download`);
  },

  /**
   * List exports for a letter
   */
  async listExports(letterId: string): Promise<ApiResponse<{ exports: LetterExport[] }>> {
    return apiClient.get<{ exports: LetterExport[] }>(`/letters/${letterId}/exports`);
  },

  /**
   * Delete export
   */
  async deleteExport(exportId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/exports/${exportId}`);
  },

  /**
   * Download export directly
   * Returns blob for immediate download
   */
  async downloadExport(exportId: string): Promise<{ blob: Blob; fileName: string } | null> {
    const response = await this.getDownloadUrl(exportId);

    if (response.status !== 'success' || !response.data) {
      return null;
    }

    try {
      const fileResponse = await fetch(response.data.downloadUrl);
      if (!fileResponse.ok) {
        return null;
      }

      const blob = await fileResponse.blob();
      return {
        blob,
        fileName: response.data.fileName,
      };
    } catch {
      return null;
    }
  },
};

