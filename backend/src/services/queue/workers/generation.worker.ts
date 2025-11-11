import { Job } from 'bull';
import { z } from 'zod';
import {
  LetterGenerationJobData,
  LetterGenerationJobResult,
  StructuredGenerationError,
} from '../jobs/generation.job';
import { getQueue, QUEUE_NAMES } from '../queue.service';
import * as generationService from '../../ai/generation.service';
import * as letterService from '../../letters/letter.service';
import * as versionService from '../../letters/version.service';
import { trackAIUsage, calculateUsageCost } from '../../ai/usage-tracker';
import { BEDROCK_CONFIG } from '../../ai/bedrock.config';
import logger from '../../../utils/logger';

/**
 * Zod schema for validating letter generation job data
 * Ensures all required fields are present before processing
 */
const LetterGenerationJobDataSchema = z.object({
  letterId: z.string().uuid('Invalid letter ID format'),
  firmId: z.string().uuid('Invalid firm ID format'),
  userId: z.string().uuid('Invalid user ID format'),
  caseType: z.string().min(1, 'Case type is required'),
  incidentDate: z.union([z.string(), z.date()]),
  incidentDescription: z.string().min(10, 'Incident description must be at least 10 characters'),
  location: z.string().optional(),
  clientName: z.string().min(1, 'Client name is required'),
  clientContact: z.string().optional(),
  defendantName: z.string().min(1, 'Defendant name is required'),
  defendantAddress: z.string().optional(),
  damages: z.object({
    medical: z.number().min(0).optional(),
    lostWages: z.number().min(0).optional(),
    propertyDamage: z.number().min(0).optional(),
    painAndSuffering: z.number().min(0).optional(),
    other: z.record(z.number().min(0)).optional(),
    itemizedMedical: z.array(z.object({
      description: z.string(),
      amount: z.number().min(0),
    })).optional(),
    notes: z.string().optional(),
  }).optional(),
  documentIds: z.array(z.string().uuid()).optional(),
  templateId: z.string().uuid().optional(),
  templateContent: z.string().optional(),
  specialInstructions: z.string().optional(),
  tone: z.enum(['professional', 'firm', 'conciliatory', 'assertive', 'diplomatic', 'urgent']).optional(),
  temperature: z.number().min(0).max(1).optional(),
  maxTokens: z.number().min(100).max(4096).optional(),
});

/**
 * Retry configuration for AI generation
 */
const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelay: 500, // 0.5 seconds
  maxDelay: 2000, // 2 seconds
};

/**
 * Timeout configuration for AI generation
 */
const GENERATION_TIMEOUT_MS = 60000; // 60 seconds

/**
 * Retry helper with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = RETRY_CONFIG.maxAttempts,
  attempt: number = 1
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (attempt >= maxAttempts) {
      throw error;
    }

    const delay = Math.min(
      RETRY_CONFIG.baseDelay * Math.pow(2, attempt - 1),
      RETRY_CONFIG.maxDelay
    );

    logger.warn('[Refactor] Retrying AI generation', {
      attempt,
      maxAttempts,
      delay,
      error: error.message,
    });

    await new Promise(resolve => setTimeout(resolve, delay));
    return retryWithBackoff(fn, maxAttempts, attempt + 1);
  }
}

/**
 * Process letter generation job
 */
