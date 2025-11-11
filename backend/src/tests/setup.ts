/**
 * Jest test setup file
 * Runs before all tests
 */

import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.test') });

// Set test environment
process.env.NODE_ENV = 'test';

// Mock AWS SDK if not testing integration
if (!process.env.TEST_INTEGRATION) {
  jest.mock('@aws-sdk/client-s3');
  jest.mock('@aws-sdk/client-bedrock-runtime');
  jest.mock('@aws-sdk/client-secrets-manager');
  jest.mock('@aws-sdk/client-kms');
}

// Increase timeout for integration tests
if (process.env.TEST_INTEGRATION) {
  jest.setTimeout(30000);
}

// Global test setup
beforeAll(async () => {
  // Setup global test fixtures
});

// Global test teardown
afterAll(async () => {
  // Cleanup global test fixtures
});

