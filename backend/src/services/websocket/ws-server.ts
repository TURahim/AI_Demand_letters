/**
 * WebSocket Server for Real-time Collaboration
 * Implements y-websocket protocol for Yjs synchronization
 */

import WebSocket, { WebSocketServer } from 'ws';
import http from 'http';
import * as Y from 'yjs';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as syncProtocol from 'y-protocols/sync';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { authenticateWs, verifyFirmAccess, AuthenticatedUser } from './ws-auth';
import { getYjsDoc, forcePersist } from '../collaboration/yjs-provider';
import logger from '../../utils/logger';
import prisma from '../../utils/prisma-client';

/**
 * Message types
 */
const messageSync = 0;
const messageAwareness = 1;

/**
 * Connected clients per document
 */
interface ConnectedClient {
  ws: WebSocket;
  user: AuthenticatedUser;
  letterId: string;
  firmId: string;
  awareness: awarenessProtocol.Awareness;
}

const clients = new Map<WebSocket, ConnectedClient>();
const documentClients = new Map<string, Set<WebSocket>>();

/**
 * Setup WebSocket server
 */
export function setupWebSocketServer(server: http.Server): WebSocketServer {
  const wss = new WebSocketServer({
    server,
    path: '/collaboration',
  });

  logger.info('WebSocket server initialized on /collaboration');

  wss.on('connection', async (ws: WebSocket, req: http.IncomingMessage) => {
    // Authenticate
    const user = await authenticateWs(req);
    if (!user) {
      ws.close(4401, 'Unauthorized');
      return;
    }

    // Extract letterId and firmId from URL
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const letterId = url.searchParams.get('letterId');
    const firmId = url.searchParams.get('firmId');

    if (!letterId || !firmId) {
      ws.close(4400, 'Missing letterId or firmId');
      return;
    }

    // Verify firm access
    if (!verifyFirmAccess(user, firmId)) {
      ws.close(4403, 'Access denied');
      return;
    }

    // Verify letter exists and belongs to firm
    try {
      const letter = await prisma.letter.findUnique({
        where: { id: letterId },
        select: { firmId: true },
      });

      if (!letter) {
        ws.close(4404, 'Letter not found');
        return;
      }

      if (letter.firmId !== firmId) {
        ws.close(4403, 'Access denied');
        return;
      }
    } catch (error) {
      logger.error('Failed to verify letter access', { letterId, firmId, error });
      ws.close(4500, 'Internal server error');
      return;
    }

    // Get or create Yjs document
    const doc = await getYjsDoc(letterId, firmId);
    const awareness = new awarenessProtocol.Awareness(doc);

    // Store client info
    const client: ConnectedClient = {
      ws,
      user,
      letterId,
      firmId,
      awareness,
    };
    clients.set(ws, client);

    // Add to document clients
    const docKey = `${firmId}:${letterId}`;
    if (!documentClients.has(docKey)) {
      documentClients.set(docKey, new Set());
    }
    documentClients.get(docKey)!.add(ws);

    logger.info('Client connected', {
      userId: user.id,
      letterId,
      firmId,
      activeConnections: documentClients.get(docKey)!.size,
    });

    // Send initial sync
    sendInitialSync(ws, doc, awareness);

    // Set up awareness for this client
    const awarenessState = {
      user: {
        id: user.id,
        email: user.email,
        name: user.email.split('@')[0], // Simple name extraction
      },
    };
    awareness.setLocalState(awarenessState);

    // Forward awareness updates to other clients
    awareness.on('update', () => {
      broadcastAwareness(letterId, firmId, awareness, ws);
    });

    // Handle incoming messages
    ws.on('message', (data: Buffer) => {
      handleMessage(ws, client, doc, awareness, new Uint8Array(data));
    });

    // Handle disconnect
    ws.on('close', () => {
      handleDisconnect(ws, client, docKey);
    });

    // Handle errors
    ws.on('error', (error) => {
      logger.error('WebSocket error', { userId: user.id, letterId, error });
    });
  });

  wss.on('error', (error) => {
    logger.error('WebSocket server error:', error);
  });

  return wss;
}

/**
 * Send initial sync to new client
 */
function sendInitialSync(
  ws: WebSocket,
  doc: Y.Doc,
  awareness: awarenessProtocol.Awareness
): void {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, messageSync);
  syncProtocol.writeSyncStep1(encoder, doc);
  send(ws, encoding.toUint8Array(encoder));

  // Send awareness states of other clients
  if (awareness.getStates().size > 0) {
    const awarenessEncoder = encoding.createEncoder();
    encoding.writeVarUint(awarenessEncoder, messageAwareness);
    encoding.writeVarUint8Array(
      awarenessEncoder,
      awarenessProtocol.encodeAwarenessUpdate(
        awareness,
        Array.from(awareness.getStates().keys())
      )
    );
    send(ws, encoding.toUint8Array(awarenessEncoder));
  }
}

/**
 * Handle incoming message
 */
