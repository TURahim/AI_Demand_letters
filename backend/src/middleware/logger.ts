import { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import logger from '../utils/logger';
import config from '../config';

// Create a stream object for Morgan
const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

// Morgan format tokens
morgan.token('user-id', (req: any) => req.user?.id || 'anonymous');
morgan.token('firm-id', (req: any) => req.user?.firmId || 'none');

// Development format
const devFormat =
  ':method :url :status :response-time ms - :res[content-length] - user: :user-id';

// Production format
const prodFormat =
  ':remote-addr - :user-id [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms - firm: :firm-id';

// Export Morgan middleware
export const requestLogger =
  config.nodeEnv === 'production'
    ? morgan(prodFormat, { stream })
    : morgan(devFormat, { stream });

// Custom request logger middleware
export function logRequest(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    const user = (req as any).user;

    logger.info('HTTP Request', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userId: user?.id,
      firmId: user?.firmId,
      userAgent: req.get('user-agent'),
    });
  });

  next();
}

