import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import config from '../../config';
import prisma from '../../utils/prisma-client';
import { AppError } from '../../middleware/error-handler';
import { createAuditLog, AUDITED_ACTIONS } from '../../middleware/audit-logger';

const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

interface TokenPayload {
  userId: string;
  email: string;
  firmId: string;
  role: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    firmId: string;
  };
}

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Compare password with hash
 */
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT access token
 */
export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(
    { ...payload, jti: crypto.randomUUID() },
    config.jwt.secret,
    {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

/**
 * Generate JWT refresh token
 */
export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(
    { ...payload, jti: crypto.randomUUID() },
    config.jwt.refreshSecret,
    {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
}

/**
 * Verify JWT access token
 */
export function verifyAccessToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, config.jwt.secret) as TokenPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError('Access token expired', 401);
    }
    throw new AppError('Invalid access token', 401);
  }
}

/**
 * Verify JWT refresh token
 */
export function verifyRefreshToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, config.jwt.refreshSecret) as TokenPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError('Refresh token expired', 401);
    }
    throw new AppError('Invalid refresh token', 401);
  }
}

/**
 * Register new user
 */
export async function register(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  firmId?: string;
  firmName?: string;
  role?: string;
}): Promise<AuthTokens> {
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    throw new AppError('User with this email already exists', 400);
  }

  let firmId = data.firmId;

  if (firmId) {
    const firm = await prisma.firm.findUnique({
      where: { id: firmId },
    });

    if (!firm) {
      throw new AppError('Firm not found', 404);
    }
  } else {
    if (!data.firmName) {
      throw new AppError('Firm name is required', 400);
    }

    const newFirm = await prisma.firm.create({
      data: {
        name: data.firmName,
        encryptionKey: generateEncryptionKey(),
      },
    });

    firmId = newFirm.id;
  }

  // Hash password
  const passwordHash = await hashPassword(data.password);

  // Create user
  const userRole: UserRole =
    (data.role as UserRole) || (data.firmId ? UserRole.ASSOCIATE : UserRole.ADMIN);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      firmId,
      role: userRole,
    },
  });

  // Generate tokens
  const tokenPayload: TokenPayload = {
    userId: user.id,
    email: user.email,
    firmId: user.firmId,
    role: user.role,
  };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  // Store refresh token
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await prisma.session.create({
    data: {
      userId: user.id,
      refreshToken,
      expiresAt,
    },
  });

  // Create audit log
  await createAuditLog(AUDITED_ACTIONS.REGISTER, 'user', {
    userId: user.id,
    firmId: user.firmId,
    resourceId: user.id,
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      firmId: user.firmId,
    },
  };
}

function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Login user
 */
export async function login(
  email: string,
  password: string,
  ipAddress?: string,
  userAgent?: string
): Promise<AuthTokens> {
  // Find user
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  if (!user.isActive) {
    throw new AppError('Account is disabled', 403);
  }

  // Verify password
  const isValidPassword = await comparePassword(password, user.passwordHash);

  if (!isValidPassword) {
    throw new AppError('Invalid credentials', 401);
  }

  // Generate tokens
  const tokenPayload: TokenPayload = {
    userId: user.id,
    email: user.email,
    firmId: user.firmId,
    role: user.role,
  };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  // Store refresh token
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.session.create({
    data: {
      userId: user.id,
      refreshToken,
      expiresAt,
    },
  });

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // Create audit log
  await createAuditLog(AUDITED_ACTIONS.LOGIN, 'user', {
    userId: user.id,
    firmId: user.firmId,
    ipAddress,
    userAgent,
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      firmId: user.firmId,
    },
  };
}

/**
 * Refresh access token
 */
export async function refresh(refreshToken: string): Promise<AuthTokens> {
  // Verify refresh token
  verifyRefreshToken(refreshToken);

  // Check if session exists
  const session = await prisma.session.findUnique({
    where: { refreshToken },
    include: { user: true },
  });

  if (!session) {
    throw new AppError('Invalid refresh token', 401);
  }

  if (session.expiresAt < new Date()) {
    // Delete expired session
    await prisma.session.delete({
      where: { id: session.id },
    });
    throw new AppError('Refresh token expired', 401);
  }

  if (!session.user.isActive) {
    throw new AppError('Account is disabled', 403);
  }

  // Generate new tokens
  const tokenPayload: TokenPayload = {
    userId: session.user.id,
    email: session.user.email,
    firmId: session.user.firmId,
    role: session.user.role,
  };

  const accessToken = generateAccessToken(tokenPayload);
  const newRefreshToken = generateRefreshToken(tokenPayload);

  // Update session with new refresh token
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.session.update({
    where: { id: session.id },
    data: {
      refreshToken: newRefreshToken,
      expiresAt,
    },
  });

  return {
    accessToken,
    refreshToken: newRefreshToken,
    user: {
      id: session.user.id,
      email: session.user.email,
      firstName: session.user.firstName,
      lastName: session.user.lastName,
      role: session.user.role,
      firmId: session.user.firmId,
    },
  };
}

/**
 * Logout user
 */
export async function logout(
  refreshToken: string,
  userId?: string
): Promise<void> {
  // Find and delete session
  const session = await prisma.session.findUnique({
    where: { refreshToken },
  });

  if (session) {
    await prisma.session.delete({
      where: { id: session.id },
    });

    // Create audit log
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (user) {
        await createAuditLog(AUDITED_ACTIONS.LOGOUT, 'user', {
          userId: user.id,
          firmId: user.firmId,
        });
      }
    }
  }
}

/**
 * Get current user
 */
export async function getCurrentUser(userId: string) {
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
      createdAt: true,
      firm: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return user;
}

