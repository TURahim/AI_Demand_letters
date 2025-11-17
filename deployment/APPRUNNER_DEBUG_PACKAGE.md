# AWS App Runner Backend Deployment - Complete Debug Package

**Problem**: App Runner deployment stuck in `OPERATION_IN_PROGRESS` and failing health checks on `/health` endpoint.

**Service ARN**: `arn:aws:apprunner:us-east-1:971422717446:service/steno-prod-backend/a255d885f1b043759fcf3b98ffa38607`

**Service URL**: `https://vfbm2fprpn.us-east-1.awsapprunner.com`

---

## === FILE: backend/Dockerfile ===

```dockerfile
# Multi-stage build for production
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production --ignore-scripts

# Generate Prisma Client
RUN npx prisma generate

# Build stage
FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma

# Copy package files and tsconfig
COPY package.json package-lock.json* tsconfig.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm install

# Copy source code
COPY src ./src

# Build application
RUN npm run build

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
RUN apk add --no-cache openssl

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Copy necessary files
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./

# Change ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "dist/server.js"]
```

---

## === FILE: backend/docker-compose.yml ===

**NOT FOUND**

---

## === FILE: backend/src/server.ts ===

```typescript
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
```

---

## === FILE: backend/src/index.ts ===

**NOT FOUND**

---

## === FILE: backend/src/app.ts ===

```typescript
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

// ============================================
// Security Middleware
// ============================================
app.use(helmet());
app.use(
  cors({
    origin: config.cors.origin,
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
```

---

## === FILE: backend/prisma/schema.prisma ===

```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ... (409 lines total - schema defines User, Firm, Document, Letter, etc.)
```

---

## === FILE: backend/src/config/index.ts ===

```typescript
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

interface Config {
  // Server
  nodeEnv: string;
  port: number;
  apiVersion: string;

  // Database
  databaseUrl: string;

  // JWT
  jwt: {
    secret: string;
    expiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };

  // AWS
  aws: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  };

  // S3
  s3: {
    bucketName: string;
    uploadsPrefix: string;
    lettersPrefix: string;
  };

  // Bedrock
  bedrock: {
    modelId: string;
    maxTokens: number;
    temperature: number;
  };

  // Secrets Manager
  secretsManager: {
    enabled: boolean;
    prefix: string;
  };

  // KMS
  kms: {
    keyId: string;
    encryptionEnabled: boolean;
  };

  // Redis
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };

  // Rate Limiting
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };

  // Logging
  logging: {
    level: string;
    format: string;
  };

  // CORS
  cors: {
    origin: string;
    credentials: boolean;
  };

  // File Upload
  upload: {
    maxFileSize: number;
    allowedFileTypes: string[];
  };

  // Monitoring
  monitoring: {
    sentryDsn?: string;
    sentryEnvironment: string;
    cloudwatchEnabled: boolean;
  };

  // OCR
  ocr: {
    provider: string;
    tesseractPath?: string;
  };

  // Antivirus
  antivirus: {
    enabled: boolean;
    clamavHost?: string;
    clamavPort?: number;
  };

  // WebSocket
  websocket: {
    port: number;
    corsOrigin: string;
  };

  // Feature Flags
  features: {
    collaboration: boolean;
    aiGeneration: boolean;
    analytics: boolean;
  };
}

const config: Config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  apiVersion: process.env.API_VERSION || 'v1',

  databaseUrl: process.env.DATABASE_URL || '',

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.REFRESH_TOKEN_SECRET || 'dev-refresh-secret',
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',
  },

  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },

  s3: {
    bucketName: process.env.S3_BUCKET_NAME || '',
    uploadsPrefix: process.env.S3_UPLOADS_PREFIX || 'uploads/',
    lettersPrefix: process.env.S3_LETTERS_PREFIX || 'letters/',
  },

  bedrock: {
    modelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    maxTokens: parseInt(process.env.BEDROCK_MAX_TOKENS || '4096', 10),
    temperature: parseFloat(process.env.BEDROCK_TEMPERATURE || '0.7'),
  },

  secretsManager: {
    enabled: process.env.SECRETS_MANAGER_ENABLED === 'true',
    prefix: process.env.SECRETS_PREFIX || 'steno/dev',
  },

  kms: {
    keyId: process.env.KMS_KEY_ID || '',
    encryptionEnabled: process.env.ENCRYPTION_ENABLED !== 'false',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: process.env.CORS_CREDENTIALS !== 'false',
  },

  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10), // 50MB default
    allowedFileTypes: (process.env.ALLOWED_FILE_TYPES || 'pdf,doc,docx,txt').split(','),
  },

  monitoring: {
    sentryDsn: process.env.SENTRY_DSN,
    sentryEnvironment: process.env.SENTRY_ENVIRONMENT || 'development',
    cloudwatchEnabled: process.env.CLOUDWATCH_ENABLED === 'true',
  },

  ocr: {
    provider: process.env.OCR_PROVIDER || 'textract',
    tesseractPath: process.env.TESSERACT_PATH,
  },

  antivirus: {
    enabled: process.env.ANTIVIRUS_ENABLED === 'true',
    clamavHost: process.env.CLAMAV_HOST,
    clamavPort: process.env.CLAMAV_PORT ? parseInt(process.env.CLAMAV_PORT, 10) : undefined,
  },

  websocket: {
    port: parseInt(process.env.WEBSOCKET_PORT || '3002', 10),
    corsOrigin: process.env.WEBSOCKET_CORS_ORIGIN || 'http://localhost:3000',
  },

  features: {
    collaboration: process.env.ENABLE_COLLABORATION !== 'false',
    aiGeneration: process.env.ENABLE_AI_GENERATION !== 'false',
    analytics: process.env.ENABLE_ANALYTICS !== 'false',
  },
};

// Validate required config
function validateConfig() {
  const errors: string[] = [];

  if (!config.databaseUrl) {
    errors.push('DATABASE_URL is required');
  }

  if (config.nodeEnv === 'production') {
    if (config.jwt.secret === 'dev-secret-change-me') {
      errors.push('JWT_SECRET must be set in production');
    }
    if (!config.aws.accessKeyId || !config.aws.secretAccessKey) {
      errors.push('AWS credentials are required in production');
    }
    if (!config.s3.bucketName) {
      errors.push('S3_BUCKET_NAME is required in production');
    }
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

// Run validation
if (process.env.NODE_ENV !== 'test') {
  validateConfig();
}

export default config;
```

