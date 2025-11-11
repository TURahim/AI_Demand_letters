import { getModelPricing, BEDROCK_CONFIG } from './bedrock.config';
import { estimateTokens } from './token-counter';

/**
 * Calculate estimated cost for a generation request
 */
export function estimateGenerationCost(input: {
  promptText: string;
  expectedOutputTokens?: number;
  modelId?: string;
}): {
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCost: number;
  costBreakdown: {
    inputCost: number;
    outputCost: number;
  };
} {
  const inputTokens = estimateTokens(input.promptText);
  const outputTokens = input.expectedOutputTokens || BEDROCK_CONFIG.maxTokens;
  
  const pricing = getModelPricing();
  const inputCost = (inputTokens / 1000000) * pricing.input;
  const outputCost = (outputTokens / 1000000) * pricing.output;
  
  return {
    estimatedInputTokens: inputTokens,
    estimatedOutputTokens: outputTokens,
    estimatedCost: inputCost + outputCost,
    costBreakdown: {
      inputCost,
      outputCost,
    },
  };
}

/**
 * Calculate actual cost from usage
 */
export function calculateActualCost(
  inputTokens: number,
  outputTokens: number,
  _modelId?: string
): {
  totalCost: number;
  costBreakdown: {
    inputCost: number;
    outputCost: number;
  };
  tokens: {
    input: number;
    output: number;
    total: number;
  };
} {
  const pricing = getModelPricing();
  const inputCost = (inputTokens / 1000000) * pricing.input;
  const outputCost = (outputTokens / 1000000) * pricing.output;
  
  return {
    totalCost: inputCost + outputCost,
    costBreakdown: {
      inputCost,
      outputCost,
    },
    tokens: {
      input: inputTokens,
      output: outputTokens,
      total: inputTokens + outputTokens,
    },
  };
}

/**
 * Estimate monthly cost based on expected usage
 */
export function estimateMonthlyCost(params: {
  expectedLettersPerMonth: number;
  expectedRefinementsPerLetter?: number;
  avgInputTokensPerLetter?: number;
  avgOutputTokensPerLetter?: number;
}): {
  totalMonthlyCost: number;
  breakdown: {
    letterGeneration: number;
    refinements: number;
  };
  perLetterCost: number;
  details: {
    totalLetters: number;
    totalRefinements: number;
    totalInputTokens: number;
    totalOutputTokens: number;
  };
} {
  const avgInputTokens = params.avgInputTokensPerLetter || 3000; // Typical case with documents
  const avgOutputTokens = params.avgOutputTokensPerLetter || 2000; // Typical demand letter
  const refinementsPerLetter = params.expectedRefinementsPerLetter || 1;
  
  // Calculate letter generation cost
  const letterGenerationCost = calculateActualCost(
    avgInputTokens * params.expectedLettersPerMonth,
    avgOutputTokens * params.expectedLettersPerMonth
  );
  
  // Calculate refinement cost (refinements use existing letter as input + instructions)
  const refinementInputTokens = (avgOutputTokens + 500) * params.expectedLettersPerMonth * refinementsPerLetter;
  const refinementOutputTokens = avgOutputTokens * params.expectedLettersPerMonth * refinementsPerLetter;
  
  const refinementCost = calculateActualCost(
    refinementInputTokens,
    refinementOutputTokens
  );
  
  const totalMonthlyCost = letterGenerationCost.totalCost + refinementCost.totalCost;
  const perLetterCost = totalMonthlyCost / params.expectedLettersPerMonth;
  
  return {
    totalMonthlyCost,
    breakdown: {
      letterGeneration: letterGenerationCost.totalCost,
      refinements: refinementCost.totalCost,
    },
    perLetterCost,
    details: {
      totalLetters: params.expectedLettersPerMonth,
      totalRefinements: params.expectedLettersPerMonth * refinementsPerLetter,
      totalInputTokens: letterGenerationCost.tokens.input + refinementCost.tokens.input,
      totalOutputTokens: letterGenerationCost.tokens.output + refinementCost.tokens.output,
    },
  };
}

/**
 * Compare costs across different models
 */
export function compareModelCosts(
  inputTokens: number,
  outputTokens: number
): Array<{
  modelId: string;
  cost: number;
  savings?: number;
  savingsPercent?: number;
}> {
  const models = [
    'anthropic.claude-3-5-sonnet-20241022-v2:0',
    'anthropic.claude-3-5-sonnet-20240620-v1:0',
    'anthropic.claude-3-sonnet-20240229-v1:0',
    'anthropic.claude-3-haiku-20240307-v1:0',
  ];
  
  const costs = models.map(modelId => {
    const result = calculateActualCost(inputTokens, outputTokens, modelId);
    return {
      modelId,
      cost: result.totalCost,
    };
  });
  
  // Calculate savings relative to most expensive
  const maxCost = Math.max(...costs.map(c => c.cost));
  
  return costs.map(c => ({
    ...c,
    savings: maxCost - c.cost,
    savingsPercent: ((maxCost - c.cost) / maxCost) * 100,
  }));
}

/**
 * Calculate ROI for AI-assisted letter generation
 */
export function calculateROI(params: {
  lettersPerMonth: number;
  avgTimePerLetterManual: number; // in hours
  avgTimePerLetterWithAI: number; // in hours
  attorneyHourlyRate: number;
  monthlyAICost?: number;
}): {
  monthlySavings: number;
  timeSavedHours: number;
  roi: number;
  roiPercent: number;
  breakEvenLetters: number;
  details: {
    manualCost: number;
    aiAssistedCost: number;
    aiToolCost: number;
  };
} {
  const manualTimeCost = params.lettersPerMonth * params.avgTimePerLetterManual * params.attorneyHourlyRate;
  const aiAssistedTimeCost = params.lettersPerMonth * params.avgTimePerLetterWithAI * params.attorneyHourlyRate;
  const aiToolCost = params.monthlyAICost || estimateMonthlyCost({
    expectedLettersPerMonth: params.lettersPerMonth,
  }).totalMonthlyCost;
  
  const totalAICost = aiAssistedTimeCost + aiToolCost;
  const monthlySavings = manualTimeCost - totalAICost;
  const timeSavedHours = params.lettersPerMonth * (params.avgTimePerLetterManual - params.avgTimePerLetterWithAI);
  const roi = monthlySavings / aiToolCost;
  
  // Calculate break-even point
  const savingsPerLetter = (params.avgTimePerLetterManual - params.avgTimePerLetterWithAI) * params.attorneyHourlyRate;
  const breakEvenLetters = Math.ceil(aiToolCost / savingsPerLetter);
  
  return {
    monthlySavings,
    timeSavedHours,
    roi,
    roiPercent: roi * 100,
    breakEvenLetters,
    details: {
      manualCost: manualTimeCost,
      aiAssistedCost: totalAICost,
      aiToolCost,
    },
  };
}

