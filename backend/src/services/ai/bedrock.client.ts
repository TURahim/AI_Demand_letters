import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelCommandInput,
} from '@aws-sdk/client-bedrock-runtime';
import config from '../../config';
import { BEDROCK_CONFIG, STOP_SEQUENCES } from './bedrock.config';
import { estimateTokensForMessages } from './token-counter';
import { AppError } from '../../middleware/error-handler';
import logger from '../../utils/logger';

/**
 * Claude message format
 */
export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string | Array<{
    type: 'text' | 'image';
    text?: string;
    source?: any;
  }>;
}

/**
 * Claude request body
 */
interface ClaudeRequestBody {
  anthropic_version: string;
  max_tokens: number;
  messages: ClaudeMessage[];
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stop_sequences?: string[];
  system?: string;
}

/**
 * Claude response
 */
interface ClaudeResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{
    type: 'text';
    text: string;
  }>;
  model: string;
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence';
  stop_sequence?: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Bedrock client wrapper for Claude
 */
export class BedrockClient {
  private client: BedrockRuntimeClient;

  constructor() {
    this.client = new BedrockRuntimeClient({
      region: config.aws.region,
      credentials: config.aws.accessKeyId && config.aws.secretAccessKey
        ? {
            accessKeyId: config.aws.accessKeyId,
            secretAccessKey: config.aws.secretAccessKey,
          }
        : undefined, // Use default credential chain if not provided
    });
  }

  /**
   * Invoke Claude model
   */
  async invoke(
    messages: ClaudeMessage[],
    options: {
      system?: string;
      temperature?: number;
      maxTokens?: number;
      stopSequences?: string[];
    } = {}
  ): Promise<{
    text: string;
    usage: {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
    };
    stopReason: string;
    metadata: {
      modelId: string;
      requestId: string;
    };
  }> {
    try {
      // Validate input
      if (!messages || messages.length === 0) {
        throw new AppError('Messages array cannot be empty', 400);
      }

      // Estimate input tokens for logging
      const estimatedInputTokens = estimateTokensForMessages(messages);
      
      logger.debug('Invoking Bedrock model', {
        modelId: BEDROCK_CONFIG.modelId,
        messageCount: messages.length,
        estimatedInputTokens,
        systemPrompt: !!options.system,
      });

      // Prepare request body
      const requestBody: ClaudeRequestBody = {
        anthropic_version: BEDROCK_CONFIG.anthropicVersion,
        max_tokens: options.maxTokens || BEDROCK_CONFIG.maxTokens,
        messages,
        temperature: options.temperature ?? BEDROCK_CONFIG.temperature,
        top_p: BEDROCK_CONFIG.topP,
        top_k: BEDROCK_CONFIG.topK,
        stop_sequences: options.stopSequences || STOP_SEQUENCES as unknown as string[],
      };

      // Add system prompt if provided
      if (options.system) {
        requestBody.system = options.system;
      }

      // Prepare invoke command
      const input: InvokeModelCommandInput = {
        modelId: BEDROCK_CONFIG.modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(requestBody),
      };

      // Invoke model
      const startTime = Date.now();
      const command = new InvokeModelCommand(input);
      const response = await this.client.send(command);
      const latency = Date.now() - startTime;

      // Parse response
      const responseBody = JSON.parse(
        new TextDecoder().decode(response.body)
      ) as ClaudeResponse;

      // Extract text from response
      const text = responseBody.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('\n');

      const usage = {
        inputTokens: responseBody.usage.input_tokens,
        outputTokens: responseBody.usage.output_tokens,
        totalTokens: responseBody.usage.input_tokens + responseBody.usage.output_tokens,
      };

      logger.info('Bedrock invocation successful', {
        modelId: BEDROCK_CONFIG.modelId,
        latency,
        usage,
        stopReason: responseBody.stop_reason,
        textLength: text.length,
      });

      return {
        text,
        usage,
        stopReason: responseBody.stop_reason,
        metadata: {
          modelId: responseBody.model,
          requestId: response.$metadata.requestId || '',
        },
      };
    } catch (error: any) {
      logger.error('Bedrock invocation failed', {
        error: error.message,
        modelId: BEDROCK_CONFIG.modelId,
        messageCount: messages.length,
      });

      // Handle specific error types
      if (error.name === 'ThrottlingException') {
        throw new AppError('AI service is currently busy. Please try again in a moment.', 429);
      }

      if (error.name === 'ValidationException') {
        throw new AppError('Invalid request to AI service', 400);
      }

      if (error.name === 'ModelTimeoutException') {
        throw new AppError('AI service request timed out', 504);
      }

      if (error.name === 'AccessDeniedException') {
        throw new AppError('Access to AI model denied. Please check configuration.', 403);
      }

      // Generic error
      throw new AppError(
        `AI service error: ${error.message}`,
        error.statusCode || 500
      );
    }
  }

  /**
   * Simple text completion (convenience method)
   */
  async complete(
    prompt: string,
    options: {
      system?: string;
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<string> {
    const messages: ClaudeMessage[] = [
      {
        role: 'user',
        content: prompt,
      },
    ];

    const response = await this.invoke(messages, options);
    return response.text;
  }

  /**
   * Multi-turn conversation
   */
  async chat(
    conversationHistory: ClaudeMessage[],
    options: {
      system?: string;
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<{
    text: string;
    usage: {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
    };
  }> {
    const response = await this.invoke(conversationHistory, options);
    
    return {
      text: response.text,
      usage: response.usage,
    };
  }

  /**
   * Stream response (not yet implemented)
   * 
   * Note: Bedrock Runtime supports streaming, but requires different API.
   * Can be implemented in future PR if needed.
   */
  async stream(
    _messages: ClaudeMessage[],
    _options: {
      system?: string;
      temperature?: number;
      maxTokens?: number;
      onChunk?: (chunk: string) => void;
    } = {}
  ): Promise<void> {
    throw new Error('Streaming not yet implemented. Use invoke() for now.');
  }
}

// Export singleton instance
export const bedrockClient = new BedrockClient();

