import fs from 'fs/promises';
import path from 'path';
import logger from '../../utils/logger';

/**
 * Prompt templates cache
 */
const promptCache = new Map<string, string>();

/**
 * Load prompt template from file
 */
async function loadPromptTemplate(filename: string): Promise<string> {
  // Check cache first
  if (promptCache.has(filename)) {
    return promptCache.get(filename)!;
  }

  try {
    const promptPath = path.join(__dirname, 'prompts', filename);
    const content = await fs.readFile(promptPath, 'utf-8');
    
    // Cache for future use
    promptCache.set(filename, content);
    
    return content;
  } catch (error) {
    logger.error(`Failed to load prompt template: ${filename}`, { error });
    throw new Error(`Prompt template not found: ${filename}`);
  }
}

/**
 * Replace placeholders in template
 */
function replacePlaceholders(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;
  
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    const safeValue = value || '[Not provided]';
    result = result.replace(new RegExp(placeholder, 'g'), safeValue);
  }
  
  // Remove any remaining placeholders that weren't filled
  result = result.replace(/\{\{[^}]+\}\}/g, '[Not provided]');
  
  return result;
}

/**
 * Build system instructions prompt
 */
export async function buildSystemPrompt(): Promise<string> {
  return await loadPromptTemplate('system-instructions.txt');
}

/**
 * Build base demand letter generation prompt
 */
export async function buildDemandLetterPrompt(variables: {
  caseInfo: string;
  clientName: string;
  clientContact: string;
  defendantName: string;
  defendantAddress: string;
  templateInstructions: string;
  documentsSummary: string;
  damagesBreakdown: string;
  specialInstructions?: string;
}): Promise<string> {
  const template = await loadPromptTemplate('base-demand-letter.txt');
  
  return replacePlaceholders(template, {
    caseInfo: variables.caseInfo,
    clientName: variables.clientName,
    clientContact: variables.clientContact || 'To be provided',
    defendantName: variables.defendantName,
    defendantAddress: variables.defendantAddress,
    templateInstructions: variables.templateInstructions || 'Use standard demand letter format',
    documentsSummary: variables.documentsSummary,
    damagesBreakdown: variables.damagesBreakdown,
    specialInstructions: variables.specialInstructions || 'None',
  });
}

/**
 * Build refinement prompt
 */
export async function buildRefinementPrompt(variables: {
  originalDraft: string;
  refinementInstructions: string;
  specificChanges?: string;
  additionalContext?: string;
}): Promise<string> {
  const template = await loadPromptTemplate('refinement.txt');
  
  return replacePlaceholders(template, {
    originalDraft: variables.originalDraft,
    refinementInstructions: variables.refinementInstructions,
    specificChanges: variables.specificChanges || 'None specified',
    additionalContext: variables.additionalContext || 'None',
  });
}

/**
 * Build tone adjustment prompt
 */
export async function buildToneAdjustmentPrompt(variables: {
  currentDraft: string;
  requestedTone: string;
  toneGuidelines?: string;
}): Promise<string> {
  const template = await loadPromptTemplate('tone-adjustment.txt');
  
  return replacePlaceholders(template, {
    currentDraft: variables.currentDraft,
    requestedTone: variables.requestedTone,
    toneGuidelines: variables.toneGuidelines || 'Follow standard guidelines for the requested tone',
  });
}

/**
 * Build document analysis prompt
 */
export async function buildDocumentAnalysisPrompt(variables: {
  documentContent: string;
  analysisType: 'summary' | 'damages' | 'timeline' | 'liability';
}): Promise<string> {
  const prompts = {
    summary: `Analyze the following legal document and provide a concise summary of the key points, facts, and relevant information for a demand letter:

${variables.documentContent}

Provide a structured summary including:
1. Document type and date
2. Key parties involved
3. Important facts and events
4. Relevant damages or injuries
5. Timeline of events
6. Any supporting evidence or documentation mentioned`,

    damages: `Analyze the following document and extract all damages, losses, costs, and financial impacts mentioned:

${variables.documentContent}

Provide a detailed breakdown including:
1. Medical expenses (itemized)
2. Lost wages/income
3. Property damage
4. Pain and suffering indicators
5. Out-of-pocket expenses
6. Future anticipated costs
7. Any other quantifiable damages`,

    timeline: `Extract and organize all dates, events, and timeline information from the following document:

${variables.documentContent}

Create a chronological timeline including:
1. Date/time of each event
2. Description of what occurred
3. Parties involved
4. Location (if mentioned)
5. Any deadlines or statute of limitations mentioned`,

    liability: `Analyze the following document for information establishing or supporting liability:

${variables.documentContent}

Identify:
1. Actions or omissions by the defendant
2. Duty of care owed
3. Breach of duty
4. Causation between breach and damages
5. Evidence of negligence or fault
6. Any admission of liability
7. Witness statements or supporting evidence`,
  };

  return prompts[variables.analysisType];
}

/**
 * Clear prompt cache (useful for testing or hot-reload)
 */
export function clearPromptCache(): void {
  promptCache.clear();
  logger.info('Prompt cache cleared');
}

/**
 * Validate prompt variables
 */
export function validatePromptVariables(
  variables: Record<string, any>,
  required: string[]
): { valid: boolean; missing: string[] } {
  const missing = required.filter(key => !variables[key] || variables[key].trim() === '');
  
  return {
    valid: missing.length === 0,
    missing,
  };
}

