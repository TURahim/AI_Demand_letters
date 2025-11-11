import request from 'supertest';
import app from '../../app';
import prisma from '../../utils/prisma-client';
import * as authService from '../../services/auth/auth.service';

describe('Template API', () => {
  let authToken: string;
  let firmId: string;
  let templateId: string;

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
        email: 'template-test@example.com',
        passwordHash: hashedPassword,
        firstName: 'Template',
        lastName: 'Tester',
        role: 'PARTNER',
        firmId,
      },
    });

    // Generate auth token
    authToken = authService.generateAccessToken({
      userId: user.id,
      email: user.email,
      firmId: user.firmId,
      role: user.role,
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.template.deleteMany({ where: { firmId } });
    await prisma.user.deleteMany({ where: { firmId } });
    await prisma.firm.delete({ where: { id: firmId } });
    await prisma.$disconnect();
  });

  describe('POST /api/v1/templates', () => {
    it('should create a new template', async () => {
      const response = await request(app)
        .post('/api/v1/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Template',
          description: 'A test template',
          category: 'Personal Injury',
          content: 'Dear {{client_name}}, This is a test template.',
          variables: [
            {
              name: 'client_name',
              type: 'string',
              required: true,
              description: 'Name of the client',
            },
          ],
          isPublic: false,
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data.template).toHaveProperty('id');
      expect(response.body.data.template.name).toBe('Test Template');
      expect(response.body.data.template.firmId).toBe(firmId);

      templateId = response.body.data.template.id;
    });

    it('should reject template without name', async () => {
      const response = await request(app)
        .post('/api/v1/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Test content',
        });

      expect(response.status).toBe(400);
    });

    it('should reject unauthenticated request', async () => {
      const response = await request(app)
        .post('/api/v1/templates')
        .send({
          name: 'Test Template',
          content: 'Test content',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/templates', () => {
    it('should list templates for firm', async () => {
      const response = await request(app)
        .get('/api/v1/templates')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.templates).toBeInstanceOf(Array);
      expect(response.body.data.templates.length).toBeGreaterThan(0);
    });

    it('should filter templates by category', async () => {
      const response = await request(app)
        .get('/api/v1/templates?category=Personal Injury')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.templates).toBeInstanceOf(Array);
    });

    it('should search templates', async () => {
      const response = await request(app)
        .get('/api/v1/templates?search=Test')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.templates).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/v1/templates/:id', () => {
    it('should get template by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/templates/${templateId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.template.id).toBe(templateId);
      expect(response.body.data.template.name).toBe('Test Template');
    });

    it('should return 404 for non-existent template', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/v1/templates/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/v1/templates/:id', () => {
    it('should update template', async () => {
      const response = await request(app)
        .put(`/api/v1/templates/${templateId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Template Name',
          description: 'Updated description',
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.template.name).toBe('Updated Template Name');
      expect(response.body.data.template.description).toBe('Updated description');
    });

    it('should return 404 for non-existent template', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .put(`/api/v1/templates/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Name',
        });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/v1/templates/:id/clone', () => {
    it('should clone template', async () => {
      const response = await request(app)
        .post(`/api/v1/templates/${templateId}/clone`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Cloned Template',
          description: 'A cloned template',
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data.template.name).toBe('Cloned Template');
      expect(response.body.data.template.content).toBe(
        'Dear {{client_name}}, This is a test template.'
      );

      // Cleanup cloned template
      await prisma.template.delete({
        where: { id: response.body.data.template.id },
      });
    });
  });

  describe('POST /api/v1/templates/:id/render', () => {
    it('should render template with data', async () => {
      const response = await request(app)
        .post(`/api/v1/templates/${templateId}/render`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          data: {
            client_name: 'John Doe',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.rendered).toContain('John Doe');
    });

    it('should fail rendering without required variables', async () => {
      const response = await request(app)
        .post(`/api/v1/templates/${templateId}/render`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          data: {},
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/templates/categories', () => {
    it('should get template categories', async () => {
      const response = await request(app)
        .get('/api/v1/templates/categories')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.categories).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/v1/templates/popular', () => {
    it('should get popular templates', async () => {
      const response = await request(app)
        .get('/api/v1/templates/popular')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.templates).toBeInstanceOf(Array);
    });
  });

  describe('DELETE /api/v1/templates/:id', () => {
    it('should delete template', async () => {
      const response = await request(app)
        .delete(`/api/v1/templates/${templateId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');

      // Verify deletion
      const getResponse = await request(app)
        .get(`/api/v1/templates/${templateId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(404);
    });
  });
});

