import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate';
import { ApiError } from '../middleware/errorHandler';

const router: Router = Router();

// Schema for testing validation
const TestSchema = z.object({
  email: z.string().email('Invalid email format'),
  age: z.number().int().min(0).max(120),
  name: z.string().min(2).max(50),
});

// Test endpoint to demonstrate validation
router.post('/validate', validateBody(TestSchema), (req: Request, res: Response) => {
  res.json({
    message: 'Validation passed!',
    data: req.body,
  });
});

// Test endpoint to demonstrate error handling
router.get('/error', (_req: Request, _res: Response) => {
  throw new ApiError(418, "I'm a teapot", { reason: 'Testing error handler' });
});

export default router;
