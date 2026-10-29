# SpaceSync BACSE344 DA3 — Q1(d) Architecture & Cloud-Bursting Specification

**Course:** Cloud Infrastructure and Architecture (BACSE344)  
**Slot:** C1 Slot  
**Project:** SpaceSync — Cloud-Based Shared Resource Booking & Utilization Platform  
**Component:** Question 1(d) — Architecture Diagram, Port Mapping & Cloud Bursting Design  
**Diagram Assets:**  
- Mermaid Source: [`docs/da3/evidence/q1d-architecture.mmd`](file:///d:/PROJECTS/space/docs/da3/evidence/q1d-architecture.mmd)  
- Standalone Vector Diagram: [`docs/da3/evidence/q1d-architecture.svg`](file:///d:/PROJECTS/space/docs/da3/evidence/q1d-architecture.svg)  

---

## 1. Actual Implemented Architecture (Assignment 1 + DA3 Q1a–c)

The implemented system represents a decoupled, containerized, cloud-backed platform designed for zero double-booking concurrency and horizontal elasticity:

```text
User Browser / Load Tester (ab)
          │
          ▼ HTTPS / REST API
Vercel Edge Platform (Next.js 14 App Router)
          │
          ▼ HTTP :8081 (Docker Port Forwarding)
Nginx Load Balancer (spacesync-nginx-lb :80)
   ├── Round-Robin Upstream #1 ──► Backend Instance 1 (spacesync-backend-1 :5000)
   ├── Round-Robin Upstream #2 ──► Backend Instance 2 (spacesync-backend-2 :5000)
   └── Round-Robin Upstream #3 ──► Backend Instance 3 (spacesync-backend-3 :5000)
          │
          ▼ TLS Encrypted Port 5432 (Pool Max = 7 per instance)
Neon Serverless PostgreSQL 18 (ep-morning-tree-b3yub052)
```

### Component Inventory & Configuration Matrix

| Component Name | Role / Technology | Actual Host / Network Port | Container Port | Hosting / Runtime Platform | Status |
| :--- | :--- | :---: | :---: | :--- | :---: |
| **Frontend Web UI** | Next.js 14 (App Router, Tailwind CSS, Lucide Icons) | Standard HTTPS (443) | — | Vercel Edge Global CDN | **Production Implemented** |
| **Production API** | Node.js, Express, TypeScript | Standard HTTPS (443) | 10000 | Render Web Service (`spacesync-0uis.onrender.com`) | **Assignment 1 Implemented** |
| **Nginx Reverse Proxy** | Nginx 1.27 Alpine Load Balancer | `http://localhost:8081` | 80 | Docker Compose (`spacesync-network`) | **DA3 Q1(a) Implemented** |
| **Backend Instance 1** | Stateless REST API (`spacesync-backend-1`) | Internal bridge | 5000 | Docker Compose (Node 20 Alpine) | **DA3 Q1(a) Implemented** |
| **Backend Instance 2** | Stateless REST API (`spacesync-backend-2`) | Internal bridge | 5000 | Docker Compose (Node 20 Alpine) | **DA3 Q1(a) Implemented** |
| **Backend Instance 3** | Stateless REST API (`spacesync-backend-3`) | Internal bridge | 5000 | Docker Compose (Node 20 Alpine) | **DA3 Q1(a) Implemented** |
| **Neon PostgreSQL** | Serverless PostgreSQL 18 with `btree_gist` | TLS Port 5432 | 5432 | Neon Cloud (`ap-southeast-1.aws`) | **Authoritative Cloud DB** |
| **Benchmarking Suite** | ApacheBench (`ab` v2.3 in `httpd:alpine`) | Internal bridge | — | Docker Container Execution | **DA3 Q1(b–c) Implemented** |

### Network & Port Routing Details
- **External Local Entry Point:** Local client traffic targets `http://localhost:8081` (mapped to port 80 of `spacesync-nginx-lb`). Port 8081 was selected because the host Windows machine has Oracle XML DB / TNSLSNR bound to port 8080.
- **Internal Docker Network:** Containers communicate over the private bridge network `spacesync-network` using service DNS names (`backend-1:5000`, `backend-2:5000`, `backend-3:5000`).
- **Database Connection Security:** Every backend instance initiates outbound TLS connections directly to `ep-morning-tree-b3yub052-pooler.c-4.ap-southeast-1.aws.neon.tech:5432`.
- **Concurrency & Double-Booking Protection:** Concurrency safety is enforced at the database layer via PostgreSQL range exclusion constraints (`CONSTRAINT no_double_booking EXCLUDE USING gist (resource_id WITH =, tstzrange(start_time, end_time) WITH &&)`). Because the lock is held inside Neon, all three backend instances can accept reservations concurrently with 100% mathematical zero-conflict guarantees.

---

## 2. Proposed Cloud-Bursting Extension (PROPOSED — NOT IMPLEMENTED)

In the architecture diagram, the cloud-bursting extension is highlighted in **Amber / Orange with dashed borders** to clearly distinguish it from existing components.

### A. Peak-Demand Scenario in SpaceSync
- **The Monday Morning Reservation Surge (08:00 AM – 09:00 AM):**
  At university campuses or corporate research hubs, booking schedules open at 08:00 AM. Thousands of team leads simultaneously query room availability (`GET /api/resources/:id/availability`) and reserve high-demand facilities (AI workstations with RTX 4090 GPUs, 4K seminar halls).
- **The Capacity Problem:** The steady-state cluster (e.g. 3 backend instances) can comfortably handle 170+ requests per second, which is more than sufficient for standard operating hours. Sizing the permanent local cluster for 1,000+ RPS would cause 90% idle resource waste throughout the remainder of the week.

### B. Why Cloud Bursting Was Chosen
Cloud bursting allows SpaceSync to run on a cost-efficient baseline infrastructure during ordinary hours while dynamically "bursting" excess traffic into an elastic public cloud (AWS ECS Fargate or Google Cloud Run) during high-demand surges.

### C. Technical Implementation Architecture

```text
                                [ Incoming Traffic Surge ]
                                            │
                                            ▼
                           ┌─────────────────────────────────┐
                           │   Cloud Burst Traffic Manager   │
                           │  (Cloudflare / Route 53 DNS)    │
                           └────────────────┬────────────────┘
                                            │
               ┌────────────────────────────┴────────────────────────────┐
               │ Normal Load (<80%)                                      │ Surge Spillover (>80%)
               ▼                                                         ▼
┌──────────────────────────────┐                         ┌──────────────────────────────┐
│  Primary Baseline Cluster    │                         │  Elastic Cloud Burst Fleet   │
│  (Nginx + 3 Docker Backends) │                         │  (Serverless ECS / Cloud Run)│
└──────────────┬───────────────┘                         └──────────────┬───────────────┘
               │                                                        │
               │ Outbound TLS (:5432)                                   │ Outbound TLS (:5432)
               │ (Max 7 conn/inst)                                      ▼
               │                                         ┌──────────────────────────────┐
               │                                         │ Cloud PgBouncer Multiplexer  │
               │                                         │ (Transaction Mode Pooling)   │
               │                                         └──────────────┬───────────────┘
               │                                                        │
               └────────────────────────────┬───────────────────────────┘
                                            │
                                            ▼
                           ┌─────────────────────────────────┐
                           │   Neon PostgreSQL Database      │
                           │   (Shared Authoritative State)  │
                           └─────────────────────────────────┘
```

#### 1. Autoscaling Trigger
- **Telemetry Collector:** A lightweight Prometheus / CloudWatch agent monitors CPU utilization, memory pressure, and Nginx request queue depth.
- **Scale-Out Condition:** Cloud bursting triggers when:
  - Cluster CPU utilization $> 75\%$ for 60 consecutive seconds, OR
  - Nginx active connections $> 80\%$ of upstream pool capacity, OR
  - Average API response latency exceeds $250\text{ ms}$.

#### 2. Provisioning & Deployment
- **Container Image Reusability:** The identical multi-stage Docker image built in `backend/Dockerfile` (`space-backend`) is pushed to a container registry (AWS ECR / Google Artifact Registry).
- **Serverless Provisioning:** The autoscaler triggers AWS ECS Fargate or Google Cloud Run to launch ephemeral instances within 15–30 seconds.
- **Stateless Operation:** Because SpaceSync backends store zero in-memory session state (authentication uses self-contained stateless JWTs with shared HMAC secrets), newly spawned burst instances can process user requests immediately without session warm-up.

#### 3. Traffic Routing & Load Balancing
- **Global Traffic Manager:** A DNS-based routing policy (AWS Route 53 Weighted Routing or Cloudflare Load Balancer) monitors health endpoints (`/api/health`).
- **Spillover Routing:** As long as local capacity remains $<80\%$, $100\%$ of requests flow to the baseline cluster. Once local latency exceeds the threshold, spillover traffic is directed to the cloud burst fleet.

#### 4. Shared Database Layer & Connection Pool Protection
- **The Connection Exhaustion Hazard:** Neon serverless PostgreSQL has strict connection pool limits (typically 20–100 simultaneous connections). If 10 burst instances spawn each creating 7 direct connections, Neon's pool would be exhausted, crashing the database.
- **The Solution (PgBouncer Multiplexing):**
  - Baseline instances connect directly to Neon (`DB_POOL_MAX=7`).
  - All burst instances connect through **Neon's built-in PgBouncer Connection Pooler** (using transaction pooling mode).
  - PgBouncer multiplexes hundreds of ephemeral burst connections into a small, fixed pool of database connections, guaranteeing that bursting never starves the database.
- **ACID & Concurrency Guarantees:** Because all instances query the exact same Neon PostgreSQL database, `btree_gist` exclusion constraints prevent double-bookings across both baseline and burst instances simultaneously.

#### 5. Automated Scale-Down & Spin-Off
- **Cooldown Window:** When traffic subsides below $40\%$ capacity for 5 consecutive minutes (the Monday morning rush concludes):
  - Cloudflare/Route 53 ceases routing new traffic to burst instances.
  - In-flight requests are allowed to drain gracefully (`SIGTERM` with 30s timeout).
  - Ephemeral containers terminate, returning cluster billing to zero until the next demand window.
