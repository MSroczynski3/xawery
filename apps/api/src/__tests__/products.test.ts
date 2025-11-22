import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import productsRouter from '../routes/products';
import { errorHandler } from '../middleware/errorHandler';
import { getPrismaClient } from '../db';

const prisma = getPrismaClient();

// Test app setup
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/products', productsRouter);
  app.use(errorHandler);
  return app;
}

// Mock authentication middleware
/* eslint-disable @typescript-eslint/no-explicit-any */
vi.mock('../middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { userId: 'test-user-id', email: 'admin@test.com', role: 'ADMIN' };
    next();
  },
  requireRole:
    (...roles: string[]) =>
    (req: any, res: any, next: any) => {
      if (req.user && roles.includes(req.user.role)) {
        next();
      } else {
        res.status(403).json({ error: 'Insufficient permissions' });
      }
    },
}));
/* eslint-enable @typescript-eslint/no-explicit-any */

describe('Product Routes', () => {
  let testProduct: { id: string; name: string; slug: string };
  let testProductSlug: string;

  beforeEach(async () => {
    // Generate unique slug to prevent race conditions in parallel test execution
    testProductSlug = `test-product-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    try {
      // Create a test product with unique slug
      testProduct = await prisma.product.create({
        data: {
          name: 'Test Product',
          slug: testProductSlug,
          description: 'A test product',
          basePrice: 99.99,
          active: true,
        },
      });
    } catch (error) {
      // Handle race conditions or other creation errors
      console.error('Failed to create test product:', error);
      throw new Error(
        `Test setup failed: Could not create test product. ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  });

  afterEach(async () => {
    // Clean up test product after each test
    if (testProduct?.id) {
      try {
        await prisma.product.delete({
          where: { id: testProduct.id },
        });
      } catch (error) {
        // Ignore errors if product was already deleted
        console.warn('Failed to delete test product in cleanup:', error);
      }
    }
  });

  describe('GET /products', () => {
    it('should list products with pagination', async () => {
      const app = createTestApp();

      const response = await request(app).get('/products');

      expect(response.status).toBe(200);
      expect(response.body.products).toBeDefined();
      expect(Array.isArray(response.body.products)).toBe(true);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
    });

    it('should search products by name', async () => {
      const app = createTestApp();

      const response = await request(app).get('/products?q=test');

      expect(response.status).toBe(200);
      expect(response.body.products.length).toBeGreaterThan(0);
      expect(response.body.products[0].name).toContain('Test');
    });

    it('should filter products by active status', async () => {
      const app = createTestApp();

      const response = await request(app).get('/products?active=true');

      expect(response.status).toBe(200);
      expect(response.body.products).toBeDefined();
      response.body.products.forEach((product: { active: boolean }) => {
        expect(product.active).toBe(true);
      });
    });

    it('should handle pagination correctly', async () => {
      const app = createTestApp();

      const response = await request(app).get('/products?page=1&limit=5');

      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });
  });

  describe('GET /products/:id', () => {
    it('should get product by ID', async () => {
      const app = createTestApp();

      const response = await request(app).get(`/products/${testProduct.id}`);

      expect(response.status).toBe(200);
      expect(response.body.product).toBeDefined();
      expect(response.body.product.id).toBe(testProduct.id);
      expect(response.body.product.name).toBe('Test Product');
    });

    it('should return 404 for non-existent product', async () => {
      const app = createTestApp();
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await request(app).get(`/products/${fakeId}`).expect(404);

      expect(response.body.error).toBe('Product not found');
    });

    it('should return 400 for invalid UUID', async () => {
      const app = createTestApp();

      const response = await request(app).get('/products/not-a-uuid');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid route parameters');
    });
  });

  describe('POST /products', () => {
    it('should create a new product', async () => {
      const app = createTestApp();

      // Use unique slug to avoid conflicts from previous test runs
      const uniqueSlug = `test-new-product-${Date.now()}`;
      const newProduct = {
        name: 'New Test Product',
        slug: uniqueSlug,
        description: 'A brand new test product',
        basePrice: 149.99,
        active: true,
      };

      const response = await request(app).post('/products').send(newProduct);

      expect(response.status).toBe(201);
      expect(response.body.product).toBeDefined();
      expect(response.body.product.name).toBe(newProduct.name);
      expect(response.body.product.slug).toBe(newProduct.slug);
      expect(response.body.product.basePrice).toBe(newProduct.basePrice);
    });

    it('should reject invalid slug format', async () => {
      const app = createTestApp();

      const response = await request(app).post('/products').send({
        name: 'Test',
        slug: 'UPPERCASE-SLUG',
        basePrice: 99.99,
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject duplicate slug', async () => {
      const app = createTestApp();

      const response = await request(app).post('/products').send({
        name: 'Duplicate Product',
        slug: testProduct.slug, // Already exists from beforeEach
        basePrice: 99.99,
      });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Resource already exists');
    });

    it('should reject missing required fields', async () => {
      const app = createTestApp();

      const response = await request(app).post('/products').send({
        name: 'Test',
        // missing slug and basePrice
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('PUT /products/:id', () => {
    it('should update product', async () => {
      const app = createTestApp();

      const updates = {
        name: 'Updated Product Name',
        basePrice: 199.99,
      };

      const response = await request(app).put(`/products/${testProduct.id}`).send(updates);

      expect(response.status).toBe(200);
      expect(response.body.product.name).toBe(updates.name);
      expect(response.body.product.basePrice).toBe(updates.basePrice);
    });

    it('should return 404 for non-existent product', async () => {
      const app = createTestApp();
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await request(app).put(`/products/${fakeId}`).send({
        name: 'Updated',
      });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Product not found');
    });

    it('should reject duplicate slug on update', async () => {
      const app = createTestApp();

      // Create another product
      const otherProduct = await prisma.product.create({
        data: {
          name: 'Other Product',
          slug: 'test-other-product',
          basePrice: 50,
        },
      });

      // Try to update testProduct with otherProduct's slug
      const response = await request(app).put(`/products/${testProduct.id}`).send({
        slug: 'test-other-product',
      });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Slug already in use');

      // Cleanup
      await prisma.product.delete({ where: { id: otherProduct.id } });
    });
  });

  describe('DELETE /products/:id', () => {
    it('should delete product', async () => {
      const app = createTestApp();

      const response = await request(app).delete(`/products/${testProduct.id}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Product deleted successfully');

      // Verify it's deleted
      const deleted = await prisma.product.findUnique({
        where: { id: testProduct.id },
      });
      expect(deleted).toBeNull();
    });

    it('should return 404 for non-existent product', async () => {
      const app = createTestApp();
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';

      const response = await request(app).delete(`/products/${fakeId}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Product not found');
    });
  });
});
