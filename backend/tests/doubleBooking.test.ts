import request from 'supertest';
import app from '../src/app';
import * as db from '../src/config/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'spacesync_development_jwt_secret_key_2026_secure';

describe('Double-Booking Prevention & Concurrency Centerpiece', () => {
  const adminUser = { id: '00000000-0000-0000-0000-000000000001', name: 'Admin', email: 'admin@spacesync.io', role: 'admin' as const };
  const member1 = { id: '00000000-0000-0000-0000-000000000002', name: 'Alex Johnson', email: 'member1@spacesync.io', role: 'member' as const };
  const member2 = { id: '00000000-0000-0000-0000-000000000003', name: 'Sarah Chen', email: 'member2@spacesync.io', role: 'member' as const };

  const member1Token = jwt.sign(member1, JWT_SECRET, { expiresIn: '1h' });
  const member2Token = jwt.sign(member2, JWT_SECRET, { expiresIn: '1h' });

  const testResourceId = '11111111-1111-1111-1111-111111111111';

  // In-memory store for simulated test executions
  let storedBookings: any[] = [];

  beforeEach(() => {
    storedBookings = [];

    // Mock pool.connect() to simulate transaction-safe execution and exclusion constraint
    jest.spyOn(db.pool, 'connect').mockImplementation(async () => {
      const mockClient: any = {
        query: jest.fn().mockImplementation(async (sql: string, params: any[] = []) => {
          const sqlTrimmed = sql.trim();

          if (sqlTrimmed === 'BEGIN' || sqlTrimmed === 'COMMIT' || sqlTrimmed === 'ROLLBACK') {
            return { rows: [] };
          }

          // Resource check
          if (sqlTrimmed.includes('FROM resources WHERE id = $1')) {
            return {
              rows: [{
                id: testResourceId,
                name: 'Conference Room Alpha',
                type: 'conference_room',
                location: 'Building A, Floor 3',
                capacity: 20,
                status: 'active'
              }],
            };
          }

          // Overlap check query:
          // (start_time < $3 AND end_time > $2)
          if (sqlTrimmed.includes('WHERE resource_id = $1') && sqlTrimmed.includes('AND status = \'confirmed\'') && sqlTrimmed.includes('FOR UPDATE')) {
            const resourceId = params[0];
            const newStart = new Date(params[1]);
            const newEnd = new Date(params[2]);

            const conflicts = storedBookings.filter((b) => {
              if (b.resource_id !== resourceId || b.status !== 'confirmed') return false;
              const bStart = new Date(b.start_time);
              const bEnd = new Date(b.end_time);
              // Standard mathematical interval overlap
              return (bStart < newEnd && bEnd > newStart);
            });

            return { rows: conflicts };
          }

          // Insert booking
          if (sqlTrimmed.includes('INSERT INTO bookings')) {
            const resourceId = params[0];
            const userId = params[1];
            const start = params[2];
            const end = params[3];
            const status = 'confirmed';
            const purpose = params[4];

            // Verify database exclusion constraint: EXCLUDE USING gist (resource_id WITH =, tsrange WITH &&)
            const newStart = new Date(start);
            const newEnd = new Date(end);
            const raceConflict = storedBookings.find(b => 
              b.resource_id === resourceId && 
              b.status === 'confirmed' && 
              (new Date(b.start_time) < newEnd && new Date(b.end_time) > newStart)
            );

            if (raceConflict) {
              const err: any = new Error('conflicting key value violates exclusion constraint "no_double_booking"');
              err.code = '23P01';
              throw err;
            }

            const newBooking = {
              id: `b-${Date.now()}-${Math.random()}`,
              resource_id: resourceId,
              user_id: userId,
              start_time: start,
              end_time: end,
              status,
              purpose,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            storedBookings.push(newBooking);
            return { rows: [newBooking] };
          }

          return { rows: [] };
        }),
        release: jest.fn(),
      };
      return mockClient;
    });

    // Mock general query helper
    jest.spyOn(db, 'query').mockImplementation(async (sql: string, params: any[] = []) => {
      const sqlTrimmed = sql.trim();

      if (sqlTrimmed.includes('FROM bookings b') && sqlTrimmed.includes('WHERE b.id = $1')) {
        const found = storedBookings.find(b => b.id === params[0]);
        if (!found) return { rows: [] } as any;
        return {
          rows: [{
            ...found,
            resource_name: 'Conference Room Alpha',
            resource_type: 'conference_room',
            resource_location: 'Building A, Floor 3',
            user_name: 'Alex Johnson',
            user_email: 'member1@spacesync.io'
          }]
        } as any;
      }

      if (sqlTrimmed.includes('SELECT * FROM bookings WHERE id = $1')) {
        const found = storedBookings.find(b => b.id === params[0]);
        return { rows: found ? [found] : [] } as any;
      }

      if (sqlTrimmed.includes('UPDATE bookings') && sqlTrimmed.includes('status = \'cancelled\'')) {
        const found = storedBookings.find(b => b.id === params[0]);
        if (found) {
          found.status = 'cancelled';
          found.updated_at = new Date().toISOString();
        }
        return { rows: found ? [found] : [] } as any;
      }

      return { rows: [] } as any;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Future date generation helper (tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split('T')[0];

  const makeIso = (hour: number, minute: number = 0) => {
    return `${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000Z`;
  };

  test('CRITICAL TEST 1: Existing booking 10:00 -> 12:00, Attempted booking 11:00 -> 13:00 MUST BE REJECTED (409 Conflict)', async () => {
    // 1. Create first booking: 10:00 -> 12:00
    const res1 = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${member1Token}`)
      .send({
        resource_id: testResourceId,
        start_time: makeIso(10, 0),
        end_time: makeIso(12, 0),
        purpose: 'Architecture Review A',
      });

    expect(res1.status).toBe(201);
    expect(res1.body.booking).toBeDefined();

    // 2. Attempt overlapping booking: 11:00 -> 13:00 (overlaps by 1 hour)
    const res2 = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${member2Token}`)
      .send({
        resource_id: testResourceId,
        start_time: makeIso(11, 0),
        end_time: makeIso(13, 0),
        purpose: 'Conflicting Design Meeting',
      });

    expect(res2.status).toBe(409);
    expect(res2.body.error).toBe('Conflict');
    expect(res2.body.message).toBe('This resource is already booked during the selected time.');
  });

  test('CRITICAL TEST 2: Existing booking 10:00 -> 12:00, New booking 12:00 -> 14:00 MUST BE ALLOWED (201 Created)', async () => {
    // 1. Create first booking: 10:00 -> 12:00
    const res1 = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${member1Token}`)
      .send({
        resource_id: testResourceId,
        start_time: makeIso(10, 0),
        end_time: makeIso(12, 0),
        purpose: 'Morning Session',
      });

    expect(res1.status).toBe(201);

    // 2. Create adjacent back-to-back booking: 12:00 -> 14:00 (exact boundary touch)
    const res2 = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${member2Token}`)
      .send({
        resource_id: testResourceId,
        start_time: makeIso(12, 0),
        end_time: makeIso(14, 0),
        purpose: 'Afternoon Session',
      });

    expect(res2.status).toBe(201);
    expect(res2.body.booking.start_time).toBe(makeIso(12, 0));
  });

  test('CRITICAL TEST 3: Preceding back-to-back booking 08:00 -> 10:00 MUST BE ALLOWED', async () => {
    // Existing: 10:00 -> 12:00
    await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${member1Token}`)
      .send({
        resource_id: testResourceId,
        start_time: makeIso(10, 0),
        end_time: makeIso(12, 0),
        purpose: 'Midday Session',
      });

    // New: 08:00 -> 10:00
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${member2Token}`)
      .send({
        resource_id: testResourceId,
        start_time: makeIso(8, 0),
        end_time: makeIso(10, 0),
        purpose: 'Early Morning Sync',
      });

    expect(res.status).toBe(201);
  });

  test('CRITICAL TEST 4: Encompassing overlap (09:00 -> 13:00) and Inner overlap (10:30 -> 11:30) MUST BE REJECTED', async () => {
    // Existing: 10:00 -> 12:00
    await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${member1Token}`)
      .send({
        resource_id: testResourceId,
        start_time: makeIso(10, 0),
        end_time: makeIso(12, 0),
        purpose: 'Base Booking',
      });

    // Inner overlap: 10:30 -> 11:30
    const innerRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${member2Token}`)
      .send({
        resource_id: testResourceId,
        start_time: makeIso(10, 30),
        end_time: makeIso(11, 30),
        purpose: 'Inside Existing',
      });
    expect(innerRes.status).toBe(409);

    // Encompassing overlap: 09:00 -> 13:00
    const outerRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${member2Token}`)
      .send({
        resource_id: testResourceId,
        start_time: makeIso(9, 0),
        end_time: makeIso(13, 0),
        purpose: 'Swallowing Existing',
      });
    expect(outerRes.status).toBe(409);
  });

  test('CRITICAL TEST 5: Cancelling booking releases the slot for other members', async () => {
    // 1. Create booking: 10:00 -> 12:00
    const createRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${member1Token}`)
      .send({
        resource_id: testResourceId,
        start_time: makeIso(10, 0),
        end_time: makeIso(12, 0),
        purpose: 'Initial Booking',
      });

    const bookingId = createRes.body.booking.id;

    // 2. Member 1 cancels their booking
    const cancelRes = await request(app)
      .patch(`/api/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${member1Token}`);

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.booking.status).toBe('cancelled');

    // 3. Member 2 can now book the previously occupied time slot
    const bookAgainRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${member2Token}`)
      .send({
        resource_id: testResourceId,
        start_time: makeIso(10, 0),
        end_time: makeIso(12, 0),
        purpose: 'New Booking after cancellation',
      });

    expect(bookAgainRes.status).toBe(201);
  });

  test('CRITICAL TEST 6: Member cannot view or cancel another member\'s booking (RBAC Isolation)', async () => {
    // Member 1 creates booking
    const createRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${member1Token}`)
      .send({
        resource_id: testResourceId,
        start_time: makeIso(14, 0),
        end_time: makeIso(16, 0),
        purpose: 'Private Member 1 Session',
      });

    const bookingId = createRes.body.booking.id;

    // Member 2 attempts to view Member 1's booking
    const viewRes = await request(app)
      .get(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${member2Token}`);

    expect(viewRes.status).toBe(403);
    expect(viewRes.body.message).toContain('You do not have permission');

    // Member 2 attempts to cancel Member 1's booking
    const cancelRes = await request(app)
      .patch(`/api/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${member2Token}`);

    expect(cancelRes.status).toBe(403);
    expect(cancelRes.body.message).toContain('You do not have permission');
  });
});
