import { Router, Request, Response } from 'express';
import { query, isUsingEmbeddedStore } from '../config/db';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const isCloud = Boolean(process.env.RENDER || (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')));
    if (isCloud) {
      process.env.NODE_ENV = 'production';
    }

    const start = Date.now();
    await query('SELECT 1');
    const latencyMs = Date.now() - start;

    return res.status(200).json({
      status: 'ok',
      instance: process.env.INSTANCE_ID || process.env.HOSTNAME || 'backend-primary',
      database: isUsingEmbeddedStore ? 'embedded' : 'connected',
      uptime: process.uptime(),
      latency: `${latencyMs}ms`,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
    });
  } catch (err: any) {
    return res.status(503).json({
      status: 'error',
      instance: process.env.INSTANCE_ID || process.env.HOSTNAME || 'backend-primary',
      database: 'disconnected',
      message: 'Database connection failed',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
    });
  }
});

export default router;
