import app from './app';
import { pool, ensureDatabaseReady, isProduction } from './config/db';
import { validateSecurityConfiguration } from './config/security';

const PORT = process.env.PORT || 5000;
const instanceId = process.env.INSTANCE_ID || process.env.HOSTNAME || 'backend-primary';

async function startServer() {
  try {
    validateSecurityConfiguration();
    await ensureDatabaseReady();
  } catch (err: any) {
    console.error(`💥 [${instanceId}] Database readiness notice:`, err.message);
    // Keep HTTP server running so health check / diagnostics return HTTP 503 with
    // instance headers rather than container crash looping with exit 1
    if (!isProduction && process.env.ALLOW_EMBEDDED_DB !== 'true' && process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
  }

  const server = app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`🚀 SpaceSync Backend [${instanceId}] running on port ${PORT}`);
    console.log(`🌍 Active Environment: ${process.env.NODE_ENV || 'production'}`);
    console.log(`📖 API Documentation: http://localhost:${PORT}/api/docs`);
    console.log(`🩺 Health Check:      http://localhost:${PORT}/api/health`);
    console.log(`=========================================`);
  });

  process.on('SIGTERM', () => {
    console.log(`[${instanceId}] SIGTERM signal received. Closing HTTP server and database pool.`);
    server.close(() => {
      pool.end();
    });
  });
}

startServer();
