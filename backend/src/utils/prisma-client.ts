import { PrismaClient } from '@prisma/client';
import config from '../config';

// Singleton instance
let prisma: PrismaClient;

// Initialize Prisma Client with logging
function initializePrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log:
      config.nodeEnv === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['warn', 'error'],
    errorFormat: 'colorless',
  });

  // Handle graceful shutdown
  process.on('beforeExit', async () => {
    await client.$disconnect();
  });

  return client;
}

// Get or create singleton instance
export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = initializePrismaClient();
  }
  return prisma;
}

// Export singleton instance
export default getPrismaClient();