async function processGenerationJob(
  job: Job<LetterGenerationJobData>
): Promise<LetterGenerationJobResult> {
  const startTime = Date.now();
  
  try {
    logger.info('[Refactor] Processing generation job', {
      jobId: job.id,
      letterId: job.data.letterId,
      firmId: job.data.firmId,
    });

    // Schema validation - ensure required fields are present
    await job.progress(5);
    try {
      LetterGenerationJobDataSchema.parse(job.data);
      logger.debug('[Refactor] Job data validation passed', {
        jobId: job.id,
        letterId: job.data.letterId,
      });
    } catch (validationError: any) {
      const structuredError: StructuredGenerationError = {
        title: 'Missing required fields',
        reason: validationError.errors?.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ') || 'Missing required fields',
        probableCause: 'One or more required fields were missing or invalid in the generation request.',
        suggestedAction: 'Review the generation request and ensure all required fields (caseType, incidentDescription, clientName, defendantName, firmId, letterId) are provided.',
      };
      
      logger.error('[Refactor] Job data validation failed', {
        jobId: job.id,
        letterId: job.data.letterId,
        validationErrors: validationError.errors,
        stack: validationError.stack,
      });
      
      throw structuredError;
    }

    await job.progress(10);

    // Generate the demand letter using AI with retry and timeout
    const damages = job.data.damages || {};
    const defendantAddress = job.data.defendantAddress || 'Address not provided';

    // Security note: PII fields (clientName, defendantName) are sent to AI provider
    // TODO: Ensure encryption is handled at the letterService layer for data at rest
    // Consider anonymizing or tokenizing PII before sending to external AI services
    const generationInput = {
      caseType: job.data.caseType,
      incidentDate: job.data.incidentDate,
      incidentDescription: job.data.incidentDescription,
      location: job.data.location,
      clientName: job.data.clientName,
      clientContact: job.data.clientContact,
      defendantName: job.data.defendantName,
      defendantAddress,
      damages,
      documentIds: job.data.documentIds,
      firmId: job.data.firmId,
      templateContent: job.data.templateContent,
      specialInstructions: job.data.specialInstructions,
      tone: job.data.tone,
      temperature: job.data.temperature,
      maxTokens: job.data.maxTokens,
    };

    // Wrap generation in timeout and retry logic
    const generationPromise = retryWithBackoff(() =>
      generationService.generateDemandLetter(generationInput)
    );

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`AI generation timed out after ${GENERATION_TIMEOUT_MS}ms`));
      }, GENERATION_TIMEOUT_MS);
    });

    let aiResult;
    try {
      aiResult = await Promise.race([generationPromise, timeoutPromise]);
    } catch (error: any) {
      // Build structured error for retry failures or timeouts
      const structuredError: StructuredGenerationError = {
        title: 'AI generation failed after retries',
        reason: error.message || 'AI service unavailable or timed out',
        probableCause: 'The AI service failed after multiple retry attempts. This could be due to service downtime, rate limiting, network issues, or request timeout.',
        suggestedAction: 'Wait a moment and retry the generation. If the issue persists, check AI service status and network connectivity.',
      };
      throw structuredError;
    }

    await job.progress(50);

    // Calculate cost
    const cost = calculateUsageCost(
      aiResult.usage.inputTokens,
      aiResult.usage.outputTokens,
      BEDROCK_CONFIG.modelId
    );

    // Fetch existing letter to preserve metadata
    const existingLetter = await letterService.getLetterById(
      job.data.letterId,
      job.data.firmId
    );
    const existingMetadata = (existingLetter.metadata as Record<string, any>) || {};

    // Merge metadata instead of replacing
    const mergedMetadata = {
      ...existingMetadata,
      // Preserve historical data
      aiGenerated: existingMetadata.aiGenerated ?? true,
      previousVersions: existingMetadata.previousVersions || [],
      // Update with new generation data
      usage: aiResult.usage,
      cost,
      generatedAt: new Date().toISOString(),
      modelId: aiResult.metadata.modelId,
      generationStatus: 'completed',
      lastGeneratedAt: new Date().toISOString(),
    };

    // Update letter in database with merged metadata
    await letterService.updateLetter(
      job.data.letterId,
      job.data.firmId,
      job.data.userId,
      {
        content: { body: aiResult.letter },
        status: 'IN_REVIEW',
        metadata: mergedMetadata,
      }
    );

    await job.progress(70);

    // Parallelize version creation and usage tracking
    await Promise.all([
      versionService.createLetterVersion(
        job.data.letterId,
        job.data.firmId,
        job.data.userId,
        {
          content: { body: aiResult.letter },
        }
      ),
      trackAIUsage({
        userId: job.data.userId,
        firmId: job.data.firmId,
        operationType: 'generate',
        modelId: aiResult.metadata.modelId,
        inputTokens: aiResult.usage.inputTokens,
        outputTokens: aiResult.usage.outputTokens,
        cost,
        requestId: aiResult.metadata.requestId,
        letterId: job.data.letterId,
        documentIds: job.data.documentIds,
        metadata: {
          caseType: job.data.caseType,
          jobId: job.id,
          processingTime: Date.now() - startTime,
        },
      }),
    ]);

    await job.progress(100);

    const duration = Date.now() - startTime;
    logger.info('[Refactor] Generation job completed', {
      jobId: job.id,
      letterId: job.data.letterId,
      duration,
      inputTokens: aiResult.usage.inputTokens,
      outputTokens: aiResult.usage.outputTokens,
      cost,
    });

    return {
      success: true,
      letterId: job.data.letterId,
      content: aiResult.letter,
      usage: aiResult.usage,
      cost,
      generatedAt: new Date(),
    };
  } catch (error: any) {
    const structuredError = error instanceof Object && 'title' in error && 'reason' in error
      ? error as StructuredGenerationError
      : buildGenerationError(error);

    logger.error('[Refactor] Generation job failed', {
      jobId: job.id,
      letterId: job.data.letterId,
      error: structuredError.reason,
      stack: error.stack || (error instanceof Error ? error.stack : undefined),
      duration: Date.now() - startTime,
    });

    // Fetch existing letter to preserve metadata
    let existingMetadata: Record<string, any> = {};
    try {
      const existingLetter = await letterService.getLetterById(
        job.data.letterId,
        job.data.firmId
      );
      existingMetadata = (existingLetter.metadata as Record<string, any>) || {};
    } catch (fetchError) {
      logger.warn('[Refactor] Could not fetch existing letter metadata', {
        letterId: job.data.letterId,
        error: fetchError,
      });
    }

    // Merge metadata instead of replacing
    const mergedMetadata = {
      ...existingMetadata,
      // Preserve historical data
      aiGenerated: existingMetadata.aiGenerated,
      previousVersions: existingMetadata.previousVersions || [],
      // Update with failure data
      generationStatus: 'failed',
      generationError: structuredError,
      failedAt: new Date().toISOString(),
      lastFailedAt: new Date().toISOString(),
    };

    // Update letter status to failed with merged metadata
    try {
      await letterService.updateLetter(
        job.data.letterId,
        job.data.firmId,
        job.data.userId,
        {
          status: 'DRAFT',
          metadata: mergedMetadata,
        }
      );
    } catch (updateError: any) {
      logger.error('[Refactor] Failed to update letter status after generation failure', {
        letterId: job.data.letterId,
        error: updateError.message,
        stack: updateError.stack,
      });
    }

    return {
      success: false,
      letterId: job.data.letterId,
      content: '',
      error: structuredError,
      generatedAt: new Date(),
    };
  }
}

