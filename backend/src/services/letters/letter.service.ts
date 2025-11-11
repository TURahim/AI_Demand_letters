import prisma from '../../utils/prisma-client';
import { AppError } from '../../middleware/error-handler';
import { createAuditLog, AUDITED_ACTIONS } from '../../middleware/audit-logger';
import logger from '../../utils/logger';

/**
 * Create a new letter
 */
export async function createLetter(data: {
  firmId: string;
  createdBy: string;
  templateId?: string;
  title: string;
  content: any; // JSON content (structured or plain text)
  recipientName?: string;
  recipientAddress?: string;
  caseReference?: string;
  metadata?: any;
}): Promise<any> {
  try {
    const initialContent =
      data.content && typeof data.content === 'object'
        ? data.content
        : { body: data.content ?? '' };

    const initialMetadata = {
      ...(data.metadata || {}),
    } as Record<string, any>;

    if (data.recipientName || data.recipientAddress) {
      initialMetadata.recipient = {
        ...(data.recipientName ? { name: data.recipientName } : {}),
        ...(data.recipientAddress ? { address: data.recipientAddress } : {}),
      };
    }

    if (data.caseReference) {
      initialMetadata.caseReference = data.caseReference;
    }

    const letter = await prisma.letter.create({
      data: {
        firmId: data.firmId,
        createdBy: data.createdBy,
        templateId: data.templateId,
        title: data.title,
        content: initialContent,
        metadata: Object.keys(initialMetadata).length > 0 ? initialMetadata : undefined,
        version: 1,
        status: 'DRAFT',
      },
      include: {
        template: true,
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        document: {
          select: {
            id: true,
            fileName: true,
            mimeType: true,
          },
        },
      },
    });

    await createAuditLog(AUDITED_ACTIONS.LETTER_CREATE, 'Letter', {
      userId: data.createdBy,
      firmId: data.firmId,
      resourceId: letter.id,
      metadata: { title: letter.title, version: letter.version },
    });

    logger.info('Letter created', {
      letterId: letter.id,
      firmId: data.firmId,
      userId: data.createdBy,
    });

    return letter;
  } catch (error: any) {
    logger.error('Letter creation failed', { error: error.message, data });
    throw error;
  }
}

/**
 * Get letter by ID
 */
export async function getLetterById(
  letterId: string,
  firmId: string
): Promise<any> {
  const letter = await prisma.letter.findUnique({
    where: { id: letterId },
    include: {
      template: true,
      creator: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      document: {
        select: {
          id: true,
          fileName: true,
          mimeType: true,
          fileSize: true,
          createdAt: true,
        },
      },
      _count: {
        select: {
          versions: true,
          exports: true,
          collaborations: true,
        },
      },
    },
  });

  if (!letter) {
    throw new AppError('Letter not found', 404);
  }

  // Firm isolation check
  if (letter.firmId !== firmId) {
    throw new AppError('Access denied', 403);
  }

  return letter;
}

/**
 * List letters for a firm
 */
export async function listLetters(
  firmId: string,
  filters: {
    status?: string;
    createdBy?: string;
    search?: string;
    templateId?: string;
    startDate?: Date;
    endDate?: Date;
  } = {},
  pagination: {
    page?: number;
    limit?: number;
  } = {}
): Promise<{ letters: any[]; total: number; page: number; pages: number }> {
  const page = pagination.page || 1;
  const limit = pagination.limit || 20;
  const skip = (page - 1) * limit;

  // Build where clause
  const where: any = { firmId };

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.createdBy) {
    where.createdBy = filters.createdBy;
  }

  if (filters.templateId) {
    where.templateId = filters.templateId;
  }

  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      where.createdAt.gte = filters.startDate;
    }
    if (filters.endDate) {
      where.createdAt.lte = filters.endDate;
    }
  }

  // Execute queries
  const [letters, total] = await Promise.all([
    prisma.letter.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        template: {
          select: {
            id: true,
            name: true,
          },
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            versions: true,
            exports: true,
            collaborations: true,
          },
        },
      },
    }),
    prisma.letter.count({ where }),
  ]);

  const pages = Math.ceil(total / limit);

  logger.debug('Letters listed', {
    firmId,
    total,
    page,
    pages,
    filters,
  });

  return { letters, total, page, pages };
}

/**
 * Update letter
 */
