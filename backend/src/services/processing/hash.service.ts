import crypto from 'crypto';
import { Readable } from 'stream';
import logger from '../../utils/logger';

/**
 * Calculate SHA-256 hash of a buffer
 */
export function hashBuffer(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Calculate SHA-256 hash of a string
 */
export function hashString(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Calculate SHA-256 hash of a stream
 */
export async function hashStream(stream: Readable): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    
    stream.on('data', (chunk) => {
      hash.update(chunk);
    });

    stream.on('end', () => {
      resolve(hash.digest('hex'));
    });

    stream.on('error', reject);
  });
}

/**
 * Verify file integrity by comparing hashes
 */
export function verifyFileHash(buffer: Buffer, expectedHash: string): boolean {
  const actualHash = hashBuffer(buffer);
  return actualHash === expectedHash;
}

/**
 * Generate checksum for file metadata
 */
export function generateMetadataChecksum(metadata: Record<string, any>): string {
  const metadataString = JSON.stringify(metadata, Object.keys(metadata).sort());
  return hashString(metadataString);
}

/**
 * Create evidence record for chain of custody
 */
export function createEvidenceRecord(
  fileHash: string,
  fileName: string,
  fileSize: number,
  uploaderId: string,
  timestamp: Date
): {
  fileHash: string;
  fileName: string;
  fileSize: number;
  uploaderId: string;
  timestamp: string;
  signature: string;
} {
  const record = {
    fileHash,
    fileName,
    fileSize,
    uploaderId,
    timestamp: timestamp.toISOString(),
  };

  // Create signature of the record
  const recordString = JSON.stringify(record, Object.keys(record).sort());
  const signature = hashString(recordString);

  logger.debug('Evidence record created', { fileHash, fileName });

  return {
    ...record,
    signature,
  };
}

