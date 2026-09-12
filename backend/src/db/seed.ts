import bcrypt from 'bcryptjs';
import { pool } from '../config/db';

export async function seedDatabase() {
  const client = await pool.connect();
  try {
    console.log('🌱 Starting database seeding...');
    await client.query('BEGIN');

    // 1. Insert/ensure Users with hashed passwords (idempotent, safe on conflict)
    const adminPasswordHash = await bcrypt.hash('Admin123!', 10);
    const memberPasswordHash = await bcrypt.hash('Member123!', 10);

    await client.query(
      `INSERT INTO users (id, name, email, password_hash, role) VALUES
        ('00000000-0000-0000-0000-000000000001', 'SpaceSync Admin', 'admin@spacesync.io', $1, 'admin'),
        ('00000000-0000-0000-0000-000000000002', 'Alex Johnson', 'member1@spacesync.io', $2, 'member'),
        ('00000000-0000-0000-0000-000000000003', 'Sarah Chen', 'member2@spacesync.io', $2, 'member')
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        role = EXCLUDED.role;`,
      [adminPasswordHash, memberPasswordHash]
    );

    const userRes = await client.query('SELECT id, email, role FROM users;');
    const admin = userRes.rows.find(u => u.role === 'admin') || userRes.rows[0];
    const member1 = userRes.rows.find(u => u.email === 'member1@spacesync.io') || userRes.rows[0];
    const member2 = userRes.rows.find(u => u.email === 'member2@spacesync.io') || userRes.rows[0];

    console.log(`👤 Verified ${userRes.rows.length} users (Admin & Members).`);

    // 2. Insert Diverse Resources with deterministic UUIDs (idempotent, safe on conflict)
    await client.query(
      `INSERT INTO resources (id, name, type, location, capacity, description, status) VALUES
        ('11111111-1111-1111-1111-111111111111', 'Conference Room Alpha', 'conference_room', 'Building A, Floor 3', 20, 'Equipped with dual 4K displays, Polycom conference audio, and video framing.', 'active'),
        ('11111111-1111-1111-1111-111111111112', 'Meeting Room Beta', 'meeting_room', 'Building A, Floor 2', 6, 'Compact team room with digital whiteboard and wireless screen projection.', 'active'),
        ('11111111-1111-1111-1111-111111111113', 'Training Room Gamma', 'training_room', 'Building B, Floor 1', 35, 'Large tiered training classroom with podium mic, dual projectors, and modular desks.', 'active'),
        ('11111111-1111-1111-1111-111111111114', '4K Cinema Projector 01', 'projector', 'Tech Hub Equipment Locker #4', 1, 'Optoma 4K UHD 5000 Lumens laser projector with HDMI 2.1 & wireless dongle.', 'active'),
        ('11111111-1111-1111-1111-111111111115', 'AI Workstation 01', 'workstation', 'Innovation Lab - Desk 14', 1, 'High-performance workstation with dual NVIDIA RTX 4090 GPUs, 128GB RAM, and Ubuntu OS.', 'active'),
        ('11111111-1111-1111-1111-111111111116', 'Research Lab Bench 01', 'lab_equipment', 'Science Wing 102', 4, 'Equipped with stereo microscope, precision balance, fume extraction, and ESD bench.', 'active'),
        ('11111111-1111-1111-1111-111111111117', 'Quiet Study Pod 04', 'study_space', 'Library Mezzanine', 2, 'Acoustically isolated pod with sit/stand desk, ergonomic chairs, and fast USB-C power.', 'active')
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        type = EXCLUDED.type,
        location = EXCLUDED.location,
        capacity = EXCLUDED.capacity,
        description = EXCLUDED.description,
        status = EXCLUDED.status;`
    );

    const resourceRes = await client.query('SELECT id, name, type FROM resources;');
    console.log(`🏢 Verified ${resourceRes.rows.length} resources in database.`);

    const roomAlpha = resourceRes.rows.find(r => r.name === 'Conference Room Alpha') || resourceRes.rows[0];
    const roomBeta = resourceRes.rows.find(r => r.name === 'Meeting Room Beta') || resourceRes.rows[0];
    const roomGamma = resourceRes.rows.find(r => r.name === 'Training Room Gamma') || resourceRes.rows[0];
    const workstation = resourceRes.rows.find(r => r.name === 'AI Workstation 01') || resourceRes.rows[0];

    // 3. Seed initial bookings only if bookings table is empty
    const bookingCountRes = await client.query('SELECT COUNT(*) FROM bookings;');
    const bookingCount = parseInt(bookingCountRes.rows[0]?.count || '0', 10);

    if (bookingCount === 0 && roomAlpha && roomBeta && roomGamma && workstation) {
      const now = new Date();
      const makeDate = (dayOffset: number, hour: number, minute: number = 0) => {
        const d = new Date(now);
        d.setDate(d.getDate() + dayOffset);
        d.setHours(hour, minute, 0, 0);
        return d.toISOString();
      };

      const sampleBookings = [
        { resource_id: roomAlpha.id, user_id: member1.id, start_time: makeDate(-2, 10), end_time: makeDate(-2, 12), status: 'confirmed', purpose: 'Q3 Product Strategy Sync' },
        { resource_id: roomBeta.id, user_id: member2.id, start_time: makeDate(-2, 14), end_time: makeDate(-2, 16), status: 'confirmed', purpose: 'Sprint Retrospective & Planning' },
        { resource_id: roomAlpha.id, user_id: member2.id, start_time: makeDate(-1, 9), end_time: makeDate(-1, 11), status: 'confirmed', purpose: 'Client Architecture Walkthrough' },
        { resource_id: workstation.id, user_id: member1.id, start_time: makeDate(-1, 13), end_time: makeDate(-1, 15), status: 'confirmed', purpose: 'Deep Learning Model Training Batch' },
        { resource_id: roomBeta.id, user_id: member1.id, start_time: makeDate(0, 14), end_time: makeDate(0, 16), status: 'confirmed', purpose: 'Design Review with Engineering' },
        { resource_id: roomGamma.id, user_id: member2.id, start_time: makeDate(0, 16), end_time: makeDate(0, 18), status: 'confirmed', purpose: 'Hands-on Cloud Workshop' },
        { resource_id: roomAlpha.id, user_id: member1.id, start_time: makeDate(1, 10), end_time: makeDate(1, 12), status: 'confirmed', purpose: 'All-Hands Pre-Brief' },
        { resource_id: roomBeta.id, user_id: member2.id, start_time: makeDate(-1, 9), end_time: makeDate(-1, 11), status: 'cancelled', purpose: 'Cancelled duplicate team catchup' },
      ];

      for (const b of sampleBookings) {
        await client.query(
          `INSERT INTO bookings (resource_id, user_id, start_time, end_time, status, purpose)
           VALUES ($1, $2, $3, $4, $5, $6);`,
          [b.resource_id, b.user_id, b.start_time, b.end_time, b.status, b.purpose]
        );
      }
      console.log('📅 Seeded realistic initial bookings.');
    } else {
      console.log(`📅 Bookings table already has ${bookingCount} existing bookings. Preserving data.`);
    }

    await client.query('COMMIT');
    console.log('🎉 Database seeding completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
