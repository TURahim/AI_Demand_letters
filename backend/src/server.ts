// ═══════════════════════════════════════════════════════════════
// CRITICAL: Early logging to detect container startup
// ═══════════════════════════════════════════════════════════════
console.log('💡 App Runner container reached entry file');
console.log('🚀 Backend starting...');
console.log('📍 Entry point: backend/src/server.ts');
console.log('⏰ Timestamp:', new Date().toISOString());
console.log('');

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

let server: ReturnType<typeof app.listen> | undefined;
let wss: ReturnType<typeof setupWebSocketServer> | null = null;
let queueWorkerStarted = false;

console.log('✅ Imports loaded successfully');
console.log('🔧 Initializing server bootstrap...');

// Test database connection early (non-blocking)
async function testDatabaseConnection() {
  try {
    console.log('🔌 Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    await prisma.$disconnect();
  } catch (err: any) {
    console.error('🔥 Prisma connection error:', err.message);
    console.error('   This is non-fatal. Server will still start.');
  }
}

// Test DB connection in background (don't block server startup)
testDatabaseConnection();

// Start HTTP server FIRST - this is critical for health checks
console.log('🌐 Starting HTTP server on port', config.port);
server = app.listen(config.port, () => {
  console.log('═══════════════════════════════════════════════════════');
  console.log(`✅ HTTP Server listening on port ${config.port}`);
  console.log(`🌐 Health endpoint ready: http://localhost:${config.port}/health`);
  console.log('═══════════════════════════════════════════════════════');
  
  logger.info('Server started', {
    environment: config.nodeEnv,
    port: config.port,
    apiVersion: config.apiVersion,
  });

  // Start optional services AFTER the HTTP server is listening
  startOptionalServices();
});

// Start optional services - these run AFTER the HTTP server is up
function startOptionalServices() {
  console.log('🔧 Starting optional services...');

  // Error reporting (non-blocking)
  try {
    initializeErrorReporting();
    console.log('✓ Error reporting initialized');
  } catch (error) {
    console.error('⚠️  Failed to initialize error reporting:', error);
  }

  // Metrics collection (non-blocking)
  try {
    startMetricsCollection();
    console.log('✓ Metrics collection started');
  } catch (error) {
    console.error('⚠️  Failed to start metrics collection:', error);
  }

  // Queue worker (optional, Redis-dependent)
  const shouldStartQueueWorker =
    process.env.ENABLE_QUEUE_WORKER === 'true' ||
    (config.nodeEnv !== 'production' && config.features.aiGeneration);

  if (shouldStartQueueWorker) {
    console.log('🔄 Starting generation worker...');
    try {
      startGenerationWorker();
      queueWorkerStarted = true;
      console.log('✓ Generation worker started');
    } catch (error) {
      console.error('⚠️  Failed to start generation worker:', error);
      console.error('   This is non-fatal. The API will still work for non-generation endpoints.');
    }
  } else {
    console.log('ℹ️  Generation worker disabled (ENABLE_QUEUE_WORKER=false)');
  }

  // WebSocket server (optional)
  if (config.websocket.enabled && server) {
    console.log('🔌 Starting WebSocket server...');
    try {
      wss = setupWebSocketServer(server);
      console.log(`✓ WebSocket server started on port ${config.websocket.port}`);
    } catch (error) {
      console.error('⚠️  Failed to start WebSocket server:', error);
      console.error('   This is non-fatal. Real-time collaboration features will be unavailable.');
    }
  } else {
    console.log('ℹ️  WebSocket server disabled (WEBSOCKET_ENABLED=false)');
  }

  console.log('✅ Optional services initialization complete');
  console.log('');
}

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log('');
  console.log(`⚠️  ${signal} received, starting graceful shutdown...`);
  logger.info(`${signal} received, starting graceful shutdown`);

  if (!server) {
    console.log('⚠️  Server not initialized, exiting immediately');
    logger.warn('Server not initialized, exiting immediately');
    process.exit(0);
  }

  // Stop accepting new connections
  server.close(async () => {
    console.log('✓ HTTP server closed');
    logger.info('HTTP server closed');

    try {
      // Close WebSocket server
      if (wss) {
        shutdownWebSocketServer(wss);
        console.log('✓ WebSocket server closed');
        logger.info('WebSocket server closed');
      }

      // Shutdown Yjs provider
      try {
        await shutdownYjsProvider();
        console.log('✓ Yjs provider closed');
        logger.info('Yjs provider closed');
      } catch (error) {
        console.warn('⚠️  Error closing Yjs provider (may not have been started)');
      }

      // Close queues (may fail if Redis was never connected)
      if (queueWorkerStarted) {
        try {
          await closeAllQueues();
          console.log('✓ Background queues closed');
          logger.info('Background queues closed');
        } catch (queueError: any) {
          console.warn('⚠️  Error closing queues:', queueError.message);
          logger.warn('Error closing queues (Redis may not be connected):', {
            error: queueError.message,
          });
        }
      }

      // Disconnect from database
      await prisma.$disconnect();
      console.log('✓ Database connection closed');
      logger.info('Database connection closed');

      console.log('✅ Graceful shutdown complete');
      // Exit process
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout');
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  logger.error('Uncaught exception:', error);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled promise rejection:', reason);
  logger.error('Unhandled promise rejection:', {
    reason: reason instanceof Error ? reason.stack : reason,
    promise: String(promise),
  });
  gracefulShutdown('unhandledRejection');
});

export default server;
