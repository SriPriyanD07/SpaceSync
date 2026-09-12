import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';
import { embeddedStore } from './embeddedDb';
import { getMigrationSql } from '../db/migrate';

dotenv.config();

// Enforce production mode if on cloud/Render or DATABASE_URL provided
if (!process.env.NODE_ENV && (process.env.DATABASE_URL || process.env.RENDER)) {
  process.env.NODE_ENV = 'production';
}

const connectionString = process.env.DATABASE_URL || 'postgres://spacesync_user:spacesync_password@localhost:5432/spacesync_db';

export const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.DATABASE_URL);

const isCloudDb = connectionString.includes('sslmode=require') || 
                  connectionString.includes('neon.tech') || 
                  connectionString.includes('supabase.co') ||
                  connectionString.includes('render.com') ||
                  isProduction;

export const pool = new Pool({
  connectionString,
  ssl: isCloudDb ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: isCloudDb ? 10000 : 3000, // 10s for serverless cloud TLS/cold start
});

// Authoritative production flag: Production NEVER uses embedded in-memory store
export let isUsingEmbeddedStore = false;

/**
 * Boot-time database readiness verifier.
 * Executes migrations and ensures authoritative resources exist before the server starts listening.
 */
export async function ensureDatabaseReady(): Promise<void> {
  console.log(`📡 Initializing SpaceSync Database (${isProduction ? 'Authoritative PostgreSQL / Cloud' : 'Development'})...`);
  
  let client: PoolClient | null = null;
  const maxAttempts = 5;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      client = await pool.connect();
      isUsingEmbeddedStore = false;
      break;
    } catch (err: any) {
      if (attempt === maxAttempts) {
        console.error(`❌ Fatal: Could not connect to PostgreSQL after ${maxAttempts} attempts: ${err.message}`);
        if (isProduction) {
          throw err; // In production, throw fatal error to avoid silent split-brain
        }
        console.log('⚡ Using SpaceSync Embedded Relational Engine (local development offline fallback only).');
        isUsingEmbeddedStore = true;
        return;
      }
      console.warn(`⏳ PostgreSQL connection attempt ${attempt}/${maxAttempts} failed: ${err.message}. Retrying in 2s...`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  if (!client) return;

  try {
    const dbInfo = await client.query('SELECT current_database(), current_user;');
    console.log(`✅ Connected to authoritative database: [${dbInfo.rows[0].current_database}] as user: [${dbInfo.rows[0].current_user}]`);

    // 1. Check if schema tables exist; if not, apply migrations
    const tableCheck = await client.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'resources');"
    );
    if (!tableCheck.rows[0]?.exists) {
      console.log('📦 Database schema tables not found in PostgreSQL. Running automated migration...');
      const sql = getMigrationSql();
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      console.log('✅ Automated schema migration applied successfully.');
    }

    // 2. Check resource inventory; if empty, run initial seed
    const countRes = await client.query('SELECT COUNT(*) FROM resources;');
    const resourceCount = parseInt(countRes.rows[0]?.count || '0', 10);
    console.log(`📊 Authoritative database resource count: ${resourceCount}`);

    if (resourceCount === 0) {
      console.log('🌱 Resources table is empty. Seeding initial resources with deterministic IDs...');
      const { seedDatabase } = await import('../db/seed');
      await seedDatabase();
      console.log('✅ Initial seed completed successfully.');
    }
  } catch (err: any) {
    console.error('❌ Database schema/seed initialization notice:', err.message);
    if (isProduction) {
      throw err;
    }
  } finally {
    client.release();
  }
}

// Check connection immediately on import for non-server runners (e.g. CLI/tests)
if (process.env.NODE_ENV !== 'test') {
  ensureDatabaseReady().catch((err) => {
    if (isProduction) {
      console.error('❌ Critical database initialization error:', err.message);
    }
  });
}

export const query = async (text: string, params?: any[]) => {
  if (isUsingEmbeddedStore && process.env.NODE_ENV !== 'test') {
    return embeddedStore.executeQuery(text, params);
  }
  return await pool.query(text, params);
};

export const getClient = async (): Promise<PoolClient> => {
  if (isUsingEmbeddedStore && process.env.NODE_ENV !== 'test') {
    const mockClient: any = {
      query: (sql: string, params?: any[]) => embeddedStore.executeQuery(sql, params),
      release: () => {},
    };
    return mockClient as PoolClient;
  }
  return await pool.connect();
};
