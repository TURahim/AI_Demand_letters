import prisma from '../../utils/prisma-client';
import { AppError } from '../../middleware/error-handler';
import { encryptWithKMS, generateSecureToken } from '../security/encryption.service';
import { createAuditLog, AUDITED_ACTIONS } from '../../middleware/audit-logger';

/**
 * Create new firm
 */
export async function createFirm(data: {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
}) {
  // Generate encryption key for firm
  const encryptionKey = generateSecureToken(32);
  const encryptedKey = await encryptWithKMS(encryptionKey);

  const firm = await prisma.firm.create({
    data: {
      name: data.name,
      address: data.address,
      phone: data.phone,
      email: data.email,
      logo: data.logo,
      encryptionKey: encryptedKey,
    },
  });

  return firm;
}

/**
 * Get firm by ID
 */
export async function getFirmById(firmId: string) {
  const firm = await prisma.firm.findUnique({
    where: { id: firmId },
    select: {
      id: true,
      name: true,
      address: true,
      phone: true,
      email: true,
      logo: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          users: true,
          documents: true,
          templates: true,
          letters: true,
        },
      },
    },
  });

  if (!firm) {
    throw new AppError('Firm not found', 404);
  }

  return firm;
}

/**
 * Update firm
 */
export async function updateFirm(
  firmId: string,
  data: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    logo?: string;
  },
  requestingUserId: string
) {
  const firm = await prisma.firm.findUnique({
    where: { id: firmId },
  });

  if (!firm) {
    throw new AppError('Firm not found', 404);
  }

  const updatedFirm = await prisma.firm.update({
    where: { id: firmId },
    data: {
      name: data.name,
      address: data.address,
      phone: data.phone,
      email: data.email,
      logo: data.logo,
    },
  });

  // Create audit log
  await createAuditLog(AUDITED_ACTIONS.FIRM_UPDATE, 'firm', {
    userId: requestingUserId,
    firmId,
    resourceId: firmId,
    metadata: { changes: data },
  });

  return updatedFirm;
}

/**
 * Get firm statistics
 */
export async function getFirmStats(firmId: string) {
  const [
    totalUsers,
    activeUsers,
    totalDocuments,
    totalTemplates,
    totalLetters,
    recentActivity,
  ] = await Promise.all([
    // Total users
    prisma.user.count({
      where: { firmId },
    }),

    // Active users
    prisma.user.count({
      where: { firmId, isActive: true },
    }),

    // Total documents
    prisma.document.count({
      where: { firmId },
    }),

    // Total templates
    prisma.template.count({
      where: { firmId },
    }),

    // Total letters
    prisma.letter.count({
      where: { firmId },
    }),

    // Recent activity (last 30 days)
    prisma.auditLog.count({
      where: {
        firmId,
        timestamp: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    }),
  ]);

  return {
    users: {
      total: totalUsers,
      active: activeUsers,
    },
    documents: totalDocuments,
    templates: totalTemplates,
    letters: totalLetters,
    recentActivity,
  };
}

/**
 * Get firm users
 */
export async function getFirmUsers(firmId: string, options?: {
  includeInactive?: boolean;
  limit?: number;
}) {
  const users = await prisma.user.findMany({
    where: {
      firmId,
      ...(options?.includeInactive ? {} : { isActive: true }),
    },
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
    take: options?.limit,
  });

  return users;
}

