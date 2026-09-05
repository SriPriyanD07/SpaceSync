import bcrypt from 'bcryptjs';
import { pool } from '../config/db';

export async function seedDatabase() {
  const client = await pool.connect();
  try {
    console.log('🌱 Starting database seeding...');
    await client.query('BEGIN');

    // 1. Clear existing seed data if needed
    await client.query('DELETE FROM bookings');
    await client.query('DELETE FROM resources');
    await client.query('DELETE FROM users');

    // 2. Insert Users with hashed passwords
    const adminPasswordHash = await bcrypt.hash('Admin123!', 10);
    const memberPasswordHash = await bcrypt.hash('Member123!', 10);

    const userRes = await client.query(
      `INSERT INTO users (name, email, password_hash, role) VALUES
        ('SpaceSync Admin', 'admin@spacesync.io', $1, 'admin'),
        ('Alex Johnson', 'member1@spacesync.io', $2, 'member'),
        ('Sarah Chen', 'member2@spacesync.io', $2, 'member')
      RETURNING id, email, role;`,
      [adminPasswordHash, memberPasswordHash]
    );

    const admin = userRes.rows.find(u => u.role === 'admin');
    const member1 = userRes.rows.find(u => u.email === 'member1@spacesync.io');
    const member2 = userRes.rows.find(u => u.email === 'member2@spacesync.io');

    console.log(`👤 Seeded ${userRes.rows.length} users (Admin & Members).`);

    // 3. Insert Diverse Resources
    const resourceRes = await client.query(
      `INSERT INTO resources (name, type, location, capacity, description, status) VALUES
        ('Conference Room Alpha', 'conference_room', 'Building A, Floor 3', 20, 'Equipped with dual 4K displays, Polycom conference audio, and video framing.', 'active'),
        ('Meeting Room Beta', 'meeting_room', 'Building A, Floor 2', 6, 'Compact team room with digital whiteboard and wireless screen projection.', 'active'),
        ('Training Room Gamma', 'training_room', 'Building B, Floor 1', 35, 'Large tiered training classroom with podium mic, dual projectors, and modular desks.', 'active'),
        ('4K Cinema Projector 01', 'projector', 'Tech Hub Equipment Locker #4', 1, 'Optoma 4K UHD 5000 Lumens laser projector with HDMI 2.1 & wireless dongle.', 'active'),
        ('AI Workstation 01', 'workstation', 'Innovation Lab - Desk 14', 1, 'High-performance workstation with dual NVIDIA RTX 4090 GPUs, 128GB RAM, and Ubuntu OS.', 'active'),
        ('Research Lab Bench 01', 'lab_equipment', 'Science Wing 102', 4, 'Equipped with stereo microscope, precision balance, fume extraction, and ESD bench.', 'active'),
        ('Quiet Study Pod 04', 'study_space', 'Library Mezzanine', 2, 'Acoustically isolated pod with sit/stand desk, ergonomic chairs, and fast USB-C power.', 'active')
      RETURNING id, name, type;`
    );

    console.log(`🏢 Seeded ${resourceRes.rows.length} resources.`);

    const roomAlpha = resourceRes.rows.find(r => r.name === 'Conference Room Alpha');
    const roomBeta = resourceRes.rows.find(r => r.name === 'Meeting Room Beta');
    const roomGamma = resourceRes.rows.find(r => r.name === 'Training Room Gamma');
    const workstation = resourceRes.rows.find(r => r.name === 'AI Workstation 01');

    // 4. Calculate dynamic timestamps for today, yesterday, 2 days ago, and tomorrow
    const now = new Date();
    
    // Helper to format ISO without milliseconds issues
    const makeDate = (dayOffset: number, hour: number, minute: number = 0) => {
      const d = new Date(now);
      d.setDate(d.getDate() + dayOffset);
      d.setHours(hour, minute, 0, 0);
      return d.toISOString();
    };

    // Past bookings (2 days ago)
    const pastStart1 = makeDate(-2, 10);
    const pastEnd1 = makeDate(-2, 12);
    const pastStart2 = makeDate(-2, 14);
    const pastEnd2 = makeDate(-2, 16);

    // Yesterday bookings
    const yestStart1 = makeDate(-1, 9);
    const yestEnd1 = makeDate(-1, 11);
    const yestStart2 = makeDate(-1, 13);
    const yestEnd2 = makeDate(-1, 15);

    // Today bookings (leaving 10:00 -> 12:00 open on Conference Room Alpha for demo!)
    const todayStart1 = makeDate(0, 14);
    const todayEnd1 = makeDate(0, 16);
    const todayStart2 = makeDate(0, 16);
    const todayEnd2 = makeDate(0, 18);

    // Tomorrow bookings
    const tmrwStart1 = makeDate(1, 10);
    const tmrwEnd1 = makeDate(1, 12);

    await client.query(
      `INSERT INTO bookings (resource_id, user_id, start_time, end_time, status, purpose) VALUES
        ($1, $2, $3, $4, 'confirmed', 'Q3 Product Strategy Sync'),
        ($5, $6, $7, $8, 'confirmed', 'Sprint Retrospective & Planning'),
        ($1, $6, $9, $10, 'confirmed', 'Client Architecture Walkthrough'),
        ($11, $2, $12, $13, 'confirmed', 'Deep Learning Model Training Batch'),
        ($5, $2, $14, $15, 'confirmed', 'Design Review with Engineering'),
        ($16, $6, $17, $18, 'confirmed', 'Hands-on Cloud Workshop'),
        ($1, $2, $19, $20, 'confirmed', 'All-Hands Pre-Brief'),
        ($5, $6, $9, $10, 'cancelled', 'Cancelled duplicate team catchup');`,
      [
        roomAlpha.id, member1.id, pastStart1, pastEnd1,
        roomBeta.id, member2.id, pastStart2, pastEnd2,
        roomAlpha.id, member2.id, yestStart1, yestEnd1,
        workstation.id, member1.id, yestStart2, yestEnd2,
        roomBeta.id, member1.id, todayStart1, todayEnd1,
        roomGamma.id, member2.id, todayStart2, todayEnd2,
        roomAlpha.id, member1.id, tmrwStart1, tmrwEnd1
      ]
    );

    console.log('📅 Seeded realistic past, today, and future bookings.');

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
