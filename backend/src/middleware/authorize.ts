import { Request, Response, NextFunction } from 'express';
import { AppError } from './error-handler';
import logger from '../utils/logger';

type UserRole = 'ADMIN' | 'PARTNER' | 'ASSOCIATE' | 'PARALEGAL';

/**
 * Authorization middleware factory
 * Checks if user has required role(s)
 * 
 * @param roles - Array of allowed roles
 * @returns Express middleware function
 */
export function authorize(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      const userRole = req.user.role as UserRole;

      if (!roles.includes(userRole)) {
        logger.warn('Authorization failed', {
          userId: req.user.id,
          userRole,
          requiredRoles: roles,
          path: req.path,
        });

        throw new AppError(
          'You do not have permission to access this resource',
          403
        );
      }

      logger.debug('Authorization successful', {
        userId: req.user.id,
        role: userRole,
      });

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Check if user is admin
 */
export const requireAdmin = authorize('ADMIN');

/**
 * Check if user is admin or partner
 */
export const requireAdminOrPartner = authorize('ADMIN', 'PARTNER');

/**
 * Check if user is at least an associate
 */
export const requireAssociate = authorize(
  'ADMIN',
  'PARTNER',
  'ASSOCIATE',
  'PARALEGAL'
);

