import app from './app';
import { pool } from './config/db';

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, async () => {
  console.log(`=========================================`);
  console.log(`🚀 SpaceSync Backend running on port ${PORT}`);
  console.log(`📖 API Documentation: http://localhost:${PORT}/api/docs`);
  console.log(`🩺 Health Check:      http://localhost:${PORT}/api/health`);
  console.log(`=========================================`);

  try {
    const res = await pool.query('SELECT current_database(), current_user;');
    console.log(`✅ Connected to PostgreSQL database: [${res.rows[0].current_database}] as user: [${res.rows[0].current_user}]`);
  } catch (err: any) {
    console.warn(`⚠️ PostgreSQL connection notice: ${err.message}`);
    console.warn(`👉 Make sure DATABASE_URL is configured or run 'docker compose up -d' for local database.`);
  }
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received. Closing HTTP server and database pool.');
  server.close(() => {
    pool.end();
  });
});
