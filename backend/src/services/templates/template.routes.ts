import { Router } from 'express';
import * as templateController from './template.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get template categories (must come before /:id routes)
router.get('/categories', templateController.getCategories);

// Get popular templates
router.get('/popular', templateController.getPopularTemplates);

// Get all templates
router.get('/', templateController.getTemplates);

// Get template by ID
router.get('/:id', templateController.getTemplate);

// Create template
router.post('/', templateController.createTemplate);

// Update template
router.put('/:id', templateController.updateTemplate);

// Delete template
router.delete('/:id', templateController.deleteTemplate);

// Clone template
router.post('/:id/clone', templateController.cloneTemplate);

// Render template
router.post('/:id/render', templateController.renderTemplate);

export default router;

