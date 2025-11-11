import { Request, Response } from 'express';
import * as templateService from './template.service';
import {
  createTemplateSchema,
  updateTemplateSchema,
  renderTemplateSchema,
  cloneTemplateSchema,
} from './template.validation';
import { asyncHandler } from '../../middleware/error-handler';
import logger from '../../utils/logger';

/**
 * Get all templates
 * GET /api/v1/templates
 */
export const getTemplates = asyncHandler(
  async (req: Request, res: Response) => {
    const firmId = req.user!.firmId;
    const { category, isPublic, isActive, search, limit, offset } = req.query;

    logger.debug('Fetching templates', { firmId, filters: req.query });

    const result = await templateService.getTemplates(firmId, {
      category: category as string,
      isPublic: isPublic === 'true' ? true : isPublic === 'false' ? false : undefined,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      search: search as string,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });

    res.json({
      status: 'success',
      data: {
        templates: result.templates,
        total: result.total,
        limit: limit ? parseInt(limit as string, 10) : 50,
        offset: offset ? parseInt(offset as string, 10) : 0,
      },
    });
  }
);

/**
 * Get template by ID
 * GET /api/v1/templates/:id
 */
export const getTemplate = asyncHandler(
  async (req: Request, res: Response) => {
    const templateId = req.params.id;
    const firmId = req.user!.firmId;

    logger.debug('Fetching template', { templateId, firmId });

    const template = await templateService.getTemplateById(templateId, firmId);

    res.json({
      status: 'success',
      data: { template },
    });
  }
);

/**
 * Create template
 * POST /api/v1/templates
 */
export const createTemplate = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const firmId = req.user!.firmId;

    logger.info('Creating template', { userId, firmId });

    // Validate request
    const validatedData = createTemplateSchema.parse(req.body);

    // Create template
    const template = await templateService.createTemplate(
      {
        name: validatedData.name,
        description: validatedData.description,
        category: validatedData.category,
        content: validatedData.content,
        variables: validatedData.variables,
        isPublic: validatedData.isPublic,
      },
      userId,
      firmId
    );

    res.status(201).json({
      status: 'success',
      message: 'Template created successfully',
      data: { template },
    });
  }
);

/**
 * Update template
 * PUT /api/v1/templates/:id
 */
export const updateTemplate = asyncHandler(
  async (req: Request, res: Response) => {
    const templateId = req.params.id;
    const userId = req.user!.id;
    const firmId = req.user!.firmId;

    logger.info('Updating template', { templateId, userId, firmId });

    // Validate request
    const validatedData = updateTemplateSchema.parse(req.body);

    // Update template
    const template = await templateService.updateTemplate(
      templateId,
      validatedData,
      userId,
      firmId
    );

    res.json({
      status: 'success',
      message: 'Template updated successfully',
      data: { template },
    });
  }
);

/**
 * Delete template
 * DELETE /api/v1/templates/:id
 */
export const deleteTemplate = asyncHandler(
  async (req: Request, res: Response) => {
    const templateId = req.params.id;
    const userId = req.user!.id;
    const firmId = req.user!.firmId;

    logger.info('Deleting template', { templateId, userId, firmId });

    await templateService.deleteTemplate(templateId, userId, firmId);

    res.json({
      status: 'success',
      message: 'Template deleted successfully',
    });
  }
);

/**
 * Clone template
 * POST /api/v1/templates/:id/clone
 */
export const cloneTemplate = asyncHandler(
  async (req: Request, res: Response) => {
    const templateId = req.params.id;
    const userId = req.user!.id;
    const firmId = req.user!.firmId;

    logger.info('Cloning template', { templateId, userId, firmId });

    // Validate request
    const validatedData = cloneTemplateSchema.parse(req.body);

    // Clone template
    const template = await templateService.cloneTemplate(
      templateId,
      validatedData.name,
      validatedData.description,
      userId,
      firmId
    );

    res.status(201).json({
      status: 'success',
      message: 'Template cloned successfully',
      data: { template },
    });
  }
);

/**
 * Render template with data
 * POST /api/v1/templates/:id/render
 */
export const renderTemplate = asyncHandler(
  async (req: Request, res: Response) => {
    const templateId = req.params.id;
    const firmId = req.user!.firmId;

    logger.info('Rendering template', { templateId, firmId });

    // Validate request
    const validatedData = renderTemplateSchema.parse(req.body);

    // Render template
    const rendered = await templateService.renderTemplateWithData(
      templateId,
      validatedData.data,
      firmId
    );

    res.json({
      status: 'success',
      data: { rendered },
    });
  }
);

/**
 * Get template categories
 * GET /api/v1/templates/categories
 */
export const getCategories = asyncHandler(
  async (req: Request, res: Response) => {
    const firmId = req.user!.firmId;

    logger.debug('Fetching template categories', { firmId });

    const categories = await templateService.getTemplateCategories(firmId);

    res.json({
      status: 'success',
      data: { categories },
    });
  }
);

/**
 * Get popular templates
 * GET /api/v1/templates/popular
 */
export const getPopularTemplates = asyncHandler(
  async (req: Request, res: Response) => {
    const firmId = req.user!.firmId;
    const { limit } = req.query;

    logger.debug('Fetching popular templates', { firmId });

    const templates = await templateService.getPopularTemplates(
      firmId,
      limit ? parseInt(limit as string, 10) : 10
    );

    res.json({
      status: 'success',
      data: { templates },
    });
  }
);

