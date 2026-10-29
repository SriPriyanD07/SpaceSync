# SpaceSync BACSE344 DA3 — Q2(a) Password Security & Storage Architecture

**Course:** Cloud Infrastructure and Architecture (BACSE344)  
**Slot:** C1 Slot  
**Project:** SpaceSync — Cloud-Based Shared Resource Booking & Utilization Platform  
**Component:** Question 2(a) — Sensitive Data Identification, Salted Hashing & Storage Security  

---

## 1. Sensitive Data Classification & Protection Architecture

SpaceSync handles several tiers of sensitive data that require rigorous confidentiality and integrity controls:

| Data Asset | Sensitivity Tier | Storage Medium | Protection Mechanism |
| :--- | :--- | :--- | :--- |
| **User Passwords** | Highly Confidential | PostgreSQL (`users.password_hash`) | Salted bcrypt hashing ($2b$, cost factor $\ge 12$). Zero plaintext storage. |
| **TOTP 2FA Secrets** | Highly Confidential | PostgreSQL (`users.mfa_secret`) | AES-256-GCM envelope encryption at rest with initialization vectors and auth tags. |
| **JWT Session Tokens** | Confidential | In-Transit / HTTP Headers | Signed via HMAC-SHA256 (`HS256`) using 256-bit environment secret (`JWT_SECRET`). |
| **Database Credentials** | Mission Critical | Environment / Docker Secrets | Injected strictly via runtime `.env` variables (`DATABASE_URL`). Gitignored. |
| **User Personal Data (PII)** | Protected | PostgreSQL (`users.email`, `users.name`) | TLS encryption in-transit, RBAC cross-user isolation. |

---

## 2. Password Hashing Implementation Details

### A. Algorithm & Work Factor Selection
- **Algorithm:** `bcrypt` (Blowfish-based salted key derivation function, RFC standard $2b$).
- **Cost / Work Factor:** $12$ rounds ($2^{12} = 4,096$ iterations) in production.
- **Salt Generation:** 16-byte cryptographically secure pseudorandom salt (`bcrypt.genSalt(12)`), generated independently per registration attempt.
- **Precomputation & Rainbow Table Immunity:** Because every user receives a distinct 128-bit salt, rainbow tables and precomputed hash dictionaries are rendered completely ineffective. Identical plaintext passwords always produce completely different hashes.

### B. Code Implementation Reference
- Controller: [`backend/src/controllers/authController.ts`](file:///d:/PROJECTS/space/backend/src/controllers/authController.ts)
- Migration: [`backend/src/db/migrations/001_initial_schema.sql`](file:///d:/PROJECTS/space/backend/src/db/migrations/001_initial_schema.sql)

```typescript
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
```

---

## 3. Zero Plaintext Exposure & Redaction Guarantees

1. **Zero Plaintext Logging:** Morgan HTTP request logging and error handling middleware strictly suppress `req.body.password`, authorization headers, and credential parameters.
2. **API Serialization Redaction:**
   - `POST /api/auth/register` returns only `id`, `name`, `email`, `role`, `mfa_enabled`, `created_at`.
   - `POST /api/auth/login` returns only user metadata and token; never returns `password_hash` or `mfa_secret`.
   - `GET /api/auth/me` explicitly selects only public profile columns (`SELECT id, name, email, role, mfa_enabled, created_at FROM users WHERE id = $1`).
3. **Privilege Escalation Protection:** Self-registration with `role: 'admin'` is rejected with `HTTP 403 Forbidden` (`Self-assigning the administrator role is forbidden.`).

---

## 4. Automated Verification Results

All automated test specifications passed successfully in `backend/tests/passwordSecurity.test.ts`:

```text
PASS tests/passwordSecurity.test.ts
  Q2(a) Password Security & Storage Architecture
    Cryptographic Salt & Hash Properties
      √ generates unique random salts for identical passwords (923 ms)
      √ rejects authentication with incorrect password (465 ms)
    Zero Plaintext Exposure in Registration & Responses
      √ POST /api/auth/register redacts password_hash and sensitive secrets (312 ms)
      √ POST /api/auth/login redacts sensitive fields from response (522 ms)
      √ GET /api/auth/me strictly omits password_hash and secrets (45 ms)
    Privilege Escalation Prevention
      √ blocks self-registration with admin role (403 Forbidden) (47 ms)
    AES-256-GCM Encryption for Secrets at Rest
      √ correctly encrypts and decrypts secrets with integrity tag validation (6 ms)
      √ rejects tampered ciphertext with authentication error (12 ms)
```
