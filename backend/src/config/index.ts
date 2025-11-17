import dotenv from 'dotenv';

// Load environment variables from .env file ONLY in development
// In production (App Runner, ECS, etc.), environment variables are injected directly
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
  console.log('✓ Loaded environment variables from .env file (development mode)');
}

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
    enabled: boolean;
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

const websocketEnabledEnv = process.env.WEBSOCKET_ENABLED;

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
    enabled:
      websocketEnabledEnv !== undefined
        ? websocketEnabledEnv === 'true'
        : process.env.NODE_ENV !== 'production',
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

    // AWS Credentials validation - support IAM role mode
    const accessKey = config.aws.accessKeyId;
    const secretKey = config.aws.secretAccessKey;
    const noKeysProvided = !accessKey && !secretKey;
    const partialKeys = (!!accessKey && !secretKey) || (!accessKey && !!secretKey);

    if (partialKeys) {
      errors.push(
        'Both AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be provided together. ' +
        'Provide both keys OR omit both to use IAM role.'
      );
    }

    // If no keys provided, assume IAM role mode (App Runner, ECS, EC2 with instance profile)
    if (noKeysProvided) {
      console.log('✓ Using AWS IAM role for credentials (no static keys provided)');
    } else {
      console.log('✓ Using static AWS credentials from environment variables');
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
  // Log startup configuration
  console.log('═══════════════════════════════════════════════════════');
  console.log('🚀 Starting Steno Backend');
  console.log('═══════════════════════════════════════════════════════');
  console.log('NODE_ENV:', config.nodeEnv);
  console.log('PORT:', config.port);
  console.log('API_VERSION:', config.apiVersion);
  console.log('Database URL configured:', !!config.databaseUrl);
  console.log('Redis Host:', config.redis.host);
  console.log('S3 Bucket:', config.s3.bucketName || '(not configured)');
  console.log('AWS Region:', config.aws.region);
  console.log('WebSocket enabled:', config.websocket.enabled);
  console.log('Queue Worker:', process.env.ENABLE_QUEUE_WORKER || 'auto');
  console.log('═══════════════════════════════════════════════════════');
  
  validateConfig();
  
  console.log('✅ Configuration validated successfully');
  console.log('');
}

export default config;

