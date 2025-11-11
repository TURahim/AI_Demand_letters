import * as s3Service from './s3.service';
import prisma from '../../utils/prisma-client';
import { AppError } from '../../middleware/error-handler';
import { validateFileType, validateFileSize } from './upload.validation';
import logger from '../../utils/logger';
import { createAuditLog, AUDITED_ACTIONS } from '../../middleware/audit-logger';

/**
 * Request presigned URL for file upload
 */
export async function requestPresignedUrl(
  fileName: string,
  fileSize: number,
  contentType: string,
  userId: string,
  firmId: string
): Promise<{
  uploadUrl: string;
  s3Key: string;
  expiresIn: number;
}> {
  // Validate file type
  if (!validateFileType(contentType, fileName)) {
    throw new AppError(
      `File type not allowed. Allowed types: pdf, doc, docx, txt`,
      400
    );
  }

  // Validate file size
  if (!validateFileSize(fileSize)) {
    throw new AppError(
      `File size must be between 1 byte and ${config.upload.maxFileSize / (1024 * 1024)}MB`,
      400
    );
  }

  // Generate S3 key
  const s3Key = s3Service.generateDocumentKey(firmId, userId, fileName);

  // Generate presigned URL (valid for 15 minutes)
  const expiresIn = 900;
  const uploadUrl = await s3Service.generatePresignedUploadUrl(
    s3Key,
    contentType,
    expiresIn
  );

  logger.info('Presigned URL generated', {
    userId,
    firmId,
    fileName,
    fileSize,
    s3Key,
  });

  return {
    uploadUrl,
    s3Key,
    expiresIn,
  };
}

/**
 * Complete upload and create document record
 */
export async function completeUpload(
  fileName: string,
  fileSize: number,
  contentType: string,
  s3Key: string,
  fileHash: string,
  userId: string,
  firmId: string,
  metadata?: Record<string, any>
): Promise<any> {
  // Verify file exists in S3
  const exists = await s3Service.fileExists(s3Key);
  if (!exists) {
    throw new AppError('File not found in S3. Upload may have failed.', 400);
  }

  // Verify file metadata from S3 (ensures file is accessible)
  await s3Service.getFileMetadata(s3Key);

  // Create document record
  const document = await prisma.document.create({
    data: {
      firmId,
      uploadedBy: userId,
      fileName,
      fileSize,
      mimeType: contentType,
      s3Key,
      s3Bucket: config.s3.bucketName,
      fileHash,
      status: 'PENDING',
      metadata: metadata || {},
      virusScanStatus: 'PENDING',
    },
  });

  // Create audit log
  await createAuditLog(AUDITED_ACTIONS.DOCUMENT_UPLOAD, 'document', {
    userId,
    firmId,
    resourceId: document.id,
    metadata: {
      fileName,
      fileSize,
      fileHash,
    },
  });

  logger.info('Upload completed', {
    documentId: document.id,
    userId,
    firmId,
    fileName,
    s3Key,
  });

  // TODO: Trigger processing job (OCR, virus scan, text extraction)
  // This will be implemented in the processing service

  return document;
}

/**
 * Get download URL for document
 */
export async function getDownloadUrl(
  documentId: string,
  userId: string,
  firmId: string
): Promise<{
  downloadUrl: string;
  fileName: string;
  expiresIn: number;
}> {
  // Get document
  const document = await prisma.document.findUnique({
    where: { id: documentId },
  });

  if (!document) {
    throw new AppError('Document not found', 404);
  }

  // Check firm access
  if (document.firmId !== firmId) {
    throw new AppError('Access denied', 403);
  }

  // Generate presigned download URL (valid for 5 minutes)
  const expiresIn = 300;
  const downloadUrl = await s3Service.generatePresignedDownloadUrl(
    document.s3Key,
    expiresIn
  );

  // Create audit log
  await createAuditLog(AUDITED_ACTIONS.DOCUMENT_DOWNLOAD, 'document', {
    userId,
    firmId,
    resourceId: documentId,
  });

  logger.info('Download URL generated', {
    documentId,
    userId,
    firmId,
    fileName: document.fileName,
  });

  return {
    downloadUrl,
    fileName: document.fileName,
    expiresIn,
  };
}

/**
 * Delete document
 */
export async function deleteDocument(
  documentId: string,
  userId: string,
  firmId: string
): Promise<void> {
  // Get document
  const document = await prisma.document.findUnique({
    where: { id: documentId },
  });

  if (!document) {
    throw new AppError('Document not found', 404);
  }

  // Check firm access
  if (document.firmId !== firmId) {
    throw new AppError('Access denied', 403);
  }

  // Delete from S3
  await s3Service.deleteFile(document.s3Key);

  // Delete document record
  await prisma.document.delete({
    where: { id: documentId },
  });

  // Create audit log
  await createAuditLog(AUDITED_ACTIONS.DOCUMENT_DELETE, 'document', {
    userId,
    firmId,
    resourceId: documentId,
    metadata: {
      fileName: document.fileName,
    },
  });

  logger.info('Document deleted', {
    documentId,
    userId,
    firmId,
    fileName: document.fileName,
  });
}

// Import config at the end to avoid circular dependency
import config from '../../config';

