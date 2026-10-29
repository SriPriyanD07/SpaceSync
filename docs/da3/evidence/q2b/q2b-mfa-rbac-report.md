# SpaceSync BACSE344 DA3 — Q2(b) Multi-Factor Authentication & RBAC Report

**Course:** Cloud Infrastructure and Architecture (BACSE344)  
**Slot:** C1 Slot  
**Project:** SpaceSync — Cloud-Based Shared Resource Booking & Utilization Platform  
**Component:** Question 2(b) — TOTP Multi-Factor Authentication (RFC 6238) & Role-Based Access Control  

---

## 1. TOTP Multi-Factor Authentication Architecture (RFC 6238)

SpaceSync implements standardized Time-Based One-Time Password (TOTP) Multi-Factor Authentication conforming to **RFC 6238** and **RFC 4226** using `otplib` and `qrcode`:

```text
[ User Client ]                   [ SpaceSync Backend ]                 [ Neon PostgreSQL ]
       │                                   │                                    │
       │ 1. POST /api/auth/mfa/setup       │                                    │
       │──────────────────────────────────►│ 2. Generate Base32 Secret          │
       │                                   │    Encrypt via AES-256-GCM         │
       │                                   │    Store in DB (mfa_enabled=false) │
       │                                   │───────────────────────────────────►│
       │ 3. Return QR Code & URI           │                                    │
       │◄──────────────────────────────────│                                    │
       │                                   │                                    │
       │ 4. Scan in Authenticator App      │                                    │
       │    (Google/Microsoft/1Password)   │                                    │
       │                                   │                                    │
       │ 5. POST /api/auth/mfa/enable      │                                    │
       │    { totpCode: "123456" }         │                                    │
       │──────────────────────────────────►│ 6. Decrypt Secret & Verify TOTP    │
       │                                   │    Set mfa_enabled = TRUE          │
       │                                   │───────────────────────────────────►│
       │ 7. MFA Enabled 200 OK             │                                    │
       │◄──────────────────────────────────│                                    │
```

### Key Technical Safeguards:
1. **At-Rest Secret Encryption:** The generated TOTP base32 secret is encrypted using **AES-256-GCM** before persistence in `users.mfa_secret`. If the database is compromised, the TOTP secrets cannot be decrypted without the master encryption key (`MFA_ENCRYPTION_KEY`).
2. **Two-Stage Login Challenge:** When an MFA-enrolled user calls `POST /api/auth/login`, the system validates the password but does NOT issue the access token. Instead, it issues a short-lived MFA challenge token (`mfaToken`, 5-minute expiry). The user must submit `{ mfaToken, totpCode }` to `POST /api/auth/mfa/verify` to receive the full JWT session token.
3. **Clock-Drift Window:** Configured with a step tolerance of $\pm 1$ period (30 seconds) to accommodate minor smartphone clock skew without reducing security.

---

## 2. Role-Based Access Control (RBAC) Specification

SpaceSync enforces strict Principle of Least Privilege access controls across all API endpoints:

| Endpoint | Method | Public / Unauth | Member Role | Admin Role | Security Enforcement |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `/api/health` | GET/HEAD | **200 OK** | **200 OK** | **200 OK** | Unauthenticated operational monitoring |
| `/api/resources` | GET | **200 OK** | **200 OK** | **200 OK** | Public inventory discovery |
| `/api/resources/:id/availability` | GET | **200 OK** | **200 OK** | **200 OK** | Public calendar availability |
| `/api/auth/register` | POST | **201 Created** | **201 Created** | **201 Created** | Self-assigning `admin` blocked (403) |
| `/api/auth/login` | POST | **200 OK** | **200 OK** | **200 OK** | Returns 2FA challenge if enrolled |
| `/api/auth/mfa/verify` | POST | **200 OK** | **200 OK** | **200 OK** | Challenge token + TOTP verification |
| `/api/auth/me` | GET | 401 Unauthorized | **200 OK** | **200 OK** | Authenticated profile retrieval |
| `/api/auth/mfa/*` | POST | 401 Unauthorized | **200 OK** | **200 OK** | Self-service MFA enrollment/management |
| `/api/bookings` | POST | 401 Unauthorized | **201 Created** | **201 Created** | Booking with collision prevention |
| `/api/bookings/my` | GET | 401 Unauthorized | **200 OK** (Own only) | **200 OK** (All/filtered) | Cross-user data isolation |
| `/api/bookings/:id/cancel` | PATCH | 401 Unauthorized | **200 OK** (Own only) | **200 OK** (Any) | Member modifying other booking = 403 |
| `/api/resources` | POST | 401 Unauthorized | **403 Forbidden** | **201 Created** | Admin-only resource provisioning |
| `/api/resources/:id` | PUT/PATCH | 401 Unauthorized | **403 Forbidden** | **200 OK** | Admin-only resource modification |
| `/api/resources/:id` | DELETE | 401 Unauthorized | **403 Forbidden** | **200 OK** | Admin-only resource removal |
| `/api/admin/statistics` | GET | 401 Unauthorized | **403 Forbidden** | **200 OK** | Admin-only KPI dashboards |

---

## 3. Automated Test Suite Results

Test execution output from `backend/tests/mfaAndRbac.test.ts`:

```text
PASS tests/mfaAndRbac.test.ts
  Q2(b) Multi-Factor Authentication (TOTP MFA) & RBAC Security Suite
    TOTP Multi-Factor Authentication (RFC 6238)
      √ POST /api/auth/mfa/setup generates QR code Data URL and base32 secret (246 ms)
      √ POST /api/auth/mfa/enable rejects invalid TOTP token (401 Unauthorized) (16 ms)
      √ POST /api/auth/mfa/enable activates MFA when valid TOTP code is provided (12 ms)
      √ POST /api/auth/login requires 2FA challenge for MFA-enabled accounts (125 ms)
      √ POST /api/auth/mfa/verify exchanges valid MFA challenge token & TOTP code for full JWT (12 ms)
      √ POST /api/auth/mfa/disable requires password confirmation (171 ms)
    Role-Based Access Control (RBAC) Enforcement
      √ rejects unauthenticated requests to protected endpoints (401 Unauthorized) (23 ms)
      √ blocks members from creating, updating, or deleting resources (403 Forbidden) (74 ms)
      √ prevents member from accessing admin statistics KPI endpoint (403 Forbidden) (44 ms)
      √ allows admin to access admin statistics KPI endpoint (200 OK) (46 ms)
      √ prevents Member A from viewing or cancelling Member B booking (Cross-User Isolation) (45 ms)

Test Suites: 1 passed, 1 total
Tests:       11 passed, 11 total
```
