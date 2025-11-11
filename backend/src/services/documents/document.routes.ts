import { Router } from 'express';
import * as documentController from './document.controller';
import { authenticate } from '../../middleware/authenticate';
import { enforceFirmIsolation, filterByFirm } from '../../middleware/firm-isolation';

const router = Router();

// All document routes require authentication
router.use(authenticate);

/**
 * Document routes
 */

// Get document statistics (must be before /:id routes)
router.get('/stats', filterByFirm, documentController.getDocumentStats);

// Get all documents
router.get('/', filterByFirm, documentController.getDocuments);

// Get document by ID
router.get(
  '/:id',
  enforceFirmIsolation('document'),
  documentController.getDocument
);

// Process document
router.post(
  '/:id/process',
  enforceFirmIsolation('document'),
  documentController.processDocument
);

// Get download URL
router.get(
  '/:id/download',
  enforceFirmIsolation('document'),
  documentController.getDownloadUrl
);

// Update document
router.put(
  '/:id',
  enforceFirmIsolation('document'),
  documentController.updateDocument
);

// Delete document
router.delete(
  '/:id',
  enforceFirmIsolation('document'),
  documentController.deleteDocument
);

export default router;

