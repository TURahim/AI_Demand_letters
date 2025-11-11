import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma-client';
import logger from '../utils/logger';

// Actions that should be audited
const AUDITED_ACTIONS = {
  // Auth
  LOGIN: 'auth.login',
  LOGOUT: 'auth.logout',
  REGISTER: 'auth.register',
  PASSWORD_RESET: 'auth.password_reset',
  
  // Users
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',
  
  // Firms
  FIRM_CREATE: 'firm.create',
  FIRM_UPDATE: 'firm.update',
  FIRM_DELETE: 'firm.delete',
  
  // Documents
  DOCUMENT_UPLOAD: 'document.upload',
  DOCUMENT_DOWNLOAD: 'document.download',
  DOCUMENT_DELETE: 'document.delete',
  
  // Templates
  TEMPLATE_CREATE: 'template.create',
  TEMPLATE_UPDATE: 'template.update',
  TEMPLATE_DELETE: 'template.delete',
  
  // Letters
  LETTER_CREATE: 'letter.create',
  LETTER_UPDATE: 'letter.update',
  LETTER_DELETE: 'letter.delete',
  LETTER_EXPORT: 'letter.export',
  LETTER_SHARE: 'letter.share',
};

// Helper to create audit log
export async function createAuditLog(
  action: string,
  resource: string,
  options: {
    userId?: string;
    firmId?: string;
    resourceId?: string;
    metadata?: any;
    ipAddress?: string;
    userAgent?: string;
  }
) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        resource,
        userId: options.userId,
        firmId: options.firmId,
        resourceId: options.resourceId,
        metadata: options.metadata,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
      },
    });
  } catch (error) {
    logger.error('Failed to create audit log:', error);
  }
}

// Middleware to automatically audit certain requests
export function auditMiddleware(action: string, resource: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    // Store audit info for after response
    res.on('finish', async () => {
      // Only audit successful requests
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          await createAuditLog(action, resource, {
            userId: user?.id,
            firmId: user?.firmId,
            resourceId: req.params.id || (res as any).resourceId,
            metadata: {
              method: req.method,
              url: req.originalUrl,
              statusCode: res.statusCode,
              body: req.body,
            },
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
          });
        } catch (error) {
          logger.error('Audit logging failed:', error);
        }
      }
    });

    next();
  };
}

// Export audit actions for use in controllers
export { AUDITED_ACTIONS };

