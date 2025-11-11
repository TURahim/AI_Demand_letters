import { Router } from 'express';
import * as firmController from './firm.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { enforceFirmIsolation } from '../../middleware/firm-isolation';

const router = Router();

// All firm routes require authentication
router.use(authenticate);

/**
 * Firm routes
 */

// Get firm by ID
router.get(
  '/:id',
  enforceFirmIsolation('firm'),
  firmController.getFirm
);

// Update firm (admin/partner only)
router.put(
  '/:id',
  authorize('ADMIN', 'PARTNER'),
  enforceFirmIsolation('firm'),
  firmController.updateFirm
);

// Get firm statistics
router.get(
  '/:id/stats',
  enforceFirmIsolation('firm'),
  firmController.getFirmStats
);

// Get firm users
router.get(
  '/:id/users',
  authorize('ADMIN', 'PARTNER'),
  enforceFirmIsolation('firm'),
  firmController.getFirmUsers
);

export default router;

