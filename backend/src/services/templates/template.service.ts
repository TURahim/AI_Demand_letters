import prisma from '../../utils/prisma-client';
import { AppError } from '../../middleware/error-handler';
import { extractVariableDefinitions, hasValidSyntax } from './variable-parser';
import { renderTemplate } from './template-renderer';
import { createAuditLog, AUDITED_ACTIONS } from '../../middleware/audit-logger';
import logger from '../../utils/logger';

/**
 * Get all templates for a firm
 */
export async function getTemplates(
  firmId: string,
  filters?: {
    category?: string;
    isPublic?: boolean;
    isActive?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  }
) {
  const where: any = {
    OR: [
      { firmId },
      { isPublic: true }, // Include public templates
    ],
  };

  if (filters?.category) {
    where.category = filters.category;
  }

  if (filters?.isPublic !== undefined) {
    where.isPublic = filters.isPublic;
  }

  if (filters?.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  if (filters?.search) {
    where.AND = [
      {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ],
      },
    ];
  }

  const [templates, total] = await Promise.all([
    prisma.template.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        firm: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { isPublic: 'desc' }, // Public templates first
        { usageCount: 'desc' }, // Then by popularity
        { createdAt: 'desc' },
      ],
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
    }),
    prisma.template.count({ where }),
  ]);

  return { templates, total };
}

/**
 * Get template by ID
 */
