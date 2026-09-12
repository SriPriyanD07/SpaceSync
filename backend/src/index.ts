import app from './app';
import { pool, ensureDatabaseReady, isProduction } from './config/db';

const isCloudEnv = Boolean(process.env.RENDER || (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')));
if (isCloudEnv || !process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await ensureDatabaseReady();
  } catch (err: any) {
    console.error('💥 Fatal database initialization failure:', err.message);
    if (isProduction) {
      process.exit(1);
    }
  }

  const server = app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`🚀 SpaceSync Backend running on port ${PORT}`);
    console.log(`🌍 Active Environment: ${process.env.NODE_ENV}`);
    console.log(`📖 API Documentation: http://localhost:${PORT}/api/docs`);
    console.log(`🩺 Health Check:      http://localhost:${PORT}/api/health`);
    console.log(`=========================================`);
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received. Closing HTTP server and database pool.');
    server.close(() => {
      pool.end();
    });
  });
}

startServer();
