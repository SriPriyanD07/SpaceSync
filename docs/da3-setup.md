# BACSE344 Digital Assignment 3 (DA3) — Question 1(a) Setup & Evidence Guide

**Course:** Cloud Infrastructure and Architecture (BACSE344)  
**Slot:** C1 Slot  
**Project:** SpaceSync — Cloud-Based Shared Resource Booking & Utilization Platform  
**Component:** Question 1(a) — Multi-Instance Backend Scaling with Docker Compose & Nginx Load Balancer  

---

## 1. Peak-Demand Situation & API Analysis (Question 1a Requirement)

### A. Peak-Demand Situation Description
In the SpaceSync domain (shared rooms, laboratories, equipment, and workstation booking for enterprises, universities, and co-working hubs), the most critical high-concurrency surge is **"The Monday Morning Reservation Rush" (08:00 AM – 09:00 AM)** and the **"Quarterly Facility Window Release"**:
* At the beginning of the week or when the administrative reservation schedule unlocks, hundreds to thousands of users simultaneously log in to find available conference rooms, reserve multi-GPU workstations, and schedule laboratory benches for their project teams.
* Users execute rapid searches, filter by capacity and equipment type, and query room availability timelines concurrently.

### B. The API That Will Be Hit Hardest
* **Primary Hotspot API:** `GET /api/resources` and `GET /api/resources/:id/availability?date=YYYY-MM-DD`
* **Why it faces the highest load:** Every user session triggers multiple read queries to fetch real-time inventory, calculate dynamic hourly occupancy blocks (08:00–20:00), and evaluate availability prior to reservation submission.
* **Architecture Solution:** Deploying three identical, stateless Node.js/Express backend instances behind an Nginx reverse proxy load balancer distributing read and write traffic evenly via round-robin, while sharing the same authoritative cloud-hosted Neon PostgreSQL database.

---

## 2. Multi-Instance Load Balancing Architecture

```
                                 [ Client / Load Tester / Browser ]
                                                 │
                                                 ▼ (HTTP :8080)
                                    ┌─────────────────────────┐
                                    │     Nginx Container     │
                                    │  (spacesync-nginx-lb)   │
                                    │    Round-Robin Proxy    │
                                    └────────────┬────────────┘
                         ┌───────────────────────┼───────────────────────┐
                         │ :5000                 │ :5000                 │ :5000
                         ▼                       ▼                       ▼
              ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
              │  Backend Instance 1 │ │  Backend Instance 2 │ │  Backend Instance 3 │
              │(spacesync-backend-1)│ │(spacesync-backend-2)│ │(spacesync-backend-3)│
              │INSTANCE_ID=backend-1│ │INSTANCE_ID=backend-2│ │INSTANCE_ID=backend-3│
              └──────────┬──────────┘ └──────────┬──────────┘ └──────────┬──────────┘
                         │                       │                       │
                         └───────────────────────┼───────────────────────┘
                                                 │ TLS / SSL (:5432)
                                                 ▼
                                    ┌─────────────────────────┐
                                    │   Neon PostgreSQL DB    │
                                    │  (Serverless Cloud DB)  │
                                    │ btree_gist Concurrency  │
                                    └─────────────────────────┘
```

### Architectural Highlights
1. **Single Entry Point on Port 8080:** Nginx listens on `http://localhost:8080` (or `${NGINX_PORT:-8080}`) and proxies traffic to the three backend containers (`backend-1:5000`, `backend-2:5000`, `backend-3:5000`) over an isolated Docker bridge network (`spacesync-network`).
2. **Authoritative Neon Cloud Database:** All three backend instances connect to the exact same Neon PostgreSQL database using the `DATABASE_URL` environment variable.
3. **Connection Pool Protection (`DB_POOL_MAX`):** To prevent three instances from exhausting Neon's serverless connection pool limit, each instance is configured with a sensible pool max (`DB_POOL_MAX=7`, totaling at most 21 pooled connections across the entire cluster).
4. **No In-Memory Fallback:** The backend instances enforce `ALLOW_EMBEDDED_DB=false`, guaranteeing they never silently fall back to an in-memory mock and always use authoritative PostgreSQL.
5. **Observability & Request Identification:**
   * Every HTTP response contains the custom headers:
     * `X-Served-By: <instance_id>` (`backend-1`, `backend-2`, or `backend-3`)
     * `X-Backend-Instance: <instance_id>`
     * `X-Proxy-By: SpaceSync-Nginx-LB`
   * The `/api/health` JSON payload also includes the `instance` attribute:
     ```json
     {
       "status": "ok",
       "instance": "backend-1",
       "database": "connected",
       "uptime": 12,
       "latency": "180ms",
       "environment": "production"
     }
     ```
