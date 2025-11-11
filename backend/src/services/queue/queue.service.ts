import Bull, { Queue, Job, JobOptions } from 'bull';
import config from '../../config';
import logger from '../../utils/logger';

/**
 * Queue names
 */
export const QUEUE_NAMES = {
  LETTER_GENERATION: 'letter-generation',
  DOCUMENT_PROCESSING: 'document-processing',
  EMAIL_NOTIFICATIONS: 'email-notifications',
} as const;

/**
 * Queue instances
 */
const queues = new Map<string, Queue>();

/**
 * Get or create a queue
 */
export function getQueue(queueName: string): Queue {
  if (queues.has(queueName)) {
    return queues.get(queueName)!;
  }

  const queue = new Bull(queueName, {
    redis: {
      host: config.redis?.host || 'localhost',
      port: config.redis?.port || 6379,
      password: config.redis?.password,
      db: config.redis?.db || 0,
    },
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 100, // Keep last 100 completed jobs
      removeOnFail: 500, // Keep last 500 failed jobs
    },
  });

  // Event listeners
  queue.on('error', (error) => {
    logger.error(`Queue ${queueName} error`, { error: error.message });
  });

  queue.on('failed', (job, error) => {
    logger.error(`Job ${job.id} in queue ${queueName} failed`, {
      jobId: job.id,
      error: error.message,
      attempts: job.attemptsMade,
    });
  });

  queue.on('completed', (job) => {
    logger.info(`Job ${job.id} in queue ${queueName} completed`, {
      jobId: job.id,
      duration: job.finishedOn! - job.processedOn!,
    });
  });

  queues.set(queueName, queue);
  return queue;
}

/**
 * Add a job to queue
 */
export async function addJob<T = any>(
  queueName: string,
  data: T,
  options?: JobOptions
): Promise<Job<T>> {
  const queue = getQueue(queueName);
  
  const job = await queue.add(data, {
    ...options,
  });

  logger.info(`Job ${job.id} added to queue ${queueName}`, {
    jobId: job.id,
    queueName,
  });

  return job;
}

/**
 * Get job by ID
 */
export async function getJob(queueName: string, jobId: string): Promise<Job | null> {
  const queue = getQueue(queueName);
  return await queue.getJob(jobId);
}

/**
 * Get job status
 */
export async function getJobStatus(
  queueName: string,
  jobId: string
): Promise<{
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'not_found';
  progress?: number;
  result?: any;
  error?: string;
  attemptsMade?: number;
  data?: any;
}> {
  const job = await getJob(queueName, jobId);

  if (!job) {
    return { status: 'not_found' };
  }

  const state = await job.getState();
  const progress = job.progress();

  const response: any = {
    status: state,
    progress: typeof progress === 'number' ? progress : undefined,
    data: job.data,
    attemptsMade: job.attemptsMade,
  };

  if (state === 'completed') {
    response.result = job.returnvalue;
  }

  if (state === 'failed') {
    response.error = job.failedReason;
  }

  return response;
}

/**
 * Remove a job
 */
export async function removeJob(queueName: string, jobId: string): Promise<void> {
  const job = await getJob(queueName, jobId);
  if (job) {
    await job.remove();
    logger.info(`Job ${jobId} removed from queue ${queueName}`);
  }
}

/**
 * Get queue statistics
 */
export async function getQueueStats(queueName: string): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}> {
  const queue = getQueue(queueName);

  const [waiting, active, completed, failed, delayed, isPaused] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
    queue.isPaused(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    paused: isPaused,
  };
}

/**
 * Pause a queue
 */
export async function pauseQueue(queueName: string): Promise<void> {
  const queue = getQueue(queueName);
  await queue.pause();
  logger.info(`Queue ${queueName} paused`);
}

/**
 * Resume a queue
 */
export async function resumeQueue(queueName: string): Promise<void> {
  const queue = getQueue(queueName);
  await queue.resume();
  logger.info(`Queue ${queueName} resumed`);
}

/**
 * Clean old jobs from queue
 */
export async function cleanQueue(
  queueName: string,
  grace: number = 24 * 3600 * 1000, // 24 hours
  status: 'completed' | 'failed' = 'completed'
): Promise<number> {
  const queue = getQueue(queueName);
  const jobs = await queue.clean(grace, status);
  logger.info(`Cleaned ${jobs.length} ${status} jobs from queue ${queueName}`);
  return jobs.length;
}

/**
 * Close all queues
 */
export async function closeAllQueues(): Promise<void> {
  logger.info('Closing all queues...');
  
  const closePromises = Array.from(queues.values()).map(queue => queue.close());
  await Promise.all(closePromises);
  
  queues.clear();
  logger.info('All queues closed');
}

/**
 * Health check for queue system
 */
export async function healthCheck(): Promise<{
  healthy: boolean;
  queues: Record<string, { connected: boolean; stats?: any }>;
}> {
  const queueHealth: Record<string, { connected: boolean; stats?: any }> = {};
  
  let allHealthy = true;

  for (const [name] of queues.entries()) {
    try {
      const stats = await getQueueStats(name);
      queueHealth[name] = {
        connected: true,
        stats,
      };
    } catch (error) {
      allHealthy = false;
      queueHealth[name] = {
        connected: false,
      };
    }
  }

  return {
    healthy: allHealthy,
    queues: queueHealth,
  };
}

