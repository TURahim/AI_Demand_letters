import { Request, Response } from 'express';
import * as documentService from './document.service';
import * as uploadService from '../upload/upload.service';
import { asyncHandler } from '../../middleware/error-handler';
import logger from '../../utils/logger';

/**
 * Get all documents
 * GET /api/v1/documents
 */
export const getDocuments = asyncHandler(
  async (req: Request, res: Response) => {
    const firmId = req.user!.firmId;
    const { status, search, uploadedBy, limit, offset } = req.query;

    logger.debug('Fetching documents', { firmId, filters: req.query });

    const result = await documentService.getDocuments(firmId, {
      status: status as string,
      search: search as string,
      uploadedBy: uploadedBy as string,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });

    res.json({
      status: 'success',
      data: {
        documents: result.documents,
        total: result.total,
        limit: limit ? parseInt(limit as string, 10) : 50,
        offset: offset ? parseInt(offset as string, 10) : 0,
      },
    });
  }
);

/**
 * Get document by ID
 * GET /api/v1/documents/:id
 */
export const getDocument = asyncHandler(
  async (req: Request, res: Response) => {
    const documentId = req.params.id;
    const firmId = req.user!.firmId;

    logger.debug('Fetching document', { documentId, firmId });

    const document = await documentService.getDocumentById(documentId, firmId);

    res.json({
      status: 'success',
      data: { document },
    });
  }
);

/**
 * Process document (extract text)
 * POST /api/v1/documents/:id/process
 */
export const processDocument = asyncHandler(
  async (req: Request, res: Response) => {
    const documentId = req.params.id;
    const firmId = req.user!.firmId;

    logger.info('Processing document', { documentId, firmId });

    // Verify access
    await documentService.getDocumentById(documentId, firmId);

    // Process document (async)
    documentService.processDocument(documentId).catch((error) => {
      logger.error('Async document processing failed', { error, documentId });
    });

    res.json({
      status: 'success',
      message: 'Document processing started',
    });
  }
);

/**
 * Update document
 * PUT /api/v1/documents/:id
 */
export const updateDocument = asyncHandler(
  async (req: Request, res: Response) => {
    const documentId = req.params.id;
    const firmId = req.user!.firmId;
    const { fileName, metadata } = req.body;

    logger.info('Updating document', { documentId, firmId });

    const document = await documentService.updateDocument(
      documentId,
      firmId,
      { fileName, metadata }
    );

    res.json({
      status: 'success',
      message: 'Document updated successfully',
      data: { document },
    });
  }
);

/**
 * Delete document
 * DELETE /api/v1/documents/:id
 */
export const deleteDocument = asyncHandler(
  async (req: Request, res: Response) => {
    const documentId = req.params.id;
    const userId = req.user!.id;
    const firmId = req.user!.firmId;

    logger.info('Deleting document', { documentId, userId, firmId });

    await uploadService.deleteDocument(documentId, userId, firmId);

    res.json({
      status: 'success',
      message: 'Document deleted successfully',
    });
  }
);

/**
 * Get download URL for document
 * GET /api/v1/documents/:id/download
 */
export const getDownloadUrl = asyncHandler(
  async (req: Request, res: Response) => {
    const documentId = req.params.id;
    const userId = req.user!.id;
    const firmId = req.user!.firmId;

    logger.info('Generating download URL', { documentId, userId, firmId });

    const result = await uploadService.getDownloadUrl(
      documentId,
      userId,
      firmId
    );

    res.json({
      status: 'success',
      data: result,
    });
  }
);

/**
 * Get document statistics
 * GET /api/v1/documents/stats
 */
export const getDocumentStats = asyncHandler(
  async (req: Request, res: Response) => {
    const firmId = req.user!.firmId;

    logger.debug('Fetching document stats', { firmId });

    const stats = await documentService.getDocumentStats(firmId);

    res.json({
      status: 'success',
      data: { stats },
    });
  }
);

