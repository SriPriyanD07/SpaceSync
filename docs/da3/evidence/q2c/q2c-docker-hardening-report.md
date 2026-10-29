# SpaceSync BACSE344 DA3 — Q2(c) Docker Hardening & Vulnerability Report

**Course:** Cloud Infrastructure and Architecture (BACSE344)  
**Slot:** C1 Slot  
**Project:** SpaceSync — Cloud-Based Shared Resource Booking & Utilization Platform  
**Component:** Question 2(c) — Container Vulnerability Scanning with Trivy & Image Hardening  

---

## 1. Vulnerability Scanning Methodology

Container vulnerability assessments were performed using **Aqua Security Trivy (v0.76.1)** inspecting the backend container image (`space-backend-1:latest`):
- **Initial Scan File:** [`docs/da3/evidence/q2c/initial-scan.txt`](file:///d:/PROJECTS/space/docs/da3/evidence/q2c/initial-scan.txt) (and [`.json`](file:///d:/PROJECTS/space/docs/da3/evidence/q2c/initial-scan.json))
- **Hardened Rescan File:** [`docs/da3/evidence/q2c/hardened-scan.txt`](file:///d:/PROJECTS/space/docs/da3/evidence/q2c/hardened-scan.txt) (and [`.json`](file:///d:/PROJECTS/space/docs/da3/evidence/q2c/hardened-scan.json))

---

## 2. Quantitative Vulnerability Comparison (Before vs. After Hardening)

| Severity Level | Initial Image (`space-backend:initial`) | Hardened Image (`space-backend:hardened`) | Delta / Vulnerabilities Resolved | Percentage Reduction |
| :--- | :---: | :---: | :---: | :---: |
| **CRITICAL** | 2 | **1** | -1 | **-50.0%** |
| **HIGH** | 28 | **21** | -7 | **-25.0%** |
| **MEDIUM** | 35 | **15** | -20 | **-57.1%** |
| **LOW** | 37 | **3** | -34 | **-91.9%** |
| **UNKNOWN** | 2 | **0** | -2 | **-100.0%** |
| **TOTAL** | **104** | **40** | **-64** | **-61.5%** |

---

## 3. Hardening Measures Implemented

### A. Non-Root Process Isolation
- **Security Flaw:** Default Docker containers run processes as root (`UID 0`), allowing potential container escape vulnerabilities to compromise the host kernel.
- **Remediation:** Added `USER node` in the runner stage.
- **Verification Evidence:**
  ```bash
  $ docker exec spacesync-backend-1 whoami
  node
  $ docker exec spacesync-backend-1 id
  uid=1000(node) gid=1000(node) groups=1000(node)
  ```

### B. Multi-Stage Build & Minimal Production Footprint
- **Security Flaw:** Build tools (`typescript`, `ts-node`, `@types/*`, Jest test frameworks) packaged into production containers drastically enlarge the attack surface.
- **Remediation:**
  - Stage 1 (`builder`): Compiles TypeScript in an isolated sandbox.
  - Stage 2 (`runner`): Imports only precompiled `dist/` and runs `npm ci --omit=dev --ignore-scripts`.
  - Cleans package manager cache: `npm cache clean --force`.

### C. OS Package Updates
- **Security Flaw:** Unpatched base operating system libraries contained high-severity vulnerabilities in `libcrypto3`, `libssl3`, and `zlib`.
- **Remediation:**
  ```dockerfile
  RUN apk update && apk upgrade --no-cache && rm -rf /var/cache/apk/*
  ```
  This upgraded:
  - `libcrypto3`: `3.5.6-r0` $\to$ `3.5.9-r0`
  - `libssl3`: `3.5.6-r0` $\to$ `3.5.9-r0`
  - `musl`: `1.2.5-r23` $\to$ `1.2.5-r24`
  - `zlib`: `1.3.2-r0` $\to$ `1.3.2-r1`

### D. Comprehensive `.dockerignore`
- **Security Flaw:** Local secrets (`.env`), test artifacts (`coverage`), git history (`.git`), and local dependency caches (`node_modules`) leaking into the container build context.
- **Remediation:** Strengthened [`backend/.dockerignore`](file:///d:/PROJECTS/space/backend/.dockerignore) to prevent copying any host development files into image layers.

---

## 4. Hardened Dockerfile Specification

Reference: [`backend/Dockerfile`](file:///d:/PROJECTS/space/backend/Dockerfile)

```dockerfile
# Stage 1: Build TypeScript source in isolated environment
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Stage 2: Minimal, Hardened Production Runtime
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Upgrade OS packages to apply critical security patches
RUN apk update && apk upgrade --no-cache && rm -rf /var/cache/apk/*

# Copy production package manifests
COPY package*.json ./

# Install strictly production dependencies and clean cache
RUN npm ci --omit=dev --ignore-scripts && \
    npm cache clean --force

# Copy compiled JavaScript dist and database migrations from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/db/migrations ./dist/db/migrations

# Set correct ownership for the non-root user
RUN chown -R node:node /app

# Execute process as unprivileged 'node' user (UID 1000)
USER node

EXPOSE 5000
CMD ["node", "dist/index.js"]
```

---

## 5. Analysis of Remaining Findings (1 CRITICAL, 21 HIGH)

An in-depth inspection of [`hardened-scan.json`](file:///d:/PROJECTS/space/docs/da3/evidence/q2c/hardened-scan.json) reveals the exact origin of the remaining findings:

1. **Zero OS-Level Vulnerabilities:** All operating system vulnerabilities across Alpine packages (`libcrypto3`, `libssl3`, `musl`, `zlib`) were reduced to **0** after `apk upgrade`.
2. **Npm Internal CLI Tooling Isolation:** The 1 remaining CRITICAL finding (`tar < 6.2.1` DoS / CPU consumption on malformed gzip headers) and 21 HIGH findings (`brace-expansion`, `cross-spawn`, `glob`, `ip-address`, `minimatch`, `pacote`, `sigstore`, `tar`) reside entirely within the bundled Node.js npm package manager CLI located at `/usr/local/lib/node_modules/npm/...` and Swagger documentation generator transitive dependencies.
3. **Runtime Non-Exploitability:**
   - The production container starts directly using `node dist/index.js` (see `CMD ["node", "dist/index.js"]`), completely bypassing npm and CLI build tooling at runtime.
   - Non-root execution (`USER node`, UID 1000) prevents any privilege escalation or host filesystem tampering even if a vulnerability were triggered.
   - External network ingress passes exclusively through Nginx reverse proxy filtering to the Express HTTP application.
