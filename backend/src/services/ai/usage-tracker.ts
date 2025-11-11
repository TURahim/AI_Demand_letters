import { calculateCost } from './token-counter';
import { getModelPricing } from './bedrock.config';
import logger from '../../utils/logger';

/**
 * Track AI usage in database
 */
export async function trackAIUsage(data: {
  userId: string;
  firmId: string;
  operationType: 'generate' | 'refine' | 'analyze' | 'feedback' | 'tone_adjust';
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  requestId?: string;
  letterId?: string;
  documentIds?: string[];
  metadata?: any;
}): Promise<void> {
  try {
    // Note: We need to add an aiUsage table to the schema
    // For now, log the usage
    logger.info('AI usage tracked', {
      userId: data.userId,
      firmId: data.firmId,
      operationType: data.operationType,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      cost: data.cost,
    });

    // TODO: Once Prisma schema is updated with aiUsage table:
    // await prisma.aiUsage.create({
    //   data: {
    //     userId: data.userId,
    //     firmId: data.firmId,
    //     operationType: data.operationType,
    //     modelId: data.modelId,
    //     inputTokens: data.inputTokens,
    //     outputTokens: data.outputTokens,
    //     totalTokens: data.inputTokens + data.outputTokens,
    //     cost: data.cost,
    //     requestId: data.requestId,
    //     letterId: data.letterId,
    //     documentIds: data.documentIds,
    //     metadata: data.metadata,
    //   },
    // });
  } catch (error) {
    logger.error('Failed to track AI usage', {
      error,
      userId: data.userId,
      firmId: data.firmId,
    });
    // Don't throw - usage tracking failure shouldn't block the operation
  }
}

/**
 * Get AI usage statistics for a user
 */
export async function getUserUsageStats(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  byOperationType: Record<string, {
    requests: number;
    inputTokens: number;
    outputTokens: number;
    cost: number;
  }>;
}> {
  // TODO: Implement once aiUsage table exists
  logger.debug('Getting usage stats for user', { userId, startDate, endDate });

  // Placeholder return
  return {
    totalRequests: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCost: 0,
    byOperationType: {},
  };
}

/**
 * Get AI usage statistics for a firm
 */
export async function getFirmUsageStats(
  firmId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  byUser: Record<string, {
    requests: number;
    inputTokens: number;
    outputTokens: number;
    cost: number;
  }>;
  byOperationType: Record<string, {
    requests: number;
    inputTokens: number;
    outputTokens: number;
    cost: number;
  }>;
}> {
  // TODO: Implement once aiUsage table exists
  logger.debug('Getting usage stats for firm', { firmId, startDate, endDate });

  // Placeholder return
  return {
    totalRequests: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCost: 0,
    byUser: {},
    byOperationType: {},
  };
}

/**
 * Calculate cost for usage
 */
export function calculateUsageCost(
  inputTokens: number,
  outputTokens: number,
  _modelId?: string
): number {
  const pricing = getModelPricing();
  return calculateCost(
    inputTokens,
    outputTokens,
    pricing.input,
    pricing.output
  );
}

/**
 * Check if user/firm is within usage limits
 */
export async function checkUsageLimits(
  firmId: string,
  userId: string
): Promise<{
  withinLimits: boolean;
  currentUsage: {
    requests: number;
    tokens: number;
    cost: number;
  };
  limits: {
    maxRequests?: number;
    maxTokens?: number;
    maxCost?: number;
  };
  message?: string;
}> {
  // TODO: Implement based on firm subscription tier
  // For now, return unlimited
  logger.debug('Checking usage limits', { firmId, userId });

  return {
    withinLimits: true,
    currentUsage: {
      requests: 0,
      tokens: 0,
      cost: 0,
    },
    limits: {},
  };
}

/**
 * Get current month usage for billing
 */
export async function getMonthlyUsage(
  firmId: string,
  year: number,
  month: number
): Promise<{
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  dailyBreakdown: Array<{
    date: string;
    requests: number;
    tokens: number;
    cost: number;
  }>;
}> {
  // TODO: Implement once aiUsage table exists
  logger.debug('Getting monthly usage', { firmId, year, month });

  return {
    totalRequests: 0,
    totalTokens: 0,
    totalCost: 0,
    dailyBreakdown: [],
  };
}