6. **Transaction Safety & Double-Booking Prevention:** Double-booking prevention is enforced inside PostgreSQL via `tstzrange` exclusion constraints (`CONSTRAINT no_double_booking EXCLUDE USING gist`) and `SELECT ... FOR UPDATE` row locks. Concurrency prevention remains 100% atomic regardless of which backend instance handles the request.

---

## 3. Environment Configuration

### Step 1: Create your local `.env` file
Copy `.env.example` to `.env` in the repository root:
```bash
cp .env.example .env
```

### Step 2: Configure your Neon PostgreSQL Connection String
Edit `.env` and set `DATABASE_URL` to your Neon PostgreSQL connection string:
```bash
# Authoritative Cloud PostgreSQL Connection String (Neon)
DATABASE_URL=postgresql://username:password@ep-something.us-east-2.aws.neon.tech/spacesync?sslmode=require

# Port configuration (8080 default, or 8081 if port 8080 has a host conflict)
NGINX_PORT=8080

# Connection limits & security
DB_POOL_MAX=7
ALLOW_EMBEDDED_DB=false
JWT_SECRET=spacesync_da3_production_jwt_secret_key_2026_secure
```

> **IMPORTANT NOTE ON PORT 8080 CONFLICTS:**  
> On Windows machines with Oracle Database Express Edition installed, `OracleXETNSListener` / Oracle XML DB listens on port 8080 by default and responds with `HTTP/1.1 401 Unauthorized (Basic realm="XDB")`.  
> To resolve this:  
> - Either stop the Oracle service via PowerShell: `Stop-Service OracleXETNSListener`  
> - Or set `NGINX_PORT=8081` in your `.env` file to run Nginx on port 8081.

---

## 4. Commands to Build, Run, and Inspect

### A. Build and Start the 3 Instances + Nginx
```bash
# Build the backend image and start all 4 containers in the background
docker compose up --build -d
```

### B. Check Container Status
```bash
docker compose ps
```
**Expected Output (Healthy):**
```
NAME                  IMAGE                COMMAND                  SERVICE     CREATED         STATUS                   PORTS
spacesync-backend-1   space-backend-1      "docker-entrypoint.s…"   backend-1   1 minute ago    Up 1 minute (healthy)    5000/tcp
spacesync-backend-2   space-backend-2      "docker-entrypoint.s…"   backend-2   1 minute ago    Up 1 minute (healthy)    5000/tcp
spacesync-backend-3   space-backend-3      "docker-entrypoint.s…"   backend-3   1 minute ago    Up 1 minute (healthy)    5000/tcp
spacesync-nginx-lb    nginx:1.27-alpine    "/docker-entrypoint.…"   nginx       1 minute ago    Up 1 minute (healthy)    0.0.0.0:8080->80/tcp
```

### C. Inspect Logs
```bash
# View aggregated logs across all instances
docker compose logs -f

# View Nginx load balancer access logs (shows upstream instance IP:port)
docker compose logs -f nginx

# View logs for a specific backend instance
docker compose logs -f backend-1
docker compose logs -f backend-2
docker compose logs -f backend-3
```

### D. Stop the Cluster
```bash
# Stop and remove containers and networks
docker compose down
```

---

## 5. Demonstrating Request Distribution (Evidence for Q1a)

### Automated Verification Script
Run the automated demonstration script:
```bash
node scripts/verify-load-balancing.js
```
*(Or specify custom URL/port: `node scripts/verify-load-balancing.js http://localhost:8080/api/health`)*

