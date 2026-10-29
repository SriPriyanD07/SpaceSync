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
1. **Single Entry Point on Port 8080:** Nginx listens on `http://localhost:8080` and proxies traffic to the three backend containers (`backend-1:5000`, `backend-2:5000`, `backend-3:5000`) over an isolated Docker bridge network (`spacesync-network`).
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
       "uptime": 12.4,
       "latency": "180ms",
       "environment": "production"
     }
     ```
6. **Transaction Safety & Double-Booking Prevention:** Double-booking prevention is enforced inside PostgreSQL via `tstzrange` exclusion constraints (`CONSTRAINT no_double_booking EXCLUDE USING gist`) and `SELECT ... FOR UPDATE` row locks. Concurrency prevention remains 100% atomic regardless of which backend instance handles the request.

---

## 3. Environment Configuration

Create a `.env` file in the root directory (or export the variable in your terminal session). **Do not commit `.env` to Git.**

```bash
# Authoritative Cloud PostgreSQL Connection String (Neon)
DATABASE_URL=postgresql://username:password@ep-something.us-east-2.aws.neon.tech/spacesync?sslmode=require

# JWT Secret for stateless token issuance and verification
JWT_SECRET=spacesync_da3_production_jwt_secret_key_2026_secure

# Per-instance connection pool size (3 instances * 7 = 21 connections max)
DB_POOL_MAX=7

# Disallow silent in-memory fallback
ALLOW_EMBEDDED_DB=false

# Allowed client origin
CLIENT_URL=http://localhost:8080
```

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
**Expected Output:**
```
NAME                  IMAGE                COMMAND                  SERVICE     CREATED         STATUS                   PORTS
spacesync-backend-1   space-backend-1      "docker-entrypoint.s…"   backend-1   1 minute ago    Up 1 minute (healthy)    5000/tcp
spacesync-backend-2   space-backend-2      "docker-entrypoint.s…"   backend-2   1 minute ago    Up 1 minute (healthy)    5000/tcp
spacesync-backend-3   space-backend-3      "docker-entrypoint.s…"   backend-3   1 minute ago    Up 1 minute (healthy)    5000/tcp
spacesync-nginx-lb    nginx:1.27-alpine    "/docker-entrypoint.…"   nginx       1 minute ago    Up 1 minute              0.0.0.0:8080->80/tcp
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
*(Or on Unix/macOS: `./scripts/verify-load-balancing.sh`)*

### Example Execution Output:
```text
========================================================================
 SpaceSync BACSE344 DA3 - Q1(a) Load Balancing Demonstration
========================================================================
 Target Load Balancer:  http://localhost:8080/api/health
 Total Sample Requests: 15
 Load Balancing Method: Nginx Round-Robin
------------------------------------------------------------------------

Sending requests sequentially through Nginx (port 8080)...

Req # | Status | Nginx Upstream Handled By | Latency | Result
------|--------|---------------------------|---------|-------
    1 | 200    | backend-1                 | 15ms    | ✅ OK
    2 | 200    | backend-2                 | 14ms    | ✅ OK
    3 | 200    | backend-3                 | 16ms    | ✅ OK
    4 | 200    | backend-1                 | 13ms    | ✅ OK
    5 | 200    | backend-2                 | 15ms    | ✅ OK
    6 | 200    | backend-3                 | 14ms    | ✅ OK
    7 | 200    | backend-1                 | 13ms    | ✅ OK
    8 | 200    | backend-2                 | 15ms    | ✅ OK
    9 | 200    | backend-3                 | 14ms    | ✅ OK
   10 | 200    | backend-1                 | 13ms    | ✅ OK
   11 | 200    | backend-2                 | 14ms    | ✅ OK
   12 | 200    | backend-3                 | 15ms    | ✅ OK
   13 | 200    | backend-1                 | 14ms    | ✅ OK
   14 | 200    | backend-2                 | 13ms    | ✅ OK
   15 | 200    | backend-3                 | 14ms    | ✅ OK

------------------------------------------------------------------------
 Multi-Instance Distribution Breakdown
------------------------------------------------------------------------
Total Requests:      15
Successful:          15
Failed:              0

Instance Breakdown:
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
✅ Query through Nginx succeeded (HTTP 200) in 182ms
   Served by: [backend-1] via [SpaceSync-Nginx-LB]
   All instances successfully query the authoritative Neon PostgreSQL database.
========================================================================
```

### Manual cURL Inspection
You can also inspect individual headers directly:
```bash
curl -i http://localhost:8080/api/health
```
Look for the response headers:
```http
HTTP/1.1 200 OK
Server: nginx/1.27.4
Content-Type: application/json; charset=utf-8
X-Served-By: backend-1
X-Backend-Instance: backend-1
X-Proxy-By: SpaceSync-Nginx-LB
```

---

## 6. Files Created and Modified for DA3 Q1(a)

| File | Purpose |
| :--- | :--- |
| `backend/Dockerfile` | Multi-stage Docker build for the backend with non-root user security. |
| `backend/.dockerignore` | Prevents local `node_modules`, `.env`, and build artifacts from leaking into images. |
| `nginx/nginx.conf` | Nginx reverse proxy configuration defining the upstream backend pool and round-robin load balancing. |
| `docker-compose.yml` | Multi-container specification running `backend-1`, `backend-2`, `backend-3`, and `nginx`. |
| `backend/src/app.ts` | Added `X-Served-By` and `X-Backend-Instance` headers middleware and port 8080 CORS origin. |
| `backend/src/config/db.ts` | Configurable connection pool sizing (`DB_POOL_MAX=7`) and strict prevention of silent fallback. |
| `backend/src/routes/healthRoutes.ts` | Health endpoint reporting active `instance` ID. |
| `backend/tests/authAndResources.test.ts` | Integration tests verifying instance identification headers. |
| `scripts/verify-load-balancing.js` | Automated script demonstrating request distribution across all 3 backend instances. |
| `scripts/verify-load-balancing.sh` | Bash script for cURL-based distribution verification. |
| `.env.example` | Root template documenting multi-instance settings without exposing credentials. |
| `docs/da3-setup.md` | Comprehensive assignment guide and report documentation. |
