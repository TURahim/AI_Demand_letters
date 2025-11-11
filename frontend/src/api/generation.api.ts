/**
 * Generation API
 */
import { apiClient, ApiResponse } from './client';

export interface GenerationRequest {
  caseType: string;
  incidentDate: string | Date;
  incidentDescription: string;
  location?: string;
  clientName: string;
  clientContact?: string;
  defendantName: string;
  defendantAddress?: string;
  damages?: {
    medical?: number;
    lostWages?: number;
    propertyDamage?: number;
    painAndSuffering?: number;
    other?: Record<string, number>;
    itemizedMedical?: Array<{ description: string; amount: number }>;
    notes?: string;
  };
  documentIds?: string[];
  templateId?: string;
  specialInstructions?: string;
  tone?: 'professional' | 'firm' | 'conciliatory';
  temperature?: number;
  maxTokens?: number;
}

export interface GenerationResponse {
  letterId: string;
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  message: string;
}

export interface GenerationStatus {
  jobId: string;
  letterId?: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  error?: string;
  letter?: {
    id: string;
    title: string;
    content: any;
    status: string;
  };
}

export const generationApi = {
  /**
   * Start letter generation
   */
  async startGeneration(data: GenerationRequest): Promise<ApiResponse<GenerationResponse>> {
    return apiClient.post<GenerationResponse>('/generation/start', data);
  },

  /**
   * Get generation status
   */
  async getStatus(jobId: string): Promise<ApiResponse<{ status: GenerationStatus }>> {
    return apiClient.get<{ status: GenerationStatus }>(`/generation/${jobId}/status`);
  },

  /**
   * Cancel generation
   */
  async cancelGeneration(jobId: string): Promise<ApiResponse<void>> {
    return apiClient.post<void>(`/generation/${jobId}/cancel`);
  },
};

