import {
  TextractClient,
  DetectDocumentTextCommand,
  Block,
} from '@aws-sdk/client-textract';
import config from '../../config';
import logger from '../../utils/logger';
import { AppError } from '../../middleware/error-handler';

// Initialize Textract client
const textractClient = new TextractClient({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
});

/**
 * Extract text from image/scanned PDF using AWS Textract
 */
export async function extractTextWithTextract(buffer: Buffer): Promise<string> {
  try {
    const command = new DetectDocumentTextCommand({
      Document: {
        Bytes: buffer,
      },
    });

    const response = await textractClient.send(command);

    if (!response.Blocks) {
      throw new Error('No text detected in document');
    }

    // Extract text from LINE blocks
    const text = response.Blocks
      .filter((block: Block) => block.BlockType === 'LINE')
      .map((block: Block) => block.Text)
      .filter((lineText): lineText is string => lineText !== undefined)
      .join('\n');

    logger.info('Textract OCR completed', {
      textLength: text.length,
      blocks: response.Blocks.length,
    });

    return text.trim();
  } catch (error) {
    logger.error('Textract OCR failed', { error });
    throw new AppError('OCR extraction failed', 500);
  }
}

/**
 * Extract text with confidence scores
 */
export async function extractTextWithConfidence(buffer: Buffer): Promise<{
  text: string;
  confidence: number;
  blocks: Array<{
    text: string;
    confidence: number;
  }>;
}> {
  try {
    const command = new DetectDocumentTextCommand({
      Document: {
        Bytes: buffer,
      },
    });

    const response = await textractClient.send(command);

    if (!response.Blocks) {
      throw new Error('No text detected in document');
    }

    const lineBlocks = response.Blocks.filter(
      (block: Block) => block.BlockType === 'LINE'
    );

    const blocks = lineBlocks.map((block: Block) => ({
      text: block.Text || '',
      confidence: block.Confidence || 0,
    }));

    const text = blocks.map((blockItem) => blockItem.text).join('\n');
    const avgConfidence =
      blocks.length > 0
        ? blocks.reduce((sum, blockItem) => sum + blockItem.confidence, 0) / blocks.length
        : 0;

    logger.info('Textract OCR with confidence completed', {
      textLength: text.length,
      avgConfidence,
      blocks: blocks.length,
    });

    return {
      text: text.trim(),
      confidence: avgConfidence,
      blocks,
    };
  } catch (error) {
    logger.error('Textract OCR with confidence failed', { error });
    throw new AppError('OCR extraction failed', 500);
  }
}

/**
 * Check if document is suitable for OCR
 */
export function isOCRCandidate(mimeType: string): boolean {
  const ocrTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/tiff',
    'application/pdf', // Scanned PDFs
  ];

  return ocrTypes.includes(mimeType);
}

/**
 * OCR with fallback handling
 * Tries Textract first, falls back to tesseract if needed
 */
export async function extractTextWithFallback(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  if (!isOCRCandidate(mimeType)) {
    throw new AppError('File type not suitable for OCR', 400);
  }

  try {
    // Try Textract first
    return await extractTextWithTextract(buffer);
  } catch (error) {
    logger.warn('Textract failed, would attempt Tesseract fallback', { error });
    
    // TODO: Implement Tesseract fallback
    // This would require installing Tesseract and using node-tesseract-ocr
    // For now, we'll just rethrow the error
    
    throw new AppError(
      'OCR failed. Textract unavailable and Tesseract not implemented.',
      500
    );
  }
}

