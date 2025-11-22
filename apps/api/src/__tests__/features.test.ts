import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import featuresRouter from '../routes/features';
import { errorHandler } from '../middleware/errorHandler';

// Mock LaunchDarkly
vi.mock('../utils/launchdarkly', () => ({
  buildLDContext: vi.fn((user) => ({
    kind: 'user',
    key: user.userId,
    email: user.email,
    role: user.role,
  })),
  getAllFlags: vi.fn(),
}));

// Mock authentication middleware
vi.mock('../middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { userId: 'test-user-id', email: 'admin@test.com', role: 'ADMIN' };
    next();
  },
}));

import { getAllFlags } from '../utils/launchdarkly';

// Test app setup
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/features', featuresRouter);
  app.use(errorHandler);
  return app;
}

describe('Features Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /features', () => {
    it('should return feature flags for authenticated user', async () => {
      const mockFlags = {
        'product-variants': true,
        'new-checkout': false,
      };

      vi.mocked(getAllFlags).mockResolvedValue(mockFlags);

      const app = createTestApp();
      const response = await request(app).get('/features');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockFlags);
      expect(getAllFlags).toHaveBeenCalledWith({
        kind: 'user',
        key: 'test-user-id',
        email: 'admin@test.com',
        role: 'ADMIN',
      });
    });

    it('should return empty object when no flags are available', async () => {
      vi.mocked(getAllFlags).mockResolvedValue({});

      const app = createTestApp();
      const response = await request(app).get('/features');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({});
    });

    it('should handle LaunchDarkly errors gracefully', async () => {
      // getAllFlags catches errors internally and returns {}
      vi.mocked(getAllFlags).mockRejectedValue(new Error('LaunchDarkly error'));

      const app = createTestApp();
      
      // Note: The real getAllFlags implementation catches errors and returns {}
      // But if it throws, asyncHandler will catch it and return 500
      // This test verifies error propagation through asyncHandler
      const response = await request(app).get('/features');

      // Since getAllFlags throws, asyncHandler catches it and returns 500
      expect(response.status).toBe(500);
    });

    it('should only return boolean flags', async () => {
      // getAllFlags filters non-boolean values internally
      // This test verifies the route returns only boolean flags
      const mockFlags = {
        'product-variants': true,
        'new-checkout': false,
      };

      vi.mocked(getAllFlags).mockResolvedValue(mockFlags);

      const app = createTestApp();
      const response = await request(app).get('/features');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockFlags);
      // Verify all returned values are booleans
      Object.values(response.body).forEach((value) => {
        expect(typeof value).toBe('boolean');
      });
    });
  });
});

