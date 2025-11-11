/**
 * Analytics API Client
 */

import { apiClient, ApiResponse } from './client';

export interface DashboardMetrics {
  totalDocuments: number;
  totalLetters: number;
  totalTemplates: number;
  activeUsers: number;
  documentsThisMonth: number;
  lettersThisMonth: number;
  recentActivity: ActivityItem[];
  lettersByStatus: StatusBreakdown[];
  documentsByType: TypeBreakdown[];
  dailyStats: DailyStats[]; // Last 7 days
}

export interface UsageStatistics {
  dailyStats: DailyStats[];
  weeklyStats: WeeklyStats[];
  monthlyStats: MonthlyStats[];
  topUsers: UserStats[];
}

export interface FirmStatistics {
  firmId: string;
  firmName: string;
  totalUsers: number;
  activeUsers: number;
  totalDocuments: number;
  totalLetters: number;
  totalTemplates: number;
  storageUsed: number;
  lastActivity: string | null;
}

export interface ActivityItem {
  id: string;
  type: 'document' | 'letter' | 'template' | 'user';
  action: string;
  description: string;
  timestamp: string;
  userId?: string;
  userName?: string;
}

export interface StatusBreakdown {
  status: string;
  count: number;
  percentage: number;
}

export interface TypeBreakdown {
  type: string;
  count: number;
  percentage: number;
}

export interface DailyStats {
  date: string;
  documents: number;
  letters: number;
  users: number;
}

export interface WeeklyStats {
  week: string;
  documents: number;
  letters: number;
  users: number;
}

export interface MonthlyStats {
  month: string;
  documents: number;
  letters: number;
  users: number;
}

export interface UserStats {
  userId: string;
  userName: string;
  documentsCreated: number;
  lettersCreated: number;
  lastActive: string | null;
}

export const analyticsApi = {
  /**
   * Get dashboard metrics
   */
  async getDashboardMetrics(): Promise<ApiResponse<{ metrics: DashboardMetrics }>> {
    return apiClient.get<{ metrics: DashboardMetrics }>('/analytics/dashboard');
  },

  /**
   * Get usage statistics
   */
  async getUsageStatistics(days: number = 30): Promise<ApiResponse<{ statistics: UsageStatistics }>> {
    return apiClient.get<{ statistics: UsageStatistics }>(`/analytics/usage?days=${days}`);
  },

  /**
   * Get firm statistics (admin/partner only)
   */
  async getFirmStatistics(): Promise<ApiResponse<{ statistics: FirmStatistics }>> {
    return apiClient.get<{ statistics: FirmStatistics }>('/analytics/firm-stats');
  },
};

