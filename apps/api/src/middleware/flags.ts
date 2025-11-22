import { Request, Response, NextFunction } from 'express';
import { buildLDContext, evaluateFlag } from '../utils/launchdarkly';
import { ApiError } from './errorHandler';

/**
 * Middleware to require a feature flag to be enabled
 * Returns 403 if the flag is disabled for the current user
 *
 * @param flagKey - The feature flag key (e.g., 'product-variants')
 * @returns Express middleware function
 *
 * @example
 * router.post('/products/:id/variants', requireFlag('product-variants'), createVariant);
 */
export function requireFlag(flagKey: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // User must be authenticated
    if (!req.user) {
      throw new ApiError(401, 'Authentication required');
    }

    // Build LaunchDarkly context from user
    const context = buildLDContext(req.user);

    // Evaluate the flag
    const isEnabled = await evaluateFlag(flagKey, context, false);

    if (!isEnabled) {
      throw new ApiError(403, `Feature '${flagKey}' is not enabled`, 'FEATURE_DISABLED');
    }

    // Flag is enabled, continue to next middleware
    next();
  };
}