/**
 * Start the generation worker
 * 
 * Note: Job deduplication should be handled at queue insertion time.
 * When adding jobs to the queue, use: queue.add(name, data, { jobId: letterId })
 * This ensures that duplicate generation requests for the same letter are prevented.
 */
export function startGenerationWorker(): void {
  try {
    const queue = getQueue(QUEUE_NAMES.LETTER_GENERATION);
    let processorStarted = false;

    // Define the processor function
    const startProcessor = () => {
      if (processorStarted) {
        logger.warn('Processor already started, skipping duplicate initialization', {
          queueName: QUEUE_NAMES.LETTER_GENERATION,
        });
        return;
      }
      
      processorStarted = true;

      // Process jobs with concurrency of 2
      queue.process(2, async (job) => {
        return await processGenerationJob(job);
      });

      logger.info('✓ Letter generation worker started successfully', {
        concurrency: 2,
        queueName: QUEUE_NAMES.LETTER_GENERATION,
      });
    };

    // Aggressive multi-strategy approach to ensure worker starts
    const client = (queue as any).client;
    
    // Strategy 1: Check immediately if already ready
    if (client && client.status === 'ready') {
      logger.info('Redis already ready (immediate check), starting worker', {
        queueName: QUEUE_NAMES.LETTER_GENERATION,
      });
      startProcessor();
    }
    
    // Strategy 2: Check after setImmediate
    setImmediate(() => {
      if (!processorStarted && client && client.status === 'ready') {
        logger.info('Redis ready (setImmediate check), starting worker', {
          queueName: QUEUE_NAMES.LETTER_GENERATION,
        });
        startProcessor();
      }
    });
    
    // Strategy 3: Check after 100ms delay
    setTimeout(() => {
      if (!processorStarted && client && client.status === 'ready') {
        logger.info('Redis ready (100ms check), starting worker', {
          queueName: QUEUE_NAMES.LETTER_GENERATION,
        });
        startProcessor();
      }
    }, 100);
    
    // Strategy 4: Check after 500ms delay
    setTimeout(() => {
      if (!processorStarted && client && client.status === 'ready') {
        logger.info('Redis ready (500ms check), starting worker', {
          queueName: QUEUE_NAMES.LETTER_GENERATION,
        });
        startProcessor();
      }
    }, 500);
    
    // Strategy 5: Listen for ready event
    queue.on('ready', () => {
      if (!processorStarted) {
        logger.info('Redis ready (event), starting worker', {
          queueName: QUEUE_NAMES.LETTER_GENERATION,
        });
        startProcessor();
      }
    });

    // Handle worker-level errors
    queue.on('error', (error) => {
      logger.error('Generation worker error:', {
        error: error.message,
        stack: error.stack,
      });
    });

    logger.info('Letter generation worker initializing', {
      queueName: QUEUE_NAMES.LETTER_GENERATION,
      redisStatus: client?.status || 'unknown',
    });
  } catch (error: any) {
    logger.error('Failed to start generation worker:', {
      error: error.message,
      stack: error.stack,
    });
    // Don't throw - allow server to start even if Redis is unavailable
    logger.warn('Server will start without background job processing. Redis may not be available.');
  }
}

