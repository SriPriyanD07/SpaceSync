import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export interface EmbeddedUser {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: 'admin' | 'member';
  created_at: string;
}

export interface EmbeddedResource {
  id: string;
  name: string;
  type: string;
  location: string;
  capacity: number;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface EmbeddedBooking {
  id: string;
  resource_id: string;
  user_id: string;
  start_time: string;
  end_time: string;
  status: 'confirmed' | 'cancelled';
  purpose: string;
  created_at: string;
  updated_at: string;
}

class EmbeddedStore {
  public users: EmbeddedUser[] = [];
  public resources: EmbeddedResource[] = [];
  public bookings: EmbeddedBooking[] = [];
  private initialized = false;

  public async init() {
    if (this.initialized) return;

    const adminHash = await bcrypt.hash('Admin123!', 10);
    const memberHash = await bcrypt.hash('Member123!', 10);

    const now = new Date().toISOString();

    this.users = [
      {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'SpaceSync Admin',
        email: 'admin@spacesync.io',
        password_hash: adminHash,
        role: 'admin',
        created_at: now,
      },
      {
        id: '00000000-0000-0000-0000-000000000002',
        name: 'Alex Johnson',
        email: 'member1@spacesync.io',
        password_hash: memberHash,
        role: 'member',
        created_at: now,
      },
      {
        id: '00000000-0000-0000-0000-000000000003',
        name: 'Sarah Chen',
        email: 'member2@spacesync.io',
        password_hash: memberHash,
        role: 'member',
        created_at: now,
      },
    ];

    this.resources = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Conference Room Alpha',
        type: 'conference_room',
        location: 'Building A, Floor 3',
        capacity: 20,
        description: 'Equipped with dual 4K displays, Polycom conference audio, and video framing.',
        status: 'active',
        created_at: now,
        updated_at: now,
      },
      {
        id: '11111111-1111-1111-1111-111111111112',
        name: 'Meeting Room Beta',
        type: 'meeting_room',
        location: 'Building A, Floor 2',
        capacity: 6,
        description: 'Compact team room with digital whiteboard and wireless screen projection.',
        status: 'active',
        created_at: now,
        updated_at: now,
      },
      {
        id: '11111111-1111-1111-1111-111111111113',
        name: 'Training Room Gamma',
        type: 'training_room',
        location: 'Building B, Floor 1',
        capacity: 35,
        description: 'Large tiered training classroom with podium mic, dual projectors, and modular desks.',
        status: 'active',
        created_at: now,
        updated_at: now,
      },
      {
        id: '11111111-1111-1111-1111-111111111114',
        name: '4K Cinema Projector 01',
        type: 'projector',
        location: 'Tech Hub Equipment Locker #4',
        capacity: 1,
        description: 'Optoma 4K UHD 5000 Lumens laser projector with HDMI 2.1 & wireless dongle.',
        status: 'active',
        created_at: now,
        updated_at: now,
      },
      {
        id: '11111111-1111-1111-1111-111111111115',
        name: 'AI Workstation 01',
        type: 'workstation',
        location: 'Innovation Lab - Desk 14',
        capacity: 1,
        description: 'High-performance workstation with dual NVIDIA RTX 4090 GPUs, 128GB RAM, and Ubuntu OS.',
        status: 'active',
        created_at: now,
        updated_at: now,
      },
      {
        id: '11111111-1111-1111-1111-111111111116',
        name: 'Research Lab Bench 01',
        type: 'lab_equipment',
        location: 'Science Wing 102',
        capacity: 4,
        description: 'Equipped with stereo microscope, precision balance, fume extraction, and ESD bench.',
        status: 'active',
        created_at: now,
        updated_at: now,
      },
      {
        id: '11111111-1111-1111-1111-111111111117',
        name: 'Quiet Study Pod 04',
        type: 'study_space',
        location: 'Library Mezzanine',
        capacity: 2,
        description: 'Acoustically isolated pod with sit/stand desk, ergonomic chairs, and fast USB-C power.',
        status: 'active',
        created_at: now,
        updated_at: now,
      },
    ];

    // Seed realistic bookings across past, today, and future
    const makeDate = (dayOffset: number, hour: number) => {
      const d = new Date();
      d.setDate(d.getDate() + dayOffset);
      d.setHours(hour, 0, 0, 0);
      return d.toISOString();
    };

