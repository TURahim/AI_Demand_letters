import { Job } from 'bull';
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
 * Process letter generation job
 */
async function processGenerationJob(
  job: Job<LetterGenerationJobData>
): Promise<LetterGenerationJobResult> {
  const startTime = Date.now();
  
  try {
    logger.info('Processing generation job', {
      jobId: job.id,
      letterId: job.data.letterId,
      firmId: job.data.firmId,
    });

    // Update job progress
    await job.progress(10);

    // Generate the demand letter using AI
    const damages = job.data.damages || {};
    const defendantAddress = job.data.defendantAddress || 'Address not provided';

    const aiResult = await generationService.generateDemandLetter({
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
    });

    await job.progress(60);

    // Calculate cost
    const cost = calculateUsageCost(
      aiResult.usage.inputTokens,
      aiResult.usage.outputTokens,
      BEDROCK_CONFIG.modelId
    );

    // Update letter in database
    await letterService.updateLetter(
      job.data.letterId,
      job.data.firmId,
      job.data.userId,
      {
        content: { body: aiResult.letter },
        status: 'IN_REVIEW',
        metadata: {
          aiGenerated: true,
          usage: aiResult.usage,
          cost,
          generatedAt: new Date().toISOString(),
          modelId: aiResult.metadata.modelId,
          generationStatus: 'completed',
        },
      }
    );

    await job.progress(80);

    // Create initial version
    await versionService.createLetterVersion(
      job.data.letterId,
      job.data.firmId,
      job.data.userId,
      {
        content: { body: aiResult.letter },
      }
    );

    await job.progress(90);

    // Track AI usage
    await trackAIUsage({
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
    });

    await job.progress(100);

    const duration = Date.now() - startTime;
    logger.info('Generation job completed', {
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
    const structuredError = buildGenerationError(error);

    logger.error('Generation job failed', {
      jobId: job.id,
      letterId: job.data.letterId,
      error: structuredError.reason,
      duration: Date.now() - startTime,
    });

    // Update letter status to failed
    try {
      await letterService.updateLetter(
        job.data.letterId,
        job.data.firmId,
        job.data.userId,
        {
          status: 'DRAFT',
      metadata: {
        generationStatus: 'failed',
        generationError: structuredError,
        failedAt: new Date().toISOString(),
      },
        }
      );
    } catch (updateError) {
      logger.error('Failed to update letter status after generation failure', {
        letterId: job.data.letterId,
        error: updateError,
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
 */
export function startGenerationWorker(): void {
  try {
    const queue = getQueue(QUEUE_NAMES.LETTER_GENERATION);

    // Define the processor function
    const startProcessor = () => {
      // Process jobs with concurrency of 2
      queue.process(2, async (job) => {
        return await processGenerationJob(job);
      });

      logger.info('Letter generation worker started successfully', {
        concurrency: 2,
        queueName: QUEUE_NAMES.LETTER_GENERATION,
      });
    };

    // Check if Redis is already connected
    const client = (queue as any).client;
    if (client && client.status === 'ready') {
      logger.info('Redis already ready, starting worker immediately', {
        queueName: QUEUE_NAMES.LETTER_GENERATION,
      });
      startProcessor();
    } else {
      // Wait for Redis to be ready
      logger.info('Waiting for Redis connection...', {
        queueName: QUEUE_NAMES.LETTER_GENERATION,
        currentStatus: client?.status || 'unknown',
      });
      
      queue.on('ready', () => {
        logger.info('Queue ready event fired, starting worker processor', {
          queueName: QUEUE_NAMES.LETTER_GENERATION,
        });
        startProcessor();
      });
    }

    // Handle worker-level errors
    queue.on('error', (error) => {
      logger.error('Generation worker error:', {
        error: error.message,
        stack: error.stack,
      });
    });

    logger.info('Letter generation worker initializing', {
      queueName: QUEUE_NAMES.LETTER_GENERATION,
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

  if (errMsg.includes('AI service is currently busy') || errMsg.includes('request timed out')) {
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