---

## === FILE: backend/src/config/env.ts ===

**NOT FOUND**

---

## === FILE: backend/package.json ===

```json
{
  "name": "steno-backend",
  "version": "1.0.0",
  "description": "Backend API for Steno Demand Letter Generator",
  "main": "dist/server.js",
  "scripts": {
    "dev": "nodemon src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "jest --coverage",
    "test:watch": "jest --watch",
    "test:integration": "jest --testPathPattern=integration",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio",
    "prisma:seed": "ts-node database/seeds/seed.ts",
    "db:migrate": "prisma migrate dev",
    "db:seed": "ts-node database/seeds/seed.ts",
    "db:reset": "prisma migrate reset",
    "lint": "eslint . --ext .ts",
    "lint:fix": "eslint . --ext .ts --fix",
    "format": "prettier --write \"src/**/*.ts\""
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
```

---

## === FILE: backend/entrypoint.sh ===

**NOT FOUND**

---

## === FILE: backend/start.sh ===

**NOT FOUND**

---

## === FILE: backend/src/utils/prisma-client.ts ===

```typescript
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
```

---

## === FILE: deployment/config/vpc-connector-config.json ===

```json
{
  "VpcConnectorName": "steno-prod-vpc-connector",
  "VpcConnectorArn": "arn:aws:apprunner:us-east-1:971422717446:vpcconnector/steno-prod-vpc-connector/1/2092b79550e8418488bc62ebbe98d19c",
  "AppRunnerSecurityGroup": "sg-04f4621044673ebb6",
  "Region": "us-east-1"
}
```

---

## === FILE: deployment/config/vpc-config.json ===

