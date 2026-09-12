import { Router, Request, Response } from 'express';
import { query, isUsingEmbeddedStore } from '../config/db';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const start = Date.now();
    const dbRes = await query('SELECT 1, current_database() as db_name;');
    const latencyMs = Date.now() - start;

    return res.status(200).json({
      status: 'ok',
      database: isUsingEmbeddedStore ? 'embedded' : 'connected',
      databaseName: isUsingEmbeddedStore ? 'embedded' : dbRes.rows[0]?.db_name,
      uptime: process.uptime(),
      latency: `${latencyMs}ms`,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
    });
  } catch (err: any) {
    return res.status(503).json({
      status: 'error',
      database: 'disconnected',
      message: 'Database connection failed',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
    });
  }
});

export default router;
