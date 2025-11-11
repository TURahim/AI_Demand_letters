import { Request, Response } from 'express';
import * as userService from './user.service';
import { asyncHandler } from '../../middleware/error-handler';
import logger from '../../utils/logger';

/**
 * Get user by ID
 * GET /api/v1/users/:id
 */
export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.params.id;
  const requestingUserId = req.user!.id;

  logger.debug('Fetching user', { userId, requestingUserId });

  const user = await userService.getUserById(userId, requestingUserId);

  res.json({
    status: 'success',
    data: { user },
  });
});

/**
 * Get all users in firm
 * GET /api/v1/users
 */
export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const firmId = req.user!.firmId;
  const { role, isActive, search } = req.query;

  logger.debug('Fetching users', { firmId, filters: { role, isActive, search } });

  const users = await userService.getUsersByFirm(firmId, {
    role: role as string,
    isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    search: search as string,
  });

  res.json({
    status: 'success',
    data: { users, count: users.length },
  });
});

/**
 * Update user
 * PUT /api/v1/users/:id
 */
export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.params.id;
  const requestingUserId = req.user!.id;
  const { firstName, lastName, email, role, isActive } = req.body;

  logger.info('Updating user', { userId, requestingUserId });

  const user = await userService.updateUser(
    userId,
    { firstName, lastName, email, role, isActive },
    requestingUserId
  );

  res.json({
    status: 'success',
    message: 'User updated successfully',
    data: { user },
  });
});

/**
 * Change password
 * POST /api/v1/users/:id/change-password
 */
export const changePassword = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.params.id;
    const { currentPassword, newPassword } = req.body;

    logger.info('Changing password', { userId });

    await userService.changePassword(userId, currentPassword, newPassword);

    res.json({
      status: 'success',
      message: 'Password changed successfully',
    });
  }
);

/**
 * Deactivate user
 * DELETE /api/v1/users/:id
 */
export const deactivateUser = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.params.id;
    const requestingUserId = req.user!.id;

    logger.info('Deactivating user', { userId, requestingUserId });

    await userService.deactivateUser(userId, requestingUserId);

    res.json({
      status: 'success',
      message: 'User deactivated successfully',
    });
  }
);

