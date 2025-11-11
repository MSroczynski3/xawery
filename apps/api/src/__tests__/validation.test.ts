import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { z } from 'zod';
import { validateBody, validateQuery, validateParams } from '../middleware/validate';
import { errorHandler } from '../middleware/errorHandler';

// Test app setup
function createTestApp() {
  const app = express();
  app.use(express.json());
  return app;
}

describe('Validation Middleware', () => {
  describe('validateBody', () => {
    const TestSchema = z.object({
      email: z.string().email('Invalid email format'),
      age: z.number().int().min(0).max(120),
      name: z.string().min(2).max(50),
    });

    it('should accept valid data', async () => {
      const app = createTestApp();
      app.post('/test', validateBody(TestSchema), (req, res) => {
        res.json({ success: true, data: req.body });
      });

      const response = await request(app)
        .post('/test')
        .send({
          email: 'test@example.com',
          age: 25,
          name: 'John Doe',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('test@example.com');
    });

    it('should reject invalid email', async () => {
      const app = createTestApp();
      app.post('/test', validateBody(TestSchema), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({
          email: 'not-an-email',
          age: 25,
          name: 'John',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toHaveLength(1);
      expect(response.body.details[0].path).toBe('email');
      expect(response.body.details[0].message).toBe('Invalid email format');
    });

    it('should catch multiple validation errors', async () => {
      const app = createTestApp();
      app.post('/test', validateBody(TestSchema), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({
          email: 'bad-email',
          age: 150,
          name: 'J',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toHaveLength(3);
      
      const paths = response.body.details.map((d: any) => d.path);
      expect(paths).toContain('email');
      expect(paths).toContain('age');
      expect(paths).toContain('name');
    });

    it('should catch missing required fields', async () => {
      const app = createTestApp();
      app.post('/test', validateBody(TestSchema), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({
          email: 'test@example.com',
          // missing age and name
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toHaveLength(2);
      
      const paths = response.body.details.map((d: any) => d.path);
      expect(paths).toContain('age');
      expect(paths).toContain('name');
    });
  });

  describe('validateQuery', () => {
    const QuerySchema = z.object({
      page: z.string().regex(/^\d+$/).transform(Number),
      limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    });

    it('should accept valid query params', async () => {
      const app = createTestApp();
      app.get('/test', validateQuery(QuerySchema), (req, res) => {
        res.json({ success: true, query: req.query });
      });

      const response = await request(app).get('/test?page=1&limit=10');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject invalid query params', async () => {
      const app = createTestApp();
      app.get('/test', validateQuery(QuerySchema), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app).get('/test?page=invalid');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid query parameters');
    });
  });

  describe('validateParams', () => {
    const ParamsSchema = z.object({
      id: z.string().uuid(),
    });

    it('should accept valid route params', async () => {
      const app = createTestApp();
      app.get('/test/:id', validateParams(ParamsSchema), (req, res) => {
        res.json({ success: true, params: req.params });
      });

      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app).get(`/test/${validUuid}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject invalid route params', async () => {
      const app = createTestApp();
      app.get('/test/:id', validateParams(ParamsSchema), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app).get('/test/not-a-uuid');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid route parameters');
    });
  });
});

describe('Error Handler Middleware', () => {
  it('should handle custom API errors', async () => {
    const app = createTestApp();
    const { ApiError } = await import('../middleware/errorHandler');
    
    app.get('/test', () => {
      throw new ApiError(418, "I'm a teapot", { reason: 'Testing' });
    });
    app.use(errorHandler);

    const response = await request(app).get('/test');

    expect(response.status).toBe(418);
    expect(response.body.error).toBe("I'm a teapot");
    expect(response.body.details.reason).toBe('Testing');
  });

  it('should handle generic errors', async () => {
    const app = createTestApp();
    
    app.get('/test', () => {
      throw new Error('Something went wrong');
    });
    app.use(errorHandler);

    const response = await request(app).get('/test');

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Internal server error');
  });
});

