import prisma from '../../utils/prisma-client';
import { AppError } from '../../middleware/error-handler';
import logger from '../../utils/logger';
import {
  calculateJSONDiff,
  generateDiffSummary,
} from './diff.service';

/**
 * Create a new version of a letter
 */
export async function createLetterVersion(
  letterId: string,
  firmId: string,
  userId: string,
  changes: {
    content?: any;
  }
): Promise<any> {
  // Get current letter
  const letter = await prisma.letter.findUnique({
    where: { id: letterId },
  });

  if (!letter) {
    throw new AppError('Letter not found', 404);
  }

  if (letter.firmId !== firmId) {
    throw new AppError('Access denied', 403);
  }

  const nextVersion = letter.version + 1;
  const newContent = changes.content ?? letter.content;

  let changeMetadata: Record<string, any> | null = null;
  if (changes.content) {
    const diff = calculateJSONDiff(letter.content, changes.content);
    changeMetadata = {
      summary: generateDiffSummary(letter.content, changes.content, 'json'),
      diff,
    };
  }

  const version = await prisma.letterVersion.create({
    data: {
      letterId,
      version: nextVersion,
      content: newContent,
      changes: changeMetadata ?? undefined,
      createdBy: userId,
    },
  });

  await prisma.letter.update({
    where: { id: letterId },
    data: {
      version: nextVersion,
      content: newContent,
    },
  });

  logger.info('Letter version created', {
    letterId,
    version: nextVersion,
    userId,
    firmId,
  });

  return version;
}

/**
 * Get all versions of a letter
 */
export async function getLetterVersions(
  letterId: string,
  firmId: string
): Promise<any[]> {
  const letter = await prisma.letter.findUnique({
    where: { id: letterId },
  });

  if (!letter) {
    throw new AppError('Letter not found', 404);
  }

  if (letter.firmId !== firmId) {
    throw new AppError('Access denied', 403);
  }

  const versions = await prisma.letterVersion.findMany({
    where: { letterId },
    orderBy: { version: 'desc' },
  });

  return versions;
}

/**
 * Get a specific version of a letter
 */
export async function getLetterVersion(
  letterId: string,
  version: number,
  firmId: string
): Promise<any> {
  const letter = await prisma.letter.findUnique({
    where: { id: letterId },
  });

  if (!letter) {
    throw new AppError('Letter not found', 404);
  }

  if (letter.firmId !== firmId) {
    throw new AppError('Access denied', 403);
  }

  const letterVersion = await prisma.letterVersion.findFirst({
    where: {
      letterId,
      version,
    },
  });

  if (!letterVersion) {
    throw new AppError('Version not found', 404);
  }

  return letterVersion;
}

/**
 * Restore a letter to a previous version
 */
export async function restoreLetterVersion(
  letterId: string,
  version: number,
  firmId: string,
  userId: string
): Promise<any> {
  const versionToRestore = await getLetterVersion(letterId, version, firmId);

  const newVersion = await createLetterVersion(
    letterId,
    firmId,
    userId,
    {
      content: versionToRestore.content,
    }
  );

  logger.info('Letter version restored', {
    letterId,
    restoredVersion: version,
    newVersion: newVersion.version,
    userId,
    firmId,
  });

  return newVersion;
}

/**
 * Compare two versions of a letter
 */
export async function compareLetterVersions(
  letterId: string,
  version1: number,
  version2: number,
  firmId: string
): Promise<{
  version1: any;
  version2: any;
  diff: any;
}> {
  const [v1, v2] = await Promise.all([
    getLetterVersion(letterId, version1, firmId),
    getLetterVersion(letterId, version2, firmId),
  ]);

  const diff = calculateJSONDiff(v1.content, v2.content);

  return {
    version1: v1,
    version2: v2,
    diff,
  };
}

/**
 * Get version history summary
 */
export async function getVersionHistory(
  letterId: string,
  firmId: string
): Promise<{
  currentVersion: number;
  totalVersions: number;
  versions: Array<{
    version: number;
    changedBy: string;
    changedAt: Date;
    changeSummary?: string;
  }>;
}> {
  const letter = await prisma.letter.findUnique({
    where: { id: letterId },
  });

  if (!letter) {
    throw new AppError('Letter not found', 404);
  }

  if (letter.firmId !== firmId) {
    throw new AppError('Access denied', 403);
  }

  const versions = await prisma.letterVersion.findMany({
    where: { letterId },
    orderBy: { version: 'desc' },
  });

  return {
    currentVersion: letter.version,
    totalVersions: versions.length,
    versions: versions.map(v => ({
      version: v.version,
      changedBy: v.createdBy,
      changedAt: v.createdAt,
      changeSummary: (v.changes as any)?.summary,
    })),
  };
}

