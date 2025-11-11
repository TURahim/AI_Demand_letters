import request from 'supertest';
import app from '../../app';
import prisma from '../../utils/prisma-client';
import * as authService from '../../services/auth/auth.service';
import { UserRole } from '@prisma/client';

describe('Letter-Document Many-to-Many Relationship', () => {
  let authToken: string;
  let firmId: string;
  let userId: string;
  let doc1Id: string;
  let doc2Id: string;
  let doc3Id: string;
  let letterId: string;

  beforeAll(async () => {
    // Create test firm
    const firm = await prisma.firm.create({
      data: {
        name: 'Test Law Firm',
        encryptionKey: 'test-key-encrypted',
      },
    });
    firmId = firm.id;

    // Create test user
    const hashedPassword = await authService.hashPassword('TestPassword123!');
    const user = await prisma.user.create({
      data: {
        email: 'letter-doc-test@example.com',
        passwordHash: hashedPassword,
        firstName: 'Letter',
        lastName: 'DocTester',
        role: 'PARTNER' as UserRole,
        firmId,
      },
    });
    userId = user.id;

    // Generate auth token
    authToken = authService.generateAccessToken({
      userId: user.id,
      email: user.email,
      firmId: user.firmId,
      role: user.role,
    });

    // Create test documents
    const doc1 = await prisma.document.create({
      data: {
        firmId,
        uploadedBy: userId,
        fileName: 'police-report.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        s3Key: 'test/police-report.pdf',
        s3Bucket: 'test-bucket',
        fileHash: 'hash1',
        status: 'COMPLETED',
        extractedText: 'This is a police report about the incident.',
      },
    });
    doc1Id = doc1.id;

    const doc2 = await prisma.document.create({
      data: {
        firmId,
        uploadedBy: userId,
        fileName: 'medical-records.pdf',
        fileSize: 2048,
        mimeType: 'application/pdf',
        s3Key: 'test/medical-records.pdf',
        s3Bucket: 'test-bucket',
        fileHash: 'hash2',
        status: 'COMPLETED',
        extractedText: 'Medical records showing injuries.',
      },
    });
    doc2Id = doc2.id;

    const doc3 = await prisma.document.create({
      data: {
        firmId,
        uploadedBy: userId,
        fileName: 'photos.pdf',
        fileSize: 3072,
        mimeType: 'application/pdf',
        s3Key: 'test/photos.pdf',
        s3Bucket: 'test-bucket',
        fileHash: 'hash3',
        status: 'COMPLETED',
        extractedText: 'Photographic evidence of damages.',
      },
    });
    doc3Id = doc3.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.letterDocument.deleteMany({ where: { letterId } });
    await prisma.letter.deleteMany({ where: { firmId } });
    await prisma.document.deleteMany({ where: { firmId } });
    await prisma.user.deleteMany({ where: { firmId } });
    await prisma.firm.delete({ where: { id: firmId } });
    await prisma.$disconnect();
  });

  describe('Many-to-Many Document Linking', () => {
    it('should create a letter and link multiple documents', async () => {
      // Create letter via generation service (which calls linkDocumentsToLetter)
      const response = await request(app)
        .post('/api/v1/generation/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          caseType: 'Personal Injury',
          incidentDate: '2024-01-15',
          incidentDescription: 'Car accident on Main St',
          clientName: 'John Doe',
          clientAddress: '123 Main St',
          defendantName: 'Jane Smith',
          defendantAddress: '456 Oak Ave',
          damages: {
            medical: 5000,
            lostWages: 2000,
            painAndSuffering: 10000,
          },
          documentIds: [doc1Id, doc2Id, doc3Id], // Link all 3 documents
        });

      expect(response.status).toBe(202);
      expect(response.body.data).toHaveProperty('letterId');
      letterId = response.body.data.letterId;

      // Wait for background job to process (in test mode, jobs run synchronously)
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verify letter was created
      const letter = await prisma.letter.findUnique({
        where: { id: letterId },
        include: {
          sourceDocuments: {
            include: {
              document: true,
            },
            orderBy: {
              order: 'asc',
            },
          },
        },
      });

      expect(letter).not.toBeNull();
      expect(letter!.sourceDocuments).toHaveLength(3);
      expect(letter!.sourceDocuments[0].documentId).toBe(doc1Id);
      expect(letter!.sourceDocuments[0].role).toBe('primary');
      expect(letter!.sourceDocuments[1].documentId).toBe(doc2Id);
      expect(letter!.sourceDocuments[1].role).toBe('supporting');
      expect(letter!.sourceDocuments[2].documentId).toBe(doc3Id);
      expect(letter!.sourceDocuments[2].role).toBe('supporting');

      // Verify legacy documentId field is set to the first document
      expect(letter!.documentId).toBe(doc1Id);
    });

    it('should retrieve letter with all linked documents', async () => {
      const response = await request(app)
        .get(`/api/v1/letters/${letterId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.letter.sourceDocuments).toHaveLength(3);
      expect(response.body.data.letter.sourceDocuments[0].document.fileName).toBe('police-report.pdf');
      expect(response.body.data.letter.sourceDocuments[1].document.fileName).toBe('medical-records.pdf');
      expect(response.body.data.letter.sourceDocuments[2].document.fileName).toBe('photos.pdf');
    });

    it('should get document IDs via dedicated endpoint', async () => {
      const response = await request(app)
        .get(`/api/v1/letters/${letterId}/documents`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.documentIds).toEqual([doc1Id, doc2Id, doc3Id]);
    });

    it('should list letters with source documents', async () => {
      const response = await request(app)
        .get('/api/v1/letters')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.letters).toBeInstanceOf(Array);
      const letter = response.body.data.letters.find((l: any) => l.id === letterId);
      expect(letter).toBeDefined();
      expect(letter.sourceDocuments).toHaveLength(3);
    });

    it('should prevent duplicate document links', async () => {
      // Try to link the same documents again
      const letterService = await import('../../services/letters/letter.service');
      await letterService.linkDocumentsToLetter(letterId, [doc1Id, doc2Id, doc3Id], firmId);

      // Should still have exactly 3 documents
      const letterDocs = await prisma.letterDocument.findMany({
        where: { letterId },
      });
      expect(letterDocs).toHaveLength(3);
    });

    it('should replace document links when relinking', async () => {
      // Link only 2 documents this time
      const letterService = await import('../../services/letters/letter.service');
      await letterService.linkDocumentsToLetter(letterId, [doc1Id, doc2Id], firmId);

      const letterDocs = await prisma.letterDocument.findMany({
        where: { letterId },
        orderBy: { order: 'asc' },
      });

      expect(letterDocs).toHaveLength(2);
      expect(letterDocs[0].documentId).toBe(doc1Id);
      expect(letterDocs[1].documentId).toBe(doc2Id);
    });
  });
});

