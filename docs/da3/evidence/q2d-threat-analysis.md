# SpaceSync BACSE344 DA3 — Q2(d) Threat Analysis & Regulatory Alignment (GDPR)

**Course:** Cloud Infrastructure and Architecture (BACSE344)  
**Slot:** C1 Slot  
**Project:** SpaceSync — Cloud-Based Shared Resource Booking & Utilization Platform  
**Component:** Question 2(d) — Threat Modeling, Security Controls & GDPR Compliance  

---

## 1. Threat Agent & Control Mapping

The SpaceSync security architecture directly addresses the two primary adversarial threat categories: **External Threat Agents** and **Compromised / Malicious Authenticated Users**.

### A. External Threat Agent Scenarios & Implemented Countermeasures

| Threat Scenario | Attack Vector & Mechanism | Implemented Technical Control | Verification / Evidence |
| :--- | :--- | :--- | :--- |
| **Credential Stuffing & Dictionary Attacks** | Attacker uses breached password lists against `/api/auth/login`. | **Salted bcrypt Key Derivation** (cost 12, $4,096$ iterations) + **RFC 6238 TOTP MFA**. Compromising password alone fails to yield a session token. | Automated test: [`backend/tests/passwordSecurity.test.ts`](file:///d:/PROJECTS/space/backend/tests/passwordSecurity.test.ts) |
| **Rainbow Table Precomputation** | Attacker attempts to invert leaked database password hashes. | **Unique 128-bit Random Salt per User**. Identical passwords produce non-matching hashes. | Verified: unique salts generate non-identical ciphertext ($2b$). |
| **Double-Booking Race Condition Exploit** | Attacker floods concurrent reservation requests across multiple backend instances to hijack high-value facilities. | **PostgreSQL `btree_gist` Range Exclusion Constraints** (`CONSTRAINT no_double_booking EXCLUDE USING gist (...)`). Atomically enforced at Neon storage engine. | Automated test: [`backend/tests/doubleBooking.test.ts`](file:///d:/PROJECTS/space/backend/tests/doubleBooking.test.ts) |
| **Container Breakout & Host Kernel Takeover** | Attacker exploits an unpatched Node.js or Linux C library vulnerability to escape container. | **Unprivileged Execution (`USER node`, UID 1000)** + **Trivy Vulnerability Scanning** + **Alpine OS Security Patches**. Root filesystem writes are blocked. | Verified: `docker exec spacesync-backend-1 whoami` $\to$ `node`. |
| **In-Transit Eavesdropping & MitM** | Attacker intercepts network packets between backend instances and the database. | **TLS 1.3 Transport Encryption** (`sslmode=require`). Every connection across Docker bridge to Neon is cryptographically secured. | Verified in `backend/src/config/db.ts` (`isCloudDb` TLS flags). |
| **2FA Secret Exposure via Database Dump** | Attacker gains unauthorized read access to the PostgreSQL database table. | **AES-256-GCM Envelope Encryption at Rest**. `users.mfa_secret` is stored as authenticated ciphertext with IV and auth tag. | Verified in [`backend/src/utils/crypto.ts`](file:///d:/PROJECTS/space/backend/src/utils/crypto.ts). |

---

### B. Compromised / Malicious Authenticated User Scenarios

| Threat Scenario | Attack Vector & Mechanism | Implemented Technical Control | Verification / Evidence |
| :--- | :--- | :--- | :--- |
| **Privilege Escalation to Administrator** | Member submits `role: 'admin'` during registration or profile updates. | **Registration Role Lockdown**. Self-registration with admin role is blocked with `403 Forbidden`. | Automated test: `tests/passwordSecurity.test.ts` $\to$ `403 Forbidden`. |
| **Unauthorized Facility Tampering** | Member sends `POST`, `PUT`, `PATCH`, or `DELETE` to `/api/resources/*`. | **RBAC Middleware (`requireRole('admin')`)**. Unprivileged requests are immediately aborted with `403 Forbidden`. | Automated test: `tests/mfaAndRbac.test.ts` $\to$ `403 Forbidden`. |
| **Cross-User Booking Sabotage** | Member Alice attempts to cancel or alter Member Bob's reservation via `PATCH /api/bookings/:id/cancel`. | **Resource Ownership Verification**. The controller verifies `booking.user_id === req.user.id`. Unauthorized cancellations return `403 Forbidden`. | Automated test: `tests/mfaAndRbac.test.ts` $\to$ `403 Forbidden`. |
| **User Calendar & Schedule Snooping** | Member attempts to query reservations of other departments or colleagues. | **Tenant Isolation Filtering**. `getBookings` automatically injects `WHERE user_id = $1` when `role === 'member'`. | Automated test: `tests/authAndResources.test.ts`. |

---

## 2. Regulatory Alignment: General Data Protection Regulation (GDPR)

SpaceSync processes personal data (PII) including user full names, email addresses, timestamps of room occupancy, purpose of room bookings, and client connection IP addresses. When serving European Union data subjects or operating within EU jurisdictions (pursuant to GDPR Article 3 territorial scope), the processing of this personal data is governed by the General Data Protection Regulation (GDPR). 

The technical architecture implements security-by-design controls directly aligned with GDPR Articles 5(1)(f) and 32. Note that comprehensive GDPR compliance is an ongoing operational commitment that additionally encompasses data protection agreements (DPAs), records of processing activities (ROPA), consent management, and data subject access request (DSAR) procedures.

### A. Article 5(1)(f) — Principle of Integrity and Confidentiality
> *"Personal data shall be processed in a manner that ensures appropriate security of the personal data, including protection against unauthorised or unlawful processing and against accidental loss, destruction or damage, using appropriate technical or organisational measures."*

**SpaceSync Technical Alignment:**
1. **Confidentiality:**
   - User passwords are never stored or logged in plaintext. They are protected using bcrypt ($2b$ work factor 12).
   - Sensitive two-factor authentication secrets are encrypted using authenticated AES-256-GCM prior to storage.
   - All REST API endpoints strictly redact internal hashes and security tokens from JSON outputs.
2. **Integrity:**
   - Double-booking prevention via PostgreSQL exclusion constraints prevents data corruption and reservation overlaps across horizontally distributed instances.
   - Database migrations use atomic transactions (`BEGIN ... COMMIT / ROLLBACK`) to prevent partial or inconsistent schema states.

---

### B. Article 32 — Security of Processing
> *"Taking into account the state of the art, the costs of implementation and the nature, scope, context and purposes of processing as well as the risk of varying likelihood and severity for the rights and freedoms of natural persons, the controller and the processor shall implement appropriate technical and organisational measures to ensure a level of security appropriate to the risk..."*

SpaceSync implements the four core technical pillars established by Article 32:

1. **Pseudonymisation and Encryption of Personal Data (Art. 32(1)(a)):**
   - In-transit encryption: All database client traffic is encrypted via TLS (`sslmode=require`).
   - At-rest encryption: Critical secrets (`mfa_secret`) are encrypted via AES-256-GCM. Passwords are irreversibly hashed.
   - Primary key pseudonymisation: Database records use non-sequential UUIDv4 keys (`gen_random_uuid()`) instead of auto-incrementing integers, preventing enumeration attacks.

2. **Ongoing Confidentiality, Integrity, Availability, and Resilience (Art. 32(1)(b)):**
   - High availability is achieved through Docker Compose multi-instance clustering behind an Nginx reverse proxy load balancer (`spacesync-nginx-lb`).
   - As demonstrated in the Q1(c) resilience experiment, stopping an entire backend instance mid-traffic results in **0 dropped requests** and **100% success rate** due to automated Nginx upstream retry failover (`proxy_next_upstream error timeout http_502 http_503`).

3. **Timely Restoration of Availability in the Event of Incident (Art. 32(1)(c)):**
   - Stateless backend containers allow instantaneous restart and horizontal scaling without state synchronization delay.
   - Authoritative persistent state resides in Neon Serverless PostgreSQL with automated Point-in-Time Recovery (PITR).

4. **Regular Testing, Assessing, and Evaluating Security Effectiveness (Art. 32(1)(d)):**
   - Automated container image vulnerability scanning via Aqua Security Trivy (v0.76.1) before deployment.
   - Automated Jest unit and integration test suites validating password security, MFA challenge logic, and RBAC isolation on every build (`51 passing test specifications across 4 suites`).
