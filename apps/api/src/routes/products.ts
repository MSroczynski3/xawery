import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getPrismaClient } from '../db';
import { validateBody, validateParams, validateQuery } from '../middleware/validate';
import { authenticate, requireRole } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';
import { asyncHandler } from '../utils/asyncHandler';

const router: Router = Router();
const prisma = getPrismaClient();

// Validation schemas
const CreateProductSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase with hyphens'),
  description: z.string().optional(),
  basePrice: z.number().positive(),
  active: z.boolean().optional().default(true),
});

const UpdateProductSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase with hyphens')
    .optional(),
  description: z.string().optional(),
  basePrice: z.number().positive().optional(),
  active: z.boolean().optional(),
});

const SearchQuerySchema = z.object({
  q: z
    .string()
    .optional()
    .transform((val) => (val === '' || val === undefined ? undefined : val)),
  active: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
});

const UuidParamSchema = z.object({
  id: z.string().uuid('Invalid product ID'),
});

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Search and list products
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query (searches name and description)
 *       - in: query
 *         name: active
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filter by active status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of products
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 products:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 */
router.get(
  '/',
  validateQuery(SearchQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { q, active, page, limit } = req.query as unknown as {
      q?: string;
      active?: 'true' | 'false';
      page: number;
      limit: number;
    };

    const where: {
      active?: boolean;
      OR?: Array<
        | { name: { contains: string; mode: 'insensitive' } }
        | { description: { contains: string; mode: 'insensitive' } }
      >;
    } = {};

    // Filter by active status
    if (active !== undefined) {
      where.active = active === 'true';
    }

    // Search by name or description
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          basePrice: true,
          active: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.product.count({ where }),
    ]);

    res.json({
      products: products.map((p) => ({
        ...p,
        basePrice: Number(p.basePrice),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  })
);

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 product:
 *                   $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found
 */
router.get(
  '/:id',
  validateParams(UuidParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        basePrice: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    res.json({
      product: {
        ...product,
        basePrice: Number(product.basePrice),
      },
    });
  })
);

/**
 * @swagger
 * /products:
 *   post:
 *     summary: Create a new product (Manager or Admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - slug
 *               - basePrice
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 200
 *                 example: Premium T-Shirt
 *               slug:
 *                 type: string
 *                 pattern: ^[a-z0-9]+(?:-[a-z0-9]+)*$
 *                 example: premium-t-shirt
 *               description:
 *                 type: string
 *                 example: High-quality cotton t-shirt
 *               basePrice:
 *                 type: number
 *                 minimum: 0
 *                 example: 29.99
 *               active:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Product created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Manager or Admin access required
 *       409:
 *         description: Product with this slug already exists
 */
router.post(
  '/',
  authenticate,
  requireRole('ADMIN', 'MANAGER'),
  validateBody(CreateProductSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { name, slug, description, basePrice, active } = req.body;

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description,
        basePrice,
        active,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        basePrice: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(201).json({
      product: {
        ...product,
        basePrice: Number(product.basePrice),
      },
    });
  })
);

/**
 * @swagger
 * /products/{id}:
 *   put:
 *     summary: Update product (Manager or Admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               slug:
 *                 type: string
 *               description:
 *                 type: string
 *               basePrice:
 *                 type: number
 *               active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Product updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Manager or Admin access required
 *       404:
 *         description: Product not found
 *       409:
 *         description: Slug already in use
 */
router.put(
  '/:id',
  authenticate,
  requireRole('ADMIN', 'MANAGER'),
  validateParams(UuidParamSchema),
  validateBody(UpdateProductSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      throw new ApiError(404, 'Product not found');
    }

    // If slug is being updated, check if it's already taken
    if (updates.slug && updates.slug !== existingProduct.slug) {
      const slugTaken = await prisma.product.findUnique({
        where: { slug: updates.slug },
      });

      if (slugTaken) {
        throw new ApiError(409, 'Slug already in use');
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: updates,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        basePrice: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({
      product: {
        ...product,
        basePrice: Number(product.basePrice),
      },
    });
  })
);

/**
 * @swagger
 * /products/{id}:
 *   delete:
 *     summary: Delete product (Admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Product not found
 */
router.delete(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  validateParams(UuidParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    await prisma.product.delete({
      where: { id },
    });

    res.json({ message: 'Product deleted successfully' });
  })
);

export default router;
