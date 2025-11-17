import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import config from './config';
import { requestLogger } from './middleware/logger';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { compressionMiddleware } from './middleware/compression';
import logger from './utils/logger';

// Import routes
import authRoutes from './services/auth/auth.routes';
import userRoutes from './services/users/user.routes';
import firmRoutes from './services/firms/firm.routes';
import uploadRoutes from './services/upload/upload.routes';
import documentRoutes from './services/documents/document.routes';
import templateRoutes from './services/templates/template.routes';
import aiRoutes from './services/ai/ai.routes';
import generationRoutes from './services/generation/generation.routes';
import letterRoutes from './services/letters/letter.routes';
import commentRoutes from './services/comments/comment.routes';
import exportRoutes from './services/export/export.routes';
import analyticsRoutes from './services/analytics/analytics.routes';

// Create Express app
const app: Application = express();

// Trust reverse proxy (ELB/CloudFront) so rate limiting and IP tracking work
app.set('trust proxy', 1);

// ============================================
// Security Middleware
// ============================================
app.use(helmet());
app.use(
  cors({
    origin: config.cors.origin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: config.cors.credentials,
  })
);

// ============================================
// Body Parsing Middleware
// ============================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// Compression Middleware
// ============================================
app.use(compressionMiddleware);

// ============================================
// Logging Middleware
// ============================================
app.use(requestLogger);

// ============================================
// Health Check
// ============================================
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
  });
});

console.log('✓ Health endpoint registered at /health');

// ============================================
// API Routes
// ============================================
app.get(`/api/${config.apiVersion}`, (_req, res) => {
  res.json({
    message: 'Steno API',
    version: config.apiVersion,
    environment: config.nodeEnv,
  });
});

// Register API routes
app.use(`/api/${config.apiVersion}/auth`, authRoutes);
app.use(`/api/${config.apiVersion}/users`, userRoutes);
app.use(`/api/${config.apiVersion}/firms`, firmRoutes);
app.use(`/api/${config.apiVersion}/upload`, uploadRoutes);
app.use(`/api/${config.apiVersion}/documents`, documentRoutes);
app.use(`/api/${config.apiVersion}/templates`, templateRoutes);
app.use(`/api/${config.apiVersion}/ai`, aiRoutes);
app.use(`/api/${config.apiVersion}/generation`, generationRoutes);
app.use(`/api/${config.apiVersion}/letters`, letterRoutes);
app.use(`/api/${config.apiVersion}/comments`, commentRoutes);
app.use(`/api/${config.apiVersion}/exports`, exportRoutes);
app.use(`/api/${config.apiVersion}/analytics`, analyticsRoutes);

// ============================================
// Error Handling
// ============================================
app.use(notFoundHandler);
app.use(errorHandler);

logger.info('Express app initialized');

export default app;

