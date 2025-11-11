/**
 * Letter Content Diagnostic Script
 * 
 * Checks the database to see what's actually stored in letter records
 * Run with: npx ts-node src/tests/check-letter-content.ts
 */

import prisma from '../utils/prisma-client';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  reset: '\x1b[0m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function checkLetterContent() {
  log('\n=== Letter Content Diagnostic ===', colors.blue);
  
  try {
    // Get all letters
    const letters = await prisma.letter.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
      include: {
        creator: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (letters.length === 0) {
      log('\n⚠️  No letters found in database', colors.yellow);
      return;
    }

    log(`\nFound ${letters.length} letter(s):\n`, colors.green);

    for (const letter of letters) {
      log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, colors.blue);
      log(`Letter ID: ${letter.id}`, colors.yellow);
      log(`Title: ${letter.title}`);
      log(`Status: ${letter.status}`);
      log(`Created: ${letter.createdAt.toISOString()}`);
      log(`Created By: ${letter.creator.firstName} ${letter.creator.lastName}`);
      
      // Check content structure
      log(`\nContent Type: ${typeof letter.content}`, colors.yellow);
      
      if (letter.content === null) {
        log(`Content: NULL`, colors.red);
      } else if (typeof letter.content === 'string') {
        log(`Content (string): "${letter.content.substring(0, 100)}..."`, colors.green);
        log(`Content Length: ${letter.content.length} characters`);
      } else if (typeof letter.content === 'object') {
        log(`Content (JSON):`, colors.green);
        const contentObj = letter.content as any;
        
        if (contentObj.body !== undefined) {
          log(`  - body: ${typeof contentObj.body}`);
          if (typeof contentObj.body === 'string') {
            log(`  - body length: ${contentObj.body.length} characters`);
            if (contentObj.body.length > 0) {
              log(`  - body preview: "${contentObj.body.substring(0, 150)}..."`, colors.green);
            } else {
              log(`  - body is EMPTY STRING`, colors.red);
            }
          }
        } else {
          log(`  - No 'body' field found`, colors.red);
        }
        
        log(`  - Full content keys: ${Object.keys(contentObj).join(', ')}`);
      }
      
      // Check metadata for generation info
      if (letter.metadata) {
        log(`\nMetadata:`, colors.yellow);
        const metadata = letter.metadata as any;
        
        if (metadata.generationStatus) {
          log(`  - Generation Status: ${metadata.generationStatus}`, 
            metadata.generationStatus === 'completed' ? colors.green : colors.red);
        }
        
        if (metadata.generationError) {
          log(`  - Generation Error:`, colors.red);
          log(`    Title: ${metadata.generationError.title}`);
          log(`    Reason: ${metadata.generationError.reason}`);
          log(`    Probable Cause: ${metadata.generationError.probableCause}`);
        }
        
        if (metadata.usage) {
          log(`  - AI Usage:`, colors.green);
          log(`    Input Tokens: ${metadata.usage.inputTokens}`);
          log(`    Output Tokens: ${metadata.usage.outputTokens}`);
          log(`    Total Tokens: ${metadata.usage.totalTokens}`);
        }
        
        if (metadata.modelId) {
          log(`  - Model: ${metadata.modelId}`);
        }
      }
      
      // Check aiResponse field
      if (letter.aiResponse) {
        log(`\nAI Response Length: ${letter.aiResponse.length} characters`, colors.green);
        log(`AI Response Preview: "${letter.aiResponse.substring(0, 150)}..."`);
      }
    }
    
    log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`, colors.blue);
    
    // Summary
    const emptyContent = letters.filter(l => {
      const content = l.content as any;
      return !content || 
             (typeof content === 'object' && (!content.body || content.body === ''));
    });
    
    if (emptyContent.length > 0) {
      log(`⚠️  ${emptyContent.length} letter(s) have empty content!`, colors.red);
      log(`\nPossible causes:`, colors.yellow);
      log(`  1. AI generation failed but error wasn't properly logged`);
      log(`  2. Bedrock credentials not configured`);
      log(`  3. Model ID incorrect (should be inference profile ID)`);
      log(`  4. Generation worker not saving AI output correctly`);
      log(`\nNext steps:`, colors.yellow);
      log(`  1. Check backend logs when generation runs`);
      log(`  2. Run: npx ts-node src/tests/bedrock-test.ts`);
      log(`  3. Check Redis/Bull queue is running`);
    } else {
      log(`✅ All letters have content!`, colors.green);
    }
    
  } catch (error: any) {
    log(`\n✗ Error checking letters: ${error.message}`, colors.red);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLetterContent();

