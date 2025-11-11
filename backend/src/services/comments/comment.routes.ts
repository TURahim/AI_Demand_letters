/**
 * Comment Routes
 * Defines routes for comment operations
 */

import { Router } from 'express';
import { commentController } from './comment.controller';
import { authenticate } from '../../middleware/authenticate';
import { asyncHandler } from '../../middleware/async-handler';

const router = Router();

// All comment routes require authentication
router.use(authenticate);

// Comment operations on a specific comment
router.get('/:id', asyncHandler(commentController.getComment.bind(commentController)));
router.put('/:id', asyncHandler(commentController.updateComment.bind(commentController)));
router.delete('/:id', asyncHandler(commentController.deleteComment.bind(commentController)));
router.post('/:id/resolve', asyncHandler(commentController.resolveComment.bind(commentController)));
router.post('/:id/unresolve', asyncHandler(commentController.unresolveComment.bind(commentController)));

export default router;

