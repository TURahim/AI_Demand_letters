/**
 * Templates API
 */
import { apiClient, ApiResponse } from './client';

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'currency';
  required: boolean;
  defaultValue?: any;
  description?: string;
  placeholder?: string;
}

export interface Template {
  id: string;
  name: string;
  description?: string;
  category?: string;
  content: any; // JSON content
  variables?: TemplateVariable[];
  isPublic: boolean;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateListResponse {
  templates: Template[];
}

export interface CreateTemplateData {
  name: string;
  description?: string;
  category?: string;
  content: any;
  variables?: TemplateVariable[];
  isPublic?: boolean;
}

export interface UpdateTemplateData {
  name?: string;
  description?: string;
  category?: string;
  content?: any;
  variables?: TemplateVariable[];
  isPublic?: boolean;
  isActive?: boolean;
}

export interface RenderTemplateData {
  data: Record<string, any>;
}

export const templatesApi = {
  /**
   * List templates
   */
  async listTemplates(params?: {
    category?: string;
    search?: string;
    isPublic?: boolean;
  }): Promise<ApiResponse<TemplateListResponse>> {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append('category', params.category);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.isPublic !== undefined) queryParams.append('isPublic', params.isPublic.toString());

    const query = queryParams.toString();
    return apiClient.get<TemplateListResponse>(`/templates${query ? `?${query}` : ''}`);
  },

  /**
   * Get template by ID
   */
  async getTemplate(id: string): Promise<ApiResponse<{ template: Template }>> {
    return apiClient.get<{ template: Template }>(`/templates/${id}`);
  },

  /**
   * Create template
   */
  async createTemplate(data: CreateTemplateData): Promise<ApiResponse<{ template: Template }>> {
    return apiClient.post<{ template: Template }>('/templates', data);
  },

  /**
   * Update template
   */
  async updateTemplate(id: string, data: UpdateTemplateData): Promise<ApiResponse<{ template: Template }>> {
    return apiClient.put<{ template: Template }>(`/templates/${id}`, data);
  },

  /**
   * Delete template
   */
  async deleteTemplate(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/templates/${id}`);
  },

  /**
   * Clone template
   */
  async cloneTemplate(id: string, name: string, description?: string): Promise<ApiResponse<{ template: Template }>> {
    return apiClient.post<{ template: Template }>(`/templates/${id}/clone`, { name, description });
  },

  /**
   * Render template with data
   */
  async renderTemplate(id: string, data: RenderTemplateData): Promise<ApiResponse<{ content: string }>> {
    return apiClient.post<{ content: string }>(`/templates/${id}/render`, data);
  },

  /**
   * Get template categories
   */
  async getCategories(): Promise<ApiResponse<{ categories: string[] }>> {
    return apiClient.get<{ categories: string[] }>('/templates/categories');
  },

  /**
   * Get popular templates
   */
  async getPopularTemplates(): Promise<ApiResponse<TemplateListResponse>> {
    return apiClient.get<TemplateListResponse>('/templates/popular');
  },
};

