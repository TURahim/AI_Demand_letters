import { Router } from 'express';
import * as uploadController from './upload.controller';
import { authenticate } from '../../middleware/authenticate';
import { rateLimiter } from '../../middleware/rate-limiter';

const router = Router();

// All upload routes require authentication
router.use(authenticate);

/**
 * Upload routes
 */

// Request presigned URL for upload
router.post(
  '/presigned-url',
  rateLimiter('upload'),
  uploadController.requestPresignedUrl
);

// Complete upload
router.post(
  '/complete',
  rateLimiter('upload'),
  uploadController.completeUpload
);

export default router;

