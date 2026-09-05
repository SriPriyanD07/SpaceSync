# SpaceSync System Architecture

## 1. High-Level Architectural Overview

SpaceSync is designed following cloud-computing enterprise best practices: strict separation of concerns, stateless RESTful services, transactional concurrency safety, and managed cloud persistence.

```
+-------------------------------------------------------------------------------+
|                                  USER CLIENTS                                 |
|            Web Browser / Mobile Web (Desktop, Tablet, Mobile)                 |
+-------------------------------------------------------------------------------+
                                        |
                                        | HTTPS / JSON API
                                        v
+-------------------------------------------------------------------------------+
|                       TIER 1: CLOUD FRONTEND (Vercel)                         |
|   - Next.js 14 (App Router)                                                   |
|   - React 18, TypeScript, Tailwind CSS                                        |
|   - Client-side JWT Session Storage & Route Guards                            |
|   - Interactive Hourly Timeline & Recharts Visualization                      |
+-------------------------------------------------------------------------------+
                                        |
                                        | HTTPS / REST Calls
                                        v
+-------------------------------------------------------------------------------+
|                   TIER 2: STATELESS REST API (Render / Railway)               |
|   - Node.js 20+ Runtime & Express.js Framework                                |
|   - TypeScript Strong Typing & Zod Input Validation                           |
|   - JWT Authentication & Role-Based Access Control (Admin / Member)           |
|   - Swagger / OpenAPI Interactive Specification (/api/docs)                   |
|   - Concurrency Locking (BEGIN ... SELECT FOR UPDATE ... COMMIT)              |
+-------------------------------------------------------------------------------+
                                        |
                                        | TLS Encrypted Connection Pool (pg)
                                        v
+-------------------------------------------------------------------------------+
|               TIER 3: MANAGED CLOUD DATABASE (Supabase / Neon / Render)       |
|   - PostgreSQL 16 Enterprise Relational Database                              |
|   - btree_gist Extension & Range Exclusion Constraint                        |
|   - Indexed Foreign Keys & Timestamps (TIMESTAMPTZ)                           |
|   - 100% Database-Calculated Utilization & Booking Analytics                  |
+-------------------------------------------------------------------------------+
```

---

## 2. Architectural Pillars

### A. Stateless REST Architecture
- The backend stores **no session state** in memory or local disk.
- All client requests carry a cryptographic JSON Web Token (JWT) in the `Authorization: Bearer <token>` header.
- This allows horizontal scaling across multiple container instances without sticky sessions or complex cache synchronization.

### B. Client-Server Separation
- The frontend Next.js application communicates with the backend solely via RESTful JSON APIs.
- Frontend and backend can be built, tested, and deployed completely independently.

### C. Concurrency & Double-Booking Prevention: Defense-in-Depth
SpaceSync employs a **dual-layer protection mechanism**:

1. **Application-Level Transactional Lock**:
   ```sql
   BEGIN;
   SELECT id FROM bookings
   WHERE resource_id = $1
     AND status = 'confirmed'
     AND (start_time < $3 AND end_time > $2)
   FOR UPDATE;
   ```
   Row-level locks prevent simultaneous overlap verification from returning false negatives.

2. **Database-Level Range Exclusion Constraint**:
   ```sql
   CREATE EXTENSION IF NOT EXISTS btree_gist;
   
   ALTER TABLE bookings ADD CONSTRAINT no_double_booking
   EXCLUDE USING gist (
     resource_id WITH =,
     tstzrange(start_time, end_time) WITH &&
   ) WHERE (status = 'confirmed');
   ```
   Even if two concurrent requests bypass application locks during extreme race conditions, PostgreSQL rejects the second write with error code `23P01` (exclusion_violation).

3. **Graceful User Feedback**:
   Database constraint violations are caught by the centralized error handler and converted into HTTP `409 Conflict`:
   ```json
   {
     "error": "Conflict",
     "message": "This resource is already booked during the selected time.",
     "statusCode": 409
   }
   ```

---

## 3. Role-Based Access Control (RBAC)

| Capability | Member Role | Admin Role |
| :--- | :---: | :---: |
| Register & Login | Yes | Yes |
| Browse & Search Resources | Yes | Yes |
| Check Hourly Availability | Yes | Yes |
| Create Resource Booking | Yes | Yes |
| View Own Bookings | Yes | Yes |
| Cancel Own Booking (Release Slot) | Yes | Yes |
| View Other Members' Bookings | **No (403 Forbidden)** | Yes |
| Cancel Other Members' Bookings | **No (403 Forbidden)** | Yes |
| Provision New Resources | **No (403 Forbidden)** | Yes |
| Edit Resource Specs / Status | **No (403 Forbidden)** | Yes |
| Access Organization Analytics & KPIs | **No (403 Forbidden)** | Yes |

Role enforcement is strictly executed by backend middleware (`requireRole('admin')`). The backend never trusts client-supplied role parameters.
