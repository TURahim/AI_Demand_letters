/**
 * Bedrock Pipeline Test
 * 
 * This script tests the Bedrock connection and AI generation pipeline.
 * Run with: npx ts-node src/tests/bedrock-test.ts
 */

import { bedrockClient } from '../services/ai/bedrock.client';
import { generateDemandLetter } from '../services/ai/generation.service';
import config from '../config';

// Color helpers for terminal output
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

async function testBedrockConnection() {
  log('\n=== Testing Bedrock Connection ===', colors.blue);
  
  try {
    // Check configuration
    log('\n1. Checking AWS Configuration:', colors.yellow);
    log(`   Region: ${config.aws.region}`);
    log(`   Access Key ID: ${config.aws.accessKeyId ? '✓ Set' : '✗ Not set'}`);
    log(`   Secret Access Key: ${config.aws.secretAccessKey ? '✓ Set' : '✗ Not set'}`);
    log(`   Model ID: ${config.bedrock.modelId}`);
    
    if (!config.aws.accessKeyId || !config.aws.secretAccessKey) {
      log('\n⚠️  AWS credentials not configured!', colors.yellow);
      log('   Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env', colors.yellow);
      return false;
    }
    
    // Test simple completion
    log('\n2. Testing Simple Completion:', colors.yellow);
    const startTime = Date.now();
    
    const response = await bedrockClient.complete(
      'Say "Hello, Steno AI!" and nothing else.',
      {
        temperature: 0.1,
        maxTokens: 50,
      }
    );
    
    const duration = Date.now() - startTime;
    
    log(`   Response: "${response.trim()}"`, colors.green);
    log(`   Duration: ${duration}ms`, colors.green);
    log(`   ✓ Bedrock connection successful!`, colors.green);
    
    return true;
  } catch (error: any) {
    log(`\n✗ Bedrock connection failed!`, colors.red);
    log(`   Error: ${error.message}`, colors.red);
    
    // Provide specific guidance based on error type
    if (error.message.includes('Access') || error.message.includes('denied')) {
      log('\n   Probable causes:', colors.yellow);
      log('   1. AWS credentials are incorrect', colors.yellow);
      log('   2. IAM user/role lacks Bedrock permissions', colors.yellow);
      log('   3. Bedrock is not enabled in this region', colors.yellow);
      log('\n   Solutions:', colors.yellow);
      log('   - Verify AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY', colors.yellow);
      log('   - Attach BedrockFullAccess policy to IAM user', colors.yellow);
      log('   - Enable Bedrock in AWS Console for us-east-1', colors.yellow);
    } else if (error.message.includes('timeout')) {
      log('\n   Probable cause: Network timeout or service unavailable', colors.yellow);
      log('   Solution: Check internet connection and retry', colors.yellow);
    } else if (error.message.includes('Throttling')) {
      log('\n   Probable cause: Rate limit exceeded', colors.yellow);
      log('   Solution: Wait a moment and retry', colors.yellow);
    }
    
    return false;
  }
}

async function testLetterGeneration() {
  log('\n=== Testing Letter Generation Pipeline ===', colors.blue);
  
  try {
    log('\n3. Testing Full Generation Pipeline:', colors.yellow);
    
    const testInput = {
      caseType: 'Personal Injury',
      incidentDate: '2024-01-15',
      incidentDescription: 'Client was rear-ended at a traffic light, sustaining whiplash and back injuries.',
      location: 'Intersection of Main St and Oak Ave, Springfield',
      clientName: 'John Doe',
      clientContact: 'john.doe@email.com',
      defendantName: 'Jane Smith',
      defendantAddress: '123 Insurance Way, Springfield, ST 12345',
      damages: {
        medical: 5000,
        lostWages: 2000,
        painAndSuffering: 10000,
      },
      firmId: 'test-firm',
      tone: 'professional',
      temperature: 0.7,
      maxTokens: 2000,
    };
    
    log('   Input:', colors.yellow);
    log(`   - Case Type: ${testInput.caseType}`);
    log(`   - Client: ${testInput.clientName}`);
    log(`   - Defendant: ${testInput.defendantName}`);
    log(`   - Total Damages: $${(testInput.damages.medical + testInput.damages.lostWages + testInput.damages.painAndSuffering).toLocaleString()}`);
    
    const startTime = Date.now();
    const result = await generateDemandLetter(testInput);
    const duration = Date.now() - startTime;
    
    log(`\n   ✓ Letter generated successfully!`, colors.green);
    log(`   Duration: ${duration}ms`, colors.green);
    log(`   Letter length: ${result.letter.length} characters`, colors.green);
    log(`   Input tokens: ${result.usage.inputTokens}`, colors.green);
    log(`   Output tokens: ${result.usage.outputTokens}`, colors.green);
    log(`   Total tokens: ${result.usage.totalTokens}`, colors.green);
    log(`   Model: ${result.metadata.modelId}`, colors.green);
    
    // Show first 200 characters of letter
    log('\n   Letter preview:', colors.yellow);
    log(`   "${result.letter.substring(0, 200)}..."`, colors.reset);
    
    return true;
  } catch (error: any) {
    log(`\n✗ Letter generation failed!`, colors.red);
    log(`   Error: ${error.message}`, colors.red);
    
    if (error.message.includes('Missing required fields')) {
      log('\n   Probable cause: Validation error - required fields missing', colors.yellow);
      log(`   Details: ${error.message}`, colors.yellow);
    } else if (error.message.includes('context too large')) {
      log('\n   Probable cause: Input context exceeds token limit', colors.yellow);
      log('   Solution: Reduce document count or summary length', colors.yellow);
    }
    
    return false;
  }
}

async function main() {
  log('\n╔════════════════════════════════════════════╗', colors.blue);
  log('║   Steno AI - Bedrock Pipeline Test        ║', colors.blue);
  log('╚════════════════════════════════════════════╝', colors.blue);
  
  // Test 1: Connection
  const connectionSuccess = await testBedrockConnection();
  
  if (!connectionSuccess) {
    log('\n❌ Bedrock connection test failed. Cannot proceed with generation test.', colors.red);
    process.exit(1);
  }
  
  // Test 2: Generation
  const generationSuccess = await testLetterGeneration();
  
  // Summary
  log('\n=== Test Summary ===', colors.blue);
  log(`Connection Test: ${connectionSuccess ? '✓ PASS' : '✗ FAIL'}`, connectionSuccess ? colors.green : colors.red);
  log(`Generation Test: ${generationSuccess ? '✓ PASS' : '✗ FAIL'}`, generationSuccess ? colors.green : colors.red);
  
  if (connectionSuccess && generationSuccess) {
    log('\n✅ All tests passed! Bedrock pipeline is working correctly.', colors.green);
    process.exit(0);
  } else {
    log('\n❌ Some tests failed. Please check the errors above.', colors.red);
    process.exit(1);
  }
}

// Run tests
main().catch((error) => {
  log(`\n✗ Fatal error: ${error.message}`, colors.red);
  console.error(error);
  process.exit(1);
});

