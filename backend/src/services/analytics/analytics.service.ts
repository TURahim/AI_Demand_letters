/**
 * Analytics Service
 * Aggregates data for dashboard and analytics pages
 */

import prisma from '../../utils/prisma-client';
import logger from '../../utils/logger';

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
  lastActivity: Date | null;
}

export interface ActivityItem {
  id: string;
  type: 'document' | 'letter' | 'template' | 'user';
  action: string;
  description: string;
  timestamp: Date;
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
  lastActive: Date | null;
}

class AnalyticsService {
  /**
   * Get dashboard metrics for a firm
   */
  async getDashboardMetrics(firmId: string): Promise<DashboardMetrics> {
    try {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Get counts
      const [
        totalDocuments,
        totalLetters,
        totalTemplates,
        activeUsers,
        documentsThisMonth,
        lettersThisMonth,
      ] = await Promise.all([
        prisma.document.count({ where: { firmId } }),
        prisma.letter.count({ where: { firmId } }),
        prisma.template.count({ where: { firmId, isPublic: false } }),
        prisma.user.count({
          where: {
            firmId,
            isActive: true,
            lastLoginAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        }),
        prisma.document.count({
          where: { firmId, createdAt: { gte: firstDayOfMonth } },
        }),
        prisma.letter.count({
          where: { firmId, createdAt: { gte: firstDayOfMonth } },
        }),
      ]);

      // Get recent activity
      const recentActivity = await this.getRecentActivity(firmId, 10);

      // Get letters by status
      const lettersByStatus = await this.getLettersByStatus(firmId);

      // Get documents by type
      const documentsByType = await this.getDocumentsByType(firmId);

      // Get last 7 days stats for dashboard chart
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const dailyStats = await this.getDailyStats(firmId, sevenDaysAgo, now);

      return {
        totalDocuments,
        totalLetters,
        totalTemplates,
        activeUsers,
        documentsThisMonth,
        lettersThisMonth,
        recentActivity,
        lettersByStatus,
        documentsByType,
        dailyStats,
      };
    } catch (error) {
      logger.error('Failed to get dashboard metrics', { firmId, error });
      throw error;
    }
  }

  /**
   * Get recent activity for a firm
   */
  private async getRecentActivity(firmId: string, limit: number): Promise<ActivityItem[]> {
    try {
      const auditLogs = await prisma.auditLog.findMany({
        where: { firmId },
        orderBy: { timestamp: 'desc' },
        take: limit,
        include: { user: true },
      });

      return auditLogs.map((log) => ({
        id: log.id,
        type: this.getActivityType(log.resource),
        action: log.action,
        description: this.formatActivityDescription(log),
        timestamp: log.timestamp,
        userId: log.userId || undefined,
        userName: log.user ? `${log.user.firstName} ${log.user.lastName}` : undefined,
      }));
    } catch (error) {
      logger.error('Failed to get recent activity', { firmId, error });
      return [];
    }
  }

  /**
   * Get activity type from resource
   */
  private getActivityType(resource: string): 'document' | 'letter' | 'template' | 'user' {
    const lowerResource = resource.toLowerCase();
    if (lowerResource.includes('document')) return 'document';
    if (lowerResource.includes('letter')) return 'letter';
    if (lowerResource.includes('template')) return 'template';
    return 'user';
  }

  /**
   * Format activity description
   */
  private formatActivityDescription(log: any): string {
    const action = log.action.toLowerCase();
    const resource = log.resource.toLowerCase();

    // Auth-specific actions
    if (action.includes('auth.login')) return 'Signed in';
    if (action.includes('auth.logout')) return 'Signed out';
    if (action.includes('auth.register')) return 'Created an account';
    if (action.includes('auth.password_reset')) return 'Reset password';

    // General actions
    if (action.includes('create')) return `Created a ${resource}`;
    if (action.includes('update')) return `Updated a ${resource}`;
    if (action.includes('delete')) return `Deleted a ${resource}`;
    if (action.includes('export')) return `Exported a ${resource}`;
    if (action.includes('generate')) return `Generated a ${resource}`;

    return `${log.action} on ${resource}`;
  }

  /**
   * Get letters breakdown by status
   */
  private async getLettersByStatus(firmId: string): Promise<StatusBreakdown[]> {
    try {
      const letters = await prisma.letter.groupBy({
        by: ['status'],
        where: { firmId },
        _count: { status: true },
      });

      const total = letters.reduce((sum, l) => sum + l._count.status, 0);

      return letters.map((l) => ({
        status: l.status,
        count: l._count.status,
        percentage: total > 0 ? Math.round((l._count.status / total) * 100) : 0,
      }));
    } catch (error) {
      logger.error('Failed to get letters by status', { firmId, error });
      return [];
    }
  }

  /**
   * Get documents breakdown by type
   */
  private async getDocumentsByType(firmId: string): Promise<TypeBreakdown[]> {
    try {
      const documents = await prisma.document.groupBy({
        by: ['mimeType'],
        where: { firmId },
        _count: { mimeType: true },
      });

      const total = documents.reduce((sum, d) => sum + d._count.mimeType, 0);

      return documents.map((d) => ({
        type: this.formatMimeType(d.mimeType),
        count: d._count.mimeType,
        percentage: total > 0 ? Math.round((d._count.mimeType / total) * 100) : 0,
      }));
    } catch (error) {
      logger.error('Failed to get documents by type', { firmId, error });
      return [];
    }
  }

  /**
   * Format MIME type for display
   */
  private formatMimeType(mimeType: string): string {
    const typeMap: Record<string, string> = {
      'application/pdf': 'PDF',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
      'application/msword': 'DOC',
      'text/plain': 'TXT',
    };

    return typeMap[mimeType] || mimeType;
  }

  /**
   * Get usage statistics for a firm
   */
  async getUsageStatistics(firmId: string, days: number = 30): Promise<UsageStatistics> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

      // Get daily stats
      const dailyStats = await this.getDailyStats(firmId, startDate, endDate);

      // Get weekly stats
      const weeklyStats = await this.getWeeklyStats(firmId, startDate, endDate);

      // Get monthly stats
      const monthlyStats = await this.getMonthlyStats(firmId);

      // Get top users
      const topUsers = await this.getTopUsers(firmId, 10);

      return {
        dailyStats,
        weeklyStats,
        monthlyStats,
        topUsers,
      };
    } catch (error) {
      logger.error('Failed to get usage statistics', { firmId, error });
      throw error;
    }
  }

  /**
   * Get daily statistics
   */
  private async getDailyStats(
    firmId: string,
    startDate: Date,
    endDate: Date
  ): Promise<DailyStats[]> {
    try {
      // Generate array of dates
      const dates: Date[] = [];
      const current = new Date(startDate);
      while (current <= endDate) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }

      // Get stats for each day
      const stats = await Promise.all(
        dates.map(async (date) => {
          const nextDay = new Date(date);
          nextDay.setDate(nextDay.getDate() + 1);

          const [documents, letters, users] = await Promise.all([
            prisma.document.count({
              where: {
                firmId,
                createdAt: { gte: date, lt: nextDay },
              },
            }),
            prisma.letter.count({
              where: {
                firmId,
                createdAt: { gte: date, lt: nextDay },
              },
            }),
            prisma.user.count({
              where: {
                firmId,
                lastLoginAt: { gte: date, lt: nextDay },
              },
            }),
          ]);

          return {
            date: date.toISOString().split('T')[0],
            documents,
            letters,
            users,
          };
        })
      );

      return stats;
    } catch (error) {
      logger.error('Failed to get daily stats', { firmId, error });
      return [];
    }
  }

  /**
   * Get weekly statistics
   */
  private async getWeeklyStats(
    firmId: string,
    startDate: Date,
    endDate: Date
  ): Promise<WeeklyStats[]> {
    try {
      const stats: WeeklyStats[] = [];
      const current = new Date(startDate);

      while (current <= endDate) {
        const weekEnd = new Date(current);
        weekEnd.setDate(weekEnd.getDate() + 7);

        const [documents, letters, users] = await Promise.all([
          prisma.document.count({
            where: {
              firmId,
              createdAt: { gte: current, lt: weekEnd },
            },
          }),
          prisma.letter.count({
            where: {
              firmId,
              createdAt: { gte: current, lt: weekEnd },
            },
          }),
          prisma.user.count({
            where: {
              firmId,
              lastLoginAt: { gte: current, lt: weekEnd },
            },
          }),
        ]);

        stats.push({
          week: `${current.toISOString().split('T')[0]} - ${weekEnd.toISOString().split('T')[0]}`,
          documents,
          letters,
          users,
        });

        current.setDate(current.getDate() + 7);
      }

      return stats;
    } catch (error) {
      logger.error('Failed to get weekly stats', { firmId, error });
      return [];
    }
  }

  /**
   * Get monthly statistics
   */
  private async getMonthlyStats(firmId: string): Promise<MonthlyStats[]> {
    try {
      const stats: MonthlyStats[] = [];
      const now = new Date();

      // Get last 12 months
      for (let i = 11; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

        const [documents, letters, users] = await Promise.all([
          prisma.document.count({
            where: {
              firmId,
              createdAt: { gte: monthStart, lt: monthEnd },
            },
          }),
          prisma.letter.count({
            where: {
              firmId,
              createdAt: { gte: monthStart, lt: monthEnd },
            },
          }),
          prisma.user.count({
            where: {
              firmId,
              lastLoginAt: { gte: monthStart, lt: monthEnd },
            },
          }),
        ]);

        stats.push({
          month: monthStart.toISOString().substring(0, 7), // YYYY-MM format
          documents,
          letters,
          users,
        });
      }

      return stats;
    } catch (error) {
      logger.error('Failed to get monthly stats', { firmId, error });
      return [];
    }
  }

  /**
   * Get top users by activity
   */
  private async getTopUsers(firmId: string, limit: number): Promise<UserStats[]> {
    try {
      const users = await prisma.user.findMany({
        where: { firmId, isActive: true },
        include: {
          _count: {
            select: {
              documents: true,
              letters: true,
            },
          },
        },
        take: limit,
      });

      return users
        .map((user) => ({
          userId: user.id,
          userName: `${user.firstName} ${user.lastName}`,
          documentsCreated: user._count.documents,
          lettersCreated: user._count.letters,
          lastActive: user.lastLoginAt,
        }))
        .sort((a, b) => (b.documentsCreated + b.lettersCreated) - (a.documentsCreated + a.lettersCreated))
        .slice(0, limit);
    } catch (error) {
      logger.error('Failed to get top users', { firmId, error });
      return [];
    }
  }

  /**
   * Get firm-wide statistics (admin only)
   */
  async getFirmStatistics(firmId: string): Promise<FirmStatistics> {
    try {
      const firm = await prisma.firm.findUnique({
        where: { id: firmId },
        include: {
          users: true,
          documents: true,
          letters: true,
          templates: true,
        },
      });

      if (!firm) {
        throw new Error('Firm not found');
      }

      // Calculate active users (logged in last 30 days)
      const activeUsers = firm.users.filter(
        (u) => u.isActive && u.lastLoginAt && u.lastLoginAt.getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000
      ).length;

      // Calculate total storage used
      const storageUsed = firm.documents.reduce((sum, doc) => sum + doc.fileSize, 0);

      // Get last activity
      const lastActivity = firm.users
        .map((u) => u.lastLoginAt)
        .filter((d): d is Date => d !== null)
        .sort((a, b) => b.getTime() - a.getTime())[0] || null;

      return {
        firmId: firm.id,
        firmName: firm.name,
        totalUsers: firm.users.length,
        activeUsers,
        totalDocuments: firm.documents.length,
        totalLetters: firm.letters.length,
        totalTemplates: firm.templates.length,
        storageUsed,
        lastActivity,
      };
    } catch (error) {
      logger.error('Failed to get firm statistics', { firmId, error });
      throw error;
    }
  }
}

export default new AnalyticsService();

