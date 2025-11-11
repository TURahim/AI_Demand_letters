import { Router } from 'express';
import { UserRole } from '@prisma/client';
import * as letterController from './letter.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { auditMiddleware, AUDITED_ACTIONS } from '../../middleware/audit-logger';

const router = Router();

// All letter routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/letters/stats
 * Get letter statistics
 */
router.get(
  '/stats',
  authorize(UserRole.ADMIN, UserRole.PARTNER),
  letterController.getLetterStats
);

/**
 * GET /api/v1/letters
 * List letters
 */
router.get(
  '/',
  authorize(UserRole.ADMIN, UserRole.PARTNER, UserRole.ASSOCIATE, UserRole.PARALEGAL),
  letterController.listLetters
);

/**
 * GET /api/v1/letters/:id
 * Get letter by ID
 */
router.get(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.PARTNER, UserRole.ASSOCIATE, UserRole.PARALEGAL),
  letterController.getLetterById
);

/**
 * PUT /api/v1/letters/:id
 * Update letter
 */
router.put(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.PARTNER, UserRole.ASSOCIATE),
  auditMiddleware(AUDITED_ACTIONS.LETTER_UPDATE, 'Letter'),
  letterController.updateLetter
);

/**
 * DELETE /api/v1/letters/:id
 * Delete letter
 */
router.delete(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.PARTNER),
  auditMiddleware(AUDITED_ACTIONS.LETTER_DELETE, 'Letter'),
  letterController.deleteLetter
);

/**
 * GET /api/v1/letters/:id/versions
 * Get letter versions
 */
router.get(
  '/:id/versions',
  authorize(UserRole.ADMIN, UserRole.PARTNER, UserRole.ASSOCIATE, UserRole.PARALEGAL),
  letterController.getLetterVersions
);

export default router;

