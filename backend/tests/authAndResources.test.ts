import request from 'supertest';
import app from '../src/app';
import * as db from '../src/config/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'spacesync_development_jwt_secret_key_2026_secure';

describe('Authentication, RBAC & Resource Management', () => {
  const adminUser = { id: 'u-admin-1', name: 'Admin', email: 'admin@spacesync.io', role: 'admin' as const };
  const memberUser = { id: 'u-member-1', name: 'Member', email: 'member1@spacesync.io', role: 'member' as const };

  const adminToken = jwt.sign(adminUser, JWT_SECRET, { expiresIn: '1h' });
  const memberToken = jwt.sign(memberUser, JWT_SECRET, { expiresIn: '1h' });

  beforeEach(() => {
    jest.spyOn(db, 'query').mockImplementation(async (sql: string, params: any[] = []) => {
      const sqlTrimmed = sql.trim();

      // Health check
      if (sqlTrimmed === 'SELECT 1') {
        return { rows: [{ '?column?': 1 }] } as any;
      }

      // User lookup by email
      if (sqlTrimmed.includes('FROM users WHERE email = $1')) {
        const email = params[0];
        if (email === 'admin@spacesync.io') {
          const hash = await bcrypt.hash('Admin123!', 4);
          return { rows: [{ ...adminUser, password_hash: hash, created_at: new Date().toISOString() }] } as any;
        }
        if (email === 'member1@spacesync.io') {
          const hash = await bcrypt.hash('Member123!', 4);
          return { rows: [{ ...memberUser, password_hash: hash, created_at: new Date().toISOString() }] } as any;
        }
        return { rows: [] } as any;
      }

      // User insert (Registration)
      if (sqlTrimmed.includes('INSERT INTO users')) {
        return {
          rows: [{
            id: 'u-new-123',
            name: params[0],
            email: params[1],
            role: params[3],
            created_at: new Date().toISOString(),
          }],
        } as any;
      }

      // Me query
      if (sqlTrimmed.includes('FROM users WHERE id = $1')) {
        return { rows: [memberUser] } as any;
      }

      // Resources list
      if (sqlTrimmed.includes('SELECT COUNT(*) FROM resources')) {
        return { rows: [{ count: '2' }] } as any;
      }

      if (sqlTrimmed.includes('FROM resources') && sqlTrimmed.includes('ORDER BY name ASC')) {
        return {
          rows: [
            {
              id: 'r-1',
              name: 'Conference Room Alpha',
              type: 'conference_room',
              location: 'Building A, Floor 3',
              capacity: 20,
              status: 'active',
              description: 'Executive conference room',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            {
              id: 'r-2',
              name: 'Meeting Room Beta',
              type: 'meeting_room',
              location: 'Building A, Floor 2',
              capacity: 6,
              status: 'active',
              description: 'Small huddle room',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
        } as any;
      }

      // Resource by ID (matches SELECT * or SELECT id)
      if (sqlTrimmed.includes('FROM resources WHERE id = $1')) {
        return {
          rows: [{
            id: params[0],
            name: 'Conference Room Alpha',
            type: 'conference_room',
            location: 'Building A, Floor 3',
            capacity: 20,
            status: 'active',
            description: 'Executive conference room',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }],
        } as any;
      }

      // Resource create
      if (sqlTrimmed.includes('INSERT INTO resources')) {
        return {
          rows: [{
            id: 'r-new',
            name: params[0],
            type: params[1],
            location: params[2],
            capacity: params[3],
            description: params[4],
            status: params[5],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }],
        } as any;
      }

      // Resource update
      if (sqlTrimmed.includes('UPDATE resources') && sqlTrimmed.includes('SET')) {
        return {
          rows: [{
            id: params[params.length - 1],
            name: 'Updated Name',
            type: 'conference_room',
            location: 'Building B',
            capacity: 25,
            status: 'active',
            updated_at: new Date().toISOString(),
          }],
        } as any;
      }

      // Admin stats
      if (sqlTrimmed.includes('COUNT(*) as total_resources')) {
        return {
          rows: [{
            total_resources: '7',
            active_resources: '7',
            maintenance_resources: '0',
            inactive_resources: '0',
          }],
        } as any;
      }

      if (sqlTrimmed.includes('COUNT(*) as total_bookings')) {
        return {
          rows: [{
            total_bookings: '12',
            confirmed_bookings: '10',
            cancelled_bookings: '2',
            today_bookings: '3',
            upcoming_bookings: '5',
            total_hours_booked: '28.5',
          }],
        } as any;
      }

      if (sqlTrimmed.includes('SELECT r.id, r.name, r.type, COUNT(b.id) as booking_count')) {
        return {
          rows: [{
            id: 'r-1',
            name: 'Conference Room Alpha',
            type: 'conference_room',
            booking_count: '6',
          }],
        } as any;
      }

      if (sqlTrimmed.includes('VOLUME OVER TIME') || sqlTrimmed.includes('INTERVAL \'14 days\'')) {
        return {
          rows: [
            { date: '2026-09-04', total: '4', confirmed: '4', cancelled: '0' },
            { date: '2026-09-05', total: '5', confirmed: '4', cancelled: '1' },
          ],
        } as any;
      }

      return { rows: [] } as any;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Health Endpoint', () => {
    test('GET /api/health should return ok and connected database', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.database).toBe('connected');
    });
  });

  describe('Auth Flow', () => {
    test('POST /api/auth/register should register a user and return token', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'New Tester',
          email: 'newtester@spacesync.io',
          password: 'Password123!',
        });

      expect(res.status).toBe(201);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('newtester@spacesync.io');
    });

    test('POST /api/auth/login with valid credentials returns token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'member1@spacesync.io',
          password: 'Member123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.role).toBe('member');
    });

    test('POST /api/auth/login with invalid password returns 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'member1@spacesync.io',
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Invalid email or password');
    });

    test('GET /api/auth/me returns current user info', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.id).toBe(memberUser.id);
    });

    test('GET /api/auth/me without token returns 401', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });

  describe('Resource Management & RBAC', () => {
    test('GET /api/resources returns resource list for all users', async () => {
      const res = await request(app).get('/api/resources');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);
    });

    test('Member attempting to create resource is rejected (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/resources')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          name: 'Unauthorized Room',
          type: 'meeting_room',
          location: 'Floor 1',
          capacity: 4,
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied');
    });

    test('Admin can create new resource (201 Created)', async () => {
      const res = await request(app)
        .post('/api/resources')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Executive Boardroom',
          type: 'conference_room',
          location: 'Penthouse Floor',
          capacity: 30,
          description: 'High-end boardroom',
        });

      expect(res.status).toBe(201);
      expect(res.body.resource.name).toBe('Executive Boardroom');
    });

    test('Admin can update resource details (200 OK)', async () => {
      const res = await request(app)
        .patch('/api/resources/r-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          capacity: 25,
        });

      expect(res.status).toBe(200);
      expect(res.body.resource).toBeDefined();
    });

    test('Member attempting to access admin statistics is rejected (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/admin/statistics')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
    });

    test('Admin can access KPI statistics (200 OK)', async () => {
      const res = await request(app)
        .get('/api/admin/statistics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.resources.total).toBe(7);
      expect(res.body.bookings.total).toBe(12);
      expect(res.body.mostBookedResource.name).toBe('Conference Room Alpha');
    });
  });
});
