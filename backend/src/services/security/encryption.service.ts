import { KMSClient, EncryptCommand, DecryptCommand } from '@aws-sdk/client-kms';
import config from '../../config';
import logger from '../../utils/logger';
import crypto from 'crypto';

// Initialize KMS client
const kmsClient = new KMSClient({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
});

/**
 * Encrypt data using AWS KMS
 */
export async function encryptWithKMS(plaintext: string): Promise<string> {
  if (!config.kms.encryptionEnabled) {
    logger.warn('KMS encryption is disabled, returning plaintext');
    return plaintext;
  }

  try {
    const command = new EncryptCommand({
      KeyId: config.kms.keyId,
      Plaintext: Buffer.from(plaintext, 'utf-8'),
    });

    const response = await kmsClient.send(command);
    
    if (!response.CiphertextBlob) {
      throw new Error('KMS encryption failed: no ciphertext returned');
    }

    // Return base64 encoded ciphertext
    return Buffer.from(response.CiphertextBlob).toString('base64');
  } catch (error) {
    logger.error('KMS encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt data using AWS KMS
 */
export async function decryptWithKMS(ciphertext: string): Promise<string> {
  if (!config.kms.encryptionEnabled) {
    logger.warn('KMS encryption is disabled, returning ciphertext as plaintext');
    return ciphertext;
  }

  try {
    const command = new DecryptCommand({
      CiphertextBlob: Buffer.from(ciphertext, 'base64'),
    });

    const response = await kmsClient.send(command);
    
    if (!response.Plaintext) {
      throw new Error('KMS decryption failed: no plaintext returned');
    }

    return Buffer.from(response.Plaintext).toString('utf-8');
  } catch (error) {
    logger.error('KMS decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Generate data encryption key using KMS (envelope encryption)
 */
export async function generateDataKey(): Promise<{
  plaintextKey: Buffer;
  encryptedKey: string;
}> {
  try {
    const { GenerateDataKeyCommand } = await import('@aws-sdk/client-kms');
    
    const command = new GenerateDataKeyCommand({
      KeyId: config.kms.keyId,
      KeySpec: 'AES_256',
    });

    const response = await kmsClient.send(command);
    
    if (!response.Plaintext || !response.CiphertextBlob) {
      throw new Error('Failed to generate data key');
    }

    return {
      plaintextKey: Buffer.from(response.Plaintext),
      encryptedKey: Buffer.from(response.CiphertextBlob).toString('base64'),
    };
  } catch (error) {
    logger.error('Data key generation failed:', error);
    throw new Error('Failed to generate encryption key');
  }
}

/**
 * Encrypt data using AES-256-GCM with envelope encryption
 */
export function encryptData(plaintext: string, key: Buffer): {
  encrypted: string;
  iv: string;
  authTag: string;
} {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

/**
 * Decrypt data using AES-256-GCM
 */
export function decryptData(
  encrypted: string,
  key: Buffer,
  iv: string,
  authTag: string
): string {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(iv, 'base64')
  );

  decipher.setAuthTag(Buffer.from(authTag, 'base64'));

  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Hash data using SHA-256
 */
export function hashData(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Sign data using HMAC-SHA256
 */
export function signData(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Verify HMAC signature
 */
export function verifySignature(
  data: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = signData(data, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

