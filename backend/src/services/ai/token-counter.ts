/**
 * Token estimation utilities
 * 
 * Note: This is an approximation. Actual token counts may vary slightly.
 * Claude uses a similar tokenizer to GPT-3/4, so we can estimate reasonably well.
 */

/**
 * Estimate token count from text
 * 
 * Rough approximation: 1 token ≈ 4 characters or 0.75 words
 * More accurate for English text
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;

  // Remove extra whitespace
  const cleanText = text.trim();
  
  // Character-based estimation (more accurate for mixed content)
  const charCount = cleanText.length;
  const charBasedEstimate = Math.ceil(charCount / 4);
  
  // Word-based estimation
  const words = cleanText.split(/\s+/).filter(w => w.length > 0);
  const wordBasedEstimate = Math.ceil(words.length / 0.75);
  
  // Use average of both methods for better accuracy
  return Math.ceil((charBasedEstimate + wordBasedEstimate) / 2);
}

/**
 * Estimate tokens for messages array (Claude format)
 */
export function estimateTokensForMessages(
  messages: Array<{ role: string; content: string | Array<any> }>
): number {
  let totalTokens = 0;

  for (const message of messages) {
    // Add tokens for role
    totalTokens += 4; // Approximate overhead for role formatting

    // Handle content
    if (typeof message.content === 'string') {
      totalTokens += estimateTokens(message.content);
    } else if (Array.isArray(message.content)) {
      // Handle content blocks
      for (const block of message.content) {
        if (block.type === 'text' && block.text) {
          totalTokens += estimateTokens(block.text);
        }
        // Note: Image tokens would need special handling
      }
    }
  }

  return totalTokens;
}

/**
 * Check if text is within token limit
 */
export function isWithinTokenLimit(text: string, limit: number): boolean {
  return estimateTokens(text) <= limit;
}

/**
 * Truncate text to fit within token limit
 */
export function truncateToTokenLimit(text: string, limit: number): string {
  const estimatedTokens = estimateTokens(text);
  
  if (estimatedTokens <= limit) {
    return text;
  }
  
  // Calculate approximate character limit
  const charLimit = Math.floor(limit * 4 * 0.9); // 90% safety margin
  
  if (text.length <= charLimit) {
    return text;
  }
  
  // Truncate and add ellipsis
  return text.substring(0, charLimit) + '...';
}

/**
 * Split text into chunks that fit within token limit
 */
export function splitIntoChunks(
  text: string,
  maxTokensPerChunk: number,
  overlap: number = 0
): string[] {
  const estimatedTokens = estimateTokens(text);
  
  if (estimatedTokens <= maxTokensPerChunk) {
    return [text];
  }
  
  const chunks: string[] = [];
  const charLimit = Math.floor(maxTokensPerChunk * 4);
  const overlapChars = Math.floor(overlap * 4);
  
  let startIdx = 0;
  
  while (startIdx < text.length) {
    const endIdx = Math.min(startIdx + charLimit, text.length);
    const chunk = text.substring(startIdx, endIdx);
    chunks.push(chunk);
    
    // Move start index forward, accounting for overlap
    startIdx = endIdx - overlapChars;
    
    if (startIdx >= text.length - overlapChars) {
      break;
    }
  }
  
  return chunks;
}

/**
 * Get token statistics for text
 */
export function getTokenStats(text: string): {
  tokens: number;
  characters: number;
  words: number;
  lines: number;
} {
  return {
    tokens: estimateTokens(text),
    characters: text.length,
    words: text.split(/\s+/).filter(w => w.length > 0).length,
    lines: text.split('\n').length,
  };
}

/**
 * Calculate cost based on token usage
 */
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  inputPricePerMillion: number,
  outputPricePerMillion: number
): number {
  const inputCost = (inputTokens / 1000000) * inputPricePerMillion;
  const outputCost = (outputTokens / 1000000) * outputPricePerMillion;
  return inputCost + outputCost;
}

