import config from '../../config';

/**
 * Bedrock model configuration
 */
export const BEDROCK_CONFIG = {
  modelId: config.bedrock.modelId,
  maxTokens: config.bedrock.maxTokens,
  temperature: config.bedrock.temperature,
  topP: 0.9,
  topK: 250,
  
  // Anthropic Claude specific version
  anthropicVersion: 'bedrock-2023-05-31',
  
  // Timeout settings
  requestTimeout: 60000, // 60 seconds
  
  // Retry configuration
  maxRetries: 3,
  retryDelay: 1000, // 1 second
} as const;

/**
 * Model pricing (per million tokens)
 * Supports both direct model IDs and inference profile IDs
 */
export const MODEL_PRICING = {
  'anthropic.claude-3-5-sonnet-20241022-v2:0': {
    input: 3.00,  // $3.00 per million input tokens
    output: 15.00, // $15.00 per million output tokens
  },
  'us.anthropic.claude-3-5-sonnet-20241022-v2:0': {
    input: 3.00,
    output: 15.00,
  },
  'anthropic.claude-3-5-sonnet-20240620-v1:0': {
    input: 3.00,
    output: 15.00,
  },
  'anthropic.claude-3-sonnet-20240229-v1:0': {
    input: 3.00,
    output: 15.00,
  },
  'anthropic.claude-3-haiku-20240307-v1:0': {
    input: 0.25,
    output: 1.25,
  },
} as const;

/**
 * Get pricing for current model
 */
export function getModelPricing() {
  const modelId = BEDROCK_CONFIG.modelId;
  return MODEL_PRICING[modelId as keyof typeof MODEL_PRICING] || {
    input: 3.00,
    output: 15.00,
  };
}

/**
 * Token limits for models
 * Supports both direct model IDs and inference profile IDs
 */
export const MODEL_LIMITS = {
  'anthropic.claude-3-5-sonnet-20241022-v2:0': {
    maxInputTokens: 200000,
    maxOutputTokens: 4096,
    contextWindow: 200000,
  },
  'us.anthropic.claude-3-5-sonnet-20241022-v2:0': {
    maxInputTokens: 200000,
    maxOutputTokens: 4096,
    contextWindow: 200000,
  },
  'anthropic.claude-3-5-sonnet-20240620-v1:0': {
    maxInputTokens: 200000,
    maxOutputTokens: 4096,
    contextWindow: 200000,
  },
  'anthropic.claude-3-sonnet-20240229-v1:0': {
    maxInputTokens: 200000,
    maxOutputTokens: 4096,
    contextWindow: 200000,
  },
  'anthropic.claude-3-haiku-20240307-v1:0': {
    maxInputTokens: 200000,
    maxOutputTokens: 4096,
    contextWindow: 200000,
  },
} as const;

/**
 * Get limits for current model
 */
export function getModelLimits() {
  const modelId = BEDROCK_CONFIG.modelId;
  return MODEL_LIMITS[modelId as keyof typeof MODEL_LIMITS] || {
    maxInputTokens: 200000,
    maxOutputTokens: 4096,
    contextWindow: 200000,
  };
}

/**
 * Stop sequences for generation
 */
export const STOP_SEQUENCES = [
  '\n\nHuman:',
  '\n\nAssistant:',
  '<END>',
] as const;

