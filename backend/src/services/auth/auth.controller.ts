import { Request, Response } from 'express';
import * as authService from './auth.service';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
} from './auth.validation';
import { asyncHandler } from '../../middleware/error-handler';
import logger from '../../utils/logger';

/**
 * Register new user
 * POST /api/v1/auth/register
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  logger.info('Registration attempt', { email: req.body.email });

  // Validate request body
  const validatedData = registerSchema.parse(req.body);

  // Register user
  const result = await authService.register(validatedData);

  logger.info('User registered successfully', { userId: result.user.id });

  res.status(201).json({
    status: 'success',
    message: 'User registered successfully',
    data: result,
  });
});

/**
 * Login user
 * POST /api/v1/auth/login
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  logger.info('Login attempt', { email: req.body.email });

  // Validate request body
  const validatedData = loginSchema.parse(req.body);

  // Login user
  const result = await authService.login(
    validatedData.email,
    validatedData.password,
    req.ip,
    req.get('user-agent')
  );

  logger.info('User logged in successfully', { userId: result.user.id });

  res.json({
    status: 'success',
    message: 'Login successful',
    data: result,
  });
});

/**
 * Refresh access token
 * POST /api/v1/auth/refresh
 */
export const refreshToken = asyncHandler(
  async (req: Request, res: Response) => {
    logger.info('Token refresh attempt');

    // Validate request body
    const validatedData = refreshSchema.parse(req.body);

    // Refresh tokens
    const result = await authService.refresh(validatedData.refreshToken);

    logger.info('Token refreshed successfully', { userId: result.user.id });

    res.json({
      status: 'success',
      message: 'Token refreshed successfully',
      data: result,
    });
  }
);

/**
 * Logout user
 * POST /api/v1/auth/logout
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  const userId = (req as any).user?.id;

  logger.info('Logout attempt', { userId });

  if (refreshToken) {
    await authService.logout(refreshToken, userId);
  }

  logger.info('User logged out successfully', { userId });

  res.json({
    status: 'success',
    message: 'Logout successful',
  });
});

/**
 * Get current user
 * GET /api/v1/auth/me
 */
export const getCurrentUser = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = (req as any).user.id;

    logger.debug('Fetching current user', { userId });

    const user = await authService.getCurrentUser(userId);

    res.json({
      status: 'success',
      data: { user },
    });
  }
);

