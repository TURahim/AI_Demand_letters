import { Request, Response } from 'express';
import * as letterService from './letter.service';
import * as versionService from './version.service';
import { updateLetterSchema } from './letter.validation';
import { asyncHandler } from '../../middleware/async-handler';
import { autoSaveService } from './autosave.service';
import logger from '../../utils/logger';
import { z } from 'zod';

/**
 * List letters
 * GET /api/v1/letters
 */
export const listLetters = asyncHandler(async (req: Request, res: Response) => {
  const firmId = req.user!.firmId;
  const { status, createdBy, search, templateId, startDate, endDate, page, limit } = req.query;

  const filters = {
    status: status as string,
    createdBy: createdBy as string,
    search: search as string,
    templateId: templateId as string,
    startDate: startDate ? new Date(startDate as string) : undefined,
    endDate: endDate ? new Date(endDate as string) : undefined,
  };

  const pagination = {
    page: page ? parseInt(page as string, 10) : undefined,
    limit: limit ? parseInt(limit as string, 10) : undefined,
  };

  const result = await letterService.listLetters(firmId, filters, pagination);

  res.status(200).json({
    status: 'success',
    message: 'Letters retrieved successfully',
    data: result,
  });
});

/**
 * Get letter by ID
 * GET /api/v1/letters/:id
 */
export const getLetterById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const firmId = req.user!.firmId;

  const letter = await letterService.getLetterById(id, firmId);

  res.status(200).json({
    status: 'success',
    message: 'Letter retrieved successfully',
    data: { letter },
  });
});

/**
 * Update letter
 * PUT /api/v1/letters/:id
 */
export const updateLetter = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const firmId = req.user!.firmId;

  logger.info('Update letter request', { letterId: id, userId, firmId });

  const validatedData = updateLetterSchema.parse(req.body);

  const letter = await letterService.updateLetter(id, firmId, userId, validatedData);

  res.status(200).json({
    status: 'success',
    message: 'Letter updated successfully',
    data: { letter },
  });
});

/**
 * Delete letter
 * DELETE /api/v1/letters/:id
 */
export const deleteLetter = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const firmId = req.user!.firmId;

  logger.info('Delete letter request', { letterId: id, userId, firmId });

  await letterService.deleteLetter(id, firmId, userId);

  res.status(200).json({
    status: 'success',
    message: 'Letter deleted successfully',
    data: null,
  });
});

/**
 * Get letter versions
 * GET /api/v1/letters/:id/versions
 */
export const getLetterVersions = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const firmId = req.user!.firmId;

  const versions = await versionService.getLetterVersions(id, firmId);

  res.status(200).json({
    status: 'success',
    message: 'Letter versions retrieved successfully',
    data: { versions },
  });
});

/**
 * Get letter statistics
 * GET /api/v1/letters/stats
 */
export const getLetterStats = asyncHandler(async (req: Request, res: Response) => {
  const firmId = req.user!.firmId;

  const stats = await letterService.getLetterStats(firmId);

  res.status(200).json({
    status: 'success',
    message: 'Letter statistics retrieved successfully',
    data: { stats },
  });
});

/**
 * Get document IDs associated with a letter
 * GET /api/v1/letters/:id/documents
 */
export const getLetterDocuments = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const firmId = req.user!.firmId;

  const documentIds = await letterService.getLetterDocumentIds(id, firmId);

  res.status(200).json({
    status: 'success',
    message: 'Letter documents retrieved successfully',
    data: { documentIds },
  });
});

// Auto-save validation schema
const autoSaveSchema = z.object({
  content: z.any().optional(),
  title: z.string().optional(),
  metadata: z.any().optional(),
});

/**
 * Auto-save letter (debounced)
 * PATCH /api/v1/letters/:id/autosave
 */
export const autoSaveLetter = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const validatedData = autoSaveSchema.parse(req.body);

  // Schedule the save (debounced)
  await autoSaveService.scheduleSave(id, userId, validatedData, {
    createVersion: false, // Auto-saves don't create versions
  });

  res.status(202).json({
    status: 'success',
    message: 'Auto-save scheduled',
    data: {
      letterId: id,
      hasPendingChanges: autoSaveService.hasPendingChanges(id),
    },
  });
});

/**
 * Force save letter (immediate, no debounce)
 * POST /api/v1/letters/:id/save
 */
export const forceSaveLetter = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const validatedData = autoSaveSchema.parse(req.body);

  // If there are pending changes, force save them first
  if (autoSaveService.hasPendingChanges(id)) {
    await autoSaveService.forceSave(id, userId, { createVersion: false });
  }

  // Then apply the new changes with version creation
  await autoSaveService.scheduleSave(id, userId, validatedData, {
    createVersion: true, // Manual saves create versions
  });
  await autoSaveService.forceSave(id, userId, { createVersion: true });

  res.status(200).json({
    status: 'success',
    message: 'Letter saved successfully',
    data: { letterId: id },
  });
});

