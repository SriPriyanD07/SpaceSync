import { Response, NextFunction } from 'express';
import { pool, query } from '../config/db';
import { createBookingSchema } from '../utils/validation';
import { ConflictError, NotFoundError, ForbiddenError, ValidationError } from '../utils/errors';
import { AuthenticatedRequest } from '../types';

export async function createBooking(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const client = await pool.connect();
  try {
    if (!req.user) {
      throw new ForbiddenError('Authentication required to create a booking');
    }

    const validated = createBookingSchema.parse(req.body);
    const startTime = new Date(validated.start_time);
    const endTime = new Date(validated.end_time);

    // Prevent bookings in the distant past (allow a 5-minute buffer for client clock skew)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (startTime < fiveMinutesAgo) {
      throw new ValidationError('Booking cannot be made in the past');
    }

    // Check resource exists and is active
    const resourceRes = await client.query(
      'SELECT id, name, status FROM resources WHERE id = $1',
      [validated.resource_id]
    );

    if (resourceRes.rows.length === 0) {
      throw new NotFoundError('Resource not found');
    }

    const resource = resourceRes.rows[0];
    if (resource.status !== 'active') {
      throw new ValidationError(`Resource is currently ${resource.status} and cannot be booked`);
    }

    // Execute concurrency-safe booking within a database transaction
    await client.query('BEGIN');

    // 1. Check for overlapping confirmed bookings with row locking
    // Interval overlap condition: (start_time < new_end) AND (end_time > new_start)
    const overlapQuery = `
      SELECT id, start_time, end_time, purpose
      FROM bookings
      WHERE resource_id = $1
        AND status = 'confirmed'
        AND (start_time < $3 AND end_time > $2)
      FOR UPDATE;
    `;
    const overlapRes = await client.query(overlapQuery, [
      validated.resource_id,
      startTime.toISOString(),
      endTime.toISOString(),
    ]);

    if (overlapRes.rows.length > 0) {
      await client.query('ROLLBACK');
      throw new ConflictError('This resource is already booked during the selected time.');
    }

    // 2. Insert the booking (protected by both the transaction lock and the PostgreSQL exclusion constraint)
    const insertQuery = `
      INSERT INTO bookings (resource_id, user_id, start_time, end_time, status, purpose)
      VALUES ($1, $2, $3, $4, 'confirmed', $5)
      RETURNING id, resource_id, user_id, start_time, end_time, status, purpose, created_at, updated_at;
    `;
    const insertRes = await client.query(insertQuery, [
      validated.resource_id,
      req.user.id,
      startTime.toISOString(),
      endTime.toISOString(),
      validated.purpose.trim(),
    ]);

    await client.query('COMMIT');

    // Fetch joined response for client convenience
    const fullBookingRes = await query(`
      SELECT b.*, r.name as resource_name, r.type as resource_type, r.location as resource_location,
             u.name as user_name, u.email as user_email
      FROM bookings b
      JOIN resources r ON b.resource_id = r.id
      JOIN users u ON b.user_id = u.id
      WHERE b.id = $1;
    `, [insertRes.rows[0].id]);

    return res.status(201).json({
      message: 'Booking created successfully',
      booking: fullBookingRes.rows[0],
    });
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {});
    // If PostgreSQL exclusion constraint caught a simultaneous concurrent race:
    if (err.code === '23P01') {
      return next(new ConflictError('This resource is already booked during the selected time.'));
    }
    return next(err);
  } finally {
    client.release();
  }
}

