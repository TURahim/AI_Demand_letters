/**
 * Export Service
 * Handles letter export to various formats
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  convertInchesToTwip,
} from 'docx';
import prisma from '../../utils/prisma-client';
import * as s3Service from '../upload/s3.service';
import logger from '../../utils/logger';
import { AppError } from '../../middleware/error-handler';
import config from '../../config';
import { ExportFormat } from '@prisma/client';

interface ExportOptions {
  format: ExportFormat;
  includeHeader?: boolean;
  includeFooter?: boolean;
  firmBranding?: boolean;
}

/**
 * Generate export file for a letter
 */
export async function generateExport(
  letterId: string,
  firmId: string,
  userId: string,
  options: ExportOptions
): Promise<{
  exportId: string;
  downloadUrl: string;
  expiresIn: number;
}> {
  // Get letter
  const letter = await prisma.letter.findUnique({
    where: { id: letterId },
  });

  if (!letter) {
    throw new AppError('Letter not found', 404);
  }

  // Check firm access
  if (letter.firmId !== firmId) {
    throw new AppError('Access denied', 403);
  }

  // Generate file based on format
  let fileBuffer: Buffer;
  let mimeType: string;

  switch (options.format) {
    case 'DOCX':
      fileBuffer = await generateDocx(letter, options);
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      break;
    case 'PDF':
      throw new AppError('PDF export not yet implemented', 501);
    case 'HTML':
      throw new AppError('HTML export not yet implemented', 501);
    default:
      throw new AppError(`Unsupported export format: ${options.format}`, 400);
  }

  // Upload to S3
  const s3Key = generateExportKey(firmId, letterId, options.format);
  await s3Service.uploadFile(s3Key, fileBuffer, mimeType, {
    letterId,
    format: options.format,
    exportedBy: userId,
    exportedAt: new Date().toISOString(),
  });

  // Create export record
  const letterExport = await prisma.letterExport.create({
    data: {
      letterId,
      format: options.format,
      s3Key,
      s3Bucket: config.s3.bucketName,
      fileSize: fileBuffer.length,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  // Generate download URL
  const downloadUrl = await s3Service.generatePresignedDownloadUrl(s3Key, 3600); // 1 hour

  logger.info('Letter exported', {
    exportId: letterExport.id,
    letterId,
    format: options.format,
    fileSize: fileBuffer.length,
    userId,
    firmId,
  });

  return {
    exportId: letterExport.id,
    downloadUrl,
    expiresIn: 3600,
  };
}

/**
 * Generate DOCX file from letter
 */
async function generateDocx(
  letter: any,
  options: ExportOptions
): Promise<Buffer> {
  const children: Paragraph[] = [];

  // Add header if requested
  if (options.includeHeader) {
    children.push(
      new Paragraph({
        text: letter.title,
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: {
          after: 400,
        },
      })
    );

    // Add metadata
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Generated: ${new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}`,
            size: 20,
            color: '666666',
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: {
          after: 600,
        },
      })
    );
  }

  // Parse and add letter content
  const content = letter.content;
  let textContent: string;

  if (typeof content === 'string') {
    textContent = content;
  } else if (content?.body) {
    textContent = content.body;
  } else if (content?.text) {
    textContent = content.text;
  } else {
    textContent = JSON.stringify(content);
  }

  // Split content into paragraphs
  const paragraphs = textContent.split('\n\n');

  for (const para of paragraphs) {
    if (para.trim()) {
      // Check if it's a heading (starts with # or is all caps short line)
      const isHeading =
        para.startsWith('#') ||
        (para.length < 100 && para === para.toUpperCase() && para.length > 0);

      if (isHeading) {
        children.push(
          new Paragraph({
            text: para.replace(/^#+\s*/, ''),
            heading: HeadingLevel.HEADING_2,
            spacing: {
              before: 400,
              after: 200,
            },
          })
        );
      } else {
        // Regular paragraph - handle line breaks within
        const lines = para.split('\n');
        children.push(
          new Paragraph({
            children: lines.map(
              (line, index) =>
                new TextRun({
                  text: index === lines.length - 1 ? line : line + '\n',
                  size: 24, // 12pt
                })
            ),
            spacing: {
              after: 200,
              line: 360, // 1.5 line spacing
            },
          })
        );
      }
    }
  }

  // Add footer if requested
  if (options.includeFooter) {
    children.push(
      new Paragraph({
        text: '',
        spacing: {
          before: 600,
        },
      })
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Generated by Steno AI',
            size: 20,
            color: '999999',
            italics: true,
          }),
        ],
        alignment: AlignmentType.CENTER,
      })
    );
  }

  // Create document
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
            },
          },
        },
        children,
      },
    ],
  });

  // Generate buffer
  return await Packer.toBuffer(doc);
}

/**
 * Get download URL for existing export
 */
export async function getExportDownloadUrl(
  exportId: string,
  firmId: string
): Promise<{
  downloadUrl: string;
  fileName: string;
  expiresIn: number;
}> {
  const letterExport = await prisma.letterExport.findUnique({
    where: { id: exportId },
    include: {
      letter: {
        select: {
          firmId: true,
          title: true,
        },
      },
    },
  });

  if (!letterExport) {
    throw new AppError('Export not found', 404);
  }

  // Check firm access
  if (letterExport.letter.firmId !== firmId) {
    throw new AppError('Access denied', 403);
  }

  // Check expiration
  if (letterExport.expiresAt && letterExport.expiresAt < new Date()) {
    throw new AppError('Export has expired', 410);
  }

  // Increment download count
  await prisma.letterExport.update({
    where: { id: exportId },
    data: {
      downloadCount: {
        increment: 1,
      },
    },
  });

  // Generate download URL
  const expiresIn = 3600; // 1 hour
  const downloadUrl = await s3Service.generatePresignedDownloadUrl(
    letterExport.s3Key,
    expiresIn
  );

  const extension = letterExport.format.toLowerCase();
  const fileName = `${sanitizeFileName(letterExport.letter.title)}.${extension}`;

  logger.info('Export download URL generated', {
    exportId,
    downloadCount: letterExport.downloadCount + 1,
  });

  return {
    downloadUrl,
    fileName,
    expiresIn,
  };
}

/**
 * List exports for a letter
 */
export async function listExports(
  letterId: string,
  firmId: string
): Promise<any[]> {
  // Verify letter access
  const letter = await prisma.letter.findUnique({
    where: { id: letterId },
    select: { firmId: true },
  });

  if (!letter) {
    throw new AppError('Letter not found', 404);
  }

  if (letter.firmId !== firmId) {
    throw new AppError('Access denied', 403);
  }

  // Get exports
  const exports = await prisma.letterExport.findMany({
    where: {
      letterId,
      // Optionally filter expired ones
      OR: [
        { expiresAt: null },
        { expiresAt: { gte: new Date() } },
      ],
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return exports;
}

/**
 * Delete export
 */
export async function deleteExport(
  exportId: string,
  firmId: string
): Promise<void> {
  const letterExport = await prisma.letterExport.findUnique({
    where: { id: exportId },
    include: {
      letter: {
        select: {
          firmId: true,
        },
      },
    },
  });

  if (!letterExport) {
    throw new AppError('Export not found', 404);
  }

  // Check firm access
  if (letterExport.letter.firmId !== firmId) {
    throw new AppError('Access denied', 403);
  }

  // Delete from S3
  await s3Service.deleteFile(letterExport.s3Key);

  // Delete record
  await prisma.letterExport.delete({
    where: { id: exportId },
  });

  logger.info('Export deleted', { exportId });
}

/**
 * Cleanup expired exports (for scheduled job)
 */
export async function cleanupExpiredExports(): Promise<number> {
  const expiredExports = await prisma.letterExport.findMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });

  logger.info('Cleaning up expired exports', {
    count: expiredExports.length,
  });

  let deletedCount = 0;

  for (const exp of expiredExports) {
    try {
      await s3Service.deleteFile(exp.s3Key);
      await prisma.letterExport.delete({
        where: { id: exp.id },
      });
      deletedCount++;
    } catch (error) {
      logger.error('Failed to delete expired export', {
        exportId: exp.id,
        error,
      });
    }
  }

  logger.info('Expired exports cleanup complete', {
    deleted: deletedCount,
    failed: expiredExports.length - deletedCount,
  });

  return deletedCount;
}

/**
 * Generate S3 key for export
 */
function generateExportKey(
  firmId: string,
  letterId: string,
  format: ExportFormat
): string {
  const timestamp = Date.now();
  const extension = format.toLowerCase();
  return `${config.s3.lettersPrefix}${firmId}/${letterId}/exports/${timestamp}.${extension}`;
}

/**
 * Sanitize filename
 */
function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 100);
}