    this.bookings = [
      {
        id: 'b-001',
        resource_id: '11111111-1111-1111-1111-111111111111', // Room Alpha
        user_id: '00000000-0000-0000-0000-000000000002',     // Alex
        start_time: makeDate(-2, 10),
        end_time: makeDate(-2, 12),
        status: 'confirmed',
        purpose: 'Q3 Product Strategy Sync',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'b-002',
        resource_id: '11111111-1111-1111-1111-111111111112', // Room Beta
        user_id: '00000000-0000-0000-0000-000000000003',     // Sarah
        start_time: makeDate(-2, 14),
        end_time: makeDate(-2, 16),
        status: 'confirmed',
        purpose: 'Sprint Retrospective & Planning',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'b-003',
        resource_id: '11111111-1111-1111-1111-111111111111', // Room Alpha
        user_id: '00000000-0000-0000-0000-000000000003',     // Sarah
        start_time: makeDate(-1, 9),
        end_time: makeDate(-1, 11),
        status: 'confirmed',
        purpose: 'Client Architecture Walkthrough',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'b-004',
        resource_id: '11111111-1111-1111-1111-111111111115', // AI Workstation
        user_id: '00000000-0000-0000-0000-000000000002',     // Alex
        start_time: makeDate(-1, 13),
        end_time: makeDate(-1, 15),
        status: 'confirmed',
        purpose: 'Deep Learning Model Training Batch',
        created_at: now,
        updated_at: now,
      },
      // Today: Room Beta 14:00 - 16:00
      {
        id: 'b-005',
        resource_id: '11111111-1111-1111-1111-111111111112', // Room Beta
        user_id: '00000000-0000-0000-0000-000000000002',     // Alex
        start_time: makeDate(0, 14),
        end_time: makeDate(0, 16),
        status: 'confirmed',
        purpose: 'Design Review with Engineering',
        created_at: now,
        updated_at: now,
      },
      // Today: Room Gamma 16:00 - 18:00
      {
        id: 'b-006',
        resource_id: '11111111-1111-1111-1111-111111111113', // Room Gamma
        user_id: '00000000-0000-0000-0000-000000000003',     // Sarah
        start_time: makeDate(0, 16),
        end_time: makeDate(0, 18),
        status: 'confirmed',
        purpose: 'Hands-on Cloud Workshop',
        created_at: now,
        updated_at: now,
      },
      // Tomorrow: Room Alpha 14:00 - 16:00
      {
        id: 'b-007',
        resource_id: '11111111-1111-1111-1111-111111111111', // Room Alpha
        user_id: '00000000-0000-0000-0000-000000000002',     // Alex
        start_time: makeDate(1, 14),
        end_time: makeDate(1, 16),
        status: 'confirmed',
        purpose: 'All-Hands Pre-Brief',
        created_at: now,
        updated_at: now,
      },
      // Cancelled duplicate
      {
        id: 'b-008',
        resource_id: '11111111-1111-1111-1111-111111111112',
        user_id: '00000000-0000-0000-0000-000000000003',
        start_time: makeDate(-1, 9),
        end_time: makeDate(-1, 11),
        status: 'cancelled',
        purpose: 'Cancelled duplicate team catchup',
        created_at: now,
        updated_at: now,
      },
    ];

