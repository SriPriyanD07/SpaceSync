import { Request, Response, NextFunction } from 'express';
import { query } from '../config/db';
import { createResourceSchema, updateResourceSchema } from '../utils/validation';
import { NotFoundError } from '../utils/errors';
import { AuthenticatedRequest } from '../types';

export async function getAllResources(req: Request, res: Response, next: NextFunction) {
  try {
    const { type, location, min_capacity, status, search, page = '1', limit = '50' } = req.query;

    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (type) {
      conditions.push(`type = $${paramIndex++}`);
      values.push(type);
    }

    if (location) {
      conditions.push(`location ILIKE $${paramIndex++}`);
      values.push(`%${location}%`);
    }

    if (min_capacity) {
      conditions.push(`capacity >= $${paramIndex++}`);
      values.push(Number(min_capacity));
    }

    if (status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(status);
    }

    if (search) {
      conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      values.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    const countRes = await query(`SELECT COUNT(*) FROM resources ${whereClause}`, values);
    const total = parseInt(countRes.rows[0].count, 10);

    const dataQuery = `
      SELECT id, name, type, location, capacity, description, status, created_at, updated_at
      FROM resources
      ${whereClause}
      ORDER BY name ASC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
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

export async function getResourceById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM resources WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Resource not found');
    }

    return res.status(200).json({
      resource: result.rows[0],
    });
  } catch (err) {
    return next(err);
  }
}

export async function createResource(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const validated = createResourceSchema.parse(req.body);

    const result = await query(
      `INSERT INTO resources (name, type, location, capacity, description, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *;`,
      [
        validated.name.trim(),
        validated.type,
        validated.location.trim(),
        validated.capacity,
        validated.description?.trim() || '',
        validated.status,
      ]
    );

    return res.status(201).json({
      message: 'Resource created successfully',
      resource: result.rows[0],
    });
  } catch (err) {
    return next(err);
  }
}

export async function updateResource(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const validated = updateResourceSchema.parse(req.body);

    // Check resource exists
    const existing = await query('SELECT id FROM resources WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      throw new NotFoundError('Resource not found');
    }

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(validated).forEach(([key, val]) => {
      if (val !== undefined) {
        fields.push(`${key} = $${paramIndex++}`);
        values.push(val);
      }
    });

    if (fields.length === 0) {
      return res.status(200).json({ message: 'No changes provided' });
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const updateQuery = `
      UPDATE resources
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *;
    `;

    const result = await query(updateQuery, values);

    return res.status(200).json({
      message: 'Resource updated successfully',
      resource: result.rows[0],
    });
  } catch (err) {
    return next(err);
  }
}

export async function deleteResource(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    // Check if resource exists
    const existing = await query('SELECT id FROM resources WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      throw new NotFoundError('Resource not found');
    }

    // Set status to inactive to preserve booking history and referential integrity
    const result = await query(
      `UPDATE resources
       SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *;`,
      [id]
    );

    return res.status(200).json({
      message: 'Resource deactivated successfully',
      resource: result.rows[0],
    });
  } catch (err) {
    return next(err);
  }
}
