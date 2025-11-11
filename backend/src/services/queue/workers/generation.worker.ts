import { Job } from 'bull';
import { LetterGenerationJobData, LetterGenerationJobResult } from '../jobs/generation.job';
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
    logger.error('Generation job failed', {
      jobId: job.id,
      letterId: job.data.letterId,
      error: error.message,
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
            error: error.message,
            failedAt: new Date().toISOString(),
            generationStatus: 'failed',
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
      error: error.message,
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

    // Process jobs with concurrency of 2
    queue.process(2, async (job) => {
      return await processGenerationJob(job);
    });

    // Handle worker-level errors
    queue.on('error', (error) => {
      logger.error('Generation worker error:', {
        error: error.message,
        stack: error.stack,
      });
    });

    logger.info('Letter generation worker started', {
      concurrency: 2,
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