export async function updateLetter(
  letterId: string,
  firmId: string,
  userId: string,
  data: {
    title?: string;
    content?: any;
    recipientName?: string;
    recipientAddress?: string;
    caseReference?: string;
    status?: string;
    metadata?: any;
  }
): Promise<any> {
  // Get existing letter
  const existingLetter = await getLetterById(letterId, firmId);

  const updateData: any = {};

  if (data.title) {
    updateData.title = data.title;
  }

  if (data.content !== undefined) {
    updateData.content =
      typeof data.content === 'object' ? data.content : { body: data.content };
  }

  if (data.status) {
    updateData.status = data.status;
  }

  // Merge metadata
  const existingMetadata = (existingLetter.metadata as Record<string, any>) || {};
  const mergedMetadata = {
    ...existingMetadata,
    ...(data.metadata || {}),
  };

  if (data.recipientName || data.recipientAddress) {
    mergedMetadata.recipient = {
      ...(existingMetadata.recipient || {}),
      ...(data.recipientName ? { name: data.recipientName } : {}),
      ...(data.recipientAddress ? { address: data.recipientAddress } : {}),
    };
  }

  if (data.caseReference) {
    mergedMetadata.caseReference = data.caseReference;
  }

  if (Object.keys(mergedMetadata).length > 0) {
    updateData.metadata = mergedMetadata;
  }

  // Update letter
  const letter = await prisma.letter.update({
    where: { id: letterId },
    data: updateData,
    include: {
      template: true,
      creator: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  await createAuditLog(AUDITED_ACTIONS.LETTER_UPDATE, 'Letter', {
    userId,
    firmId,
    resourceId: letter.id,
    metadata: {
      title: letter.title,
      changes: Object.keys(data),
      previousVersion: existingLetter.version,
    },
  });

  logger.info('Letter updated', {
    letterId: letter.id,
    firmId,
    userId,
    changes: Object.keys(data),
  });

  return letter;
}

/**
 * Delete letter (soft delete)
 */
export async function deleteLetter(
  letterId: string,
  firmId: string,
  userId: string
): Promise<void> {
  // Verify access
  await getLetterById(letterId, firmId);

  // Soft delete by updating status
  await prisma.letter.update({
    where: { id: letterId },
    data: {
      status: 'ARCHIVED',
    },
  });

  await createAuditLog(AUDITED_ACTIONS.LETTER_DELETE, 'Letter', {
    userId,
    firmId,
    resourceId: letterId,
  });

  logger.info('Letter deleted', { letterId, firmId, userId });
}

/**
 * Link documents to letter
 */
export async function linkDocumentsToLetter(
  letterId: string,
  documentIds: string[],
  firmId: string
): Promise<void> {
  // Verify letter access
  await getLetterById(letterId, firmId);

  // Verify all documents belong to firm
  const documents = await prisma.document.findMany({
    where: {
      id: { in: documentIds },
      firmId,
    },
  });

  if (documents.length !== documentIds.length) {
    throw new AppError('One or more documents not found or access denied', 404);
  }

  if (documents.length === 0) {
    return;
  }

  // As the current schema supports a single document reference,
  // use the first document provided.
  await prisma.letter.update({
    where: { id: letterId },
    data: {
      documentId: documents[0].id,
    },
  });

  logger.info('Documents linked to letter', {
    letterId,
    documentCount: documents.length,
    firmId,
  });
}

/**
 * Get letter statistics for firm
 */
export async function getLetterStats(firmId: string): Promise<{
  total: number;
  byStatus: Record<string, number>;
  thisMonth: number;
  thisWeek: number;
}> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());

  const [total, byStatus, thisMonth, thisWeek] = await Promise.all([
    prisma.letter.count({ where: { firmId } }),
    prisma.letter.groupBy({
      by: ['status'],
      where: { firmId },
      _count: true,
    }),
    prisma.letter.count({
      where: {
        firmId,
        createdAt: { gte: startOfMonth },
      },
    }),
    prisma.letter.count({
      where: {
        firmId,
        createdAt: { gte: startOfWeek },
      },
    }),
  ]);

  const statusCounts: Record<string, number> = {};
  byStatus.forEach(item => {
    statusCounts[item.status] = item._count;
  });

  return {
    total,
    byStatus: statusCounts,
    thisMonth,
    thisWeek,
  };
}

