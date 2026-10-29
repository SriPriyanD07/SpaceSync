import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';
import { embeddedStore } from './embeddedDb';
import { getMigrationSql } from '../db/migrate';

// Preserve existing NODE_ENV if set (e.g. 'test' in Jest runner)
const existingEnv = process.env.NODE_ENV;
dotenv.config();
if (existingEnv) {
  process.env.NODE_ENV = existingEnv;
}

const rawDbUrl = (process.env.DATABASE_URL || '').trim();
// Check if user provided an actual connection string (not blank and not default localhost placeholder when in container/prod)
const isDefaultLocalhost = rawDbUrl === '' || rawDbUrl === 'postgres://spacesync_user:spacesync_password@localhost:5432/spacesync_db';

// Enforce production mode if on cloud/Render or remote DATABASE_URL provided or INSTANCE_ID set
if (!process.env.NODE_ENV && (process.env.RENDER || (!isDefaultLocalhost && rawDbUrl) || process.env.INSTANCE_ID)) {
  process.env.NODE_ENV = 'production';
}

export const isProduction = process.env.NODE_ENV === 'production';

const connectionString = rawDbUrl || 'postgres://spacesync_user:spacesync_password@localhost:5432/spacesync_db';

const isCloudDb = connectionString.includes('sslmode=require') || 
                  connectionString.includes('neon.tech') || 
                  connectionString.includes('supabase.co') ||
                  connectionString.includes('render.com') ||
                  (!isDefaultLocalhost && isProduction);

// Sensible connection pool sizing to avoid exhausting Neon connection limits across multiple instances
const defaultPoolMax = isProduction ? 7 : 10;
const poolMax = process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX, 10) : defaultPoolMax;

export const pool = new Pool({
  connectionString,
  ssl: isCloudDb ? { rejectUnauthorized: false } : false,
  max: poolMax,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: isCloudDb ? 10000 : 3000, // 10s for serverless cloud TLS/cold start
});

// Authoritative production flag: Production NEVER uses embedded in-memory store
export let isUsingEmbeddedStore = false;

// Idempotency lock to prevent race conditions during multi-instance cold starts
let dbInitPromise: Promise<void> | null = null;

/**
 * Boot-time database readiness verifier.
 * Executes migrations and ensures authoritative resources exist before the server starts listening.
 */
export async function ensureDatabaseReady(): Promise<void> {
  if (dbInitPromise) {
    return dbInitPromise;
  }

  dbInitPromise = (async () => {
    const instanceId = process.env.INSTANCE_ID || 'backend-primary';

    // If running in container or production and DATABASE_URL is not configured with remote DB
    if ((isProduction || process.env.INSTANCE_ID) && isDefaultLocalhost) {
      console.warn(`⚠️ [${instanceId}] DATABASE_URL is not set or is using the localhost placeholder.`);
      console.warn(`👉 [${instanceId}] To connect to your Neon PostgreSQL database, configure DATABASE_URL in root .env or backend/.env.`);
      if (process.env.ALLOW_EMBEDDED_DB !== 'true') {
        throw new Error(`[${instanceId}] Missing DATABASE_URL for PostgreSQL connection.`);
      }
    }

    console.log(`📡 [${instanceId}] Initializing SpaceSync Database (${isProduction ? 'Authoritative PostgreSQL / Cloud' : 'Development'})...`);
    
    let client: PoolClient | null = null;
    const maxAttempts = (isProduction || isCloudDb) ? 5 : 3;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        client = await pool.connect();
        isUsingEmbeddedStore = false;
        break;
      } catch (err: any) {
        if (attempt === maxAttempts) {
          console.error(`❌ [${instanceId}] Fatal: Could not connect to PostgreSQL after ${maxAttempts} attempts: ${err.message}`);
          // Never fall back to embedded store if production, or if in Docker, or if ALLOW_EMBEDDED_DB is not explicitly true
          const allowEmbedded = process.env.ALLOW_EMBEDDED_DB === 'true' && !isProduction && process.env.NODE_ENV !== 'production';
          if (!allowEmbedded) {
            throw err;
          }
          console.log(`⚡ [${instanceId}] Using SpaceSync Embedded Relational Engine (local development offline fallback only).`);
          isUsingEmbeddedStore = true;
          return;
        }
        console.warn(`⏳ [${instanceId}] PostgreSQL connection attempt ${attempt}/${maxAttempts} failed: ${err.message}. Retrying in 2s...`);
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    if (!client) return;

    try {
      const dbInfo = await client.query('SELECT current_database(), current_user;');
      console.log(`✅ [${instanceId}] Connected to authoritative database: [${dbInfo.rows[0].current_database}] as user: [${dbInfo.rows[0].current_user}]`);

      // 1. Check if schema tables exist; if not, apply migrations
      const tableCheck = await client.query(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'resources');"
      );
      if (!tableCheck.rows[0]?.exists) {
        console.log(`📦 [${instanceId}] Database schema tables not found in PostgreSQL. Running automated migration...`);
        const sql = getMigrationSql();
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
        console.log(`✅ [${instanceId}] Automated schema migration applied successfully.`);
      }

      // 2. Check resource inventory; if empty, run initial seed
      const countRes = await client.query('SELECT COUNT(*) FROM resources;');
      const resourceCount = parseInt(countRes.rows[0]?.count || '0', 10);
      console.log(`📊 [${instanceId}] Authoritative database resource count: ${resourceCount}`);

      if (resourceCount === 0) {
        console.log(`🌱 [${instanceId}] Resources table is empty. Seeding initial resources with deterministic IDs...`);
        const { seedDatabase } = await import('../db/seed');
        await seedDatabase();
        console.log(`✅ [${instanceId}] Initial seed completed successfully.`);
      }
    } catch (err: any) {
      console.error(`❌ [${instanceId}] Database schema/seed initialization notice:`, err.message);
      if (isProduction) {
        throw err;
      }
    } finally {
      client.release();
    }
  })();

  return dbInitPromise;
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
