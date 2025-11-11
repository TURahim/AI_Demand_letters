import { z } from 'zod';
import config from '../../config';

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

// Allowed file extensions
const ALLOWED_EXTENSIONS = config.upload.allowedFileTypes;

/**
 * Validate file type
 */
export function validateFileType(mimeType: string, fileName: string): boolean {
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return false;
  }

  // Check file extension
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
    return false;
  }

  return true;
}

/**
 * Validate file size
 */
export function validateFileSize(size: number): boolean {
  return size > 0 && size <= config.upload.maxFileSize;
}

/**
 * Get MIME type from file extension
 */
export function getMimeTypeFromExtension(extension: string): string {
  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    txt: 'text/plain',
  };

  return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
}

/**
 * Presigned URL request schema
 */
export const presignedUrlSchema = z.object({
  fileName: z.string().min(1, 'File name is required').max(255),
  fileSize: z.number().positive('File size must be positive'),
  contentType: z.string().min(1, 'Content type is required'),
});

export type PresignedUrlInput = z.infer<typeof presignedUrlSchema>;

/**
 * Upload complete schema
 */
export const uploadCompleteSchema = z.object({
  fileName: z.string().min(1, 'File name is required'),
  fileSize: z.number().positive('File size must be positive'),
  contentType: z.string().min(1, 'Content type is required'),
  s3Key: z.string().min(1, 'S3 key is required'),
  fileHash: z.string().min(1, 'File hash is required'),
});

export type UploadCompleteInput = z.infer<typeof uploadCompleteSchema>;

