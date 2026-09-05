import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db';
import { registerSchema, loginSchema } from '../utils/validation';
import { ConflictError, UnauthorizedError } from '../utils/errors';
import { AuthenticatedRequest, User } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'spacesync_development_jwt_secret_key_2026_secure';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const validated = registerSchema.parse(req.body);

    // Check if user already exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [validated.email.toLowerCase()]);
    if (existing.rows.length > 0) {
      throw new ConflictError('A user with this email address already exists.');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(validated.password, salt);

    // Insert user
    const result = await query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, created_at;`,
      [validated.name.trim(), validated.email.toLowerCase().trim(), passwordHash, validated.role]
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: (JWT_EXPIRES_IN || '7d') as any }
    );

    return res.status(201).json({
      message: 'Registration successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
      },
      token,
    });
  } catch (err) {
    return next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const validated = loginSchema.parse(req.body);

    // Find user
    const result = await query('SELECT * FROM users WHERE email = $1', [validated.email.toLowerCase().trim()]);
    if (result.rows.length === 0) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const user: User = result.rows[0];

    // Verify password
    const isMatch = await bcrypt.compare(validated.password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: (JWT_EXPIRES_IN || '7d') as any }
    );

    return res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
      },
      token,
    });
  } catch (err) {
    return next(err);
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }

    const result = await query('SELECT id, name, email, role, created_at FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) {
      throw new UnauthorizedError('User not found');
    }

    return res.status(200).json({
      user: result.rows[0],
    });
  } catch (err) {
    return next(err);
  }
}