export async function getTemplateById(templateId: string, firmId: string) {
  const template = await prisma.template.findUnique({
    where: { id: templateId },
    include: {
      creator: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      firm: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!template) {
    throw new AppError('Template not found', 404);
  }

  // Check access (own firm or public)
  if (template.firmId !== firmId && !template.isPublic) {
    throw new AppError('Access denied', 403);
  }

  return template;
}

/**
 * Create new template
 */
export async function createTemplate(
  data: {
    name: string;
    description?: string;
    category?: string;
    content: any;
    variables?: any;
    isPublic?: boolean;
  },
  userId: string,
  firmId: string
) {
  // Validate template content syntax if it's a string
  if (typeof data.content === 'string') {
    const syntaxCheck = hasValidSyntax(data.content);
    if (!syntaxCheck.valid) {
      throw new AppError(
        `Template syntax errors: ${syntaxCheck.errors.join(', ')}`,
        400
      );
    }
  }

  // Extract variables from content if not provided
  let variables = data.variables;
  if (!variables) {
    const contentString =
      typeof data.content === 'string'
        ? data.content
        : JSON.stringify(data.content);
    variables = extractVariableDefinitions(contentString);
  }

  // Create template
  const template = await prisma.template.create({
    data: {
      firmId,
      createdBy: userId,
      name: data.name,
      description: data.description,
      category: data.category,
      content: data.content,
      variables,
      isPublic: data.isPublic || false,
    },
  });

  // Create audit log
  await createAuditLog(AUDITED_ACTIONS.TEMPLATE_CREATE, 'template', {
    userId,
    firmId,
    resourceId: template.id,
    metadata: {
      name: template.name,
    },
  });

  logger.info('Template created', {
    templateId: template.id,
    userId,
    firmId,
    name: template.name,
  });

  return template;
}

/**
 * Update template
 */
export async function updateTemplate(
  templateId: string,
  data: {
    name?: string;
    description?: string;
    category?: string;
    content?: any;
    variables?: any;
    isPublic?: boolean;
    isActive?: boolean;
  },
  userId: string,
  firmId: string
) {
  const template = await prisma.template.findUnique({
    where: { id: templateId },
  });

  if (!template) {
    throw new AppError('Template not found', 404);
  }

  // Only template creator or firm admin can edit
  if (template.firmId !== firmId) {
    throw new AppError('Access denied', 403);
  }

  // Validate content syntax if being updated
  if (data.content && typeof data.content === 'string') {
    const syntaxCheck = hasValidSyntax(data.content);
    if (!syntaxCheck.valid) {
      throw new AppError(
        `Template syntax errors: ${syntaxCheck.errors.join(', ')}`,
        400
      );
    }
  }

  // Update template
  const updated = await prisma.template.update({
    where: { id: templateId },
    data: {
      name: data.name,
      description: data.description,
      category: data.category,
      content: data.content,
      variables: data.variables,
      isPublic: data.isPublic,
      isActive: data.isActive,
    },
  });

  // Create audit log
  await createAuditLog(AUDITED_ACTIONS.TEMPLATE_UPDATE, 'template', {
    userId,
    firmId,
    resourceId: templateId,
    metadata: { changes: data },
  });

  logger.info('Template updated', {
    templateId,
    userId,
    firmId,
  });

  return updated;
}

/**
 * Delete template
 */
export async function deleteTemplate(
  templateId: string,
  userId: string,
  firmId: string
) {
  const template = await prisma.template.findUnique({
    where: { id: templateId },
  });

  if (!template) {
    throw new AppError('Template not found', 404);
  }

  if (template.firmId !== firmId) {
    throw new AppError('Access denied', 403);
  }

  // Delete template
  await prisma.template.delete({
    where: { id: templateId },
  });

  // Create audit log
  await createAuditLog(AUDITED_ACTIONS.TEMPLATE_DELETE, 'template', {
    userId,
    firmId,
    resourceId: templateId,
    metadata: {
      name: template.name,
    },
  });

  logger.info('Template deleted', {
    templateId,
    userId,
    firmId,
  });
}

/**
 * Clone template
 */
export async function cloneTemplate(
  templateId: string,
  newName: string,
  newDescription: string | undefined,
  userId: string,
  firmId: string
) {
  const sourceTemplate = await prisma.template.findUnique({
    where: { id: templateId },
  });

  if (!sourceTemplate) {
    throw new AppError('Template not found', 404);
  }

  // Check access
  if (sourceTemplate.firmId !== firmId && !sourceTemplate.isPublic) {
    throw new AppError('Access denied', 403);
  }

  // Create cloned template
  const cloned = await prisma.template.create({
    data: {
      firmId,
      createdBy: userId,
      name: newName,
      description: newDescription || sourceTemplate.description,
      category: sourceTemplate.category,
      content: sourceTemplate.content as any,
      variables: sourceTemplate.variables as any,
      isPublic: false, // Clones are always private
    },
  });

  logger.info('Template cloned', {
    sourceTemplateId: templateId,
    clonedTemplateId: cloned.id,
    userId,
    firmId,
  });

  return cloned;
}

/**
 * Render template with data
 */
export async function renderTemplateWithData(
  templateId: string,
  data: Record<string, any>,
  firmId: string
) {
  const template = await getTemplateById(templateId, firmId);

  // Extract content as string
  const contentString =
    typeof template.content === 'string'
      ? template.content
      : JSON.stringify(template.content);

  // Render
  const rendered = renderTemplate(
    contentString,
    data,
    template.variables as any
  );

  // Increment usage count
  await prisma.template.update({
    where: { id: templateId },
    data: {
      usageCount: {
        increment: 1,
      },
    },
  });

  return rendered;
}

/**
 * Get template categories
 */
export async function getTemplateCategories(firmId: string): Promise<string[]> {
  const templates = await prisma.template.findMany({
    where: {
      OR: [{ firmId }, { isPublic: true }],
      category: { not: null },
    },
    select: {
      category: true,
    },
    distinct: ['category'],
  });

  return templates
    .map((t) => t.category)
    .filter((c): c is string => c !== null)
    .sort();
}

/**
 * Get popular templates
 */
export async function getPopularTemplates(firmId: string, limit: number = 10) {
  const templates = await prisma.template.findMany({
    where: {
      OR: [{ firmId }, { isPublic: true }],
      isActive: true,
    },
    orderBy: {
      usageCount: 'desc',
    },
    take: limit,
    include: {
      creator: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  return templates;
}

