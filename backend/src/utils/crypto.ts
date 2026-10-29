import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

function getDerivedKey(): Buffer {
  const secretKey =
    process.env.MFA_ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    'spacesync_default_mfa_aes256_encryption_key_2026';
  return crypto.createHash('sha256').update(secretKey).digest();
}

/**
 * Encrypts an MFA TOTP secret at rest using AES-256-GCM.
 * Output format: `ivHex:tagHex:ciphertextHex`
 */
export function encryptMfaSecret(plaintextSecret: string): string {
  if (!plaintextSecret) return '';
  const key = getDerivedKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintextSecret, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted MFA secret from rest storage.
 */
export function decryptMfaSecret(encryptedPayload: string): string {
  if (!encryptedPayload) return '';
  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted MFA secret format');
  }

  const [ivHex, tagHex, ciphertextHex] = parts;
  const key = getDerivedKey();
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