/**
 * Stop the generation worker
 */
export async function stopGenerationWorker(): Promise<void> {
  const queue = getQueue(QUEUE_NAMES.LETTER_GENERATION);
  await queue.close();
  logger.info('Letter generation worker stopped');
}

function buildGenerationError(error: any): StructuredGenerationError {
  const defaultError: StructuredGenerationError = {
    title: 'Generation failed',
    reason: 'An unexpected error occurred while generating the demand letter.',
    probableCause:
      'The AI service encountered an unexpected error. This may be due to missing required fields, invalid case data, or service interruption.',
    suggestedAction:
      'Review the case information, ensure all required fields are complete, then retry. If the issue persists, contact support.',
  };

  if (!error) {
    return defaultError;
  }

  const errMsg = error.message || error.reason || `${error}`;

  if (errMsg.includes('Missing required fields')) {
    return {
      title: 'Missing required information',
      reason: errMsg,
      probableCause:
        'One or more required fields were blank or invalid (case type, incident description, client name, defendant name, etc.).',
      suggestedAction:
        'Return to the generation form, make sure all required sections are filled in with descriptive information, and try again.',
    };
  }

  if (errMsg.includes('Input context too large')) {
    return {
      title: 'Case summary too large',
      reason: errMsg,
      probableCause:
        'The combined case summary, documents, and damages exceeded the maximum token limit for the AI model.',
      suggestedAction:
        'Shorten the incident description or remove some supporting documents, then retry.',
    };
  }

  if (errMsg.includes('AI service is currently busy') || errMsg.includes('request timed out') || errMsg.includes('timed out')) {
    return {
      title: 'AI service unavailable',
      reason: errMsg,
      probableCause: 'The AI provider rate-limited or timed out while processing the request.',
      suggestedAction: 'Wait a moment and try again. If this persists, contact support.',
    };
  }

  if (errMsg.includes('AccessDenied') || errMsg.includes('Authentication')) {
    return {
      title: 'AI credentials missing or invalid',
      reason: errMsg,
      probableCause:
        'The backend is missing valid AWS Bedrock credentials or does not have permission to invoke the model.',
      suggestedAction:
        'Verify the AWS credentials and Bedrock access configuration, then retry the generation.',
    };
  }

  return {
    ...defaultError,
    reason: errMsg,
  };
}
