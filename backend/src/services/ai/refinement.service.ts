import { bedrockClient, ClaudeMessage } from './bedrock.client';
import {
  buildSystemPrompt,
  buildRefinementPrompt,
  buildToneAdjustmentPrompt,
} from './prompt-builder';
import { AppError } from '../../middleware/error-handler';
import logger from '../../utils/logger';

/**
 * Refine existing demand letter
 */
export async function refineLetter(input: {
  originalDraft: string;
  refinementInstructions: string;
  specificChanges?: string;
  additionalContext?: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<{
  refinedLetter: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  metadata: {
    modelId: string;
    requestId: string;
    refinedAt: Date;
  };
}> {
  try {
    if (!input.originalDraft || !input.refinementInstructions) {
      throw new AppError('Original draft and refinement instructions are required', 400);
    }

    logger.info('Refining demand letter', {
      draftLength: input.originalDraft.length,
      instructionsLength: input.refinementInstructions.length,
    });

    // Build refinement prompt
    const userPrompt = await buildRefinementPrompt({
      originalDraft: input.originalDraft,
      refinementInstructions: input.refinementInstructions,
      specificChanges: input.specificChanges,
      additionalContext: input.additionalContext,
    });

    // Get system prompt
    const systemPrompt = await buildSystemPrompt();

    // Prepare messages
    const messages: ClaudeMessage[] = [
      {
        role: 'user',
        content: userPrompt,
      },
    ];

    // Invoke model
    const response = await bedrockClient.invoke(messages, {
      system: systemPrompt,
      temperature: input.temperature ?? 0.5, // Slightly lower temperature for refinement
      maxTokens: input.maxTokens,
    });

    logger.info('Letter refinement completed', {
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
      refinedLength: response.text.length,
    });

    return {
      refinedLetter: response.text,
      usage: response.usage,
      metadata: {
        modelId: response.metadata.modelId,
        requestId: response.metadata.requestId,
        refinedAt: new Date(),
      },
    };
  } catch (error: any) {
    logger.error('Letter refinement failed', {
      error: error.message,
      draftLength: input.originalDraft?.length,
    });
    throw error;
  }
}

/**
 * Adjust tone of demand letter
 */
export async function adjustTone(input: {
  currentDraft: string;
  requestedTone: 'professional' | 'firm' | 'conciliatory' | 'assertive' | 'diplomatic' | 'urgent';
  toneGuidelines?: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<{
  adjustedLetter: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  metadata: {
    modelId: string;
    requestId: string;
    adjustedAt: Date;
  };
}> {
  try {
    if (!input.currentDraft || !input.requestedTone) {
      throw new AppError('Current draft and requested tone are required', 400);
    }

    logger.info('Adjusting letter tone', {
      draftLength: input.currentDraft.length,
      requestedTone: input.requestedTone,
    });

    // Map tone to guidelines if not provided
    const toneGuidelines = input.toneGuidelines || getToneGuidelines(input.requestedTone);

    // Build tone adjustment prompt
    const userPrompt = await buildToneAdjustmentPrompt({
      currentDraft: input.currentDraft,
      requestedTone: input.requestedTone,
      toneGuidelines,
    });

    // Get system prompt
    const systemPrompt = await buildSystemPrompt();

    // Prepare messages
    const messages: ClaudeMessage[] = [
      {
        role: 'user',
        content: userPrompt,
      },
    ];

    // Invoke model
    const response = await bedrockClient.invoke(messages, {
      system: systemPrompt,
      temperature: input.temperature ?? 0.6,
      maxTokens: input.maxTokens,
    });

    logger.info('Tone adjustment completed', {
      requestedTone: input.requestedTone,
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
    });

    return {
      adjustedLetter: response.text,
      usage: response.usage,
      metadata: {
        modelId: response.metadata.modelId,
        requestId: response.metadata.requestId,
        adjustedAt: new Date(),
      },
    };
  } catch (error: any) {
    logger.error('Tone adjustment failed', {
      error: error.message,
      requestedTone: input.requestedTone,
    });
    throw error;
  }
}

/**
 * Get predefined tone guidelines
 */
function getToneGuidelines(tone: string): string {
  const guidelines: Record<string, string> = {
    professional:
      'Use standard formal business language. Be respectful, objective, and clear. Maintain a balanced tone suitable for most legal correspondence.',
    
    firm:
      'Use confident, assertive language that clearly states the client’s position and expectations. Maintain professionalism while emphasizing accountability and consequences.',

    conciliatory:
      'Use cooperative, solution-focused language that encourages resolution. Emphasize shared interests, mutual respect, and opportunities to resolve the matter amicably.',

    assertive:
      'Use confident, direct language that emphasizes the strength of the case and the clarity of liability. Be firm about deadlines and consequences while remaining professional.',
    
    diplomatic:
      'Use softer, more conciliatory language that emphasizes mutual benefit of settlement. Focus on resolution rather than confrontation. Appropriate when ongoing relationship matters.',
    
    urgent:
      'Emphasize time-sensitivity and the pressing nature of the matter. Use stronger language about deadlines and immediate consequences. Appropriate for statute of limitations concerns.',
  };

  return guidelines[tone] || guidelines.professional;
}

/**
 * Provide feedback on draft letter
 */
export async function provideFeedback(draft: string): Promise<{
  feedback: string;
  suggestions: string[];
  strengths: string[];
  improvements: string[];
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}> {
  try {
    if (!draft) {
      throw new AppError('Draft letter is required for feedback', 400);
    }

    logger.info('Providing feedback on draft', {
      draftLength: draft.length,
    });

    const feedbackPrompt = `As an expert legal editor, analyze this demand letter draft and provide detailed feedback.

Draft:
${draft}

Please provide:
1. Overall assessment (2-3 sentences)
2. Strengths (bullet points)
3. Areas for improvement (bullet points)
4. Specific suggestions for enhancement (bullet points)

Format your response in clear sections.`;

    // Get system prompt
    const systemPrompt = await buildSystemPrompt();

    // Prepare messages
    const messages: ClaudeMessage[] = [
      {
        role: 'user',
        content: feedbackPrompt,
      },
    ];

    // Invoke model
    const response = await bedrockClient.invoke(messages, {
      system: systemPrompt,
      temperature: 0.4, // Lower temperature for more consistent feedback
    });

    // Parse response (simple parsing - could be enhanced)
    const feedback = response.text;
    const suggestions = extractBulletPoints(feedback, 'suggestions');
    const strengths = extractBulletPoints(feedback, 'strengths');
    const improvements = extractBulletPoints(feedback, 'improvement');

    logger.info('Feedback generated', {
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
    });

    return {
      feedback,
      suggestions,
      strengths,
      improvements,
      usage: response.usage,
    };
  } catch (error: any) {
    logger.error('Feedback generation failed', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Extract bullet points from text (helper)
 */
function extractBulletPoints(text: string, section: string): string[] {
  const lines = text.split('\n');
  const bullets: string[] = [];
  let inSection = false;

  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    // Check if we're entering the target section
    if (lowerLine.includes(section)) {
      inSection = true;
      continue;
    }
    
    // Check if we're leaving the section (next heading)
    if (inSection && lowerLine.match(/^#+\s/) && !lowerLine.includes(section)) {
      break;
    }
    
    // Extract bullet points
    if (inSection && (line.trim().startsWith('-') || line.trim().startsWith('*') || line.match(/^\d+\./))) {
      const bullet = line.trim().replace(/^[-*]\s*/, '').replace(/^\d+\.\s*/, '');
      if (bullet) {
        bullets.push(bullet);
      }
    }
  }

  return bullets;
}

