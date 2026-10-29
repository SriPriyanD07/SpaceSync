import request from 'supertest';
import app from '../src/app';
import * as db from '../src/config/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import { encryptMfaSecret } from '../src/utils/crypto';
import { getJwtSecret } from '../src/config/security';

const JWT_SECRET = getJwtSecret();

describe('Q2(b) Multi-Factor Authentication (TOTP MFA) & RBAC Security Suite', () => {
  const adminUser = {
    id: 'u-adm-01',
    name: 'Admin Lead',
    email: 'admin@spacesync.io',
    role: 'admin' as const,
    purpose: 'access_token' as const,
  };
  const memberA = {
    id: 'u-mem-01',
    name: 'Alice Member',
    email: 'alice@spacesync.io',
    role: 'member' as const,
    purpose: 'access_token' as const,
  };
  const memberB = {
    id: 'u-mem-02',
    name: 'Bob Member',
    email: 'bob@spacesync.io',
    role: 'member' as const,
    purpose: 'access_token' as const,
  };

  const adminToken = jwt.sign(adminUser, JWT_SECRET, { expiresIn: '1h' });
  const memberAToken = jwt.sign(memberA, JWT_SECRET, { expiresIn: '1h' });
  const memberBToken = jwt.sign(memberB, JWT_SECRET, { expiresIn: '1h' });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('TOTP Multi-Factor Authentication (RFC 6238)', () => {
    it('POST /api/auth/mfa/setup generates QR code Data URL and base32 secret', async () => {
      let savedSecret = '';
      jest.spyOn(db, 'query').mockImplementation(async (sql: string, params: any[] = []) => {
        if (sql.includes('UPDATE users SET mfa_secret = $1 WHERE id = $2')) {
          savedSecret = params[0];
          return { rowCount: 1 } as any;
        }
        return { rows: [] } as any;
      });

      const res = await request(app)
        .post('/api/auth/mfa/setup')
        .set('Authorization', `Bearer ${memberAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.secret).toBeDefined();
      expect(res.body.otpauth).toContain('otpauth://totp/');
      expect(res.body.qrCode).toMatch(/^data:image\/png;base64,/);

      // Verify secret was stored in encrypted form in database
      expect(savedSecret).toBeDefined();
      expect(savedSecret.split(':').length).toBe(3); // iv:tag:ciphertext
    });

    it('POST /api/auth/mfa/enable rejects invalid TOTP token (401 Unauthorized)', async () => {
      const plaintextSecret = authenticator.generateSecret();
      const encrypted = encryptMfaSecret(plaintextSecret);

      jest.spyOn(db, 'query').mockImplementation(async (sql: string, params: any[] = []) => {
        if (sql.includes('FROM users WHERE id = $1')) {
          return {
            rows: [{
              ...memberA,
              mfa_secret: encrypted,
              mfa_enabled: false,
            }],
          } as any;
        }
        return { rows: [] } as any;
      });

      const res = await request(app)
        .post('/api/auth/mfa/enable')
        .set('Authorization', `Bearer ${memberAToken}`)
        .send({ totpCode: '000000' });

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/invalid totp verification code/i);
    });

    it('POST /api/auth/mfa/enable activates MFA when valid TOTP code is provided', async () => {
      const plaintextSecret = authenticator.generateSecret();
      const validCode = authenticator.generate(plaintextSecret);
      const encrypted = encryptMfaSecret(plaintextSecret);

      let activated = false;
      jest.spyOn(db, 'query').mockImplementation(async (sql: string, params: any[] = []) => {
        if (sql.includes('FROM users WHERE id = $1')) {
          return {
            rows: [{
              ...memberA,
              mfa_secret: encrypted,
              mfa_enabled: false,
            }],
          } as any;
        }
        if (sql.includes('UPDATE users SET mfa_enabled = TRUE WHERE id = $1')) {
          activated = true;
          return { rowCount: 1 } as any;
        }
        return { rows: [] } as any;
      });

      const res = await request(app)
        .post('/api/auth/mfa/enable')
        .set('Authorization', `Bearer ${memberAToken}`)
        .send({ totpCode: validCode });

      expect(res.status).toBe(200);
      expect(res.body.mfa_enabled).toBe(true);
      expect(activated).toBe(true);
    });

    it('POST /api/auth/login requires 2FA challenge for MFA-enabled accounts', async () => {
      const password = 'AlicePassword2026!';
      const hash = await bcrypt.hash(password, 10);
      const plaintextSecret = authenticator.generateSecret();
      const encrypted = encryptMfaSecret(plaintextSecret);

      jest.spyOn(db, 'query').mockImplementation(async (sql: string, params: any[] = []) => {
        if (sql.includes('FROM users WHERE email = $1')) {
          return {
            rows: [{
              ...memberA,
              password_hash: hash,
              mfa_enabled: true,
              mfa_secret: encrypted,
              created_at: new Date().toISOString(),
            }],
          } as any;
        }
        return { rows: [] } as any;
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: memberA.email, password });

      expect(res.status).toBe(200);
      expect(res.body.mfaRequired).toBe(true);
      expect(res.body.mfaToken).toBeDefined();

      // Verify challenge token contains purpose: 'mfa_challenge'
      const decoded = jwt.verify(res.body.mfaToken, JWT_SECRET) as any;
      expect(decoded.purpose).toBe('mfa_challenge');
      expect(decoded.mfaRequired).toBe(true);

      // Crucial: full session JWT token is NOT issued yet
      expect(res.body.token).toBeUndefined();
    });

    it('POST /api/auth/mfa/verify exchanges valid MFA challenge token & TOTP code for full JWT', async () => {
      const plaintextSecret = authenticator.generateSecret();
      const validCode = authenticator.generate(plaintextSecret);
      const encrypted = encryptMfaSecret(plaintextSecret);

      const mfaChallengeToken = jwt.sign(
        { id: memberA.id, email: memberA.email, purpose: 'mfa_challenge', mfaRequired: true },
        JWT_SECRET,
        { expiresIn: '5m' }
      );

      jest.spyOn(db, 'query').mockImplementation(async (sql: string, params: any[] = []) => {
        if (sql.includes('FROM users WHERE id = $1')) {
          return {
            rows: [{
              ...memberA,
              mfa_enabled: true,
              mfa_secret: encrypted,
              created_at: new Date().toISOString(),
            }],
          } as any;
        }
        return { rows: [] } as any;
      });

      const res = await request(app)
        .post('/api/auth/mfa/verify')
        .send({
          mfaToken: mfaChallengeToken,
          totpCode: validCode,
        });

      expect(res.status).toBe(200);
      expect(res.body.mfaRequired).toBe(false);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe(memberA.email);

      // Verify issued session token has purpose: 'access_token'
      const decoded = jwt.verify(res.body.token, JWT_SECRET) as any;
      expect(decoded.id).toBe(memberA.id);
      expect(decoded.role).toBe('member');
      expect(decoded.purpose).toBe('access_token');
    });

    it('POST /api/auth/mfa/disable requires password confirmation', async () => {
      const password = 'AlicePassword2026!';
      const hash = await bcrypt.hash(password, 10);

      jest.spyOn(db, 'query').mockImplementation(async (sql: string, params: any[] = []) => {
        if (sql.includes('FROM users WHERE id = $1')) {
          return {
            rows: [{
              ...memberA,
              password_hash: hash,
              mfa_enabled: true,
              mfa_secret: 'some_encrypted_secret',
            }],
          } as any;
        }
        if (sql.includes('UPDATE users SET mfa_enabled = FALSE')) {
          return { rowCount: 1 } as any;
        }
        return { rows: [] } as any;
      });

      // Wrong password attempt
      const failRes = await request(app)
        .post('/api/auth/mfa/disable')
        .set('Authorization', `Bearer ${memberAToken}`)
        .send({ password: 'WrongPassword' });

      expect(failRes.status).toBe(401);

      // Correct password attempt
      const successRes = await request(app)
        .post('/api/auth/mfa/disable')
        .set('Authorization', `Bearer ${memberAToken}`)
        .send({ password });

      expect(successRes.status).toBe(200);
      expect(successRes.body.mfa_enabled).toBe(false);
    });
  });

  describe('MFA Challenge Token Isolation & Purpose Integrity (Phase 2)', () => {
    it('allows valid ordinary access token to access authorized endpoint', async () => {
      jest.spyOn(db, 'query').mockImplementation(async (sql: string) => {
        if (sql.includes('FROM users WHERE id = $1')) {
          return { rows: [memberA] } as any;
        }
        return { rows: [] } as any;
      });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${memberAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(memberA.email);
    });

    it('strictly rejects MFA challenge token when calling ordinary protected endpoints (401 Unauthorized)', async () => {
      const challengeToken = jwt.sign(
        { id: memberA.id, email: memberA.email, purpose: 'mfa_challenge', mfaRequired: true },
        JWT_SECRET,
        { expiresIn: '5m' }
      );

      const resMe = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${challengeToken}`);

      expect(resMe.status).toBe(401);
      expect(resMe.body.message).toMatch(/access token required/i);

      const resBookings = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${challengeToken}`)
        .send({
          resource_id: '00000000-0000-0000-0000-000000000001',
          start_time: '2026-11-01T10:00:00Z',
          end_time: '2026-11-01T12:00:00Z',
          purpose: 'Bypass Attempt',
        });

      expect(resBookings.status).toBe(401);
      expect(resBookings.body.message).toMatch(/access token required/i);
    });

    it('strictly rejects MFA challenge token when calling admin-only endpoints (401 Unauthorized)', async () => {
      const challengeTokenAdmin = jwt.sign(
        { id: adminUser.id, email: adminUser.email, purpose: 'mfa_challenge', mfaRequired: true },
        JWT_SECRET,
        { expiresIn: '5m' }
      );

      const res = await request(app)
        .get('/api/admin/statistics')
        .set('Authorization', `Bearer ${challengeTokenAdmin}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/access token required/i);
    });

    it('rejects expired MFA challenge tokens (401 Unauthorized)', async () => {
      const expiredChallengeToken = jwt.sign(
        { id: memberA.id, email: memberA.email, purpose: 'mfa_challenge', mfaRequired: true },
        JWT_SECRET,
        { expiresIn: '-1s' } // Expired in the past
      );

      const res = await request(app)
        .post('/api/auth/mfa/verify')
        .send({
          mfaToken: expiredChallengeToken,
          totpCode: '123456',
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/expired/i);
    });

    it('rejects challenge token with wrong purpose or missing mfaRequired claim (401 Unauthorized)', async () => {
      const wrongPurposeToken = jwt.sign(
        { id: memberA.id, email: memberA.email, purpose: 'wrong_purpose', mfaRequired: true },
        JWT_SECRET,
        { expiresIn: '5m' }
      );

      const res = await request(app)
        .post('/api/auth/mfa/verify')
        .send({
          mfaToken: wrongPurposeToken,
          totpCode: '123456',
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/token purpose/i);
    });

    it('rejects ordinary access token passed as mfaToken to /api/auth/mfa/verify (401 Unauthorized)', async () => {
      const res = await request(app)
        .post('/api/auth/mfa/verify')
        .send({
          mfaToken: memberAToken, // Has purpose: 'access_token', not 'mfa_challenge'
          totpCode: '123456',
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/mfa challenge token is required/i);
    });

    it('rejects invalid TOTP code and does NOT issue a session token', async () => {
      const plaintextSecret = authenticator.generateSecret();
      const encrypted = encryptMfaSecret(plaintextSecret);

      const challengeToken = jwt.sign(
        { id: memberA.id, email: memberA.email, purpose: 'mfa_challenge', mfaRequired: true },
        JWT_SECRET,
        { expiresIn: '5m' }
      );

      jest.spyOn(db, 'query').mockImplementation(async (sql: string) => {
        if (sql.includes('FROM users WHERE id = $1')) {
          return {
            rows: [{
              ...memberA,
              mfa_enabled: true,
              mfa_secret: encrypted,
            }],
          } as any;
        }
        return { rows: [] } as any;
      });

      const res = await request(app)
        .post('/api/auth/mfa/verify')
        .send({
          mfaToken: challengeToken,
          totpCode: '000000', // Invalid code
        });

      expect(res.status).toBe(401);
      expect(res.body.token).toBeUndefined();
      expect(res.body.message).toMatch(/invalid totp code/i);
    });
  });

  describe('Role-Based Access Control (RBAC) Enforcement', () => {
    it('rejects unauthenticated requests to protected endpoints (401 Unauthorized)', async () => {
      const resPostBooking = await request(app).post('/api/bookings').send({});
      expect(resPostBooking.status).toBe(401);

      const resCreateResource = await request(app).post('/api/resources').send({});
      expect(resCreateResource.status).toBe(401);

      const resDeleteResource = await request(app).delete('/api/resources/r-01');
      expect(resDeleteResource.status).toBe(401);
    });

    it('blocks members from creating, updating, or deleting resources (403 Forbidden)', async () => {
      const resCreate = await request(app)
        .post('/api/resources')
        .set('Authorization', `Bearer ${memberAToken}`)
        .send({
          name: 'Unauthorized Lab',
          type: 'lab_equipment',
          location: 'Floor 1',
          capacity: 5,
        });
      expect(resCreate.status).toBe(403);

      const resUpdate = await request(app)
        .put('/api/resources/r-01')
        .set('Authorization', `Bearer ${memberAToken}`)
        .send({ name: 'Tampered Name' });
      expect(resUpdate.status).toBe(403);

      const resDelete = await request(app)
        .delete('/api/resources/r-01')
        .set('Authorization', `Bearer ${memberAToken}`);
      expect(resDelete.status).toBe(403);
    });

    it('prevents member from accessing admin statistics KPI endpoint (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/admin/statistics')
        .set('Authorization', `Bearer ${memberAToken}`);

      expect(res.status).toBe(403);
    });

    it('allows admin to access admin statistics KPI endpoint (200 OK)', async () => {
      jest.spyOn(db, 'query').mockImplementation(async (sql: string) => {
        if (sql.includes('FROM resources;')) {
          return {
            rows: [{
              total_resources: '10',
              active_resources: '8',
              maintenance_resources: '2',
              inactive_resources: '0',
            }],
          } as any;
        }
        if (sql.includes('FROM bookings;')) {
          return {
            rows: [{
              total_bookings: '25',
              confirmed_bookings: '20',
              cancelled_bookings: '5',
              today_bookings: '3',
              upcoming_bookings: '12',
              total_hours_booked: '48',
            }],
          } as any;
        }
        if (sql.includes('WHERE b.status = \'confirmed\'')) {
          return {
            rows: [{ id: 'r-01', name: 'Conference Alpha', type: 'conference_room', booking_count: '15' }],
          } as any;
        }
        if (sql.includes('GROUP BY r.type')) {
          return { rows: [] } as any;
        }
        return { rows: [] } as any;
      });

      const res = await request(app)
        .get('/api/admin/statistics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.resources).toBeDefined();
    });

    it('prevents Member A from viewing or cancelling Member B booking (Cross-User Isolation)', async () => {
      const bobsBooking = {
        id: 'b-bob-99',
        resource_id: 'r-01',
        user_id: memberB.id,
        start_time: '2026-11-01T10:00:00.000Z',
        end_time: '2026-11-01T12:00:00.000Z',
        status: 'confirmed',
        purpose: 'Bob Confidential Project',
      };

      jest.spyOn(db, 'query').mockImplementation(async (sql: string, params: any[] = []) => {
        if (sql.includes('FROM bookings WHERE id = $1')) {
          return { rows: [bobsBooking] } as any;
        }
        return { rows: [] } as any;
      });

      // Member A tries to cancel Member B's booking
      const cancelRes = await request(app)
        .patch(`/api/bookings/${bobsBooking.id}/cancel`)
        .set('Authorization', `Bearer ${memberAToken}`);

      expect(cancelRes.status).toBe(403);
      expect(cancelRes.body.message).toMatch(/permission/i);
    });
  });
});
