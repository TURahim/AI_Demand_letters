import prisma from '../../utils/prisma-client';
import { AppError } from '../../middleware/error-handler';
import * as s3Service from '../upload/s3.service';
import * as pdfExtractor from '../processing/pdf-extractor';
import * as docxExtractor from '../processing/docx-extractor';
import * as ocrService from '../processing/ocr.service';
import logger from '../../utils/logger';

/**
 * Get all documents for a firm
 */
export async function getDocuments(
  firmId: string,
  filters?: {
    status?: string;
    search?: string;
    uploadedBy?: string;
    limit?: number;
    offset?: number;
  }
) {
  const where: any = { firmId };

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.uploadedBy) {
    where.uploadedBy = filters.uploadedBy;
  }

  if (filters?.search) {
    where.OR = [
      { fileName: { contains: filters.search, mode: 'insensitive' } },
      { extractedText: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      include: {
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
    }),
    prisma.document.count({ where }),
  ]);

  return { documents, total };
}

/**
 * Get document by ID
 */
export async function getDocumentById(documentId: string, firmId: string) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      uploader: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      processingJobs: {
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  });

  if (!document) {
    throw new AppError('Document not found', 404);
  }

  if (document.firmId !== firmId) {
    throw new AppError('Access denied', 403);
  }

  return document;
}

/**
 * Process document (extract text)
 */
export async function processDocument(documentId: string) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
  });

  if (!document) {
    throw new AppError('Document not found', 404);
  }

  // Create processing job
  const job = await prisma.processingJob.create({
    data: {
      documentId: document.id,
      jobType: 'TEXT_EXTRACTION',
      status: 'PROCESSING',
      startedAt: new Date(),
    },
  });

  try {
    // Download file from S3
    const fileBuffer = await s3Service.downloadFile(document.s3Key);

    let extractedText = '';

    // Extract text based on file type
    if (document.mimeType === 'application/pdf') {
      // Check if PDF is scanned
      const isScanned = await pdfExtractor.isPDFScanned(fileBuffer);

      if (isScanned) {
        logger.info('PDF appears to be scanned, using OCR', {
          documentId: document.id,
        });
        extractedText = await ocrService.extractTextWithTextract(fileBuffer);
      } else {
        extractedText = await pdfExtractor.extractTextFromPDF(fileBuffer);
      }
    } else if (
      document.mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      extractedText = await docxExtractor.extractTextFromDOCX(fileBuffer);
    } else if (document.mimeType === 'text/plain') {
      extractedText = fileBuffer.toString('utf-8');
    }

    // Update document with extracted text
    await prisma.document.update({
      where: { id: document.id },
      data: {
        extractedText,
        status: 'COMPLETED',
      },
    });

    // Update job
    await prisma.processingJob.update({
      where: { id: job.id },
      data: {
        status: 'COMPLETED',
        progress: 100,
        completedAt: new Date(),
        result: {
          textLength: extractedText.length,
        },
      },
    });

    logger.info('Document processing completed', {
      documentId: document.id,
      textLength: extractedText.length,
    });

    return extractedText;
  } catch (error) {
    logger.error('Document processing failed', { error, documentId: document.id });

    // Update document status
    await prisma.document.update({
      where: { id: document.id },
      data: { status: 'FAILED' },
    });

    // Update job
    await prisma.processingJob.update({
      where: { id: job.id },
      data: {
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date(),
      },
    });

    throw error;
  }
}

/**
 * Update document metadata
 */
export async function updateDocument(
  documentId: string,
  firmId: string,
  data: {
    fileName?: string;
    metadata?: any;
  }
) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
  });

  if (!document) {
    throw new AppError('Document not found', 404);
  }

  if (document.firmId !== firmId) {
    throw new AppError('Access denied', 403);
  }

  const updated = await prisma.document.update({
    where: { id: documentId },
    data: {
      fileName: data.fileName,
      metadata: data.metadata,
    },
  });

  return updated;
}

/**
 * Get document statistics for firm
 */
export async function getDocumentStats(firmId: string) {
  const [total, pending, processing, completed, failed] = await Promise.all([
    prisma.document.count({ where: { firmId } }),
    prisma.document.count({ where: { firmId, status: 'PENDING' } }),
    prisma.document.count({ where: { firmId, status: 'PROCESSING' } }),
    prisma.document.count({ where: { firmId, status: 'COMPLETED' } }),
    prisma.document.count({ where: { firmId, status: 'FAILED' } }),
  ]);

  // Get total storage used
  const documents = await prisma.document.findMany({
    where: { firmId },
    select: { fileSize: true },
  });

  const totalStorage = documents.reduce((sum, doc) => sum + doc.fileSize, 0);

  return {
    total,
    byStatus: {
      pending,
      processing,
      completed,
      failed,
    },
    totalStorageBytes: totalStorage,
    totalStorageMB: Math.round(totalStorage / (1024 * 1024) * 100) / 100,
  };
}

