# SpaceSync: Cloud-Based Shared Resource Booking & Utilization Platform

[![CI](https://github.com/organization/spacesync/actions/workflows/ci.yml/badge.svg)](https://github.com/organization/spacesync/actions)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%20%2B%20btree__gist-blue.svg)](https://www.postgresql.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14%20(App%20Router)-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![Swagger](https://img.shields.io/badge/Swagger-OpenAPI%203.0-green.svg)](http://localhost:5000/api/docs)

**SpaceSync** is a production-grade SaaS web platform engineered to solve shared resource scheduling bottlenecks across organizations, corporate campuses, research laboratories, training facilities, and coworking spaces.

---

## 1. Problem Statement

Offices, universities, and research facilities often manage shared physical assets (meeting rooms, AI workstations, high-spec spectrometers, training auditoriums, and projectors) using disparate spreadsheets, WhatsApp groups, or verbal requests.

This operational approach leads to:
1. **Double Bookings**: Multiple teams arriving at the same venue at the same time.
2. **Zero Visibility**: No real-time indication of current occupancy or equipment status.
3. **Ghost Bookings**: Reserved slots abandoned without cancellation, locking others out.
4. **Missing Utilization Insights**: Facilities management lacks data to optimize space allocation or justify equipment expenditures.

**SpaceSync** solves this with a centralized, cloud-architected platform featuring **zero-conflict mathematical guarantees** and **real-time utilization analytics**.

---

## 2. System Architecture

```
User (Browser)
      │
      ▼ HTTPS
Cloud Frontend (Next.js 14 App Router on Vercel)
      │
      ▼ RESTful API (Bearer JWT)
Stateless Backend (Node.js + Express + TypeScript on Render/Railway)
      │
      ▼ Connection Pool + Exclusion Constraint
Managed PostgreSQL (Neon / Supabase with btree_gist)
```

- **Stateless RESTful Architecture**: Backend stores zero in-memory session state, allowing seamless horizontal autoscaling.
- **Client-Server Decoupling**: Complete separation between presentation and API services.
- **Database Persistence**: PostgreSQL ensures ACID compliance with serialized row locks and range exclusion constraints.

---

## 3. Double-Booking Prevention: The Technical Centerpiece

SpaceSync guarantees zero double-bookings through multi-layered concurrency protection:

### Interval Overlap Mathematical Model
Two time intervals $A = [A_{start}, A_{end})$ and $B = [B_{start}, B_{end})$ overlap if and only if:
$$\text{Overlap}(A, B) \iff (A_{start} < B_{end}) \land (A_{end} > B_{start})$$

- **Overlapping Attempt (10:00–12:00 vs 11:00–13:00)**:  
  $10:00 < 13:00$ (True) AND $12:00 > 11:00$ (True) $\implies$ **REJECTED (409 Conflict)**.
- **Back-to-Back Booking (10:00–12:00 vs 12:00–14:00)**:  
  $10:00 < 14:00$ (True), BUT $12:00 > 12:00$ is (False) $\implies$ **ACCEPTED (201 Created)**.

### Defense-in-Depth Implementation
1. **Transaction-Safe Row Locking**:
   ```sql
   BEGIN;
   SELECT id FROM bookings
   WHERE resource_id = $1
     AND status = 'confirmed'
     AND (start_time < $3 AND end_time > $2)
   FOR UPDATE;
   ```
2. **PostgreSQL Exclusion Constraint (`btree_gist`)**:
   ```sql
   ALTER TABLE bookings ADD CONSTRAINT no_double_booking
   EXCLUDE USING gist (
     resource_id WITH =,
     tstzrange(start_time, end_time) WITH &&
   ) WHERE (status = 'confirmed');
   ```
3. **Graceful Error Handling**:  
   Constraint violation code `23P01` is caught by the Express error handler and returned as an informative HTTP `409 Conflict`:
   > *"This resource is already booked during the selected time."*

---

## 4. Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide Icons, Recharts.
- **Backend**: Node.js, Express.js, TypeScript, `pg` pool, `bcryptjs`, `jsonwebtoken`, `zod`, `swagger-ui-express`, `helmet`, `cors`.
- **Database**: PostgreSQL 16 with `btree_gist` extension.
- **Deployment**:
  - Frontend: Vercel
  - Backend: Render / Railway
  - Database: Neon / Supabase
  - CI/CD: GitHub Actions (`.github/workflows/ci.yml`)

---

## 5. Roles & RBAC Matrix

| Feature | Member | Admin |
| :--- | :---: | :---: |
| Register / Login | Yes | Yes |
| Explore & Filter Resources | Yes | Yes |
| Visual Hourly Availability | Yes | Yes |
| Book Resource | Yes | Yes |
| View Own Bookings | Yes | Yes |
| Cancel Own Booking (Release Slot) | Yes | Yes |
| View / Cancel Other Users' Bookings | **Forbidden (403)** | Yes |
| Provision / Edit Resources | **Forbidden (403)** | Yes |
| View Utilization Analytics & Charts | **Forbidden (403)** | Yes |

---

## 6. Seed Credentials & Personas

After running the seed script, the database is populated with realistic personas:

| Persona | Email | Password | Role |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@spacesync.io` | `Admin123!` | Administrator |
| **Member 1** | `member1@spacesync.io` | `Member123!` | Member (Alex Johnson) |
| **Member 2** | `member2@spacesync.io` | `Member123!` | Member (Sarah Chen) |

---

## 7. Local Setup & Running Instructions

### Prerequisites
- Node.js 20+
- Docker (optional for local Postgres) or an existing PostgreSQL connection string

### Step 1: Start PostgreSQL (Docker or Cloud)
```bash
# Start local PostgreSQL container with btree_gist extension support
docker compose up -d
```
*(Or use a free cloud instance from Neon / Supabase and paste its URL into `.env`)*

### Step 2: Set Up Backend
```bash
cd backend
npm install
npm run migrate
npm run seed
npm run dev
```
Backend runs on `http://localhost:5000`.
- Swagger Docs: `http://localhost:5000/api/docs`
- Health Check: `http://localhost:5000/api/health`

### Step 3: Run Automated Test Suite
```bash
cd backend
npm test
```
Runs 18 automated integration tests including double-booking rejection, back-to-back acceptance, and RBAC isolation.

### Step 4: Set Up Frontend
```bash
cd ../frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:3000`.

---

## 8. 5-Minute Final Demonstration Script

Follow this workflow for the evaluation demo:

1. **Open SpaceSync** at `http://localhost:3000`.
2. **Login as Member**: Click **"Demo as Member"** (logs in as `member1@spacesync.io`).
3. **Explore Resources**: Navigate to **Explore Resources**. Notice real-time filtering by category (Meeting Rooms, Workstations, Lab Equipment) and capacity.
4. **Select Resource**: Open **"Conference Room Alpha"**.
5. **View Availability Schedule**: Observe the 08:00–20:00 visual timeline showing confirmed bookings (red) and open slots (emerald).
6. **Book 10:00 -> 12:00**:
   - Set Start: `10:00`, End: `12:00`, Agenda: `Client Project Kickoff`.
   - Click **"Confirm Reservation"**.
   - Note success notification: the slot turns red on the timeline.
7. **View in My Bookings**: Navigate to **My Bookings** to verify the active reservation.
8. **Attempt Conflicting Overlap (11:00 -> 13:00)**:
   - Return to **Conference Room Alpha**.
   - Attempt to book `11:00` to `13:00`.
   - The system immediately rejects the attempt with **409 Conflict**:
     *"This resource is already booked during the selected time."*
9. **Explain Dual-Layer Guard**: Explain that both Express row locking and PostgreSQL's exclusion constraint protect against race conditions.
10. **Test Back-to-Back (12:00 -> 14:00)**:
    - Attempt to book `12:00` to `14:00`.
    - Successfully allowed! (Back-to-back booking allowed on exact boundary).
11. **Cancel Booking & Free Slot**:
    - Go to **My Bookings**, select the 10:00–12:00 booking, and click **"Cancel Booking"**.
    - Return to Conference Room Alpha: the 10:00–12:00 slot is instantly green and available again!
12. **Login as Admin**: Switch to Admin (`admin@spacesync.io`) via top navbar persona switcher.
13. **Manage Resources**: Add or edit a resource under **Resource Provisioning**.
14. **Inspect Live Analytics**: Open **Admin Hub** and **Deep Analytics** to view 100% database-derived KPI metrics, booking volume trend charts, resource utilization bars, and peak hour distributions.
15. **Open Swagger API Docs**: Visit `http://localhost:5000/api/docs` and show OpenAPI documentation and `/api/health`.

---

## 9. Cloud Deployment Guide

See [docs/deployment.md](docs/deployment.md) for full instructions on configuring Vercel, Render, and Neon/Supabase with environment variables.
