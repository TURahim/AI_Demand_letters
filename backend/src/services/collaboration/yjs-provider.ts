/**
 * Yjs Provider with Redis Persistence
 * Manages Yjs documents and syncs them to Redis for persistence
 */

import * as Y from 'yjs';
import Redis from 'ioredis';
import logger from '../../utils/logger';
import config from '../../config';

const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  db: 1, // Use separate DB for Yjs documents
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('error', (err) => {
  logger.error('Redis connection error (Yjs Provider):', err);
});

redis.on('connect', () => {
  logger.info('Redis connected (Yjs Provider)');
});

/**
 * Document cache in memory
 */
const docs = new Map<string, Y.Doc>();

/**
 * Pending persistence operations (debounced)
 */
const pendingPersist = new Map<string, NodeJS.Timeout>();

/**
 * Get or create a Yjs document for a letter
 */
export async function getYjsDoc(letterId: string, firmId: string): Promise<Y.Doc> {
  const docKey = getDocKey(letterId, firmId);

  // Return cached doc if exists
  if (docs.has(docKey)) {
    return docs.get(docKey)!;
  }

  // Create new doc
  const doc = new Y.Doc();

  // Load persisted state from Redis
  try {
    const persistedState = await redis.getBuffer(getRedisKey(letterId, firmId));
    if (persistedState) {
      Y.applyUpdate(doc, new Uint8Array(persistedState));
      logger.debug('Loaded Yjs document from Redis', { letterId, firmId });
    }
  } catch (error) {
    logger.error('Failed to load Yjs document from Redis', { letterId, firmId, error });
  }

  // Set up persistence on updates
  doc.on('update', () => {
    persistDocDebounced(letterId, firmId, doc);
  });

  // Cache the doc
  docs.set(docKey, doc);

  logger.info('Yjs document created', { letterId, firmId });

  return doc;
}

/**
 * Persist document to Redis (debounced)
 */
function persistDocDebounced(letterId: string, firmId: string, doc: Y.Doc): void {
  const docKey = getDocKey(letterId, firmId);

  // Clear existing timeout
  if (pendingPersist.has(docKey)) {
    clearTimeout(pendingPersist.get(docKey)!);
  }

  // Set new timeout (persist after 2 seconds of inactivity)
  const timeout = setTimeout(async () => {
    await persistDoc(letterId, firmId, doc);
    pendingPersist.delete(docKey);
  }, 2000);

  pendingPersist.set(docKey, timeout);
}

/**
 * Persist document to Redis immediately
 */
async function persistDoc(letterId: string, firmId: string, doc: Y.Doc): Promise<void> {
  try {
    const state = Y.encodeStateAsUpdate(doc);
    const buffer = Buffer.from(state);
    const redisKey = getRedisKey(letterId, firmId);

    await redis.setex(redisKey, 7 * 24 * 60 * 60, buffer); // 7 days TTL

    logger.debug('Persisted Yjs document to Redis', {
      letterId,
      firmId,
      size: buffer.length,
    });
  } catch (error) {
    logger.error('Failed to persist Yjs document to Redis', { letterId, firmId, error });
  }
}

/**
 * Force persist a document immediately
 */
export async function forcePersist(letterId: string, firmId: string): Promise<void> {
  const docKey = getDocKey(letterId, firmId);
  const doc = docs.get(docKey);

  if (!doc) {
    logger.warn('Cannot force persist: document not loaded', { letterId, firmId });
    return;
  }

  // Clear pending debounced persist
  if (pendingPersist.has(docKey)) {
    clearTimeout(pendingPersist.get(docKey)!);
    pendingPersist.delete(docKey);
  }

  await persistDoc(letterId, firmId, doc);
}

/**
 * Create a snapshot of the document
 */
export async function createSnapshot(
  letterId: string,
  firmId: string
): Promise<Buffer | null> {
  const docKey = getDocKey(letterId, firmId);
  const doc = docs.get(docKey);

  if (!doc) {
    logger.warn('Cannot create snapshot: document not loaded', { letterId, firmId });
    return null;
  }

  const state = Y.encodeStateAsUpdate(doc);
  return Buffer.from(state);
}

/**
 * Get document key for in-memory cache
 */
function getDocKey(letterId: string, firmId: string): string {
  return `${firmId}:${letterId}`;
}

/**
 * Get Redis key for persistence
 */
function getRedisKey(letterId: string, firmId: string): string {
  return `yjs:letter:${firmId}:${letterId}`;
}

/**
 * Remove document from cache (cleanup)
 */
export function removeDoc(letterId: string, firmId: string): void {
  const docKey = getDocKey(letterId, firmId);

  // Clear pending persist
  if (pendingPersist.has(docKey)) {
    clearTimeout(pendingPersist.get(docKey)!);
    pendingPersist.delete(docKey);
  }

  // Remove from cache
  if (docs.has(docKey)) {
    const doc = docs.get(docKey)!;
    doc.destroy();
    docs.delete(docKey);
    logger.info('Yjs document removed from cache', { letterId, firmId });
  }
}

/**
 * Cleanup inactive documents (call periodically)
 */
export function cleanupInactiveDocs(): void {
  // TODO: Track last access time and remove docs inactive for > 30 minutes
  logger.info('Cleanup inactive docs called', { activeDocCount: docs.size });
}

/**
 * Get Redis client (for awareness)
 */
export function getRedisClient(): Redis {
  return redis;
}

/**
 * Shutdown and cleanup
 */
export async function shutdown(): Promise<void> {
  logger.info('Shutting down Yjs provider...');

  // Force persist all pending docs
  const persistPromises: Promise<void>[] = [];
  for (const [docKey] of docs.entries()) {
    const [firmId, letterId] = docKey.split(':');
    persistPromises.push(forcePersist(letterId, firmId));
  }

  await Promise.all(persistPromises);

  // Clear all docs
  for (const [docKey] of docs.entries()) {
    const [firmId, letterId] = docKey.split(':');
    removeDoc(letterId, firmId);
  }

  // Close Redis connection
  await redis.quit();

  logger.info('Yjs provider shutdown complete');
}

