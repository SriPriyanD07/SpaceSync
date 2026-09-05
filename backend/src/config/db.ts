import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgres://spacesync_user:spacesync_password@localhost:5432/spacesync_db';

// Detect if SSL should be enabled (typical for Neon, Supabase, Render, Railway)
const isCloudDb = connectionString.includes('sslmode=require') || 
                  connectionString.includes('neon.tech') || 
                  connectionString.includes('supabase.co') ||
                  connectionString.includes('render.com') ||
                  process.env.NODE_ENV === 'production';

export const pool = new Pool({
  connectionString,
  ssl: isCloudDb ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

export const query = (text: string, params?: any[]) => pool.query(text, params);

export const getClient = (): Promise<PoolClient> => pool.connect();
