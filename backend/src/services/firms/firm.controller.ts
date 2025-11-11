import { Request, Response } from 'express';
import * as firmService from './firm.service';
import { asyncHandler } from '../../middleware/error-handler';
import logger from '../../utils/logger';

/**
 * Get firm by ID
 * GET /api/v1/firms/:id
 */
export const getFirm = asyncHandler(async (req: Request, res: Response) => {
  const firmId = req.params.id;

  logger.debug('Fetching firm', { firmId });

  const firm = await firmService.getFirmById(firmId);

  res.json({
    status: 'success',
    data: { firm },
  });
});

/**
 * Update firm
 * PUT /api/v1/firms/:id
 */
export const updateFirm = asyncHandler(async (req: Request, res: Response) => {
  const firmId = req.params.id;
  const requestingUserId = req.user!.id;
  const { name, address, phone, email, logo } = req.body;

  logger.info('Updating firm', { firmId, requestingUserId });

  const firm = await firmService.updateFirm(
    firmId,
    { name, address, phone, email, logo },
    requestingUserId
  );

  res.json({
    status: 'success',
    message: 'Firm updated successfully',
    data: { firm },
  });
});

/**
 * Get firm statistics
 * GET /api/v1/firms/:id/stats
 */
export const getFirmStats = asyncHandler(
  async (req: Request, res: Response) => {
    const firmId = req.params.id;

    logger.debug('Fetching firm stats', { firmId });

    const stats = await firmService.getFirmStats(firmId);

    res.json({
      status: 'success',
      data: { stats },
    });
  }
);

/**
 * Get firm users
 * GET /api/v1/firms/:id/users
 */
export const getFirmUsers = asyncHandler(
  async (req: Request, res: Response) => {
    const firmId = req.params.id;
    const { includeInactive, limit } = req.query;

    logger.debug('Fetching firm users', { firmId });

    const users = await firmService.getFirmUsers(firmId, {
      includeInactive: includeInactive === 'true',
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    res.json({
      status: 'success',
      data: { users, count: users.length },
    });
  }
);

