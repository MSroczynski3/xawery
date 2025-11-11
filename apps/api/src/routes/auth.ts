import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getPrismaClient } from '../db';
import { validateBody } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { hashPassword, verifyPassword, generateToken } from '../utils/auth';
import { ApiError } from '../middleware/errorHandler';

const router = Router();
const prisma = getPrismaClient();

// Validation schemas
const RegisterSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['ADMIN', 'MANAGER', 'VIEWER']).optional().default('VIEWER'),
});

const LoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * POST /auth/register - Register a new user
 */
router.post('/register', validateBody(RegisterSchema), async (req: Request, res: Response) => {
  const { email, password, role } = req.body;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new ApiError(409, 'User already exists');
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      role,
    },
  });

  // Generate token
  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  res.status(201).json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    token,
  });
});

/**
 * POST /auth/login - Login user
 */
router.post('/login', validateBody(LoginSchema), async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Find user
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new ApiError(401, 'Invalid credentials');
  }

  // Verify password
  const isValid = await verifyPassword(user.password, password);

  if (!isValid) {
    throw new ApiError(401, 'Invalid credentials');
  }

  // Generate token
  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  res.json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    token,
  });
});

/**
 * GET /auth/me - Get current user info
 */
router.get('/me', authenticate, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  res.json({ user });
});

export default router;
