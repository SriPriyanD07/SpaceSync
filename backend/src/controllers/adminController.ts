import { Request, Response, NextFunction } from 'express';
import { query } from '../config/db';

export async function getStatistics(req: Request, res: Response, next: NextFunction) {
  try {
    // 1. Overall counts
    const resourceCounts = await query(`
      SELECT 
        COUNT(*) as total_resources,
        COUNT(*) FILTER (WHERE status = 'active') as active_resources,
        COUNT(*) FILTER (WHERE status = 'maintenance') as maintenance_resources,
        COUNT(*) FILTER (WHERE status = 'inactive') as inactive_resources
      FROM resources;
    `);

    const bookingCounts = await query(`
      SELECT 
        COUNT(*) as total_bookings,
        COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_bookings,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_bookings,
        COUNT(*) FILTER (WHERE DATE(start_time) = CURRENT_DATE) as today_bookings,
        COUNT(*) FILTER (WHERE start_time >= CURRENT_TIMESTAMP AND status = 'confirmed') as upcoming_bookings,
        COALESCE(SUM(EXTRACT(EPOCH FROM (end_time - start_time))/3600) FILTER (WHERE status = 'confirmed'), 0) as total_hours_booked
      FROM bookings;
    `);

    const mostBooked = await query(`
      SELECT r.id, r.name, r.type, COUNT(b.id) as booking_count
      FROM resources r
      JOIN bookings b ON r.id = b.resource_id
      WHERE b.status = 'confirmed'
      GROUP BY r.id, r.name, r.type
      ORDER BY booking_count DESC
      LIMIT 1;
    `);

    const totalBookingsNum = parseInt(bookingCounts.rows[0].total_bookings, 10) || 0;
    const cancelledBookingsNum = parseInt(bookingCounts.rows[0].cancelled_bookings, 10) || 0;
    const cancellationRate = totalBookingsNum > 0 
      ? Number(((cancelledBookingsNum / totalBookingsNum) * 100).toFixed(1))
      : 0;

    return res.status(200).json({
      resources: {
        total: parseInt(resourceCounts.rows[0].total_resources, 10) || 0,
        active: parseInt(resourceCounts.rows[0].active_resources, 10) || 0,
        maintenance: parseInt(resourceCounts.rows[0].maintenance_resources, 10) || 0,
        inactive: parseInt(resourceCounts.rows[0].inactive_resources, 10) || 0,
      },
      bookings: {
        total: totalBookingsNum,
        confirmed: parseInt(bookingCounts.rows[0].confirmed_bookings, 10) || 0,
        cancelled: cancelledBookingsNum,
        today: parseInt(bookingCounts.rows[0].today_bookings, 10) || 0,
        upcoming: parseInt(bookingCounts.rows[0].upcoming_bookings, 10) || 0,
        cancellationRate,
        totalHoursBooked: Math.round(parseFloat(bookingCounts.rows[0].total_hours_booked) || 0),
      },
      mostBookedResource: mostBooked.rows.length > 0 ? mostBooked.rows[0] : null,
    });
  } catch (err) {
    return next(err);
  }
}

export async function getUtilization(req: Request, res: Response, next: NextFunction) {
  try {
    // 1. Volume over time (last 14 days)
    const volumeRes = await query(`
      SELECT 
        TO_CHAR(DATE(start_time), 'YYYY-MM-DD') as date,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled
      FROM bookings
      WHERE start_time >= CURRENT_DATE - INTERVAL '14 days'
      GROUP BY DATE(start_time)
      ORDER BY DATE(start_time) ASC;
    `);

    // 2. Resource-level utilization (hours booked & count)
    const resourceUtilRes = await query(`
      SELECT 
        r.id,
        r.name,
        r.type,
        r.capacity,
        COUNT(b.id) as booking_count,
        COALESCE(ROUND(SUM(EXTRACT(EPOCH FROM (b.end_time - b.start_time))/3600)::numeric, 1), 0) as booked_hours
      FROM resources r
      LEFT JOIN bookings b ON r.id = b.resource_id AND b.status = 'confirmed'
      GROUP BY r.id, r.name, r.type, r.capacity
      ORDER BY booked_hours DESC;
    `);

    // 3. Bookings by resource type
    const typeRes = await query(`
      SELECT 
        r.type,
        COUNT(b.id) as booking_count
      FROM resources r
      LEFT JOIN bookings b ON r.id = b.resource_id AND b.status = 'confirmed'
      GROUP BY r.type
      ORDER BY booking_count DESC;
    `);

    // 4. Peak booking hours
    const peakHoursRes = await query(`
      SELECT 
        EXTRACT(HOUR FROM start_time)::INTEGER as hour,
        COUNT(*) as count
      FROM bookings
      WHERE status = 'confirmed'
      GROUP BY EXTRACT(HOUR FROM start_time)
      ORDER BY hour ASC;
    `);

    return res.status(200).json({
      volumeOverTime: volumeRes.rows,
      resourceUtilization: resourceUtilRes.rows,
      byResourceType: typeRes.rows,
      peakHours: peakHoursRes.rows,
    });
  } catch (err) {
    return next(err);
  }
}