### Example Execution Output:
```text
========================================================================
 SpaceSync BACSE344 DA3 - Q1(a) Load Balancing Demonstration
========================================================================
 Target Load Balancer:  http://localhost:8080/api/health
 Total Sample Requests: 15
 Load Balancing Method: Nginx Round-Robin (default)
------------------------------------------------------------------------

Sending requests sequentially through Nginx (port 8080)...

Req # | Status | Upstream Handled By       | Database    | Latency | Result
------|--------|---------------------------|-------------|---------|-------
    1 | 200    | backend-1                 | connected   | 15ms    | ✅ OK
    2 | 200    | backend-2                 | connected   | 14ms    | ✅ OK
    3 | 200    | backend-3                 | connected   | 16ms    | ✅ OK
    4 | 200    | backend-1                 | connected   | 13ms    | ✅ OK
    5 | 200    | backend-2                 | connected   | 15ms    | ✅ OK
    6 | 200    | backend-3                 | connected   | 14ms    | ✅ OK
    7 | 200    | backend-1                 | connected   | 13ms    | ✅ OK
    8 | 200    | backend-2                 | connected   | 15ms    | ✅ OK
    9 | 200    | backend-3                 | connected   | 14ms    | ✅ OK
   10 | 200    | backend-1                 | connected   | 13ms    | ✅ OK
   11 | 200    | backend-2                 | connected   | 14ms    | ✅ OK
   12 | 200    | backend-3                 | connected   | 15ms    | ✅ OK
   13 | 200    | backend-1                 | connected   | 14ms    | ✅ OK
   14 | 200    | backend-2                 | connected   | 13ms    | ✅ OK
   15 | 200    | backend-3                 | connected   | 14ms    | ✅ OK

------------------------------------------------------------------------
 Multi-Instance Distribution Breakdown
------------------------------------------------------------------------
Total Requests:      15
Successful (HTTP 200): 15
Failed / Degraded:   0

Instance Traffic Distribution:
  • backend-1   :  5 requests ( 33.3%) ██████████
  • backend-2   :  5 requests ( 33.3%) ██████████
  • backend-3   :  5 requests ( 33.3%) ██████████
------------------------------------------------------------------------

🎉 EVIDENCE VERIFIED:
✅ Requests were successfully balanced across all THREE instances (backend-1, backend-2, backend-3)!
✅ Evidence demonstrates round-robin distribution with zero dropped requests.

------------------------------------------------------------------------
 Database-backed API Verification: GET /api/resources
------------------------------------------------------------------------
✅ Query through Nginx succeeded (HTTP 200) in 22ms
   Served by: [backend-1] via [SpaceSync-Nginx-LB]
   All instances successfully query the authoritative Neon PostgreSQL database.
========================================================================
```

---

## 6. Diagnosis & Remediation Record

| Issue | Root Cause | Permanent Resolution |
| :--- | :--- | :--- |
| **`DATABASE_URL is not set` Warning** | `docker compose` was executed from root directory where no `.env` file existed. | Configured `env_file: [./backend/.env, .env]` in `docker-compose.yml` with `DATABASE_URL=${DATABASE_URL:-}` fallback syntax. |
| **Containers Unhealthy / Crash Loop** | Node app exited with `process.exit(1)` immediately when `DATABASE_URL` was missing, preventing Express from listening. | App now starts HTTP server and returns `503 Service Unavailable` with diagnostic JSON and instance headers. Healthcheck updated to use Node native fetch with 30s start period. |
| **`HTTP 401 Unauthorized` on Port 8080** | Host machine had Oracle Database TNS Listener (`OracleXETNSListener` / Oracle XML DB) occupying port 8080. | Identified Oracle XML DB process (`TNSLSNR`), and added configurable `NGINX_PORT=${NGINX_PORT:-8080}` mapping to prevent host port collision. |
| **Verification Script Reporting 0/15** | Script failed because Nginx could not bind to 8080 due to host port conflict. | Updated `verify-load-balancing.js` to report exact status codes, parse database status, provide actionable diagnostics, and support configurable ports. |
