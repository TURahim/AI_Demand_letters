import { Router } from 'express';
import * as exportController from './export.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { UserRole } from '@prisma/client';

const router = Router();

// All export routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/exports/:exportId/download
 * Get download URL for export
 */
router.get(
  '/:exportId/download',
  authorize(UserRole.ADMIN, UserRole.PARTNER, UserRole.ASSOCIATE, UserRole.PARALEGAL),
  exportController.getDownloadUrl
);

/**
 * DELETE /api/v1/exports/:exportId
 * Delete export
 */
router.delete(
  '/:exportId',
  authorize(UserRole.ADMIN, UserRole.PARTNER, UserRole.ASSOCIATE),
  exportController.deleteExport
);

export default router;

