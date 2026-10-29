import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { query } from '../config/db';
import {
  registerSchema,
  loginSchema,
  mfaVerifySchema,
  mfaEnableSchema,
  mfaDisableSchema,
} from '../utils/validation';
import {
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  BadRequestError,
} from '../utils/errors';
import { AuthenticatedRequest, User, UserRole } from '../types';
import { encryptMfaSecret, decryptMfaSecret } from '../utils/crypto';

// Configure TOTP window (1 step +/- 30s tolerance for clock drift)
authenticator.options = { window: 1 };

const JWT_SECRET = process.env.JWT_SECRET || 'spacesync_development_jwt_secret_key_2026_secure';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const BCRYPT_ROUNDS = process.env.NODE_ENV === 'test' ? 10 : 12;

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const validated = registerSchema.parse(req.body);

    // Role Escalation Prevention: Self-registration as admin is explicitly rejected
    if (req.body.role === 'admin') {
      throw new ForbiddenError('Self-assigning the administrator role is forbidden.');
    }

    // Default to 'member' for all self-registered public users
    const assignedRole: UserRole = 'member';

    // Check if user already exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [validated.email.toLowerCase().trim()]);
    if (existing.rows.length > 0) {
      throw new ConflictError('A user with this email address already exists.');
    }

    // Hash password with strong salt work factor (cost 12 in production)
    const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
    const passwordHash = await bcrypt.hash(validated.password, salt);

    // Insert user into authoritative database with zero plaintext storage
    const result = await query(
      `INSERT INTO users (name, email, password_hash, role, mfa_enabled)
       VALUES ($1, $2, $3, $4, FALSE)
       RETURNING id, name, email, role, mfa_enabled, created_at;`,
      [validated.name.trim(), validated.email.toLowerCase().trim(), passwordHash, assignedRole]
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
        mfa_enabled: user.mfa_enabled || false,
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

    // Verify salted hash
    const isMatch = await bcrypt.compare(validated.password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check if user has TOTP Multi-Factor Authentication enabled
    if (user.mfa_enabled) {
      // Issue short-lived challenge token for 2FA step (expires in 5 minutes)
      const mfaToken = jwt.sign(
        { id: user.id, email: user.email, mfaRequired: true },
        JWT_SECRET,
        { expiresIn: '5m' }
      );

      return res.status(200).json({
        message: 'MFA authentication code required',
        mfaRequired: true,
        mfaToken,
      });
    }

    // Generate full session JWT token for non-MFA accounts
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: (JWT_EXPIRES_IN || '7d') as any }
    );

    return res.status(200).json({
      message: 'Login successful',
      mfaRequired: false,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        mfa_enabled: false,
        created_at: user.created_at,
      },
      token,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Verifies MFA challenge token and TOTP code to issue full session JWT.
 */
export async function verifyMfa(req: Request, res: Response, next: NextFunction) {
  try {
    const { mfaToken, totpCode } = mfaVerifySchema.parse(req.body);

    // Verify short-lived MFA challenge token
    let decoded: any;
    try {
      decoded = jwt.verify(mfaToken, JWT_SECRET);
    } catch {
      throw new UnauthorizedError('MFA session token is invalid or expired. Please sign in again.');
    }

    if (!decoded.mfaRequired || !decoded.id) {
      throw new UnauthorizedError('Invalid MFA session challenge.');
    }

    // Retrieve user and encrypted TOTP secret
    const result = await query('SELECT * FROM users WHERE id = $1', [decoded.id]);
    if (result.rows.length === 0) {
      throw new UnauthorizedError('User not found');
    }

    const user: User = result.rows[0];
    if (!user.mfa_enabled || !user.mfa_secret) {
      throw new BadRequestError('MFA is not enabled for this account');
    }

    // Decrypt MFA secret from rest storage
    const plaintextSecret = decryptMfaSecret(user.mfa_secret);

    // Verify TOTP code
    const isValid = authenticator.verify({
      token: totpCode,
      secret: plaintextSecret,
    });

    if (!isValid) {
      throw new UnauthorizedError('Invalid TOTP code. Please check your authenticator application.');
    }

    // Issue full session JWT token
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: (JWT_EXPIRES_IN || '7d') as any }
    );

    return res.status(200).json({
      message: 'MFA verification successful',
      mfaRequired: false,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        mfa_enabled: true,
        created_at: user.created_at,
      },
      token,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Initiates TOTP MFA setup for an authenticated user.
 * Generates an encrypted secret at rest and returns QR code Data URL and setup secret.
 */
export async function setupMfa(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    // Generate random base32 secret
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(req.user.email, 'SpaceSync', secret);

    // Render QR Code as PNG Data URL
    const qrCode = await QRCode.toDataURL(otpauth);

    // Encrypt secret with AES-256-GCM before database storage
    const encryptedSecret = encryptMfaSecret(secret);

    // Store encrypted secret in user record (mfa_enabled remains false until confirmed)
    await query('UPDATE users SET mfa_secret = $1 WHERE id = $2', [encryptedSecret, req.user.id]);

    return res.status(200).json({
      message: 'MFA setup initiated. Scan the QR code or enter the secret manually, then verify with a 6-digit code.',
      secret,
      otpauth,
      qrCode,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Confirms and activates MFA for the authenticated user by verifying their initial TOTP code.
 */
export async function enableMfa(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const { totpCode } = mfaEnableSchema.parse(req.body);

    const userRes = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (userRes.rows.length === 0) {
      throw new UnauthorizedError('User not found');
    }

    const user: User = userRes.rows[0];
    if (!user.mfa_secret) {
      throw new BadRequestError('MFA setup has not been initiated. Please call /api/auth/mfa/setup first.');
    }

    // Decrypt secret
    const plaintextSecret = decryptMfaSecret(user.mfa_secret);

    // Verify token
    const isValid = authenticator.verify({
      token: totpCode,
      secret: plaintextSecret,
    });

    if (!isValid) {
      throw new UnauthorizedError('Invalid TOTP verification code. Verification failed.');
    }

    // Activate MFA
    await query('UPDATE users SET mfa_enabled = TRUE WHERE id = $1', [req.user.id]);

    return res.status(200).json({
      message: 'Two-Factor Authentication (TOTP MFA) has been successfully enabled on your account.',
      mfa_enabled: true,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Disables MFA for the authenticated user upon confirmation of current password.
 */
export async function disableMfa(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const { password, totpCode } = mfaDisableSchema.parse(req.body);

    const userRes = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (userRes.rows.length === 0) {
      throw new UnauthorizedError('User not found');
    }

    const user: User = userRes.rows[0];

    // Verify user password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid password. MFA could not be disabled.');
    }

    // Optional TOTP verification if code provided
    if (totpCode && user.mfa_secret) {
      const plaintextSecret = decryptMfaSecret(user.mfa_secret);
      const isValid = authenticator.verify({ token: totpCode, secret: plaintextSecret });
      if (!isValid) {
        throw new UnauthorizedError('Invalid TOTP code.');
      }
    }

    // Clear secret and disable MFA
    await query('UPDATE users SET mfa_enabled = FALSE, mfa_secret = NULL WHERE id = $1', [req.user.id]);

    return res.status(200).json({
      message: 'Two-Factor Authentication (TOTP MFA) has been successfully disabled.',
      mfa_enabled: false,
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

    // Strictly redact password_hash and mfa_secret from query selection
    const result = await query(
      'SELECT id, name, email, role, mfa_enabled, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedError('User not found');
    }

    const user = result.rows[0];

    return res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        mfa_enabled: Boolean(user.mfa_enabled),
        created_at: user.created_at,
      },
    });
  } catch (err) {
    return next(err);
  }
}
