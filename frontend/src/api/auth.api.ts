/**
 * Authentication API
 */
import { apiClient, ApiResponse } from './client';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  firmName: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  firmId: string;
}

export const authApi = {
  /**
   * Login user
   */
  async login(credentials: LoginCredentials): Promise<ApiResponse<{ tokens: AuthTokens; user: User }>> {
    const response = await apiClient.post<{ tokens: AuthTokens; user: User }>('/auth/login', credentials);
    
    if (response.status === 'success' && response.data.tokens) {
      // Store token
      const { setAuthToken } = await import('./client');
      setAuthToken(response.data.tokens.accessToken);
    }
    
    return response;
  },

  /**
   * Register new user
   */
  async register(data: RegisterData): Promise<ApiResponse<{ tokens: AuthTokens; user: User }>> {
    const response = await apiClient.post<{ tokens: AuthTokens; user: User }>('/auth/register', data);
    
    if (response.status === 'success' && response.data.tokens) {
      // Store token
      const { setAuthToken } = await import('./client');
      setAuthToken(response.data.tokens.accessToken);
    }
    
    return response;
  },

  /**
   * Logout user
   */
  async logout(): Promise<ApiResponse<void>> {
    const response = await apiClient.post<void>('/auth/logout');
    
    // Clear token regardless of response
    const { removeAuthToken } = await import('./client');
    removeAuthToken();
    
    return response;
  },

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<ApiResponse<{ user: User }>> {
    return apiClient.get<{ user: User }>('/auth/me');
  },

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<ApiResponse<{ tokens: AuthTokens }>> {
    const response = await apiClient.post<{ tokens: AuthTokens }>('/auth/refresh', { refreshToken });
    
    if (response.status === 'success' && response.data.tokens) {
      // Update stored token
      const { setAuthToken } = await import('./client');
      setAuthToken(response.data.tokens.accessToken);
    }
    
    return response;
  },
};

