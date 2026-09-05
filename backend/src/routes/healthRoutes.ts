import { Router, Request, Response } from 'express';
import { query } from '../config/db';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const start = Date.now();
    await query('SELECT 1');
    const latencyMs = Date.now() - start;

    return res.status(200).json({
      status: 'ok',
      database: 'connected',
      uptime: process.uptime(),
      latency: `${latencyMs}ms`,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (err: any) {
    return res.status(503).json({
      status: 'error',
      database: 'disconnected',
      message: 'Database connection failed',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
