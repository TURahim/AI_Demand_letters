import { CloudWatchClient, PutMetricDataCommand, StandardUnit } from '@aws-sdk/client-cloudwatch';
import config from '../../config';
import logger from '../../utils/logger';
import prisma from '../../utils/prisma-client';

// Initialize CloudWatch client
const cloudWatchClient = new CloudWatchClient({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
});

// Metric namespace
const NAMESPACE = 'Steno/Backend';

/**
 * Send custom metric to CloudWatch
 */
export async function sendMetric(
  metricName: string,
  value: number,
  unit: StandardUnit = StandardUnit.Count,
  dimensions?: Record<string, string>
) {
  // Store in database
  try {
    await prisma.systemMetric.create({
      data: {
        metricName,
        metricValue: value,
        unit: String(unit),
        dimensions: dimensions || {},
      },
    });
  } catch (error) {
    logger.error('Failed to store metric in database:', error);
  }

  // Send to CloudWatch if enabled
  if (config.monitoring.cloudwatchEnabled) {
    try {
      const command = new PutMetricDataCommand({
        Namespace: NAMESPACE,
        MetricData: [
          {
            MetricName: metricName,
            Value: value,
            Unit: unit,
            Timestamp: new Date(),
            Dimensions: dimensions
              ? Object.entries(dimensions).map(([Name, Value]) => ({ Name, Value }))
              : undefined,
          },
        ],
      });

      await cloudWatchClient.send(command);
    } catch (error) {
      logger.error('Failed to send metric to CloudWatch:', error);
    }
  }
}

/**
 * Track API latency
 */
export async function trackLatency(
  endpoint: string,
  method: string,
  latencyMs: number
) {
  await sendMetric('APILatency', latencyMs, StandardUnit.Milliseconds, {
    Endpoint: endpoint,
    Method: method,
  });
}

/**
 * Track error count
 */
export async function trackError(
  errorType: string,
  endpoint?: string
) {
  await sendMetric('ErrorCount', 1, StandardUnit.Count, {
    ErrorType: errorType,
    Endpoint: endpoint || 'unknown',
  });
}

/**
 * Track API request count
 */
export async function trackRequest(
  endpoint: string,
  method: string,
  statusCode: number
) {
  await sendMetric('RequestCount', 1, StandardUnit.Count, {
    Endpoint: endpoint,
    Method: method,
    StatusCode: statusCode.toString(),
  });
}

/**
 * Track file upload metrics
 */
export async function trackFileUpload(
  fileSize: number,
  fileType: string,
  success: boolean
) {
  await sendMetric('FileUpload', 1, StandardUnit.Count, {
    FileType: fileType,
    Success: success.toString(),
  });

  if (success) {
    await sendMetric('FileSize', fileSize, StandardUnit.Bytes, {
      FileType: fileType,
    });
  }
}

/**
 * Track AI generation metrics
 */
export async function trackAIGeneration(
  model: string,
  tokensUsed: number,
  latencyMs: number,
  success: boolean
) {
  await sendMetric('AIGeneration', 1, StandardUnit.Count, {
    Model: model,
    Success: success.toString(),
  });

  if (success) {
    await sendMetric('AITokens', tokensUsed, StandardUnit.Count, {
      Model: model,
    });

    await sendMetric('AILatency', latencyMs, StandardUnit.Milliseconds, {
      Model: model,
    });
  }
}

/**
 * Track database query performance
 */
export async function trackDatabaseQuery(
  operation: string,
  latencyMs: number
) {
  await sendMetric('DatabaseLatency', latencyMs, StandardUnit.Milliseconds, {
    Operation: operation,
  });
}

/**
 * Track active users
 */
export async function trackActiveUsers(count: number) {
  await sendMetric('ActiveUsers', count, StandardUnit.Count);
}

/**
 * Track memory usage
 */
export function trackMemoryUsage() {
  const memoryUsage = process.memoryUsage();
  
  sendMetric('MemoryHeapUsed', memoryUsage.heapUsed, StandardUnit.Bytes);
  sendMetric('MemoryHeapTotal', memoryUsage.heapTotal, StandardUnit.Bytes);
  sendMetric('MemoryRSS', memoryUsage.rss, StandardUnit.Bytes);
}

/**
 * Start periodic system metrics collection
 */
export function startMetricsCollection() {
  // Collect system metrics every 5 minutes
  setInterval(() => {
    trackMemoryUsage();
  }, 5 * 60 * 1000);

  logger.info('Started metrics collection');
}

