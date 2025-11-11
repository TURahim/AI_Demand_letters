/**
 * API Client Configuration
 * Handles all HTTP requests to the backend API
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_VERSION = 'v1';

export interface ApiError {
  status: 'error';
  message: string;
  errors?: Array<{ field: string; message: string }>;
}

export interface ApiSuccess<T = any> {
  status: 'success';
  message: string;
  data: T;
}

export type ApiResponse<T = any> = ApiSuccess<T> | ApiError;

/**
 * Get auth token from localStorage
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

/**
 * Set auth token in localStorage
 */
export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('auth_token', token);
}

/**
 * Remove auth token from localStorage
 */
export function removeAuthToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('auth_token');
}

/**
 * API Client class
 */
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  /**
   * Build full URL
   */
  private buildUrl(endpoint: string): string {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    return `${this.baseURL}/api/${API_VERSION}/${cleanEndpoint}`;
  }

  /**
   * Get default headers
   */
  private getHeaders(customHeaders?: Record<string, string>): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Handle API response
   */
  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      // Handle 401 Unauthorized - clear token and redirect to login
      // BUT: don't redirect if we're already on login/signup pages (to avoid reload that clears error toasts)
      if (response.status === 401) {
        removeAuthToken();
        if (typeof window !== 'undefined') {
          const currentPath = window.location.pathname;
          const isAuthPage = currentPath.startsWith('/auth/login') || currentPath.startsWith('/auth/signup');
          
          // Only redirect if we're NOT already on an auth page
          if (!isAuthPage) {
            window.location.href = '/auth/login';
          }
        }
      }

      return {
        status: 'error',
        message: data.message || `HTTP ${response.status}: ${response.statusText}`,
        errors: data.errors,
      };
    }

    return data as ApiResponse<T>;
  }

  /**
   * GET request
   */
  async get<T = any>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(this.buildUrl(endpoint), {
        method: 'GET',
        headers: this.getHeaders(),
        ...options,
      });

      return this.handleResponse<T>(response);
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Network error occurred',
      };
    }
  }

  /**
   * POST request
   */
  async post<T = any>(
    endpoint: string,
    body?: any,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(this.buildUrl(endpoint), {
        method: 'POST',
        headers: this.getHeaders(),
        body: body ? JSON.stringify(body) : undefined,
        ...options,
      });

      return this.handleResponse<T>(response);
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Network error occurred',
      };
    }
  }

  /**
   * PUT request
   */
  async put<T = any>(
    endpoint: string,
    body?: any,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(this.buildUrl(endpoint), {
        method: 'PUT',
        headers: this.getHeaders(),
        body: body ? JSON.stringify(body) : undefined,
        ...options,
      });

      return this.handleResponse<T>(response);
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Network error occurred',
      };
    }
  }

  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(this.buildUrl(endpoint), {
        method: 'DELETE',
        headers: this.getHeaders(),
        ...options,
      });

      return this.handleResponse<T>(response);
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Network error occurred',
      };
    }
  }

  /**
   * Upload file with FormData
   */
  async upload<T = any>(
    endpoint: string,
    formData: FormData,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    try {
      const token = getAuthToken();
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(this.buildUrl(endpoint), {
        method: 'POST',
        headers,
        body: formData,
        ...options,
      });

      return this.handleResponse<T>(response);
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Network error occurred',
      };
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export for testing or custom instances
export { ApiClient };

