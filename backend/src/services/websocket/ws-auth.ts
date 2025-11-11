/**
 * WebSocket Authentication
 * Verifies JWT tokens for WebSocket connections
 */

import { IncomingMessage } from 'http';
import { verifyAccessToken } from '../auth/auth.service';
import logger from '../../utils/logger';

export interface AuthenticatedUser {
  id: string;
  email: string;
  firmId: string;
  role: string;
}

/**
 * Extract token from WebSocket upgrade request
 */
function extractToken(req: IncomingMessage): string | null {
  // Check query parameter: ws://localhost:3001?token=xxx
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const tokenFromQuery = url.searchParams.get('token');
  if (tokenFromQuery) {
    return tokenFromQuery;
  }

  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check cookie
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map((c) => c.trim());
    for (const cookie of cookies) {
      if (cookie.startsWith('token=')) {
        return cookie.substring(6);
      }
    }
  }

  return null;
}

/**
 * Authenticate WebSocket connection
 */
export async function authenticateWs(
  req: IncomingMessage
): Promise<AuthenticatedUser | null> {
  try {
    const token = extractToken(req);

    if (!token) {
      logger.warn('WebSocket authentication failed: no token provided');
      return null;
    }

    const decoded = verifyAccessToken(token);

    if (!decoded || !decoded.userId) {
      logger.warn('WebSocket authentication failed: invalid token');
      return null;
    }

    logger.info('WebSocket authenticated', {
      userId: decoded.userId,
      firmId: decoded.firmId,
    });

    return {
      id: decoded.userId,
      email: decoded.email || '',
      firmId: decoded.firmId,
      role: decoded.role || 'USER',
    };
  } catch (error) {
    logger.error('WebSocket authentication error:', error);
    return null;
  }
}

/**
 * Verify firm access for a letter
 */
export function verifyFirmAccess(user: AuthenticatedUser, firmId: string): boolean {
  return user.firmId === firmId;
}