```json
{
  "VpcId": "vpc-0b5ff75842342f527",
  "VpcName": "stenoai-dev-vpc",
  "VpcCidr": "10.0.0.0/16",
  "PrivateSubnet1Id": "subnet-0fd1ae4a15040a502",
  "PrivateSubnet1Name": "stenoai-dev-subnet-private-1",
  "PrivateSubnet1Az": "us-east-1a",
  "PrivateSubnet2Id": "subnet-0454ed18175d192cd",
  "PrivateSubnet2Name": "stenoai-dev-subnet-private-2",
  "PrivateSubnet2Az": "us-east-1b",
  "Region": "us-east-1",
  "Reused": true,
  "Note": "Reusing existing VPC - no new VPC creation needed"
}
```

---

## === SUBNETS DETAILS ===

```json
{
  "Subnet1": {
    "SubnetId": "subnet-0fd1ae4a15040a502",
    "VpcId": "vpc-0b5ff75842342f527",
    "CidrBlock": "10.0.1.0/24",
    "AvailabilityZone": "us-east-1a",
    "AvailableIpAddressCount": 246,
    "MapPublicIpOnLaunch": false,
    "State": "available"
  },
  "Subnet2": {
    "SubnetId": "subnet-0454ed18175d192cd",
    "VpcId": "vpc-0b5ff75842342f527",
    "CidrBlock": "10.0.2.0/24",
    "AvailabilityZone": "us-east-1b",
    "AvailableIpAddressCount": 245,
    "MapPublicIpOnLaunch": false,
    "State": "available"
  }
}
```

---

## === APP RUNNER CURRENT CONFIGURATION ===

```json
{
  "ServiceName": "steno-prod-backend",
  "ServiceId": "a255d885f1b043759fcf3b98ffa38607",
  "ServiceArn": "arn:aws:apprunner:us-east-1:971422717446:service/steno-prod-backend/a255d885f1b043759fcf3b98ffa38607",
  "ServiceUrl": "vfbm2fprpn.us-east-1.awsapprunner.com",
  "Status": "OPERATION_IN_PROGRESS",
  "ImageIdentifier": "971422717446.dkr.ecr.us-east-1.amazonaws.com/steno-prod-backend:latest",
  "Port": "3001",
  "HealthCheckPath": "/health",
  "HealthCheckInterval": 10,
  "HealthCheckTimeout": 5,
  "HealthyThreshold": 2,
  "UnhealthyThreshold": 5,
  "NetworkConfiguration": {
    "EgressType": "VPC",
    "VpcConnectorArn": "arn:aws:apprunner:us-east-1:971422717446:vpcconnector/steno-prod-vpc-connector/1/2092b79550e8418488bc62ebbe98d19c"
  },
  "Cpu": "1024",
  "Memory": "2048"
}
```

---

## === ENVIRONMENT VARIABLES SET IN APP RUNNER ===