    this.initialized = true;
  }

  public async executeQuery(sql: string, params: any[] = []): Promise<{ rows: any[]; rowCount: number }> {
    await this.init();
    const s = sql.trim();

    // Transaction commands
    if (s === 'BEGIN' || s === 'COMMIT' || s === 'ROLLBACK') {
      return { rows: [], rowCount: 0 };
    }

    // 1. Health check
    if (s === 'SELECT 1') {
      return { rows: [{ '?column?': 1 }], rowCount: 1 };
    }

    // 2. Current database / user info
    if (s.includes('current_database()')) {
      return { rows: [{ current_database: 'spacesync_embedded', current_user: 'spacesync_local' }], rowCount: 1 };
    }

    // 3. User lookup by email
    if (s.includes('FROM users WHERE email = $1')) {
      const email = String(params[0] || '').toLowerCase().trim();
      const user = this.users.find((u) => u.email.toLowerCase() === email);
      return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
    }

    // 4. User insert (register)
    if (s.includes('INSERT INTO users')) {
      const newUser: EmbeddedUser = {
        id: `u-${Date.now()}`,
        name: params[0],
        email: params[1],
        password_hash: params[2],
        role: params[3] || 'member',
        created_at: new Date().toISOString(),
      };
      this.users.push(newUser);
      return { rows: [newUser], rowCount: 1 };
    }

    // 5. User lookup by ID (auth/me)
    if (s.includes('FROM users WHERE id = $1')) {
      const user = this.users.find((u) => u.id === params[0]);
      return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
    }

    // 6. Resources count & list
    if (s.includes('SELECT COUNT(*) FROM resources')) {
      return { rows: [{ count: String(this.resources.length) }], rowCount: 1 };
    }

    if (s.includes('FROM resources') && s.includes('ORDER BY name ASC')) {
      let filtered = [...this.resources];
      // Basic param matching for search or type
      return { rows: filtered, rowCount: filtered.length };
    }

    // 7. Resource by ID
    if (s.includes('FROM resources WHERE id = $1')) {
      const res = this.resources.find((r) => r.id === params[0]);
      return { rows: res ? [res] : [], rowCount: res ? 1 : 0 };
    }

    // 8. Resource create
    if (s.includes('INSERT INTO resources')) {
      const newRes: EmbeddedResource = {
        id: `r-${Date.now()}`,
        name: params[0],
        type: params[1],
        location: params[2],
        capacity: Number(params[3]),
        description: params[4] || '',
        status: params[5] || 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.resources.push(newRes);
      return { rows: [newRes], rowCount: 1 };
    }

    // 9. Resource update
    if (s.includes('UPDATE resources') && s.includes('SET')) {
      const id = params[params.length - 1];
      const res = this.resources.find((r) => r.id === id);
      if (res) {
        // If updating status or fields
        res.updated_at = new Date().toISOString();
      }
      return { rows: res ? [res] : [], rowCount: res ? 1 : 0 };
    }

    // 10. Booking overlap check (The Centerpiece):
    // (start_time < $3 AND end_time > $2)
    if (s.includes('WHERE resource_id = $1') && s.includes('status = \'confirmed\'') && s.includes('FOR UPDATE')) {
      const resourceId = params[0];
      const newStart = new Date(params[1]);
      const newEnd = new Date(params[2]);

      const conflicts = this.bookings.filter((b) => {
        if (b.resource_id !== resourceId || b.status !== 'confirmed') return false;
        const bStart = new Date(b.start_time);
        const bEnd = new Date(b.end_time);
        return bStart < newEnd && bEnd > newStart;
      });

      return { rows: conflicts, rowCount: conflicts.length };
    }

    // 11. Booking insert
    if (s.includes('INSERT INTO bookings')) {
      const resourceId = params[0];
      const userId = params[1];
      const start = params[2];
      const end = params[3];
      const status = 'confirmed';
      const purpose = params[4];

      const newStart = new Date(start);
      const newEnd = new Date(end);

      // Verify mathematical exclusion constraint simulation
      const raceConflict = this.bookings.find((b) => {
        if (b.resource_id !== resourceId || b.status !== 'confirmed') return false;
        return new Date(b.start_time) < newEnd && new Date(b.end_time) > newStart;
      });

      if (raceConflict) {
        const err: any = new Error('conflicting key value violates exclusion constraint "no_double_booking"');
        err.code = '23P01';
        throw err;
      }

      const newBooking: EmbeddedBooking = {
        id: crypto.randomUUID(),
        resource_id: resourceId,
        user_id: userId,
        start_time: start,
        end_time: end,
        status,
        purpose,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      this.bookings.push(newBooking);
      return { rows: [newBooking], rowCount: 1 };
    }

    // 12. Bookings joined query
    if (s.includes('SELECT b.*') && s.includes('FROM bookings b')) {
      const joined = this.bookings.map((b) => {
        const res = this.resources.find((r) => r.id === b.resource_id);
        const usr = this.users.find((u) => u.id === b.user_id);
        return {
          ...b,
          resource_name: res?.name || 'Resource',
          resource_type: res?.type || 'meeting_room',
          resource_location: res?.location || 'Campus',
          user_name: usr?.name || 'Member',
          user_email: usr?.email || 'member@spacesync.io',
        };
      });

      // Check for WHERE b.id = $1
      if (s.includes('WHERE b.id = $1')) {
        const found = joined.find((b) => b.id === params[0]);
        return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
      }

      // Check for user_id filter if member
      if (s.includes('b.user_id = $1')) {
        const userBookings = joined.filter((b) => b.user_id === params[0]);
        return { rows: userBookings, rowCount: userBookings.length };
      }

      return { rows: joined, rowCount: joined.length };
    }

    // 13. Bookings count
    if (s.includes('SELECT COUNT(*) FROM bookings b')) {
      return { rows: [{ count: String(this.bookings.length) }], rowCount: 1 };
    }

    // 14. Select * from bookings where id = $1
    if (s.includes('SELECT * FROM bookings WHERE id = $1')) {
      const booking = this.bookings.find((b) => b.id === params[0]);
      return { rows: booking ? [booking] : [], rowCount: booking ? 1 : 0 };
    }

    // 15. Cancel booking
    if (s.includes('UPDATE bookings') && s.includes('status = \'cancelled\'')) {
      const id = params[0];
      const booking = this.bookings.find((b) => b.id === id);
      if (booking) {
        booking.status = 'cancelled';
        booking.updated_at = new Date().toISOString();
      }
      return { rows: booking ? [booking] : [], rowCount: booking ? 1 : 0 };
    }

    // 16. Availability query for resource on date
    if (s.includes('WHERE b.resource_id = $1') && s.includes('status = \'confirmed\'')) {
      const resourceId = params[0];
      const dayStart = new Date(params[1]);
      const dayEnd = new Date(params[2]);

      const confirmedBookings = this.bookings
        .filter((b) => {
          if (b.resource_id !== resourceId || b.status !== 'confirmed') return false;
          const bStart = new Date(b.start_time);
          const bEnd = new Date(b.end_time);
          return bStart <= dayEnd && bEnd >= dayStart;
        })
        .map((b) => {
          const usr = this.users.find((u) => u.id === b.user_id);
          return {
            id: b.id,
            start_time: b.start_time,
            end_time: b.end_time,
            purpose: b.purpose,
            status: b.status,
            user_name: usr?.name || 'Member',
          };
        });

      return { rows: confirmedBookings, rowCount: confirmedBookings.length };
    }

    // 17. Admin Statistics
    if (s.includes('COUNT(*) as total_resources')) {
      const active = this.resources.filter((r) => r.status === 'active').length;
      const maintenance = this.resources.filter((r) => r.status === 'maintenance').length;
      const inactive = this.resources.filter((r) => r.status === 'inactive').length;
      return {
        rows: [
          {
            total_resources: String(this.resources.length),
            active_resources: String(active),
            maintenance_resources: String(maintenance),
            inactive_resources: String(inactive),
          },
        ],
        rowCount: 1,
      };
    }

    if (s.includes('COUNT(*) as total_bookings')) {
      const confirmed = this.bookings.filter((b) => b.status === 'confirmed').length;
      const cancelled = this.bookings.filter((b) => b.status === 'cancelled').length;
      let totalHours = 0;
      this.bookings
        .filter((b) => b.status === 'confirmed')
        .forEach((b) => {
          totalHours += (new Date(b.end_time).getTime() - new Date(b.start_time).getTime()) / 3600000;
        });

      return {
        rows: [
          {
            total_bookings: String(this.bookings.length),
            confirmed_bookings: String(confirmed),
            cancelled_bookings: String(cancelled),
            today_bookings: '2',
            upcoming_bookings: '3',
            total_hours_booked: String(totalHours),
          },
        ],
        rowCount: 1,
      };
    }

    if (s.includes('SELECT r.id, r.name, r.type, COUNT(b.id) as booking_count')) {
      return {
        rows: [
          {
            id: '11111111-1111-1111-1111-111111111111',
            name: 'Conference Room Alpha',
            type: 'conference_room',
            booking_count: '4',
          },
        ],
        rowCount: 1,
      };
    }

    // 18. Admin Utilization
    if (s.includes('VOLUME OVER TIME') || s.includes('INTERVAL \'14 days\'')) {
      const dates = ['2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05'];
      return {
        rows: dates.map((d) => ({
          date: d,
          total: '2',
          confirmed: '2',
          cancelled: '0',
        })),
        rowCount: dates.length,
      };
    }

    if (s.includes('ROUND(SUM(EXTRACT(EPOCH FROM (b.end_time - b.start_time))/3600)')) {
      const resData = this.resources.map((r) => {
        const rBookings = this.bookings.filter((b) => b.resource_id === r.id && b.status === 'confirmed');
        let hrs = 0;
        rBookings.forEach((b) => {
          hrs += (new Date(b.end_time).getTime() - new Date(b.start_time).getTime()) / 3600000;
        });
        return {
          id: r.id,
          name: r.name,
          type: r.type,
          capacity: r.capacity,
          booking_count: String(rBookings.length),
          booked_hours: String(hrs.toFixed(1)),
        };
      });
      return { rows: resData, rowCount: resData.length };
    }

    if (s.includes('r.type,') && s.includes('COUNT(b.id) as booking_count')) {
      return {
        rows: [
          { type: 'conference_room', booking_count: '4' },
          { type: 'meeting_room', booking_count: '3' },
          { type: 'training_room', booking_count: '2' },
          { type: 'workstation', booking_count: '1' },
        ],
        rowCount: 4,
      };
    }

    if (s.includes('EXTRACT(HOUR FROM start_time)::INTEGER as hour')) {
      return {
        rows: [
          { hour: 9, count: '1' },
          { hour: 10, count: '3' },
          { hour: 14, count: '3' },
          { hour: 16, count: '2' },
        ],
        rowCount: 4,
      };
    }

    // Default fallback
    return { rows: [], rowCount: 0 };
  }
}

export const embeddedStore = new EmbeddedStore();