export async function getBookings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new ForbiddenError('Authentication required');
    }

    const { resource_id, user_id, status, date, page = '1', limit = '50' } = req.query;

    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // RBAC: Member can ONLY see their own bookings. Admin can see all or filter.
    if (req.user.role === 'member') {
      conditions.push(`b.user_id = $${paramIndex++}`);
      values.push(req.user.id);
    } else if (user_id) {
      conditions.push(`b.user_id = $${paramIndex++}`);
      values.push(user_id);
    }

    if (resource_id) {
      conditions.push(`b.resource_id = $${paramIndex++}`);
      values.push(resource_id);
    }

    if (status) {
      conditions.push(`b.status = $${paramIndex++}`);
      values.push(status);
    }

    if (date) {
      conditions.push(`DATE(b.start_time) = $${paramIndex++}`);
      values.push(date);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    const countRes = await query(`SELECT COUNT(*) FROM bookings b ${whereClause}`, values);
    const total = parseInt(countRes.rows[0].count, 10);

    const dataQuery = `
      SELECT b.*, 
             r.name as resource_name, r.type as resource_type, r.location as resource_location,
             u.name as user_name, u.email as user_email
      FROM bookings b
      JOIN resources r ON b.resource_id = r.id
      JOIN users u ON b.user_id = u.id
      ${whereClause}
      ORDER BY b.start_time DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++};
    `;
    const dataRes = await query(dataQuery, [...values, limitNum, offset]);

    return res.status(200).json({
      data: dataRes.rows,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function getBookingById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new ForbiddenError('Authentication required');
    }

    const { id } = req.params;
    const result = await query(`
      SELECT b.*, 
             r.name as resource_name, r.type as resource_type, r.location as resource_location,
             u.name as user_name, u.email as user_email
      FROM bookings b
      JOIN resources r ON b.resource_id = r.id
      JOIN users u ON b.user_id = u.id
      WHERE b.id = $1;
    `, [id]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Booking not found');
    }

    const booking = result.rows[0];

    // Security: Member can only view their own booking
    if (req.user.role !== 'admin' && booking.user_id !== req.user.id) {
      throw new ForbiddenError('You do not have permission to view this booking');
    }

    return res.status(200).json({
      booking,
    });
  } catch (err) {
    return next(err);
  }
}

export async function cancelBooking(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new ForbiddenError('Authentication required');
    }

    const { id } = req.params;
    const existing = await query('SELECT * FROM bookings WHERE id = $1', [id]);

    if (existing.rows.length === 0) {
      throw new NotFoundError('Booking not found');
    }

    const booking = existing.rows[0];

    // Security: Member can only cancel their own booking
    if (req.user.role !== 'admin' && booking.user_id !== req.user.id) {
      throw new ForbiddenError('You do not have permission to cancel this booking');
    }

    if (booking.status === 'cancelled') {
      return res.status(200).json({
        message: 'Booking is already cancelled',
        booking,
      });
    }

    const result = await query(`
      UPDATE bookings
      SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *;
    `, [id]);

    return res.status(200).json({
      message: 'Booking cancelled successfully. The time slot has been released.',
      booking: result.rows[0],
    });
  } catch (err) {
    return next(err);
  }
}

export async function getResourceAvailability(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const dateParam = (req.query.date as string) || new Date().toISOString().split('T')[0];

    // Validate resource exists
    const resourceRes = await query('SELECT * FROM resources WHERE id = $1', [id]);
    if (resourceRes.rows.length === 0) {
      throw new NotFoundError('Resource not found');
    }

    const resource = resourceRes.rows[0];

    // Parse start and end of requested date (e.g. 2026-09-05T00:00:00.000Z to 23:59:59.999Z)
    const dayStart = new Date(`${dateParam}T00:00:00.000Z`);
    const dayEnd = new Date(`${dateParam}T23:59:59.999Z`);

    // Fetch confirmed bookings for this resource on that day
    const bookingsRes = await query(`
      SELECT b.id, b.start_time, b.end_time, b.purpose, b.status,
             u.name as user_name
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      WHERE b.resource_id = $1
        AND b.status = 'confirmed'
        AND (b.start_time <= $3 AND b.end_time >= $2)
      ORDER BY b.start_time ASC;
    `, [id, dayStart.toISOString(), dayEnd.toISOString()]);

    // Build timeline slots from 08:00 to 20:00
    const slots = [];
    const operationalStartHour = 8;
    const operationalEndHour = 20;

    for (let hour = operationalStartHour; hour < operationalEndHour; hour++) {
      const slotStart = new Date(`${dateParam}T${String(hour).padStart(2, '0')}:00:00.000Z`);
      const slotEnd = new Date(`${dateParam}T${String(hour + 1).padStart(2, '0')}:00:00.000Z`);

      // Check if this 1-hour block overlaps with any confirmed booking
      const conflictingBooking = bookingsRes.rows.find((b) => {
        const bStart = new Date(b.start_time);
        const bEnd = new Date(b.end_time);
        return slotStart < bEnd && slotEnd > bStart;
      });

      slots.push({
        hour: `${String(hour).padStart(2, '0')}:00`,
        startTime: slotStart.toISOString(),
        endTime: slotEnd.toISOString(),
        isAvailable: !conflictingBooking,
        booking: conflictingBooking ? {
          id: conflictingBooking.id,
          userName: conflictingBooking.user_name,
          purpose: conflictingBooking.purpose,
          startTime: conflictingBooking.start_time,
          endTime: conflictingBooking.end_time,
        } : null,
      });
    }

    return res.status(200).json({
      resource,
      date: dateParam,
      slots,
      confirmedBookings: bookingsRes.rows,
    });
  } catch (err) {
    return next(err);
  }
}
