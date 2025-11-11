import prisma from '../../utils/prisma-client';
import { AppError } from '../../middleware/error-handler';
import { hashPassword } from '../auth/auth.service';
import { createAuditLog, AUDITED_ACTIONS } from '../../middleware/audit-logger';

/**
 * Get user by ID
 */
export async function getUserById(userId: string, _requestingUserId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      firmId: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
      firm: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return user;
}

/**
 * Get all users in a firm
 */
export async function getUsersByFirm(firmId: string, filters?: {
  role?: string;
  isActive?: boolean;
  search?: string;
}) {
  const where: any = { firmId };

  if (filters?.role) {
    where.role = filters.role;
  }

  if (filters?.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  if (filters?.search) {
    where.OR = [
      { email: { contains: filters.search, mode: 'insensitive' } },
      { firstName: { contains: filters.search, mode: 'insensitive' } },
      { lastName: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return users;
}

/**
 * Update user profile
 */
export async function updateUser(
  userId: string,
  data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
    isActive?: boolean;
  },
  requestingUserId: string
) {
  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // If email is being updated, check if it's already in use
  if (data.email && data.email !== user.email) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new AppError('Email already in use', 400);
    }
  }

  // Update user
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      role: data.role as any,
      isActive: data.isActive,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      firmId: true,
      isActive: true,
      updatedAt: true,
    },
  });

  // Create audit log
  await createAuditLog(AUDITED_ACTIONS.USER_UPDATE, 'user', {
    userId: requestingUserId,
    firmId: user.firmId,
    resourceId: userId,
    metadata: { changes: data },
  });

  return updatedUser;
}

/**
 * Change user password
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Verify current password
  const bcrypt = await import('bcrypt');
  const isValidPassword = await bcrypt.compare(
    currentPassword,
    user.passwordHash
  );

  if (!isValidPassword) {
    throw new AppError('Current password is incorrect', 400);
  }

  // Hash new password
  const newPasswordHash = await hashPassword(newPassword);

  // Update password
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newPasswordHash },
  });

  // Invalidate all sessions for this user
  await prisma.session.deleteMany({
    where: { userId },
  });

  // Create audit log
  await createAuditLog(AUDITED_ACTIONS.PASSWORD_RESET, 'user', {
    userId,
    firmId: user.firmId,
    resourceId: userId,
  });
}

/**
 * Deactivate user
 */
export async function deactivateUser(userId: string, requestingUserId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Update user status
  await prisma.user.update({
    where: { id: userId },
    data: { isActive: false },
  });

  // Invalidate all sessions
  await prisma.session.deleteMany({
    where: { userId },
  });

  // Create audit log
  await createAuditLog(AUDITED_ACTIONS.USER_DELETE, 'user', {
    userId: requestingUserId,
    firmId: user.firmId,
    resourceId: userId,
  });
}

