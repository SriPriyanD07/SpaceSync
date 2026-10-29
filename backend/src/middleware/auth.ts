import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest, AuthUser, UserRole } from '../types';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import { getJwtSecret } from '../config/security';

export function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return next(new UnauthorizedError('Missing Authorization header'));
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return next(new UnauthorizedError('Authorization header format must be Bearer <token>'));
  }

  const token = parts[1];

  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret) as any;

    // Strict Token Purpose Enforcement: Challenge tokens cannot access ordinary protected endpoints
    if (decoded.purpose !== 'access_token' || decoded.mfaRequired) {
      return next(
        new UnauthorizedError(
          'Invalid authentication token: access token required (temporary MFA challenge tokens are not permitted)'
        )
      );
    }

    if (!decoded.id || !decoded.role) {
      return next(new UnauthorizedError('Malformed authentication token: missing required identity claims'));
    }

    req.user = {
      id: decoded.id,
      name: decoded.name,
      email: decoded.email,
      role: decoded.role,
      purpose: decoded.purpose,
    };
    return next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Authentication token has expired'));
    }
    if (err instanceof UnauthorizedError) {
      return next(err);
    }
    return next(new UnauthorizedError('Invalid authentication token'));
  }
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError(`Access denied. Requires one of: ${allowedRoles.join(', ')}`));
    }

    return next();
  };
}
