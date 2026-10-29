import request from 'supertest';
import app from '../src/app';
import * as db from '../src/config/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { encryptMfaSecret, decryptMfaSecret } from '../src/utils/crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'spacesync_development_jwt_secret_key_2026_secure';

describe('Q2(a) Password Security & Storage Architecture', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Cryptographic Salt & Hash Properties', () => {
    it('generates unique random salts for identical passwords', async () => {
      const plaintextPassword = 'SuperSecurePassword2026!';
      const salt1 = await bcrypt.genSalt(10);
      const salt2 = await bcrypt.genSalt(10);

      const hash1 = await bcrypt.hash(plaintextPassword, salt1);
      const hash2 = await bcrypt.hash(plaintextPassword, salt2);

      // Unique salts must produce completely distinct ciphertext hashes
      expect(salt1).not.toEqual(salt2);
      expect(hash1).not.toEqual(hash2);

      // Both hashes must verify against the same plaintext password
      expect(await bcrypt.compare(plaintextPassword, hash1)).toBe(true);
      expect(await bcrypt.compare(plaintextPassword, hash2)).toBe(true);

      // Bcrypt hash identifier $2a$ or $2b$ and salt cost factor verification
      expect(hash1).toMatch(/^\$2[ab]\$10\$/);
      expect(hash2).toMatch(/^\$2[ab]\$10\$/);
    });

    it('rejects authentication with incorrect password', async () => {
      const storedHash = await bcrypt.hash('CorrectPassword123!', 10);
      const isMatch = await bcrypt.compare('WrongPassword456!', storedHash);
      expect(isMatch).toBe(false);
    });
  });

  describe('Zero Plaintext Exposure in Registration & Responses', () => {
    it('POST /api/auth/register redacts password_hash and sensitive secrets', async () => {
      let insertedPasswordHash = '';
      jest.spyOn(db, 'query').mockImplementation(async (sql: string, params: any[] = []) => {
        const sqlTrimmed = sql.trim();
        if (sqlTrimmed.includes('FROM users WHERE email = $1')) {
          return { rows: [] } as any; // No existing user
        }
        if (sqlTrimmed.includes('INSERT INTO users')) {
          insertedPasswordHash = params[2];
          return {
            rows: [{
              id: 'u-sec-01',
              name: params[0],
              email: params[1],
              role: params[3],
              mfa_enabled: false,
              created_at: new Date().toISOString(),
            }],
          } as any;
        }
        return { rows: [] } as any;
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Security Test User',
          email: 'sec_test@spacesync.io',
          password: 'MyConfidentialPassword!',
        });

      expect(res.status).toBe(201);
      // Database received salted hash, NOT plaintext password
      expect(insertedPasswordHash).not.toBe('MyConfidentialPassword!');
      expect(insertedPasswordHash.startsWith('$2')).toBe(true);

      // Response body must NEVER expose password, hash, or mfa secrets
      expect(res.body.user).toBeDefined();
      expect(res.body.user.password).toBeUndefined();
      expect(res.body.user.password_hash).toBeUndefined();
      expect(res.body.user.mfa_secret).toBeUndefined();
    });

    it('POST /api/auth/login redacts sensitive fields from response', async () => {
      const password = 'UserPassword2026!';
      const hash = await bcrypt.hash(password, 10);

      jest.spyOn(db, 'query').mockImplementation(async (sql: string, params: any[] = []) => {
        if (sql.includes('FROM users WHERE email = $1')) {
          return {
            rows: [{
              id: 'u-sec-02',
              name: 'Logged In User',
              email: params[0],
              password_hash: hash,
              role: 'member',
              mfa_enabled: false,
              mfa_secret: null,
              created_at: new Date().toISOString(),
            }],
          } as any;
        }
        return { rows: [] } as any;
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'logged_in@spacesync.io',
          password,
        });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.password_hash).toBeUndefined();
      expect(res.body.user.password).toBeUndefined();
      expect(res.body.user.mfa_secret).toBeUndefined();
    });

    it('GET /api/auth/me strictly omits password_hash and secrets', async () => {
      const userPayload = {
        id: 'u-sec-03',
        name: 'Profile User',
        email: 'profile@spacesync.io',
        role: 'member' as const,
        purpose: 'access_token' as const,
      };
      const token = jwt.sign(userPayload, JWT_SECRET);

      jest.spyOn(db, 'query').mockImplementation(async (sql: string, params: any[] = []) => {
        if (sql.includes('FROM users WHERE id = $1')) {
          return {
            rows: [{
              id: userPayload.id,
              name: userPayload.name,
              email: userPayload.email,
              role: userPayload.role,
              mfa_enabled: false,
              created_at: new Date().toISOString(),
            }],
          } as any;
        }
        return { rows: [] } as any;
      });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.password_hash).toBeUndefined();
      expect(res.body.user.mfa_secret).toBeUndefined();
    });
  });

  describe('Privilege Escalation Prevention', () => {
    it('blocks self-registration with admin role (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Attacker User',
          email: 'attacker@spacesync.io',
          password: 'Password123!',
          role: 'admin',
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/administrator role is forbidden/i);
    });
  });

  describe('AES-256-GCM Encryption for Secrets at Rest', () => {
    it('correctly encrypts and decrypts secrets with integrity tag validation', () => {
      const plaintextSecret = 'JBSWY3DPEHPK3PXP'; // Base32 TOTP secret sample
      const encrypted = encryptMfaSecret(plaintextSecret);

      // Verify encrypted format is iv:tag:ciphertext
      const parts = encrypted.split(':');
      expect(parts.length).toBe(3);
      expect(parts[0].length).toBe(24); // 12-byte IV in hex = 24 chars
      expect(parts[1].length).toBe(32); // 16-byte Auth Tag in hex = 32 chars
      expect(encrypted).not.toContain(plaintextSecret);

      // Round-trip decryption matches original secret
      const decrypted = decryptMfaSecret(encrypted);
      expect(decrypted).toBe(plaintextSecret);
    });

    it('rejects tampered ciphertext with authentication error', () => {
      const plaintextSecret = 'JBSWY3DPEHPK3PXP';
      const encrypted = encryptMfaSecret(plaintextSecret);
      const parts = encrypted.split(':');

      // Tamper with ciphertext by altering last byte
      const tamperedCipher = parts[2].slice(0, -2) + (parts[2].slice(-2) === 'aa' ? 'bb' : 'aa');
      const tamperedPayload = `${parts[0]}:${parts[1]}:${tamperedCipher}`;

      expect(() => decryptMfaSecret(tamperedPayload)).toThrow();
    });
  });

  describe('Unsafe Secret Fallback Remediation (Phase 3)', () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
      process.env = { ...originalEnv };
      process.env.NODE_ENV = 'test';
      process.env.JWT_SECRET = 'spacesync_test_suite_jwt_signing_secret_key_2026_safe';
      process.env.MFA_ENCRYPTION_KEY = 'spacesync_test_suite_mfa_encryption_key_2026_safe';
    });

    it('fails safely in production mode when JWT_SECRET is missing', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_SECRET;
      const { getJwtSecret } = require('../src/config/security');

      expect(() => getJwtSecret()).toThrow(/SECURITY VIOLATION.*JWT_SECRET/i);
    });

    it('fails safely in production mode when MFA_ENCRYPTION_KEY is missing', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.MFA_ENCRYPTION_KEY;
      const { getMfaEncryptionKey } = require('../src/config/security');

      expect(() => getMfaEncryptionKey()).toThrow(/SECURITY VIOLATION.*MFA_ENCRYPTION_KEY/i);
    });

    it('rejects weak or placeholder secrets in production mode', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'short_weak_secret';
      const { getJwtSecret } = require('../src/config/security');

      expect(() => getJwtSecret()).toThrow(/at least 32 characters/i);
    });

    it('allows valid separate keys in production without fallbacks', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'a_very_strong_production_jwt_signing_secret_key_12345';
      process.env.MFA_ENCRYPTION_KEY = 'a_very_strong_production_mfa_encryption_key_67890';
      const { getJwtSecret, getMfaEncryptionKey } = require('../src/config/security');

      expect(getJwtSecret()).toBe('a_very_strong_production_jwt_signing_secret_key_12345');
      const mfaBuffer = getMfaEncryptionKey();
      expect(Buffer.isBuffer(mfaBuffer)).toBe(true);
      expect(mfaBuffer.length).toBe(32);
    });
  });
});
