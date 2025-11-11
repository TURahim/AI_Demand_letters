import * as letterService from '../letters/letter.service';
import * as templateService from '../templates/template.service';
import { addJob, getJobStatus, QUEUE_NAMES, removeJob } from '../queue/queue.service';
import { LetterGenerationJobData } from '../queue/jobs/generation.job';
import { AppError } from '../../middleware/error-handler';
import logger from '../../utils/logger';

/**
 * Start letter generation (async with background job)
 */
export async function startLetterGeneration(input: {
  firmId: string;
  userId: string;

  // Case information
  caseType: string;
  incidentDate: string | Date;
  incidentDescription: string;
  location?: string;

  // Parties
  clientName: string;
  clientContact?: string;
  defendantName: string;
  defendantAddress: string;

  // Damages
  damages: {
    medical?: number;
    lostWages?: number;
    propertyDamage?: number;
    painAndSuffering?: number;
    other?: Record<string, number>;
    itemizedMedical?: Array<{ description: string; amount: number }>;
  };

  // Supporting documents
  documentIds?: string[];

  // Template
  templateId?: string;

  // Customization
  title?: string;
  recipientName?: string;
  recipientAddress?: string;
  caseReference?: string;
  specialInstructions?: string;
  tone?: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<{
  letterId: string;
  jobId: string;
  status: string;
  message: string;
}> {
  try {
    logger.info('Starting letter generation', {
      firmId: input.firmId,
      userId: input.userId,
      caseType: input.caseType,
      hasTemplate: !!input.templateId,
      documentCount: input.documentIds?.length || 0,
    });

    // Get template content if templateId provided
    let templateContent: string | undefined;
    if (input.templateId) {
      const template = await templateService.getTemplateById(
        input.templateId,
        input.firmId
      );
      
      // Convert template content to string if it's structured
      if (typeof template.content === 'string') {
        templateContent = template.content;
      } else {
        templateContent = JSON.stringify(template.content);
      }
    }

    // Create letter record in PENDING status
    const letter = await letterService.createLetter({
      firmId: input.firmId,
      createdBy: input.userId,
      templateId: input.templateId,
      title: input.title || `Demand Letter - ${input.defendantName}`,
      content: { body: '' }, // Will be filled by generation job
      recipientName: input.recipientName || input.defendantName,
      recipientAddress: input.recipientAddress || input.defendantAddress,
      caseReference: input.caseReference,
      metadata: {
        caseType: input.caseType,
        generationStatus: 'pending',
        generationStarted: new Date().toISOString(),
      },
    });

    // Link documents to letter if provided
    if (input.documentIds && input.documentIds.length > 0) {
      await letterService.linkDocumentsToLetter(
        letter.id,
        input.documentIds,
        input.firmId
      );
    }

    // Prepare job data
    const jobData: LetterGenerationJobData = {
      letterId: letter.id,
      firmId: input.firmId,
      userId: input.userId,
      caseType: input.caseType,
      incidentDate: input.incidentDate,
      incidentDescription: input.incidentDescription,
      location: input.location,
      clientName: input.clientName,
      clientContact: input.clientContact,
      defendantName: input.defendantName,
      defendantAddress: input.defendantAddress,
      damages: input.damages,
      documentIds: input.documentIds,
      templateId: input.templateId,
      templateContent,
      specialInstructions: input.specialInstructions,
      tone: input.tone,
      temperature: input.temperature,
      maxTokens: input.maxTokens,
    };

    // Add job to queue
    const job = await addJob<LetterGenerationJobData>(
      QUEUE_NAMES.LETTER_GENERATION,
      jobData,
      {
        priority: 1, // Higher priority for user-initiated generations
      }
    );

    logger.info('Letter generation job queued', {
      letterId: letter.id,
      jobId: job.id,
      firmId: input.firmId,
      userId: input.userId,
    });

    return {
      letterId: letter.id,
      jobId: job.id!.toString(),
      status: 'queued',
      message: 'Letter generation started. You can check the status using the job ID.',
    };
  } catch (error: any) {
    logger.error('Failed to start letter generation', {
      error: error.message,
      firmId: input.firmId,
      userId: input.userId,
    });
    throw error;
  }
}

/**
 * Get generation status
 */
export async function getGenerationStatus(
  jobId: string
): Promise<{
  status: string;
  progress?: number;
  result?: any;
  error?: string;
  letter?: any;
}> {
  const jobStatus = await getJobStatus(QUEUE_NAMES.LETTER_GENERATION, jobId);

  if (jobStatus.status === 'not_found') {
    throw new AppError('Generation job not found', 404);
  }

  const response: any = {
    status: jobStatus.status,
    progress: jobStatus.progress,
  };

  // If completed, include result and fetch latest letter
  if (jobStatus.status === 'completed' && jobStatus.result) {
    response.result = jobStatus.result;
    
    // Fetch the generated letter
    try {
      const letterData = jobStatus.data as LetterGenerationJobData;
      const letter = await letterService.getLetterById(
        letterData.letterId,
        letterData.firmId
      );
      response.letter = letter;
    } catch (error) {
      logger.warn('Could not fetch letter for completed job', { jobId, error });
    }
  }

  // If failed, include error
  if (jobStatus.status === 'failed') {
    response.error = jobStatus.error;
  }

  return response;
}

/**
 * Cancel a generation job
 */
export async function cancelGeneration(
  jobId: string,
  firmId: string,
  userId: string
): Promise<void> {
  const jobStatus = await getJobStatus(QUEUE_NAMES.LETTER_GENERATION, jobId);

  if (jobStatus.status === 'not_found') {
    throw new AppError('Generation job not found', 404);
  }

  // Can only cancel waiting or delayed jobs
  if (jobStatus.status === 'active' || jobStatus.status === 'completed') {
    throw new AppError(
      `Cannot cancel job in status: ${jobStatus.status}`,
      400
    );
  }

  // Get job data to update letter status
  const letterData = jobStatus.data as LetterGenerationJobData;

  // Verify firm access
  if (letterData.firmId !== firmId) {
    throw new AppError('Access denied', 403);
  }

  // Update letter status
  await letterService.updateLetter(
    letterData.letterId,
    firmId,
    userId,
    {
      status: 'ARCHIVED',
      metadata: {
        cancelled: true,
        cancelledAt: new Date().toISOString(),
        cancelledBy: userId,
        generationStatus: 'cancelled',
      },
    }
  );

  await removeJob(QUEUE_NAMES.LETTER_GENERATION, jobId);

  logger.info('Generation job cancelled', {
    jobId,
    letterId: letterData.letterId,
    firmId,
    userId,
  });
}

