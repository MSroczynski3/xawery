import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { disconnectPrisma, checkDatabaseHealth } from './db';
import { errorHandler } from './middleware/errorHandler';
import { initializeLaunchDarkly, closeLaunchDarkly } from './utils/launchdarkly';
import { swaggerSpec } from './swagger';
import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import productsRoutes from './routes/products';
import featuresRoutes from './routes/features';
import testRoutes from './routes/test';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // Security headers including disabling X-Powered-By
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// OpenAPI JSON spec
app.get('/api-docs.json', (_req: Request, res: Response) => {
  res.json(swaggerSpec);
});

// Routes
app.use('/auth', authRoutes);
app.use('/users', usersRoutes);
app.use('/products', productsRoutes);
app.use('/features', featuresRoutes);
app.use('/test', testRoutes);

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   description: Server uptime in seconds
 *                 database:
 *                   type: string
 *                   enum: [connected, disconnected]
 *       503:
 *         description: Service unavailable (database issue)
 */
app.get('/health', async (_req: Request, res: Response) => {
  const dbHealthy = await checkDatabaseHealth();

  res.status(dbHealthy ? 200 : 503).json({
    status: dbHealthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbHealthy ? 'connected' : 'disconnected',
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler (must be last)
app.use(errorHandler);

// Initialize LaunchDarkly
initializeLaunchDarkly();

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 API server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API docs: http://localhost:${PORT}/api-docs`);
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  console.log(`\n${signal} signal received: closing HTTP server`);
  server.close(async () => {
    console.log('HTTP server closed');
    await closeLaunchDarkly();
    await disconnectPrisma();
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
