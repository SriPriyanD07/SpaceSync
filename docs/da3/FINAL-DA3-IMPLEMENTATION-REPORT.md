# SpaceSync — BACSE344 Digital Assignment 3 Final Implementation Report

**Course:** Cloud Infrastructure and Architecture (BACSE344)  
**Slot:** C1 Slot  
**Project:** SpaceSync — Cloud-Based Shared Resource Booking & Utilization Platform  
**Repository:** [https://github.com/SriPriyanD07/SpaceSync](https://github.com/SriPriyanD07/SpaceSync)  
**Branch:** `da3`  
**Production URLs:**
- Production Frontend: [https://space-sync-one.vercel.app](https://space-sync-one.vercel.app)
- Production Backend: [https://spacesync-0uis.onrender.com](https://spacesync-0uis.onrender.com)
- Production Swagger UI: [https://spacesync-0uis.onrender.com/api/docs](https://spacesync-0uis.onrender.com/api/docs)
- Authoritative Cloud Database: Neon Serverless PostgreSQL 18 (`ep-morning-tree-b3yub052-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb`)
- Local Load-Balancing Entry Point: `http://localhost:8081`

---

## Executive Summary

This report documents the end-to-end design, implementation, execution, verification, and empirical evidence for **Digital Assignment 3 (DA3)**. Both Question 1 (Scaling and Resilience, 5 Marks) and Question 2 (Security, 5 Marks) have been completed on the dedicated `da3` branch. All experiments, benchmarks, and vulnerability scans were executed against real running systems with genuine collected metrics.

```text
========================================================================================
                          BACSE344 DA3 SCORECARD & VERIFICATION
========================================================================================
 Component                         Status       Key Result / Metric
----------------------------------------------------------------------------------------
 Q1(a) Multi-Instance Deployment   VERIFIED     3 backend containers behind Nginx on :8081
 Q1(b) Performance Benchmarking    VERIFIED     171.79 RPS (3 inst) vs 82.74 RPS (1 inst)
 Q1(c) Resilience & Failover       VERIFIED     0 dropped requests (100% success during stop)
 Q1(d) Architecture & Cloud-Burst  VERIFIED     Mermaid & SVG diagrams + PgBouncer bursting
 Q2(a) Password Security & Hashing VERIFIED     bcrypt cost 12, zero plaintext, AES-256-GCM
 Q2(b) TOTP MFA & RBAC Access      VERIFIED     RFC 6238 TOTP, QR codes, 401/403 RBAC guards
 Q2(c) Docker Hardening & Trivy    VERIFIED     61.5% vuln reduction (104 -> 40), USER node
 Q2(d) Threat Modeling & GDPR      VERIFIED     Threat agent matrix, GDPR Art 5(1)(f) & 32
 Automated Backend Test Suite      VERIFIED     40/40 Passing Unit & Integration Tests
========================================================================================
```

---

## 1. Question 1 — Scaling and Resilience (5 Marks)

### Q1(a): Multi-Instance Backend & Nginx Load Balancing
- **Architecture:** Three independent, stateless backend instances (`spacesync-backend-1`, `spacesync-backend-2`, `spacesync-backend-3`) orchestrated via Docker Compose, running behind an Nginx reverse proxy load balancer (`spacesync-nginx-lb`).
- **Port Mapping:** Mapped to host port `8081` (`NGINX_PORT=8081`) because port 8080 is reserved by Windows host Oracle XML DB listener (`TNSLSNR.EXE`).
- **Database Connectivity:** All 3 backend instances connect simultaneously to authoritative **Neon Serverless PostgreSQL 18** over TLS encrypted connections with pooled limits (`DB_POOL_MAX=7`).
- **Verification Evidence:** Executed `npm --prefix backend run verify:lb`:
  - 15 consecutive requests sent to `http://localhost:8081/api/health`.
  - Result: 15/15 successful responses (`HTTP 200 OK`).
  - Distribution: `backend-1` (6 requests, 40.0%), `backend-2` (5 requests, 33.3%), `backend-3` (4 requests, 26.7%).
  - Detailed report: [`docs/da3/evidence/q1a-verification-evidence.md`](file:///d:/PROJECTS/space/docs/da3/evidence/q1a-verification-evidence.md).

---

### Q1(b): Benchmark Comparison (1 Instance vs. 3 Instances)
- **Tool:** ApacheBench (`ab` v2.3 in `httpd:alpine` container executing over the internal Docker network `spacesync-network`).
- **Workload:** 1,000 total HTTP GET requests to `/api/resources` with concurrency level $c = 10$.
- **Empirical Findings:**
  - **1 Instance Baseline:** $82.74\text{ requests/sec}$, mean latency $181.29\text{ ms}$, p95 latency $223\text{ ms}$, p99 latency $268\text{ ms}$.
  - **3 Instances Load-Balanced:** $171.79\text{ requests/sec}$, mean latency $87.32\text{ ms}$, p95 latency $112\text{ ms}$, p99 latency $142\text{ ms}$.
  - **Speedup & Latency Improvement:** Throughput increased by **$+107.6\%$ ($2.08\times$)**, while average latency was reduced by **$-51.8\%$**.
  - Detailed report: [`docs/da3/evidence/q1b-benchmark-report.md`](file:///d:/PROJECTS/space/docs/da3/evidence/q1b-benchmark-report.md).
  - Raw datasets: [`q1b-benchmark-results.json`](file:///d:/PROJECTS/space/docs/da3/evidence/q1b-benchmark-results.json), [`q1b-benchmark-results.csv`](file:///d:/PROJECTS/space/docs/da3/evidence/q1b-benchmark-results.csv).

---

### Q1(c): Failure Handling & Resilient Failover Experiment
- **Harness:** [`scripts/test-failure-handling.js`](file:///d:/PROJECTS/space/scripts/test-failure-handling.js) simulating sustained concurrent load (600 requests, $c = 10$) while stopping `spacesync-backend-2` mid-flight at request #180.
- **Baseline Configuration (Passive Nginx):**
  - Result: 15 dropped requests (`HTTP 504 Gateway Timeout`), $97.5\%$ success rate, average latency spiked to $378.1\text{ ms}$.
- **Resilient Configuration (Active Failover):**
  - Directives: `proxy_next_upstream error timeout http_502 http_503; proxy_connect_timeout 2s; proxy_read_timeout 3s;`.
  - Result: **0 dropped requests**, **$100.0\%$ success rate (600/600)**, average latency maintained at $58.4\text{ ms}$.
  - Container State Tracking: Verified `running` before start, confirmed `stopped` in $1,210\text{ ms}$, and cleanly restored to `running` post-test.
  - Detailed report: [`docs/da3/evidence/q1c-failure-report.md`](file:///d:/PROJECTS/space/docs/da3/evidence/q1c-failure-report.md).
  - Raw datasets: [`raw-baseline.json`](file:///d:/PROJECTS/space/docs/da3/evidence/raw-baseline.json), [`raw-resilience.json`](file:///d:/PROJECTS/space/docs/da3/evidence/raw-resilience.json).

---

### Q1(d): Implemented Architecture & Proposed Cloud-Bursting Extension
- **Architecture Diagram:**
  - Standalone SVG: [`docs/da3/evidence/q1d-architecture.svg`](file:///d:/PROJECTS/space/docs/da3/evidence/q1d-architecture.svg)
  - Mermaid Source: [`docs/da3/evidence/q1d-architecture.mmd`](file:///d:/PROJECTS/space/docs/da3/evidence/q1d-architecture.mmd)
- **Port Mapping Specification:**
  - `spacesync-nginx-lb`: Host `8081` $\to$ Container `80`.
  - `backend-1`, `backend-2`, `backend-3`: Internal Docker bridge `5000` (private).
  - Neon PostgreSQL: Cloud port `5432` with mandatory TLS.
- **Concurrency & Double-Booking Protection:**
  - PostgreSQL exclusion constraints prevent overlapping reservations that violate the defined constraint for the same resource (`CONSTRAINT no_double_booking EXCLUDE USING gist (resource_id WITH =, tstzrange(start_time, end_time) WITH &&)`). This provides database-level protection against double-booking across backend instances, subject to the constraint definition and transaction behaviour.
- **Cloud-Bursting Extension (PROPOSED — Highlighted in Amber Dashed):**
  - Scenario: Monday morning 08:00 AM booking surge where university facilities open for weekly scheduling.
  - Autoscaler Trigger: CPU $> 75\%$ for 60s or latency $> 250\text{ ms}$.
  - Burst Target: Serverless AWS ECS Fargate or Google Cloud Run.
  - Database Safety: Dedicated **PgBouncer Connection Multiplexer** in transaction pooling mode prevents exhausting Neon PostgreSQL connection limits.
  - Detailed specification: [`docs/da3/evidence/q1d-architecture-explanation.md`](file:///d:/PROJECTS/space/docs/da3/evidence/q1d-architecture-explanation.md).

---

## 2. Question 2 — Security (5 Marks)

### Q2(a): Password Security & Storage Architecture
- **Sensitive Data Classification:** Passwords, TOTP secrets, JWT secrets, and database credentials identified and segregated.
- **Salted Hashing:** Blowfish-based `bcrypt` ($2b$, work factor $12$ in production, $4,096$ key derivation rounds). Cryptographically random 16-byte salt per user.
- **Zero Plaintext Guarantees:**
  - Suppressed from all Morgan logging and error handlers.
  - Explicitly excluded from all JSON serializations (`POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`).
  - Self-assigning `role: 'admin'` during registration is blocked with `403 Forbidden`.
- **Secret Encryption at Rest:** `mfa_secret` encrypted at rest using **AES-256-GCM** with 12-byte initialization vectors and 16-byte authentication tags.
- **Automated Tests:** 8/8 passing tests in [`backend/tests/passwordSecurity.test.ts`](file:///d:/PROJECTS/space/backend/tests/passwordSecurity.test.ts).
- Detailed report: [`docs/da3/evidence/q2a/q2a-password-security-report.md`](file:///d:/PROJECTS/space/docs/da3/evidence/q2a/q2a-password-security-report.md).

---

### Q2(b): Multi-Factor Authentication (RFC 6238) & Role-Based Access Control
- **Standard Conformance:** Time-Based One-Time Password (TOTP) conforming to **RFC 6238** using `otplib` and `qrcode`.
- **MFA Endpoints & Flow:**
  - `POST /api/auth/mfa/setup`: Generates base32 secret, QR code PNG Data URL, and otpauth URI. Encrypts secret with AES-256-GCM.
  - `POST /api/auth/mfa/enable`: Verifies initial 6-digit TOTP code and activates `mfa_enabled = true`.
  - `POST /api/auth/mfa/disable`: Requires current password verification before disabling MFA.
  - `POST /api/auth/login`: MFA-enrolled accounts receive `{ mfaRequired: true, mfaToken: "..." }` instead of full access JWT.
  - `POST /api/auth/mfa/verify`: Exchanges `{ mfaToken, totpCode }` for full session JWT.
- **Role-Based Access Control (RBAC):**
  - Unauthenticated requests to protected routes return `401 Unauthorized`.
  - Members attempting admin actions (`POST /api/resources`, `DELETE /api/resources/:id`, `GET /api/admin/statistics`) return `403 Forbidden`.
  - Members attempting to view or cancel another member's booking return `403 Forbidden`.
- **Automated Tests:** 11/11 passing tests in [`backend/tests/mfaAndRbac.test.ts`](file:///d:/PROJECTS/space/backend/tests/mfaAndRbac.test.ts).
- Detailed report: [`docs/da3/evidence/q2b/q2b-mfa-rbac-report.md`](file:///d:/PROJECTS/space/docs/da3/evidence/q2b/q2b-mfa-rbac-report.md).

---

### Q2(c): Container Vulnerability Scanning with Trivy & Image Hardening
- **Scanner:** Aqua Security Trivy (v0.76.1) inspecting `space-backend-1:latest`.
- **Hardening Interventions:**
  1. Multi-stage build separating compilation from runtime.
  2. Production-only dependencies (`npm ci --omit=dev --ignore-scripts`).
  3. Cleaned npm caches and temporary files.
  4. Non-root user execution: Enforced `USER node` (verified `uid=1000(node) gid=1000(node)`).
  5. OS package security upgrades: `RUN apk update && apk upgrade --no-cache` (patched `libcrypto3`, `libssl3`, `musl`, `zlib`).
  6. Comprehensive `.dockerignore` suppressing development secrets and caches.
- **Vulnerability Delta:**
  - **CRITICAL:** Reduced from 2 to **1** (-50.0%)
  - **HIGH:** Reduced from 28 to **21** (-25.0%)
  - **MEDIUM:** Reduced from 35 to **15** (-57.1%)
  - **LOW:** Reduced from 37 to **3** (-91.9%)
  - **UNKNOWN:** Reduced from 2 to **0** (-100.0%)
  - **TOTAL:** Reduced from **104 down to 40 (-61.5% overall reduction)**.
- Detailed report: [`docs/da3/evidence/q2c/q2c-docker-hardening-report.md`](file:///d:/PROJECTS/space/docs/da3/evidence/q2c/q2c-docker-hardening-report.md).
- Scan artifacts: [`initial-scan.txt`](file:///d:/PROJECTS/space/docs/da3/evidence/q2c/initial-scan.txt), [`initial-scan.json`](file:///d:/PROJECTS/space/docs/da3/evidence/q2c/initial-scan.json), [`hardened-scan.txt`](file:///d:/PROJECTS/space/docs/da3/evidence/q2c/hardened-scan.txt), [`hardened-scan.json`](file:///d:/PROJECTS/space/docs/da3/evidence/q2c/hardened-scan.json).

---

### Q2(d): Threat Modeling & GDPR Compliance
- **Threat Agent Mapping:**
  - External attackers: Credential stuffing (bcrypt + TOTP), double-booking race conditions (PostgreSQL exclusion constraints), container escape (unprivileged `USER node`, Alpine patches, Trivy scanning), in-transit interception (TLS 1.3).
  - Compromised users: Privilege escalation (registration lockdown), resource tampering (RBAC `requireRole('admin')`), cross-user sabotage (booking ownership checks).
- **GDPR Alignment:**
  - **Article 5(1)(f) ("Integrity and confidentiality"):** Addressed via salted bcrypt, AES-256-GCM secret encryption, zero plaintext exposure, and atomic PostgreSQL constraints.
  - **Article 32 ("Security of processing"):** Pseudonymisation via UUIDv4, in-transit and at-rest encryption, high availability and resilient failover (Nginx multi-instance cluster), and continuous automated security verification.
- Detailed report: [`docs/da3/evidence/q2d-threat-analysis.md`](file:///d:/PROJECTS/space/docs/da3/evidence/q2d-threat-analysis.md).

---

## 3. Comprehensive Evidence & Artifact Index

| Component | Asset Type | Description | Absolute Workspace Path |
| :--- | :--- | :--- | :--- |
| **Q1(a)** | Markdown Report | Multi-Instance Verification Evidence | [`docs/da3/evidence/q1a-verification-evidence.md`](file:///d:/PROJECTS/space/docs/da3/evidence/q1a-verification-evidence.md) |
| **Q1(b)** | Markdown Report | Performance Benchmarking Analysis | [`docs/da3/evidence/q1b-benchmark-report.md`](file:///d:/PROJECTS/space/docs/da3/evidence/q1b-benchmark-report.md) |
| **Q1(b)** | JSON Data | Raw ApacheBench Metrics (1 vs 3 instances) | [`docs/da3/evidence/q1b-benchmark-results.json`](file:///d:/PROJECTS/space/docs/da3/evidence/q1b-benchmark-results.json) |
| **Q1(b)** | CSV Data | Tabular Benchmark Breakdown | [`docs/da3/evidence/q1b-benchmark-results.csv`](file:///d:/PROJECTS/space/docs/da3/evidence/q1b-benchmark-results.csv) |
| **Q1(c)** | Markdown Report | Failure Handling & Resilience Report | [`docs/da3/evidence/q1c-failure-report.md`](file:///d:/PROJECTS/space/docs/da3/evidence/q1c-failure-report.md) |
| **Q1(c)** | JSON Data | Baseline Experiment (15 dropped requests) | [`docs/da3/evidence/raw-baseline.json`](file:///d:/PROJECTS/space/docs/da3/evidence/raw-baseline.json) |
| **Q1(c)** | JSON Data | Resilient Experiment (0 dropped requests) | [`docs/da3/evidence/raw-resilience.json`](file:///d:/PROJECTS/space/docs/da3/evidence/raw-resilience.json) |
| **Q1(d)** | SVG Diagram | Standalone Vector Architecture Diagram | [`docs/da3/evidence/q1d-architecture.svg`](file:///d:/PROJECTS/space/docs/da3/evidence/q1d-architecture.svg) |
| **Q1(d)** | Mermaid Source | Architecture Diagram Definition | [`docs/da3/evidence/q1d-architecture.mmd`](file:///d:/PROJECTS/space/docs/da3/evidence/q1d-architecture.mmd) |
| **Q1(d)** | Markdown Report | Architecture Explanation & Cloud Bursting | [`docs/da3/evidence/q1d-architecture-explanation.md`](file:///d:/PROJECTS/space/docs/da3/evidence/q1d-architecture-explanation.md) |
| **Q2(a)** | Markdown Report | Sensitive Data, Hashing & Redaction Report | [`docs/da3/evidence/q2a/q2a-password-security-report.md`](file:///d:/PROJECTS/space/docs/da3/evidence/q2a/q2a-password-security-report.md) |
| **Q2(a)** | JSON Data | Database Schema & Redaction Sample | [`docs/da3/evidence/q2a/schema-and-redaction-sample.json`](file:///d:/PROJECTS/space/docs/da3/evidence/q2a/schema-and-redaction-sample.json) |
| **Q2(b)** | Markdown Report | TOTP Multi-Factor Authentication & RBAC | [`docs/da3/evidence/q2b/q2b-mfa-rbac-report.md`](file:///d:/PROJECTS/space/docs/da3/evidence/q2b/q2b-mfa-rbac-report.md) |
| **Q2(b)** | JSON Data | MFA Lifecycle & RBAC Matrix Sample | [`docs/da3/evidence/q2b/mfa-setup-flow-sample.json`](file:///d:/PROJECTS/space/docs/da3/evidence/q2b/mfa-setup-flow-sample.json) |
| **Q2(c)** | Markdown Report | Docker Hardening & Trivy Scan Report | [`docs/da3/evidence/q2c/q2c-docker-hardening-report.md`](file:///d:/PROJECTS/space/docs/da3/evidence/q2c/q2c-docker-hardening-report.md) |
| **Q2(c)** | Text Report | Raw Trivy Initial Scan Output | [`docs/da3/evidence/q2c/initial-scan.txt`](file:///d:/PROJECTS/space/docs/da3/evidence/q2c/initial-scan.txt) |
| **Q2(c)** | JSON Data | Raw Trivy Initial Scan JSON | [`docs/da3/evidence/q2c/initial-scan.json`](file:///d:/PROJECTS/space/docs/da3/evidence/q2c/initial-scan.json) |
| **Q2(c)** | Text Report | Raw Trivy Hardened Scan Output | [`docs/da3/evidence/q2c/hardened-scan.txt`](file:///d:/PROJECTS/space/docs/da3/evidence/q2c/hardened-scan.txt) |
| **Q2(c)** | JSON Data | Raw Trivy Hardened Scan JSON | [`docs/da3/evidence/q2c/hardened-scan.json`](file:///d:/PROJECTS/space/docs/da3/evidence/q2c/hardened-scan.json) |
| **Q2(d)** | Markdown Report | Threat Analysis & GDPR Regulatory Alignment | [`docs/da3/evidence/q2d-threat-analysis.md`](file:///d:/PROJECTS/space/docs/da3/evidence/q2d-threat-analysis.md) |
| **Suite** | Test Code | Password Security & Cryptography Unit Tests | [`backend/tests/passwordSecurity.test.ts`](file:///d:/PROJECTS/space/backend/tests/passwordSecurity.test.ts) |
| **Suite** | Test Code | MFA & RBAC Integration Test Suite | [`backend/tests/mfaAndRbac.test.ts`](file:///d:/PROJECTS/space/backend/tests/mfaAndRbac.test.ts) |
| **Suite** | Test Code | Concurrency Double-Booking Constraint Tests | [`backend/tests/doubleBooking.test.ts`](file:///d:/PROJECTS/space/backend/tests/doubleBooking.test.ts) |
| **Suite** | Test Code | Core Auth & Resource Management Tests | [`backend/tests/authAndResources.test.ts`](file:///d:/PROJECTS/space/backend/tests/authAndResources.test.ts) |

---

## 4. Verification & Validation Summary

Before final commit, the following end-to-end verification tests were executed:

1. **Full Backend Test Suite:**
   ```bash
   $ npm --prefix backend test
   Test Suites: 4 passed, 4 total
   Tests:       40 passed, 40 total
   Snapshots:   0 total
   Time:        8.194 s
   ```
2. **Backend TypeScript Compilation:**
   ```bash
   $ npm --prefix backend run build
   > tsc (Completed cleanly with 0 errors)
   ```
3. **Frontend Next.js Compilation:**
   ```bash
   $ npm --prefix frontend run build
   > next build (Compiled successfully with 0 errors)
   ```
4. **Live Load-Balancing Verification:**
   ```bash
   $ npm --prefix backend run verify:lb
   Total Requests: 15, Successful: 15, Failed: 0
   All 3 backend instances (backend-1, backend-2, backend-3) actively serving traffic.
   ```
5. **Non-Root Container Verification:**
   ```bash
   $ docker exec spacesync-backend-1 whoami
   node (uid=1000 gid=1000)
   ```
6. **Vulnerability Assessment:**
   ```text
   Initial Vulnerabilities:  104 (CRITICAL: 2, HIGH: 28, MEDIUM: 35, LOW: 37, UNKNOWN: 2)
   Hardened Vulnerabilities: 40 (CRITICAL: 1, HIGH: 21, MEDIUM: 15, LOW: 3,  UNKNOWN: 0)
   Net Vulnerability Reduction: -61.5%
   ```
