import prisma from '../../utils/prisma-client';
import { estimateTokens } from './token-counter';
import { getModelLimits } from './bedrock.config';
import logger from '../../utils/logger';

/**
 * Build context from documents
 */
export async function buildContextFromDocuments(
  documentIds: string[],
  firmId: string,
  maxTokens?: number
): Promise<string> {
  if (!documentIds || documentIds.length === 0) {
    return '';
  }

  const limit = maxTokens || getModelLimits().maxInputTokens * 0.3; // Use 30% of input limit for context

  // Fetch documents
  const documents = await prisma.document.findMany({
    where: {
      id: { in: documentIds },
      firmId,
    },
    select: {
      id: true,
      fileName: true,
      mimeType: true,
      extractedText: true,
      metadata: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (documents.length === 0) {
    logger.warn('No documents found for context building', { documentIds, firmId });
    return '';
  }

  let context = '## Supporting Documents\n\n';
  let currentTokens = estimateTokens(context);

  for (const doc of documents) {
    const docHeader = `### ${doc.fileName} (${doc.mimeType.toUpperCase()})\n`;
    const docContent = doc.extractedText || '[Text extraction pending or failed]';
    const docSection = `${docHeader}${docContent}\n\n---\n\n`;

    const docTokens = estimateTokens(docSection);

    // Check if adding this document would exceed limit
    if (currentTokens + docTokens > limit) {
      // Try to add truncated version
      const remainingTokens = limit - currentTokens - estimateTokens(docHeader);
      if (remainingTokens > 100) {
        const charLimit = Math.floor(remainingTokens * 4);
        const truncated = docContent.substring(0, charLimit) + '\n[...truncated for length]\n';
        context += `${docHeader}${truncated}\n\n---\n\n`;
      }
      break;
    }

    context += docSection;
    currentTokens += docTokens;
  }

  logger.debug('Context built from documents', {
    documentCount: documents.length,
    estimatedTokens: currentTokens,
    limit,
  });

  return context;
}

/**
 * Build case summary from case data
 */
export function buildCaseSummary(caseData: {
  caseType: string;
  incidentDate: string | Date;
  incidentDescription: string;
  location?: string;
  witnesses?: string[];
  policeReportNumber?: string;
  additionalInfo?: Record<string, any>;
}): string {
  const date = typeof caseData.incidentDate === 'string'
    ? caseData.incidentDate
    : caseData.incidentDate.toLocaleDateString();

  let summary = `## Case Type: ${caseData.caseType}\n\n`;
  summary += `**Incident Date:** ${date}\n\n`;
  
  if (caseData.location) {
    summary += `**Location:** ${caseData.location}\n\n`;
  }

  summary += `**Incident Description:**\n${caseData.incidentDescription}\n\n`;

  if (caseData.policeReportNumber) {
    summary += `**Police Report:** ${caseData.policeReportNumber}\n\n`;
  }

  if (caseData.witnesses && caseData.witnesses.length > 0) {
    summary += `**Witnesses:**\n${caseData.witnesses.map(w => `- ${w}`).join('\n')}\n\n`;
  }

  if (caseData.additionalInfo) {
    summary += `**Additional Information:**\n`;
    for (const [key, value] of Object.entries(caseData.additionalInfo)) {
      summary += `- **${key}:** ${value}\n`;
    }
    summary += '\n';
  }

  return summary;
}

/**
 * Build damages breakdown
 */
export function buildDamagesBreakdown(damages: {
  medical?: number;
  lostWages?: number;
  propertyDamage?: number;
  painAndSuffering?: number;
  other?: Record<string, number>;
  itemizedMedical?: Array<{ description: string; amount: number }>;
  notes?: string;
}): string {
  let breakdown = `## Damages Breakdown\n\n`;

  let total = 0;

  if (damages.itemizedMedical && damages.itemizedMedical.length > 0) {
    breakdown += `### Medical Expenses\n`;
    for (const item of damages.itemizedMedical) {
      breakdown += `- ${item.description}: $${item.amount.toFixed(2)}\n`;
      total += item.amount;
    }
    breakdown += `**Total Medical:** $${damages.itemizedMedical.reduce((sum, i) => sum + i.amount, 0).toFixed(2)}\n\n`;
  } else if (damages.medical) {
    breakdown += `### Medical Expenses: $${damages.medical.toFixed(2)}\n\n`;
    total += damages.medical;
  }

  if (damages.lostWages) {
    breakdown += `### Lost Wages: $${damages.lostWages.toFixed(2)}\n\n`;
    total += damages.lostWages;
  }

  if (damages.propertyDamage) {
    breakdown += `### Property Damage: $${damages.propertyDamage.toFixed(2)}\n\n`;
    total += damages.propertyDamage;
  }

  if (damages.painAndSuffering) {
    breakdown += `### Pain and Suffering: $${damages.painAndSuffering.toFixed(2)}\n\n`;
    total += damages.painAndSuffering;
  }

  if (damages.other) {
    breakdown += `### Other Damages\n`;
    for (const [description, amount] of Object.entries(damages.other)) {
      breakdown += `- ${description}: $${amount.toFixed(2)}\n`;
      total += amount;
    }
    breakdown += '\n';
  }

  breakdown += `---\n**TOTAL DAMAGES: $${total.toFixed(2)}**\n\n`;

  if (damages.notes) {
    breakdown += `**Notes:** ${damages.notes}\n\n`;
  }

  return breakdown;
}

/**
 * Build client/defendant info string
 */
export function buildPartyInfo(party: {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  email?: string;
  phone?: string;
}): string {
  let info = party.name;

  if (party.address || party.city) {
    info += '\n';
    if (party.address) info += `${party.address}\n`;
    if (party.city || party.state || party.zip) {
      info += `${party.city || ''}${party.state ? ', ' + party.state : ''} ${party.zip || ''}`.trim() + '\n';
    }
  }

  if (party.email) {
    info += `Email: ${party.email}\n`;
  }

  if (party.phone) {
    info += `Phone: ${party.phone}\n`;
  }

  return info;
}

/**
 * Validate context size
 */
export function validateContextSize(
  context: string,
  maxTokens: number
): { valid: boolean; currentTokens: number; maxTokens: number } {
  const currentTokens = estimateTokens(context);

  return {
    valid: currentTokens <= maxTokens,
    currentTokens,
    maxTokens,
  };
}

