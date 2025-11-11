import { Router } from 'express';
import { UserRole } from '@prisma/client';
import * as letterController from './letter.controller';
import { commentController } from '../comments/comment.controller';
import * as exportController from '../export/export.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { auditMiddleware, AUDITED_ACTIONS } from '../../middleware/audit-logger';
import { asyncHandler } from '../../middleware/async-handler';

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

/**
 * GET /api/v1/letters/:id/documents
 * Get document IDs associated with a letter
 */
router.get(
  '/:id/documents',
  authorize(UserRole.ADMIN, UserRole.PARTNER, UserRole.ASSOCIATE, UserRole.PARALEGAL),
  letterController.getLetterDocuments
);

/**
 * PATCH /api/v1/letters/:id/autosave
 * Auto-save letter (debounced)
 */
router.patch(
  '/:id/autosave',
  authorize(UserRole.ADMIN, UserRole.PARTNER, UserRole.ASSOCIATE),
  letterController.autoSaveLetter
);

/**
 * POST /api/v1/letters/:id/save
 * Force save letter (immediate)
 */
router.post(
  '/:id/save',
  authorize(UserRole.ADMIN, UserRole.PARTNER, UserRole.ASSOCIATE),
  auditMiddleware(AUDITED_ACTIONS.LETTER_UPDATE, 'Letter'),
  letterController.forceSaveLetter
);

/**
 * Export routes for letters
 */

/**
 * POST /api/v1/letters/:letterId/export
 * Generate export for a letter
 */
router.post(
  '/:letterId/export',
  authorize(UserRole.ADMIN, UserRole.PARTNER, UserRole.ASSOCIATE),
  auditMiddleware(AUDITED_ACTIONS.LETTER_EXPORT, 'Letter'),
  exportController.generateExport
);

/**
 * GET /api/v1/letters/:letterId/exports
 * List exports for a letter
 */
router.get(
  '/:letterId/exports',
  authorize(UserRole.ADMIN, UserRole.PARTNER, UserRole.ASSOCIATE, UserRole.PARALEGAL),
  exportController.listExports
);

/**
 * Comment routes for letters
 */

/**
 * POST /api/v1/letters/:letterId/comments
 * Create a comment on a letter
 */
router.post(
  '/:letterId/comments',
  authorize(UserRole.ADMIN, UserRole.PARTNER, UserRole.ASSOCIATE, UserRole.PARALEGAL),
  asyncHandler(commentController.createComment.bind(commentController))
);

/**
 * GET /api/v1/letters/:letterId/comments
 * Get all comments for a letter
 */
router.get(
  '/:letterId/comments',
  authorize(UserRole.ADMIN, UserRole.PARTNER, UserRole.ASSOCIATE, UserRole.PARALEGAL),
  asyncHandler(commentController.getComments.bind(commentController))
);

/**
 * GET /api/v1/letters/:letterId/comments/count
 * Get comment count for a letter
 */
router.get(
  '/:letterId/comments/count',
  authorize(UserRole.ADMIN, UserRole.PARTNER, UserRole.ASSOCIATE, UserRole.PARALEGAL),
  asyncHandler(commentController.getCommentCount.bind(commentController))
);

export default router;

