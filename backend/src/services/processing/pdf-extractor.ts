import pdf from 'pdf-parse';
import logger from '../../utils/logger';
import { AppError } from '../../middleware/error-handler';

/**
 * Extract text from PDF buffer
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const data = await pdf(buffer);
    
    const text = data.text.trim();

    logger.info('PDF text extracted', {
      pages: data.numpages,
      textLength: text.length,
    });

    return text;
  } catch (error) {
    logger.error('PDF text extraction failed', { error });
    throw new AppError('Failed to extract text from PDF', 500);
  }
}

/**
 * Check if PDF appears to be scanned (has very little text)
 */
export async function isPDFScanned(buffer: Buffer): Promise<boolean> {
  try {
    const data = await pdf(buffer);
    
    const textLength = data.text.trim().length;
    const avgCharsPerPage = textLength / data.numpages;

    // If average characters per page is less than 100, likely scanned
    const isScanned = avgCharsPerPage < 100;

    logger.debug('PDF scan check', {
      pages: data.numpages,
      textLength,
      avgCharsPerPage,
      isScanned,
    });

    return isScanned;
  } catch (error) {
    logger.error('PDF scan check failed', { error });
    // If we can't determine, assume it might be scanned
    return true;
  }
}

/**
 * Extract metadata from PDF
 */
export async function extractPDFMetadata(buffer: Buffer): Promise<{
  pages: number;
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
}> {
  try {
    const data = await pdf(buffer);

    return {
      pages: data.numpages,
      title: data.info?.Title,
      author: data.info?.Author,
      subject: data.info?.Subject,
      keywords: data.info?.Keywords,
      creator: data.info?.Creator,
      producer: data.info?.Producer,
      creationDate: data.info?.CreationDate,
      modificationDate: data.info?.ModDate,
    };
  } catch (error) {
    logger.error('PDF metadata extraction failed', { error });
    throw new AppError('Failed to extract PDF metadata', 500);
  }
}