function handleMessage(
  ws: WebSocket,
  client: ConnectedClient,
  doc: Y.Doc,
  awareness: awarenessProtocol.Awareness,
  message: Uint8Array
): void {
  try {
    const decoder = decoding.createDecoder(message);
    const messageType = decoding.readVarUint(decoder);

    switch (messageType) {
      case messageSync:
        handleSyncMessage(ws, client, doc, decoder);
        break;
      case messageAwareness:
        handleAwarenessMessage(client, awareness, decoder);
        break;
      default:
        logger.warn('Unknown message type', { messageType });
    }
  } catch (error) {
    logger.error('Error handling WebSocket message', { error });
  }
}

/**
 * Handle sync message
 */
function handleSyncMessage(
  ws: WebSocket,
  client: ConnectedClient,
  doc: Y.Doc,
  decoder: decoding.Decoder
): void {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, messageSync);

  const syncMessageType = syncProtocol.readSyncMessage(decoder, encoder, doc, null);

  if (syncMessageType === syncProtocol.messageYjsSyncStep2) {
    // Step 2: Document has been updated, broadcast to other clients
    broadcastSync(client.letterId, client.firmId, doc, ws);
  }

  // Send response
  const responseMessage = encoding.toUint8Array(encoder);
  if (responseMessage.length > 1) {
    send(ws, responseMessage);
  }
}

/**
 * Handle awareness message
 */
function handleAwarenessMessage(
  _client: ConnectedClient,
  awareness: awarenessProtocol.Awareness,
  decoder: decoding.Decoder
): void {
  awarenessProtocol.applyAwarenessUpdate(awareness, decoding.readVarUint8Array(decoder), null);
  // Awareness update will trigger the awareness.on('update') handler which broadcasts
}

/**
 * Broadcast sync to all clients except sender
 */
function broadcastSync(
  letterId: string,
  firmId: string,
  doc: Y.Doc,
  excludeWs: WebSocket
): void {
  const docKey = `${firmId}:${letterId}`;
  const docClients = documentClients.get(docKey);

  if (!docClients) return;

  for (const clientWs of docClients) {
    if (clientWs !== excludeWs && clientWs.readyState === WebSocket.OPEN) {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageSync);
      syncProtocol.writeSyncStep2(encoder, doc);
      send(clientWs, encoding.toUint8Array(encoder));
    }
  }
}

/**
 * Broadcast awareness to all clients except sender
 */
function broadcastAwareness(
  letterId: string,
  firmId: string,
  awareness: awarenessProtocol.Awareness,
  excludeWs: WebSocket
): void {
  const docKey = `${firmId}:${letterId}`;
  const docClients = documentClients.get(docKey);

  if (!docClients) return;

  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, messageAwareness);
  encoding.writeVarUint8Array(
    encoder,
    awarenessProtocol.encodeAwarenessUpdate(
      awareness,
      Array.from(awareness.getStates().keys())
    )
  );
  const message = encoding.toUint8Array(encoder);

  for (const clientWs of docClients) {
    if (clientWs !== excludeWs && clientWs.readyState === WebSocket.OPEN) {
      send(clientWs, message);
    }
  }
}

/**
 * Handle client disconnect
 */
function handleDisconnect(ws: WebSocket, _client: ConnectedClient, docKey: string): void {
  // Remove from document clients
  const docClients = documentClients.get(docKey);
  if (docClients) {
    docClients.delete(ws);
    if (docClients.size === 0) {
      documentClients.delete(docKey);
      // Force persist document when last client disconnects
      const clientInfo = clients.get(ws);
      if (clientInfo) {
        forcePersist(clientInfo.letterId, clientInfo.firmId).catch((error) => {
          logger.error('Failed to force persist document on disconnect', {
            letterId: clientInfo.letterId,
            firmId: clientInfo.firmId,
            error,
          });
        });
      }
    }
  }

  // Get client info before removing
  const clientInfo = clients.get(ws);

  // Remove from clients map
  clients.delete(ws);

  // Remove awareness state
  if (clientInfo?.awareness) {
    clientInfo.awareness.destroy();
  }

  if (clientInfo) {
    logger.info('Client disconnected', {
      userId: clientInfo.user.id,
      letterId: clientInfo.letterId,
      firmId: clientInfo.firmId,
      remainingConnections: docClients?.size || 0,
    });
  }
}

/**
 * Send message to WebSocket client
 */
function send(ws: WebSocket, message: Uint8Array): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(message, (err) => {
      if (err) {
        logger.error('Failed to send WebSocket message', { error: err });
      }
    });
  }
}

/**
 * Get active connection count for a letter
 */
export function getConnectionCount(letterId: string, firmId: string): number {
  const docKey = `${firmId}:${letterId}`;
  return documentClients.get(docKey)?.size || 0;
}

/**
 * Shutdown WebSocket server
 */
export function shutdownWebSocketServer(wss: WebSocketServer): void {
  logger.info('Shutting down WebSocket server...');

  // Close all client connections
  for (const ws of clients.keys()) {
    ws.close(1001, 'Server shutting down');
  }

  // Close server
  wss.close(() => {
    logger.info('WebSocket server closed');
  });
}

