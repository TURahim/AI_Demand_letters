import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import config from '../../config';
import logger from '../../utils/logger';
import { AppError } from '../../middleware/error-handler';
import { Readable } from 'stream';

// Initialize S3 client
const s3Client = new S3Client({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
});

/**
 * Generate presigned URL for direct upload to S3
 */
export async function generatePresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 300 // 5 minutes
): Promise<string> {
  try {
    const command = new PutObjectCommand({
      Bucket: config.s3.bucketName,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });

    logger.debug('Generated presigned upload URL', { key, contentType });

    return url;
  } catch (error) {
    logger.error('Failed to generate presigned upload URL', { error, key });
    throw new AppError('Failed to generate upload URL', 500);
  }
}

/**
 * Generate presigned URL for downloading from S3
 */
export async function generatePresignedDownloadUrl(
  key: string,
  expiresIn: number = 300 // 5 minutes
): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: config.s3.bucketName,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });

    logger.debug('Generated presigned download URL', { key });

    return url;
  } catch (error) {
    logger.error('Failed to generate presigned download URL', { error, key });
    throw new AppError('Failed to generate download URL', 500);
  }
}

/**
 * Upload file directly to S3
 */
export async function uploadFile(
  key: string,
  body: Buffer | Readable,
  contentType: string,
  metadata?: Record<string, string>
): Promise<void> {
  try {
    const command = new PutObjectCommand({
      Bucket: config.s3.bucketName,
      Key: key,
      Body: body,
      ContentType: contentType,
      Metadata: metadata,
      ServerSideEncryption: 'AES256',
    });

    await s3Client.send(command);

    logger.info('File uploaded to S3', { key, contentType });
  } catch (error) {
    logger.error('Failed to upload file to S3', { error, key });
    throw new AppError('Failed to upload file', 500);
  }
}

/**
 * Download file from S3
 */
export async function downloadFile(key: string): Promise<Buffer> {
  try {
    const command = new GetObjectCommand({
      Bucket: config.s3.bucketName,
      Key: key,
    });

    const response = await s3Client.send(command);

    if (!response.Body) {
      throw new AppError('File not found', 404);
    }

    // Convert stream to buffer
    const stream = response.Body as Readable;
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  } catch (error: any) {
    if (error.name === 'NoSuchKey') {
      throw new AppError('File not found', 404);
    }
    logger.error('Failed to download file from S3', { error, key });
    throw new AppError('Failed to download file', 500);
  }
}

/**
 * Delete file from S3
 */
export async function deleteFile(key: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: config.s3.bucketName,
      Key: key,
    });

    await s3Client.send(command);

    logger.info('File deleted from S3', { key });
  } catch (error) {
    logger.error('Failed to delete file from S3', { error, key });
    throw new AppError('Failed to delete file', 500);
  }
}

/**
 * Check if file exists in S3
 */
export async function fileExists(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: config.s3.bucketName,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch (error: any) {
    if (error.name === 'NotFound' || error.name === 'NoSuchKey') {
      return false;
    }
    throw error;
  }
}

/**
 * Get file metadata from S3
 */
export async function getFileMetadata(key: string): Promise<{
  contentType: string;
  contentLength: number;
  lastModified: Date;
  metadata: Record<string, string>;
}> {
  try {
    const command = new HeadObjectCommand({
      Bucket: config.s3.bucketName,
      Key: key,
    });

    const response = await s3Client.send(command);

    return {
      contentType: response.ContentType || 'application/octet-stream',
      contentLength: response.ContentLength || 0,
      lastModified: response.LastModified || new Date(),
      metadata: response.Metadata || {},
    };
  } catch (error: any) {
    if (error.name === 'NotFound' || error.name === 'NoSuchKey') {
      throw new AppError('File not found', 404);
    }
    logger.error('Failed to get file metadata from S3', { error, key });
    throw new AppError('Failed to get file metadata', 500);
  }
}

/**
 * List files in S3 bucket with prefix
 */
export async function listFiles(prefix: string, maxKeys: number = 1000): Promise<
  Array<{
    key: string;
    size: number;
    lastModified: Date;
  }>
> {
  try {
    const command = new ListObjectsV2Command({
      Bucket: config.s3.bucketName,
      Prefix: prefix,
      MaxKeys: maxKeys,
    });

    const response = await s3Client.send(command);

    return (response.Contents || []).map((item) => ({
      key: item.Key!,
      size: item.Size || 0,
      lastModified: item.LastModified || new Date(),
    }));
  } catch (error) {
    logger.error('Failed to list files from S3', { error, prefix });
    throw new AppError('Failed to list files', 500);
  }
}

/**
 * Copy file within S3
 */
export async function copyFile(sourceKey: string, destKey: string): Promise<void> {
  try {
    const { CopyObjectCommand } = await import('@aws-sdk/client-s3');
    
    const command = new CopyObjectCommand({
      Bucket: config.s3.bucketName,
      CopySource: `${config.s3.bucketName}/${sourceKey}`,
      Key: destKey,
      ServerSideEncryption: 'AES256',
    });

    await s3Client.send(command);

    logger.info('File copied in S3', { sourceKey, destKey });
  } catch (error) {
    logger.error('Failed to copy file in S3', { error, sourceKey, destKey });
    throw new AppError('Failed to copy file', 500);
  }
}

/**
 * Generate S3 key for document upload
 */
export function generateDocumentKey(
  firmId: string,
  userId: string,
  fileName: string
): string {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${config.s3.uploadsPrefix}${firmId}/${userId}/${timestamp}-${sanitizedFileName}`;
}

/**
 * Generate S3 key for letter export
 */
export function generateLetterKey(
  firmId: string,
  letterId: string,
  format: string
): string {
  const timestamp = Date.now();
  return `${config.s3.lettersPrefix}${firmId}/${letterId}/${timestamp}.${format}`;
}

