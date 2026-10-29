import fs from 'fs';
import path from 'path';
import { pool } from '../config/db';

export function getMigrationFiles(): { name: string; sql: string }[] {
  const migrationsDirCandidates = [
    path.join(__dirname, 'migrations'),
    path.join(__dirname, '..', 'src', 'db', 'migrations'),
    path.join(process.cwd(), 'src', 'db', 'migrations'),
    path.join(process.cwd(), 'backend', 'src', 'db', 'migrations'),
  ];

  for (const dir of migrationsDirCandidates) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
      if (files.length > 0) {
        return files.map(file => ({
          name: file,
          sql: fs.readFileSync(path.join(dir, file), 'utf8')
        }));
      }
    }
  }

  // Fallback if directory not found
  return [
    {
      name: '001_initial_schema.sql',
      sql: `
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
        CREATE EXTENSION IF NOT EXISTS "btree_gist";

        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(100) NOT NULL,
          email VARCHAR(255) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
          mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
          mfa_secret TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS resources (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(150) NOT NULL,
          type VARCHAR(50) NOT NULL,
          location VARCHAR(150) NOT NULL,
          capacity INTEGER NOT NULL DEFAULT 1 CHECK (capacity >= 1),
          description TEXT,
          status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'inactive')),
          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS bookings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          start_time TIMESTAMPTZ NOT NULL,
          end_time TIMESTAMPTZ NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
          purpose TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT valid_booking_time_range CHECK (end_time > start_time),
          CONSTRAINT no_double_booking EXCLUDE USING gist (
            resource_id WITH =,
            tstzrange(start_time, end_time) WITH &&
          ) WHERE (status = 'confirmed')
        );

        CREATE INDEX IF NOT EXISTS idx_bookings_resource_id ON bookings(resource_id);
        CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
        CREATE INDEX IF NOT EXISTS idx_bookings_start_end ON bookings(start_time, end_time);
        CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
        CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(type);
        CREATE INDEX IF NOT EXISTS idx_resources_status ON resources(status);
      `
    }
  ];
}

export function getMigrationSql(): string {
  return getMigrationFiles().map(m => m.sql).join('\n\n');
}

export async function runMigrations() {
  const client = await pool.connect();
  try {
    console.log('🚀 Running database migrations...');
    const migrations = getMigrationFiles();

    await client.query('BEGIN');
    for (const migration of migrations) {
      console.log(`  Applying migration: ${migration.name}`);
      await client.query(migration.sql);
    }
    await client.query('COMMIT');
    console.log('✅ Database migrations applied successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
