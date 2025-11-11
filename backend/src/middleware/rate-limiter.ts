import rateLimit from 'express-rate-limit';
import config from '../config';
import logger from '../utils/logger';

// Default rate limiter (100 requests per 15 minutes)
export const defaultRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    status: 'error',
    message: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, _next, options) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });

    res.status(429).json(options.message);
  },
});

// Strict rate limiter for sensitive operations (5 requests per 15 minutes)
export const strictRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: 5,
  message: {
    status: 'error',
    message: 'Too many attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req, res, _next, options) => {
    logger.warn('Strict rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });

    res.status(429).json(options.message);
  },
});

// Auth rate limiter (10 requests per 15 minutes)
export const authRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: 10,
  message: {
    status: 'error',
    message: 'Too many authentication attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req, res, _next, options) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      email: req.body.email,
    });

    res.status(429).json(options.message);
  },
});

// File upload rate limiter (20 uploads per 15 minutes)
export const uploadRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: 20,
  message: {
    status: 'error',
    message: 'Too many uploads, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, _next, options) => {
    logger.warn('Upload rate limit exceeded', {
      ip: req.ip,
      userId: (req as any).user?.id,
    });

    res.status(429).json(options.message);
  },
});

/**
 * Rate limiter factory
 * Creates a rate limiter with custom options
 */
export function rateLimiter(
  type: 'default' | 'strict' | 'auth' | 'upload' = 'default'
) {
  switch (type) {
    case 'strict':
      return strictRateLimiter;
    case 'auth':
      return authRateLimiter;
    case 'upload':
      return uploadRateLimiter;
    default:
      return defaultRateLimiter;
  }
}

