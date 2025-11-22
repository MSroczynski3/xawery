import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { buildLDContext, getAllFlags } from '../utils/launchdarkly';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

/**
 * @swagger
 * /features:
 *   get:
 *     summary: Get all feature flags for the current user
 *     description: Returns server-evaluated feature flags based on the authenticated user's context
 *     tags: [Features]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Feature flags for the current user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties:
 *                 type: boolean
 *               example:
 *                 product-variants: true
 *                 new-checkout: false
 *       401:
 *         description: Unauthorized - Authentication required
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Build LaunchDarkly context from authenticated user
    const context = buildLDContext(req.user);

    // Get all flags for this user
    const flags = await getAllFlags(context);

    res.json(flags);
  })
);

export default router;

