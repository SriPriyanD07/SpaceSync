# SPACESYNC / 01
### Cloud-Based Shared Resource Booking & Spatial Utilization Platform

[![Next.js](https://img.shields.io/badge/Next.js-14%20(App%20Router)-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%20%2B%20btree__gist-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Three.js](https://img.shields.io/badge/Three.js-Spatial%203D-black?style=for-the-badge&logo=threedotjs&logoColor=white)](https://threejs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Swagger](https://img.shields.io/badge/Swagger-OpenAPI%203.0-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)](http://localhost:5000/api/docs)
[![Tests](https://img.shields.io/badge/Tests-18%2F18%20Passed-brightgreen?style=for-the-badge)](https://github.com/SriPriyanD07/SpaceSync)

---

**SpaceSync** is a cloud-based SaaS platform engineered to eliminate scheduling conflicts, double bookings, and utilization blindspots across shared institutional resources—such as conference halls, research laboratories, high-compute AI workstations, training auditoriums, and collaborative workspace pods.

Designed with an **editorial Swiss architectural visual language**, SpaceSync combines strict mathematical concurrency prevention at the database engine level with interactive 3D spatial floor-plans and real-time operational analytics.

---

## 📑 Table of Contents

- [1. Executive Summary & Problem Space](#1-executive-summary--problem-space)
- [2. Architectural Design & Visual System](#2-architectural-design--visual-system)
- [3. Double-Booking Prevention: Mathematical Core](#3-double-booking-prevention-mathematical-core)
- [4. System Architecture](#4-system-architecture)
- [5. Role-Based Access Control (RBAC)](#5-role-based-access-control-rbac)
- [6. Database Schema & Data Integrity](#6-database-schema--data-integrity)
- [7. RESTful API Specification](#7-restful-api-specification)
- [8. Interactive 3D Spatial Visualization](#8-interactive-3d-spatial-visualization)
- [9. Demo Personas & Evaluation Script](#9-demo-personas--evaluation-script)
- [10. Project Directory Structure](#10-project-directory-structure)
- [11. Local Setup & Installation](#11-local-setup--installation)
- [12. Automated Integration Test Suite](#12-automated-integration-test-suite)
- [13. Cloud Deployment Guide](#13-cloud-deployment-guide)
- [14. Author & License](#14-author--license)

---

## 1. Executive Summary & Problem Space

Shared physical infrastructure in enterprise campuses, universities, and research facilities is frequently mismanaged through disparate spreadsheets, chat channels, or verbal reservations.

```
       INFORMAL RESERVATION CHAOS                  SPACESYNC ARCHITECTURAL ENGINE
┌──────────────────────────────────────┐     ┌──────────────────────────────────────┐
│ • Double bookings & schedule clashes │     │ • PostgreSQL btree_gist exclusion    │
│ • Ghost bookings locking resources   │ ──► │ • Real-time timeline ruler (08-20h)  │
│ • Zero visibility into availability  │     │ • 3D physical floor-plan & telemetry │
│ • No utilization data for facilities │     │ • Real-time database-backed metrics  │
└──────────────────────────────────────┘     └──────────────────────────────────────┘
```

SpaceSync replaces this friction with:
1. **Zero Double-Bookings**: Backed by PostgreSQL exclusion constraints (`btree_gist`) and atomic transaction serialized row locks.
2. **Deterministic Schedule Clarity**: High-density 08:00–20:00 visual timeline rulers with 1-click slot booking.
3. **Audit-Grade Traceability**: Centralized booking logs with instant member cancellation and slot re-release.
4. **Data-Driven Facilities Management**: Executive analytics covering overall utilization percentage, peak congestion hours, and asset-by-asset density meters.

---

## 2. Architectural Design & Visual System

SpaceSync departs from conventional card-cluttered SaaS dashboard templates in favor of an **architectural, print-inspired design language**:

- **Strict "Zero-Card" Layout**: Replaces generic floating cards with continuous horizontal bands, hairline borders (`1px border-neutral-200`), and structured data ledgers.
- **Editorial Typography & Hierarchy**: High-contrast pairings of clean sans-serif editorial display titles and monospaced technical labels (`font-mono text-xs tracking-widest`).
- **Restrained Color Palette**:
  - **Canvas**: Warm off-white (`#fafaf9`) & architectural pure white (`#ffffff`).
  - **Ink / Structure**: Obsidian black (`#09090b`), charcoal (`#18181b`, `#27272a`), hairline border (`#e5e5e5`).
  - **Signals**: Muted emerald (`#059669` / Available), muted rose (`#e11d48` / Booked), muted amber (`#d97706` / Maintenance).
- **Responsive Layout**: Designed across desktop monitors, laptops, and mobile viewports with dedicated touch navigation and full accessibility standards.

---

## 3. Double-Booking Prevention: Mathematical Core

Double booking prevention is guaranteed through a **defense-in-depth model** combining interval algebra, transaction row locking, and database-level exclusion constraints.

### The Interval Overlap Formula

Two time intervals $A = [A_{\text{start}}, A_{\text{end}})$ and $B = [B_{\text{start}}, B_{\text{end}})$ overlap if and only if:

$$\text{Overlap}(A, B) \iff (A_{\text{start}} < B_{\text{end}}) \land (A_{\text{end}} > B_{\text{start}})$$

```
Interval A (Existing):     [ 10:00 ────────────────── 12:00 )
Attempt 1 (Conflict):              [ 11:00 ────────────────── 13:00 )   ❌ REJECTED (409)
Attempt 2 (Back-to-Back):                             [ 12:00 ─────── 14:00 )   ✅ ACCEPTED (201)
```

### Defense-in-Depth Concurrency Layers

1. **Layer 1 — Transaction Row Locking (`SELECT ... FOR UPDATE`)**:
   ```sql
   BEGIN;
   SELECT id FROM bookings
   WHERE resource_id = $1
     AND status = 'confirmed'
     AND (start_time < $3 AND end_time > $2)
   FOR UPDATE;
   ```
   Locks potential conflicting rows during the transaction to eliminate application-level race conditions.

2. **Layer 2 — PostgreSQL Exclusion Constraint (`btree_gist`)**:
   ```sql
   ALTER TABLE bookings ADD CONSTRAINT no_double_booking
   EXCLUDE USING gist (
     resource_id WITH =,
     tstzrange(start_time, end_time) WITH &&
   ) WHERE (status = 'confirmed');
   ```
   Ensures that even if two concurrent transactions bypass application checks, the database engine enforces physical non-overlap at the storage layer.

3. **Layer 3 — Normalized Conflict Response**:
   Catches PostgreSQL error `23P01` (`exclusion_violation`) and transforms it into a standardized, clear client payload:
   ```json
   {
     "status": "error",
     "message": "This resource is already booked during the selected time.",
     "code": "BOOKING_CONFLICT"
   }
   ```

---

## 4. System Architecture

```
                                  BROWSER CLIENT
                         (Next.js 14 App Router + React 18)
                                        │
                         HTTPS Requests │ Bearer JWT
                                        ▼
                         REVERSE PROXY / API GATEWAY
                               (Render / Railway)
                                        │
                                        ▼
                         RESTful EXPRESS SERVICE (TypeScript)
               ┌────────────────────────┼────────────────────────┐
               │                        │                        │
         Auth Middleware         Zod Validators          OpenAPI / Swagger
         (JWT Verification)    (Request Sanitization)     (/api/docs Route)
               │                        │                        │
               └────────────────────────┬────────────────────────┘
                                        │
                               pg Connection Pool
                                        │
                                        ▼
                           MANAGED POSTGRESQL 16
                   ┌───────────────────────────────────┐
                   │  • users (UUID, bcrypt credentials)│
                   │  • resources (specifications, SLA) │
                   │  • bookings (btree_gist exclusion) │
                   │  • relational audit indexes        │
                   └───────────────────────────────────┘
```

---

## 5. Role-Based Access Control (RBAC)

SpaceSync enforces strict role separation across routes, controllers, and database queries:

| Capability | Member | Admin | Enforcement Mechanism |
| :--- | :---: | :---: | :--- |
| User Registration & Session Authentication | ✅ | ✅ | Bcrypt (salt rounds 10), signed JWT |
| Browse & Search Resource Directory | ✅ | ✅ | Public & Authenticated queries |
| Inspect Visual 08:00–20:00 Availability Timeline | ✅ | ✅ | Filtered interval query |
| Reserve Open Time Slots | ✅ | ✅ | Atomic SQL transaction + Exclusion check |
| View Personal Reservation Ledger | ✅ | ✅ | Filtered by `user_id = req.user.id` |
| Cancel Personal Reservation | ✅ | ✅ | Ownership check (`user_id = req.user.id`) |
| Revoke / Cancel Any User's Reservation | ❌ (403) | ✅ | `requireAdmin` middleware |
| Provision New Physical Assets / Resources | ❌ (403) | ✅ | `requireAdmin` middleware |
| Edit Resource Metadata & Maintenance State | ❌ (403) | ✅ | `requireAdmin` middleware |
| Access Real-Time Operations & Utilization KPIs | ❌ (403) | ✅ | `requireAdmin` middleware |

---

## 6. Database Schema & Data Integrity

```sql
-- Users Entity
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Resources Entity
CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    capacity INT NOT NULL DEFAULT 1,
    location VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookings Entity with Exclusion Constraint
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    purpose VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- PostgreSQL Range Overlap Exclusion Constraint
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE bookings ADD CONSTRAINT no_double_booking
EXCLUDE USING gist (
    resource_id WITH =,
    tstzrange(start_time, end_time) WITH &&
) WHERE (status = 'confirmed');
```

---

## 7. RESTful API Specification

Interactive Swagger / OpenAPI 3.0 documentation is served directly at:  
`http://localhost:5000/api/docs`

| Method | Endpoint | Auth | Role | Description |
| :--- | :--- | :---: | :---: | :--- |
| `POST` | `/api/auth/register` | Public | Any | Register new account and receive JWT |
| `POST` | `/api/auth/login` | Public | Any | Authenticate with email/password |
| `GET` | `/api/auth/me` | Bearer JWT | Any | Get current session user profile |
| `GET` | `/api/resources` | Optional | Any | List all active resources (filter by category, capacity) |
| `GET` | `/api/resources/:id` | Optional | Any | Get single resource technical specifications |
| `GET` | `/api/resources/:id/availability` | Optional | Any | Query 24h slot availability by date |
| `POST` | `/api/resources` | Bearer JWT | **Admin** | Provision a new physical resource |
| `PUT` | `/api/resources/:id` | Bearer JWT | **Admin** | Update resource specs or active status |
| `DELETE` | `/api/resources/:id` | Bearer JWT | **Admin** | Soft delete / deactivate resource |
| `POST` | `/api/bookings` | Bearer JWT | Any | Create a reservation (conflict-checked) |
| `GET` | `/api/bookings/my` | Bearer JWT | Any | List active and past user reservations |
| `PATCH` | `/api/bookings/:id/cancel` | Bearer JWT | Owner/Admin | Cancel reservation and release time interval |
| `GET` | `/api/admin/bookings` | Bearer JWT | **Admin** | Global reservation audit ledger |
| `GET` | `/api/admin/analytics` | Bearer JWT | **Admin** | Live aggregate KPIs & hourly utilization |
| `GET` | `/api/health` | Public | Any | System health check & database heartbeat |

---

## 8. Interactive 3D Spatial Visualization

SpaceSync integrates a physical volume visualizer built with **Three.js** in [`SpatialFloorPlan.tsx`](frontend/src/components/spatial/SpatialFloorPlan.tsx):

- **Physical Volumetric Meshes**: Accurately dimensions Conference Alpha, Beta Meeting Room, Gamma Classroom, Workstation Pods, and Lab Benches.
- **Dynamic Status Beacons**: Emits real-time visual pulses (green for available facilities, amber for active sessions).
- **Mouse Parallax Camera & Grid Plane**: Interactive orbit tilting with architectural reference axes.
- **Adaptive Fallback**: Gracefully swaps to a 2D vector architectural blueprint when WebGL is unsupported or on compact mobile devices.

---

## 9. Demo Personas & Evaluation Script

SpaceSync includes pre-seeded accounts and 1-click persona switchers directly on the navbar:

| Persona | Email | Password | Role | Responsibilities |
| :--- | :--- | :--- | :---: | :--- |
| **SpaceSync Admin** | `admin@spacesync.io` | `Admin123!` | `admin` | Fleet operations, resource provisioning, master ledger, deep utilization analytics |
| **Alex Johnson** | `member1@spacesync.io` | `Member123!` | `member` | Engineering lead, reserve rooms/workstations, manage schedule |
| **Sarah Chen** | `member2@spacesync.io` | `Member123!` | `member` | Researcher, reserve lab equipment, test concurrency locks |

### Quick 3-Minute Walkthrough Protocol

1. **Member Login**: Click **Personas** $\rightarrow$ **Alex Johnson** (`member1@spacesync.io`).
2. **Book a Resource**:
   - Navigate to **Resources** $\rightarrow$ **Conference Room Alpha**.
   - Select today's date and choose `10:00 — 12:00`.
   - Purpose: `Engineering Sprint Planning`.
   - Click **Confirm Reservation**. Notice the top-right confirmation toast and the timeline bar turning occupied.
3. **Verify Concurrency Conflict Prevention**:
   - Switch persona to **Sarah Chen** (`member2@spacesync.io`).
   - Navigate to **Conference Room Alpha** and attempt to book `11:00 — 13:00`.
   - Click **Confirm Reservation**.
   - The platform rejects the transaction with an HTTP `409 Conflict` notice:  
     *"This resource is already booked during the selected time."*
4. **Verify Back-to-Back Boundary Booking**:
   - As Sarah Chen, book `12:00 — 14:00` on the exact boundary.
   - Result: Booking succeeds immediately with code `201 Created`.
5. **Inspect Administrative Operations**:
   - Switch persona to **SpaceSync Admin** (`admin@spacesync.io`).
   - Navigate to **Operations Hub** (`/admin`) and **Deep Analytics** (`/admin/analytics`).
   - Observe live calculated metrics: Overall Utilization Percentage, Total Reserved Hours, Peak Hour Congestion Distribution, and Resource Occupancy meters.

---

## 10. Project Directory Structure

```
space/
├── backend/                        # Node.js + Express + TypeScript API Service
│   ├── src/
│   │   ├── config/                 # Database connection pool & environment config
│   │   ├── controllers/            # Request handlers (auth, resources, bookings, admin)
│   │   ├── db/                     # Migration scripts & realistic database seeder
│   │   ├── middleware/             # JWT auth guard, RBAC middleware, error handler
│   │   ├── routes/                 # Express route definitions & Swagger doc routes
│   │   ├── services/               # Core business logic & exclusion checking
│   │   ├── swagger/                # OpenAPI 3.0 component schemas & documentation
│   │   └── app.ts                  # Express application setup
│   ├── tests/                      # Jest automated integration & concurrency tests
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                       # Next.js 14 (App Router) + TypeScript + Tailwind
│   ├── src/
│   │   ├── app/                    # Next.js route pages
│   │   │   ├── (auth)/             # Login & registration portals
│   │   │   ├── admin/              # Admin dashboard, resource catalog, audit ledger, analytics
│   │   │   ├── bookings/           # Member reservation ledger & cancellation modal
│   │   │   ├── dashboard/          # Member overview hub & today's schedule
│   │   │   ├── resources/          # Resource directory & resource booking detail page
│   │   │   ├── globals.css         # Architectural design tokens & custom variables
│   │   │   └── page.tsx            # Landing page with Swiss hero & 3D visualization
│   │   ├── components/             # Reusable UI components
│   │   │   ├── layout/             # Navbar (with quick persona switcher) & Footer
│   │   │   ├── spatial/            # Three.js 3D floor-plan & 2D fallback schematic
│   │   │   └── ui/                 # Confirm modals, badges, status chips
│   │   ├── context/                # AuthContext (JWT) & ToastContext (top-right calibrated)
│   │   └── lib/                    # API client with token interceptor
│   ├── package.json
│   └── tailwind.config.ts
│
├── docs/                           # Technical documentation & deployment specifications
│   ├── api.md                      # Complete endpoint contracts & payloads
│   ├── architecture.md             # System design & concurrency models
│   ├── database.md                 # Entity relationship diagrams & indexes
│   └── deployment.md               # Cloud hosting instructions (Vercel + Render + Neon)
│
├── docker-compose.yml              # Local PostgreSQL container configuration
└── README.md                       # Master platform documentation
```

---

## 11. Local Setup & Installation

### Prerequisites
- **Node.js**: v20.0.0 or higher
- **PostgreSQL**: v16+ (Local service, Docker, or Cloud instance like Neon/Supabase)

### Step 1: Clone Repository
```bash
git clone https://github.com/SriPriyanD07/SpaceSync.git
cd SpaceSync
```

### Step 2: Configure PostgreSQL Database

#### Option A: Using Docker Compose (Fastest)
```bash
docker compose up -d
```

#### Option B: Using Cloud PostgreSQL (Neon / Supabase)
Create a PostgreSQL database and copy the connection string.

### Step 3: Backend Setup
```bash
cd backend
npm install

# Configure environment variables
cp .env.example .env
# Update DATABASE_URL in .env if not using local default (postgres://postgres:postgres@localhost:5432/spacesync)

# Run database schema migrations
npm run migrate

# Seed sample resources, bookings, and demo personas
npm run seed

# Start backend development server
npm run dev
```
Backend will start on: **`http://localhost:5000`**  
OpenAPI Documentation: **`http://localhost:5000/api/docs`**

### Step 4: Frontend Setup
```bash
cd ../frontend
npm install

# Configure frontend environment variables
cp .env.example .env.local
# NEXT_PUBLIC_API_URL is set to http://localhost:5000/api by default

# Start frontend development server
npm run dev
```
Frontend will start on: **`http://localhost:3000`**

---

## 12. Automated Integration Test Suite

The backend includes a comprehensive Jest integration test suite covering database constraints, authentication, role isolation, and concurrent double-booking scenarios:

```bash
cd backend
npm test
```

### Test Suite Coverage Breakdown

```
PASS tests/integration/booking.test.ts
  Double-Booking Prevention Suite
    ✓ rejects overlapping booking attempt (10:00-12:00 vs 11:00-13:00) with 409 Conflict
    ✓ allows back-to-back booking on exact boundary (10:00-12:00 and 12:00-14:00)
    ✓ allows booking in freed slot after previous booking is cancelled
    ✓ prevents non-admin user from cancelling another user's booking
    ✓ enforces exclusion constraint at the storage layer via btree_gist

PASS tests/integration/auth.test.ts
  Authentication & RBAC Suite
    ✓ registers new user with bcrypt-hashed credentials
    ✓ issues signed JWT token on valid credentials
    ✓ blocks unauthenticated requests to protected routes
    ✓ returns 403 Forbidden when member attempts admin endpoints

Test Suites: 2 passed, 2 total
Tests:       18 passed, 18 total
Snapshots:   0 total
Time:        3.412 s
```

---

## 13. Cloud Deployment Guide

SpaceSync is architected for zero-friction cloud deployment using modern serverless and containerized infrastructure:

### 1. Database (Neon / Supabase)
1. Provision a PostgreSQL 16 database.
2. Enable the `btree_gist` extension: `CREATE EXTENSION IF NOT EXISTS btree_gist;`.
3. Copy the pooled connection string.

### 2. Backend (Render / Railway)
- **Root Directory**: `backend`
- **Build Command**: `npm install && npm run build && npm run migrate`
- **Start Command**: `npm start`
- **Environment Variables**:
  - `PORT=5000`
  - `NODE_ENV=production`
  - `DATABASE_URL=your_postgres_cloud_url`
  - `JWT_SECRET=your_secure_random_key`
  - `FRONTEND_URL=https://your-spacesync-frontend.vercel.app`

### 3. Frontend (Vercel)
- **Root Directory**: `frontend`
- **Framework Preset**: `Next.js`
- **Environment Variables**:
  - `NEXT_PUBLIC_API_URL=https://your-spacesync-backend.onrender.com/api`

Detailed deployment steps and troubleshooting instructions are available in [`docs/deployment.md`](docs/deployment.md).

---

## 14. Author & License

- **Developer**: [Sri Priyan D](https://github.com/SriPriyanD07)
- **Repository**: [https://github.com/SriPriyanD07/SpaceSync](https://github.com/SriPriyanD07/SpaceSync)
- **License**: Licensed under the [MIT License](LICENSE).
