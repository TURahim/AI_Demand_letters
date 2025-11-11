import { Request, Response, NextFunction } from 'express';
import { AppError } from './error-handler';
import prisma from '../utils/prisma-client';
import logger from '../utils/logger';

/**
 * Firm isolation middleware
 * Ensures users can only access resources belonging to their firm
 * 
 * This middleware should be used on routes that access firm-specific resources.
 * It checks if the resource being accessed belongs to the user's firm.
 */
export function enforceFirmIsolation(resourceType: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      const resourceId = req.params.id;
      const userFirmId = req.user.firmId;

      // If no resource ID in params, skip check (e.g., for list endpoints)
      if (!resourceId) {
        return next();
      }

      // Check resource belongs to user's firm
      let resource: any = null;

      switch (resourceType) {
        case 'document':
          resource = await prisma.document.findUnique({
            where: { id: resourceId },
            select: { firmId: true },
          });
          break;

        case 'template':
          resource = await prisma.template.findUnique({
            where: { id: resourceId },
            select: { firmId: true },
          });
          break;

        case 'letter':
          resource = await prisma.letter.findUnique({
            where: { id: resourceId },
            select: { firmId: true },
          });
          break;

        case 'user':
          resource = await prisma.user.findUnique({
            where: { id: resourceId },
            select: { firmId: true },
          });
          break;

        case 'firm':
          // For firm resources, just check if accessing own firm
          if (resourceId !== userFirmId) {
            throw new AppError('Access denied', 403);
          }
          return next();

        default:
          logger.error('Unknown resource type for firm isolation', {
            resourceType,
          });
          throw new AppError('Internal server error', 500);
      }

      if (!resource) {
        throw new AppError(`${resourceType} not found`, 404);
      }

      if (resource.firmId !== userFirmId) {
        logger.warn('Firm isolation violation attempted', {
          userId: req.user.id,
          userFirmId,
          resourceType,
          resourceId,
          resourceFirmId: resource.firmId,
        });

        throw new AppError('Access denied', 403);
      }

      logger.debug('Firm isolation check passed', {
        userId: req.user.id,
        firmId: userFirmId,
        resourceType,
        resourceId,
      });

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware to automatically filter queries by firm
 * Adds firmId filter to Prisma queries
 */
export function filterByFirm(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }

  // Attach firm filter to request for use in controllers
  (req as any).firmFilter = { firmId: req.user.firmId };

  next();
}

/**
 * Check if user can access another user's data
 * Admins and partners can access all users in their firm
 * Associates and paralegals can only access their own data
 */
export function checkUserAccess(req: Request, _res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const targetUserId = req.params.id;
    const currentUserId = req.user.id;
    const userRole = req.user.role;

    // Users can always access their own data
    if (targetUserId === currentUserId) {
      return next();
    }

    // Admins and partners can access all users in their firm
    if (userRole === 'ADMIN' || userRole === 'PARTNER') {
      return next();
    }

    // Other roles cannot access other users' data
    logger.warn('User access violation attempted', {
      currentUserId,
      targetUserId,
      role: userRole,
    });

    throw new AppError('Access denied', 403);
  } catch (error) {
    next(error);
  }
}

