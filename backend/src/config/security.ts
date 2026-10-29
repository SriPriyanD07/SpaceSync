import crypto from 'crypto';
import dotenv from 'dotenv';

// Preserve existing NODE_ENV if explicitly set (e.g. 'test' in Jest test runners)
const initialEnv = process.env.NODE_ENV;
dotenv.config();
if (initialEnv) {
  process.env.NODE_ENV = initialEnv;
}

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

const DEV_FALLBACK_JWT_SECRET = 'spacesync_development_jwt_secret_key_2026_secure';
const DEV_FALLBACK_MFA_KEY = 'spacesync_development_mfa_aes256_encryption_key_2026';

/**
 * Retrieves the cryptographically validated JWT signing secret.
 * Enforces strict presence and length in production without silent fallbacks.
 */
export function getJwtSecret(): string {
  const isProduction = process.env.NODE_ENV === 'production';
  const secret = process.env.JWT_SECRET?.trim();

  if (!secret) {
    if (isProduction) {
      throw new Error(
        'SECURITY VIOLATION: Missing required JWT_SECRET environment variable in production mode. ' +
        'Refusing to start with insecure fallbacks.'
      );
    }
    return DEV_FALLBACK_JWT_SECRET;
  }

  if (isProduction && (secret.length < 32 || secret.toLowerCase().includes('change_in_prod') || secret.toLowerCase().includes('replace_with') || secret.toLowerCase().includes('development'))) {
    throw new Error(
      'SECURITY VIOLATION: JWT_SECRET in production must be a strong secret of at least 32 characters and cannot use default placeholders.'
    );
  }

  return secret;
}

/**
 * Retrieves the validated 256-bit encryption key for MFA secrets stored at rest.
 * Uses a dedicated MFA_ENCRYPTION_KEY separate from the JWT signing secret.
 */
export function getMfaEncryptionKey(): Buffer {
  const isProduction = process.env.NODE_ENV === 'production';
  const mfaKey = process.env.MFA_ENCRYPTION_KEY?.trim();

  if (!mfaKey) {
    if (isProduction) {
      throw new Error(
        'SECURITY VIOLATION: Missing required MFA_ENCRYPTION_KEY environment variable in production mode. ' +
        'Refusing to start with insecure fallbacks.'
      );
    }
    // Separate development key for dev/test environments (distinct from JWT secret)
    return crypto.createHash('sha256').update(DEV_FALLBACK_MFA_KEY).digest();
  }

  if (isProduction && (mfaKey.length < 32 || mfaKey.toLowerCase().includes('change_in_prod') || mfaKey.toLowerCase().includes('replace_with') || mfaKey.toLowerCase().includes('development'))) {
    throw new Error(
      'SECURITY VIOLATION: MFA_ENCRYPTION_KEY in production must be at least 32 characters and cannot use default placeholders.'
    );
  }

  return crypto.createHash('sha256').update(mfaKey).digest();
}

/**
 * Sanity verification function to validate environment configuration during boot.
 */
export function validateSecurityConfiguration(): void {
  getJwtSecret();
  getMfaEncryptionKey();
}
