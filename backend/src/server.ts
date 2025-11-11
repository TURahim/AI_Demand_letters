import app from './app';
import config from './config';
import logger from './utils/logger';
import prisma from './utils/prisma-client';
import { initializeErrorReporting } from './services/monitoring/error-reporter';
import { startMetricsCollection } from './services/monitoring/metrics.service';
import { startGenerationWorker } from './services/queue/workers/generation.worker';
import { closeAllQueues } from './services/queue/queue.service';
import { setupWebSocketServer, shutdownWebSocketServer } from './services/websocket/ws-server';
import { shutdown as shutdownYjsProvider } from './services/collaboration/yjs-provider';

// Initialize error reporting
initializeErrorReporting();

// Start metrics collection
startMetricsCollection();

// Start background workers
startGenerationWorker();

// Start server
const server = app.listen(config.port, () => {
  logger.info(`Server started on port ${config.port}`, {
    environment: config.nodeEnv,
    port: config.port,
    apiVersion: config.apiVersion,
  });
});

// Setup WebSocket server
const wss = setupWebSocketServer(server);

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received, starting graceful shutdown`);

  // Stop accepting new connections
  server.close(async () => {
    logger.info('HTTP server closed');

    try {
      // Close WebSocket server
      shutdownWebSocketServer(wss);
      logger.info('WebSocket server closed');

      // Shutdown Yjs provider
      await shutdownYjsProvider();
      logger.info('Yjs provider closed');

      // Close queues (may fail if Redis was never connected)
      try {
        await closeAllQueues();
        logger.info('Background queues closed');
      } catch (queueError: any) {
        logger.warn('Error closing queues (Redis may not be connected):', {
          error: queueError.message,
        });
      }

      // Disconnect from database
      await prisma.$disconnect();
      logger.info('Database connection closed');

      // Exit process
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection:', {
    reason: reason instanceof Error ? reason.stack : reason,
    promise: String(promise),
  });
  gracefulShutdown('unhandledRejection');
});

export default server;

