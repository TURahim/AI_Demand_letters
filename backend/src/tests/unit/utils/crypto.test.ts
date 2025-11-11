/**
 * Unit tests for crypto utilities
 */

import { hashData, generateSecureToken, signData, verifySignature } from '../../../services/security/encryption.service';

describe('Crypto Utilities', () => {
  describe('hashData', () => {
    it('should hash data using SHA-256', () => {
      const data = 'test-data';
      const hash = hashData(data);
      
      expect(hash).toBeDefined();
      expect(hash).toHaveLength(64); // SHA-256 produces 64 hex characters
      expect(typeof hash).toBe('string');
    });

    it('should produce consistent hashes', () => {
      const data = 'test-data';
      const hash1 = hashData(data);
      const hash2 = hashData(data);
      
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different data', () => {
      const hash1 = hashData('data1');
      const hash2 = hashData('data2');
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('generateSecureToken', () => {
    it('should generate a random token', () => {
      const token = generateSecureToken();
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should generate tokens of specified length', () => {
      const length = 16;
      const token = generateSecureToken(length);
      
      // Hex encoding: 1 byte = 2 hex characters
      expect(token).toHaveLength(length * 2);
    });

    it('should generate unique tokens', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      
      expect(token1).not.toBe(token2);
    });
  });

  describe('signData and verifySignature', () => {
    const secret = 'test-secret';

    it('should sign data correctly', () => {
      const data = 'test-data';
      const signature = signData(data, secret);
      
      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      expect(signature).toHaveLength(64); // HMAC-SHA256 produces 64 hex characters
    });

    it('should verify valid signatures', () => {
      const data = 'test-data';
      const signature = signData(data, secret);
      
      const isValid = verifySignature(data, signature, secret);
      expect(isValid).toBe(true);
    });

    it('should reject invalid signatures', () => {
      const data = 'test-data';
      const invalidSignature = 'invalid-signature-' + '0'.repeat(48);
      
      expect(() => {
        verifySignature(data, invalidSignature, secret);
      }).toThrow();
    });

    it('should reject signatures with wrong secret', () => {
      const data = 'test-data';
      const signature = signData(data, secret);
      
      const isValid = verifySignature(data, signature, 'wrong-secret');
      expect(isValid).toBe(false);
    });

    it('should reject signatures for modified data', () => {
      const data = 'test-data';
      const signature = signData(data, secret);
      
      const isValid = verifySignature('modified-data', signature, secret);
      expect(isValid).toBe(false);
    });
  });
});