```bash
NODE_ENV=production
PORT=3001
API_VERSION=v1
DATABASE_URL=postgresql://steno_admin:dY4peiWkOwEh4bc2jVVtUWfkT@steno-prod-db.crws0amqe1e3.us-east-1.rds.amazonaws.com:5432/steno_prod?schema=public
REDIS_HOST=steno-prod-redis.ggng2r.0001.use1.cache.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
S3_BUCKET_NAME=steno-prod-docs-971422717446
S3_EXPORTS_BUCKET=steno-prod-exports-971422717446
S3_UPLOADS_PREFIX=uploads/
S3_LETTERS_PREFIX=letters/
JWT_SECRET=OpTQXDqmIAf2yuZvyLr5oszfgjdeVF0pAf0y9pwdDghXZt7wb6M2aUovP1h24i M73VGhBujtpuD5p1hu8XQ
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_SECRET=OpTQXDqmIAf2yuZvyLr5oszfgjdeVF0pAf0y9pwdDghXZt7wb6M2aUovP1h24i M73VGhBujtpuD5p1hu8XQ
REFRESH_TOKEN_EXPIRES_IN=30d
ENCRYPTION_KEY=7UIrpMbUr1VHSmGhHnycpppF0vXPpQXx
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=us.anthropic.claude-3-5-sonnet-20241022-v2:0
BEDROCK_MAX_TOKENS=4096
BEDROCK_TEMPERATURE=0.7
CORS_ORIGIN=*
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## === PROBLEM SUMMARY ===

### Current Issues:
1. **App Runner Status**: Stuck in `OPERATION_IN_PROGRESS` for 10+ minutes
2. **Health Check**: Failing on `HTTP GET /health` (port 3001)
3. **Previous Deployments**: All failed with "Health check failed" after 18 minutes

### What We Know:
- ✅ Docker image builds successfully locally
- ✅ Dockerfile exposes port 3001
- ✅ App Runner configured to use port 3001
- ✅ `/health` endpoint exists in `src/app.ts` (line 57-64)
- ✅ VPC Connector configured (egress type: VPC)
- ✅ RDS and Redis in private subnets (10.0.1.0/24, 10.0.2.0/24)
- ✅ Security groups allow traffic from App Runner SG to RDS:5432 and Redis:6379
- ✅ All environment variables provided

### Startup Sequence Issues:
The app attempts to start multiple services on startup (`server.ts` lines 13-19):
1. **initializeErrorReporting()** - May try to contact external service
2. **startMetricsCollection()** - May try to write to CloudWatch
3. **startGenerationWorker()** - Connects to Redis via BullMQ
4. **app.listen()** - Starts HTTP server on port 3001
5. **setupWebSocketServer()** - Starts WebSocket server

### Potential Root Causes:
1. **App crashes before HTTP server starts** (lines 22-28 in server.ts)
2. **Redis connection blocks startup** (generation worker line 19)
3. **Database connection validation fails** (config validation line 225)
4. **WebSocket server initialization fails** (line 31)
5. **Prisma cannot connect to RDS** (database not migrated)
6. **Config validation throws error** (config/index.ts line 222-244)

### Network Configuration:
- VPC: `vpc-0b5ff75842342f527` (10.0.0.0/16)
- Private Subnet 1: `subnet-0fd1ae4a15040a502` (10.0.1.0/24, us-east-1a)
- Private Subnet 2: `subnet-0454ed18175d192cd` (10.0.2.0/24, us-east-1b)
- VPC Connector: Active and attached to App Runner
- Security Group: `sg-04f4621044673ebb6` (allows egress to RDS & Redis)

---

## === QUESTIONS FOR DEBUGGING ===

1. **Does the app require Prisma migrations to be run first?** (DATABASE_URL is set but DB may be empty)
2. **Can the Redis/BullMQ worker be optional or lazy-loaded?** (worker starts immediately on line 19)
3. **Should config validation be disabled for production?** (AWS_ACCESS_KEY_ID not provided, relying on IAM role)
4. **Is AWS SDK using IAM role correctly without explicit credentials?** (config expects AWS_ACCESS_KEY_ID)
5. **Does Winston logger try to write to CloudWatch immediately?** (may fail if not configured)
6. **Can WebSocket server be disabled in App Runner?** (separate port 3002 not exposed)
7. **Should health check start-period be longer?** (currently allows 40s for Docker, but app init may take longer)

---

## === RECOMMENDED NEXT STEPS ===

1. **Make startup services optional or deferred:**
   - Move `startGenerationWorker()` to lazy initialization
   - Make metrics collection fire-and-forget
   - Skip WebSocket setup if port not available

2. **Run Prisma migrations before health check:**
   - Add migration command to Dockerfile or startup script
   - Or set `SKIP_DB_VALIDATION=true` initially

3. **Fix AWS credentials issue:**
   - Remove `accessKeyId` and `secretAccessKey` from config validation in production
   - App Runner uses IAM role automatically

4. **Increase health check grace period:**
   - Current: UnhealthyThreshold=5, Interval=10s = 50s total
   - Recommendation: UnhealthyThreshold=10, Interval=10s = 100s total

5. **Add debug logging to startup:**
   - Log each initialization step
   - Catch and log errors without crashing

6. **Check CloudWatch Logs for actual error:**
   - Log group: `/aws/apprunner/steno-prod-backend/a255d885f1b043759fcf3b98ffa38607/application`
   - Look for crash messages or stack traces

---

**Copy this entire file and paste into ChatGPT for comprehensive debugging assistance.**

