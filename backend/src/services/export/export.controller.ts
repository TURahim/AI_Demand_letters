import { Request, Response } from 'express';
import * as exportService from './export.service';
import { exportRequestSchema } from './export.validation';
import { asyncHandler } from '../../middleware/async-handler';
import logger from '../../utils/logger';

/**
 * Generate export for a letter
 * POST /api/v1/letters/:letterId/export
 */
export const generateExport = asyncHandler(
  async (req: Request, res: Response) => {
    const { letterId } = req.params;
    const userId = req.user!.id;
    const firmId = req.user!.firmId;

    logger.info('Export generation requested', { letterId, userId, firmId });

    const validatedData = exportRequestSchema.parse(req.body);

    const result = await exportService.generateExport(
      letterId,
      firmId,
      userId,
      {
        format: validatedData.format,
        includeHeader: validatedData.includeHeader,
        includeFooter: validatedData.includeFooter,
        firmBranding: validatedData.firmBranding,
      }
    );

    res.status(201).json({
      status: 'success',
      message: 'Export generated successfully',
      data: result,
    });
  }
);

/**
 * Get download URL for export
 * GET /api/v1/exports/:exportId/download
 */
export const getDownloadUrl = asyncHandler(
  async (req: Request, res: Response) => {
    const { exportId } = req.params;
    const firmId = req.user!.firmId;

    logger.info('Export download requested', { exportId, firmId });

    const result = await exportService.getExportDownloadUrl(exportId, firmId);

    res.json({
      status: 'success',
      data: result,
    });
  }
);

/**
 * List exports for a letter
 * GET /api/v1/letters/:letterId/exports
 */
export const listExports = asyncHandler(
  async (req: Request, res: Response) => {
    const { letterId } = req.params;
    const firmId = req.user!.firmId;

    logger.debug('Listing exports', { letterId, firmId });

    const exports = await exportService.listExports(letterId, firmId);

    res.json({
      status: 'success',
      data: { exports },
    });
  }
);

/**
 * Delete export
 * DELETE /api/v1/exports/:exportId
 */
export const deleteExport = asyncHandler(
  async (req: Request, res: Response) => {
    const { exportId } = req.params;
    const firmId = req.user!.firmId;

    logger.info('Export deletion requested', { exportId, firmId });

    await exportService.deleteExport(exportId, firmId);

    res.json({
      status: 'success',
      message: 'Export deleted successfully',
    });
  }
);

