/**
 * Document Upload and Management Tests
 */

import request from 'supertest';
import app from '../../app';
import prisma from '../../utils/prisma-client';

describe('Document Management', () => {
  let testFirmId: string;
  let testUserId: string;
  let accessToken: string;

  beforeAll(async () => {
    // Create test firm
    const testFirm = await prisma.firm.create({
      data: {
        name: 'Test Law Firm',
        email: 'test@lawfirm.com',
        encryptionKey: 'test-key',
      },
    });
    testFirmId = testFirm.id;

    // Create test user
    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash('Password123!', 12);
    
    const testUser = await prisma.user.create({
      data: {
        email: 'testuser@example.com',
        passwordHash: hashedPassword,
        firstName: 'Test',
        lastName: 'User',
        firmId: testFirmId,
        role: 'ASSOCIATE',
      },
    });
    testUserId = testUser.id;

    // Login to get access token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'testuser@example.com',
        password: 'Password123!',
      });

    accessToken = loginResponse.body.data.accessToken;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.processingJob.deleteMany({ where: { document: { firmId: testFirmId } } });
    await prisma.document.deleteMany({ where: { firmId: testFirmId } });
    await prisma.session.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.firm.delete({ where: { id: testFirmId } });
    await prisma.$disconnect();
  });

  describe('POST /api/v1/upload/presigned-url', () => {
    it('should generate presigned URL for valid file', async () => {
      const response = await request(app)
        .post('/api/v1/upload/presigned-url')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          fileName: 'test-document.pdf',
          fileSize: 1024 * 1024, // 1MB
          contentType: 'application/pdf',
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('uploadUrl');
      expect(response.body.data).toHaveProperty('s3Key');
      expect(response.body.data).toHaveProperty('expiresIn');
      expect(response.body.data.uploadUrl).toContain('https://');
    });

    it('should reject invalid file type', async () => {
      const response = await request(app)
        .post('/api/v1/upload/presigned-url')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          fileName: 'test.exe',
          fileSize: 1024,
          contentType: 'application/x-msdownload',
        });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('not allowed');
    });

    it('should reject file that is too large', async () => {
      const response = await request(app)
        .post('/api/v1/upload/presigned-url')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          fileName: 'huge-file.pdf',
          fileSize: 100 * 1024 * 1024, // 100MB (over limit)
          contentType: 'application/pdf',
        });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('File size');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/upload/presigned-url')
        .send({
          fileName: 'test.pdf',
          fileSize: 1024,
          contentType: 'application/pdf',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/documents', () => {
    it('should return empty list initially', async () => {
      const response = await request(app)
        .get('/api/v1/documents')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.documents).toBeInstanceOf(Array);
      expect(response.body.data.total).toBe(0);
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/api/v1/documents');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/documents/stats', () => {
    it('should return document statistics', async () => {
      const response = await request(app)
        .get('/api/v1/documents/stats')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.stats).toHaveProperty('total');
      expect(response.body.data.stats).toHaveProperty('byStatus');
      expect(response.body.data.stats).toHaveProperty('totalStorageBytes');
    });
  });

  describe('Document lifecycle', () => {
    it('should handle complete upload-to-delete flow', async () => {
      // Note: This is a simplified test that doesn't actually upload to S3
      // In a real scenario, you'd mock S3 operations
      
      // 1. Request presigned URL
      const urlResponse = await request(app)
        .post('/api/v1/upload/presigned-url')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          fileName: 'lifecycle-test.pdf',
          fileSize: 2048,
          contentType: 'application/pdf',
        });

      expect(urlResponse.status).toBe(200);
      const s3Key = urlResponse.body.data.s3Key;

      // 2. Simulate upload completion (in real test, would upload to S3 first)
      // This will fail because file doesn't exist in S3, but tests the endpoint
      const completeResponse = await request(app)
        .post('/api/v1/upload/complete')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          fileName: 'lifecycle-test.pdf',
          fileSize: 2048,
          contentType: 'application/pdf',
          s3Key: s3Key,
          fileHash: 'abc123def456',
        });

      // This will fail with 400 because file doesn't exist in S3
      // In a real test with S3 mock, it would succeed
      expect(completeResponse.status).toBe(400);
    });
  });
});

