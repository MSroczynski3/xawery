import express, { Request, Response } from 'express';

const app = express();
const PORT = process.env.FLAG_STUB_PORT || 4000;

// Parse JSON bodies
app.use(express.json());

/**
 * Flag overrides - can be set via environment variable or JSON file
 * Format: FLAG_OVERRIDES='{"product-variants":true,"new-checkout":false}'
 */
const getFlagOverrides = (): Record<string, boolean> => {
  // Try to read from environment variable first
  if (process.env.FLAG_OVERRIDES) {
    try {
      return JSON.parse(process.env.FLAG_OVERRIDES);
    } catch (error) {
      console.warn('⚠️  Invalid FLAG_OVERRIDES JSON, using defaults');
    }
  }

  // Default overrides for testing
  return {
    'product-variants': true,
  };
};

/**
 * GET /features
 * Returns feature flags based on overrides
 * This endpoint mimics LaunchDarkly's /features endpoint for testing
 */
app.get('/features', (_req: Request, res: Response) => {
  const flags = getFlagOverrides();
  res.json(flags);
});

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'flag-stubs' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚩 Flag stub server running on http://localhost:${PORT}`);
  console.log(`📋 Flags: ${JSON.stringify(getFlagOverrides(), null, 2)}`);
});

