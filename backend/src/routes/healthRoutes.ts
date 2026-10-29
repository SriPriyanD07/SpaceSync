import { Router, Request, Response } from 'express';
import { query, isUsingEmbeddedStore } from '../config/db';

const router = Router();

const handleHealth = async (req: Request, res: Response) => {
  const instanceId = process.env.INSTANCE_ID || process.env.HOSTNAME || 'backend-primary';

  // Multi-instance observability and anti-caching headers (publicly accessible, no auth required)
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('X-Served-By', instanceId);
  res.setHeader('X-Backend-Instance', instanceId);

  if (req.method === 'HEAD') {
    try {
      await query('SELECT 1');
      return res.status(200).end();
    } catch {
      return res.status(503).end();
    }
  }

  try {
    const start = Date.now();
    await query('SELECT 1');
    const latencyMs = Date.now() - start;

    return res.status(200).json({
      status: 'ok',
      instance: instanceId,
      database: isUsingEmbeddedStore ? 'embedded' : 'connected',
      uptime: Math.floor(process.uptime()),
      latency: `${latencyMs}ms`,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
    });
  } catch (err: any) {
    return res.status(503).json({
      status: 'error',
      instance: instanceId,
      database: 'disconnected',
      message: 'Database connection failed',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
    });
  }
};

// Mount handlers for GET and HEAD on both '/' and '/health'
router.get('/', handleHealth);
router.get('/health', handleHealth);
router.head('/', handleHealth);
router.head('/health', handleHealth);

export default router;
