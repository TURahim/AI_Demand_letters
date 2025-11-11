/**
 * Integration Tests for Comment System
 */

import request from 'supertest';
import app from '../../app';
import prisma from '../../utils/prisma-client';
import { UserRole } from '@prisma/client';
import * as authUtils from '../../services/auth/auth.utils';

describe('Comment System Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let firmId: string;
  let letterId: string;
  let commentId: string;

  beforeAll(async () => {
    // Create a test firm
    const firm = await prisma.firm.create({
      data: {
        name: 'Test Firm for Comments',
        encryptionKey: 'test-encryption-key',
      },
    });
    firmId = firm.id;

    // Create a test user
    const hashedPassword = await authUtils.hashPassword('testpassword');
    const user = await prisma.user.create({
      data: {
        email: 'comment-test@example.com',
        passwordHash: hashedPassword,
        firstName: 'Comment',
        lastName: 'Tester',
        firmId,
        role: UserRole.ASSOCIATE,
      },
    });
    userId = user.id;

    // Generate auth token
    authToken = authUtils.generateAccessToken({
      id: userId,
      email: user.email,
      firmId,
      role: user.role,
    });

    // Create a test letter
    const letter = await prisma.letter.create({
      data: {
        title: 'Test Letter for Comments',
        content: { text: 'Initial content' },
        firmId,
        createdBy: userId,
        status: 'DRAFT',
      },
    });
    letterId = letter.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.comment.deleteMany({ where: { letterId } });
    await prisma.letter.deleteMany({ where: { id: letterId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.firm.deleteMany({ where: { id: firmId } });
    await prisma.$disconnect();
  });

  describe('POST /api/v1/letters/:letterId/comments', () => {
    it('should create a comment on a letter', async () => {
      const response = await request(app)
        .post(`/api/v1/letters/${letterId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'This is a test comment',
          position: { line: 10, column: 5 },
        })
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.comment).toHaveProperty('id');
      expect(response.body.data.comment.content).toBe('This is a test comment');
      expect(response.body.data.comment.userId).toBe(userId);
      expect(response.body.data.comment.letterId).toBe(letterId);

      commentId = response.body.data.comment.id;
    });

    it('should fail to create comment with invalid data', async () => {
      await request(app)
        .post(`/api/v1/letters/${letterId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: '', // Empty content should fail
        })
        .expect(400);
    });

    it('should fail to create comment without authentication', async () => {
      await request(app)
        .post(`/api/v1/letters/${letterId}/comments`)
        .send({
          content: 'Unauthorized comment',
        })
        .expect(401);
    });
  });

  describe('GET /api/v1/letters/:letterId/comments', () => {
    it('should list all comments for a letter', async () => {
      const response = await request(app)
        .get(`/api/v1/letters/${letterId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(Array.isArray(response.body.data.comments)).toBe(true);
      expect(response.body.data.comments.length).toBeGreaterThan(0);
    });

    it('should filter resolved comments', async () => {
      const response = await request(app)
        .get(`/api/v1/letters/${letterId}/comments?includeResolved=false`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      const resolvedComments = response.body.data.comments.filter(
        (c: any) => c.isResolved
      );
      expect(resolvedComments.length).toBe(0);
    });
  });

  describe('GET /api/v1/comments/:id', () => {
    it('should get a single comment', async () => {
      const response = await request(app)
        .get(`/api/v1/comments/${commentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.comment.id).toBe(commentId);
    });

    it('should return 404 for non-existent comment', async () => {
      await request(app)
        .get(`/api/v1/comments/00000000-0000-0000-0000-000000000000`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('PUT /api/v1/comments/:id', () => {
    it('should update own comment', async () => {
      const response = await request(app)
        .put(`/api/v1/comments/${commentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Updated comment content',
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.comment.content).toBe('Updated comment content');
    });

    it('should fail to update with invalid data', async () => {
      await request(app)
        .put(`/api/v1/comments/${commentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: '', // Empty content should fail
        })
        .expect(400);
    });
  });

  describe('POST /api/v1/comments/:id/resolve', () => {
    it('should resolve a comment', async () => {
      const response = await request(app)
        .post(`/api/v1/comments/${commentId}/resolve`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.comment.isResolved).toBe(true);
      expect(response.body.data.comment.resolvedBy).toBe(userId);
    });

    it('should fail to update resolved comment', async () => {
      await request(app)
        .put(`/api/v1/comments/${commentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Trying to update resolved comment',
        })
        .expect(400);
    });
  });

  describe('POST /api/v1/comments/:id/unresolve', () => {
    it('should unresolve a comment', async () => {
      const response = await request(app)
        .post(`/api/v1/comments/${commentId}/unresolve`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.comment.isResolved).toBe(false);
    });
  });

  describe('Threaded Comments', () => {
    let parentCommentId: string;
    let replyCommentId: string;

    it('should create a parent comment', async () => {
      const response = await request(app)
        .post(`/api/v1/letters/${letterId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Parent comment',
        })
        .expect(201);

      parentCommentId = response.body.data.comment.id;
    });

    it('should create a reply to parent comment', async () => {
      const response = await request(app)
        .post(`/api/v1/letters/${letterId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Reply to parent',
          parentId: parentCommentId,
        })
        .expect(201);

      expect(response.body.data.comment.parentId).toBe(parentCommentId);
      replyCommentId = response.body.data.comment.id;
    });

    it('should get parent comment with replies', async () => {
      const response = await request(app)
        .get(`/api/v1/comments/${parentCommentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.comment.replies).toBeDefined();
      expect(response.body.data.comment.replies.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/v1/letters/:letterId/comments/count', () => {
    it('should get comment count', async () => {
      const response = await request(app)
        .get(`/api/v1/letters/${letterId}/comments/count`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(typeof response.body.data.count).toBe('number');
      expect(response.body.data.count).toBeGreaterThan(0);
    });
  });

  describe('DELETE /api/v1/comments/:id', () => {
    it('should delete own comment', async () => {
      const response = await request(app)
        .delete(`/api/v1/comments/${commentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
    });

    it('should return 404 for deleted comment', async () => {
      await request(app)
        .get(`/api/v1/comments/${commentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('Firm Isolation', () => {
    let otherFirmId: string;
    let otherUserId: string;
    let otherAuthToken: string;

    beforeAll(async () => {
      // Create another firm and user
      const otherFirm = await prisma.firm.create({
        data: {
          name: 'Other Firm',
          encryptionKey: 'other-encryption-key',
        },
      });
      otherFirmId = otherFirm.id;

      const hashedPassword = await authUtils.hashPassword('testpassword');
      const otherUser = await prisma.user.create({
        data: {
          email: 'other-firm-user@example.com',
          passwordHash: hashedPassword,
          firstName: 'Other',
          lastName: 'User',
          firmId: otherFirmId,
          role: UserRole.ASSOCIATE,
        },
      });
      otherUserId = otherUser.id;

      otherAuthToken = authUtils.generateAccessToken({
        id: otherUserId,
        email: otherUser.email,
        firmId: otherFirmId,
        role: otherUser.role,
      });
    });

    afterAll(async () => {
      await prisma.user.deleteMany({ where: { id: otherUserId } });
      await prisma.firm.deleteMany({ where: { id: otherFirmId } });
    });

    it('should not allow users from other firms to create comments', async () => {
      await request(app)
        .post(`/api/v1/letters/${letterId}/comments`)
        .set('Authorization', `Bearer ${otherAuthToken}`)
        .send({
          content: 'Comment from other firm',
        })
        .expect(404); // Letter not found (firm isolation)
    });
  });
});

