import mammoth from 'mammoth';
import logger from '../../utils/logger';
import { AppError } from '../../middleware/error-handler';

/**
 * Extract text from DOCX buffer
 */
export async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });

    const text = result.value.trim();

    if (result.messages.length > 0) {
      logger.warn('DOCX extraction warnings', {
        messages: result.messages,
      });
    }

    logger.info('DOCX text extracted', {
      textLength: text.length,
      warnings: result.messages.length,
    });

    return text;
  } catch (error) {
    logger.error('DOCX text extraction failed', { error });
    throw new AppError('Failed to extract text from DOCX', 500);
  }
}

/**
 * Extract HTML from DOCX buffer
 */
export async function extractHTMLFromDOCX(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.convertToHtml({ buffer });

    const html = result.value.trim();

    if (result.messages.length > 0) {
      logger.warn('DOCX HTML conversion warnings', {
        messages: result.messages,
      });
    }

    logger.info('DOCX HTML extracted', {
      htmlLength: html.length,
      warnings: result.messages.length,
    });

    return html;
  } catch (error) {
    logger.error('DOCX HTML extraction failed', { error });
    throw new AppError('Failed to extract HTML from DOCX', 500);
  }
}

/**
 * Extract markdown from DOCX buffer (simplified - mammoth doesn't have native markdown support)
 */
export async function extractMarkdownFromDOCX(buffer: Buffer): Promise<string> {
  try {
    // Extract raw text as a simple markdown alternative
    const result = await mammoth.extractRawText({ buffer });

    const text = result.value.trim();

    if (result.messages.length > 0) {
      logger.warn('DOCX text extraction warnings', {
        messages: result.messages,
      });
    }

    logger.info('DOCX text extracted as markdown alternative', {
      textLength: text.length,
      warnings: result.messages.length,
    });

    return text;
  } catch (error) {
    logger.error('DOCX text extraction failed', { error });
    throw new AppError('Failed to extract text from DOCX', 500);
  }
}

