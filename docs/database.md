# SpaceSync Database Design & Schema

## 1. Relational Entity-Relationship Diagram

```
+------------------------------------+
|               users                |
+------------------------------------+
| id: UUID (PK)                      |
| name: VARCHAR(100) NOT NULL        |
| email: VARCHAR(255) NOT NULL UNIQUE|
| password_hash: VARCHAR(255)        |
| role: VARCHAR(20) CHECK IN (...)   |
| created_at: TIMESTAMPTZ            |
+------------------------------------+
                  |
                  | 1:N
                  v
+------------------------------------+       +------------------------------------+
|              bookings              |       |             resources              |
+------------------------------------+       +------------------------------------+
| id: UUID (PK)                      |       | id: UUID (PK)                      |
| resource_id: UUID (FK) ------------+-----> | name: VARCHAR(150) NOT NULL        |
| user_id: UUID (FK)                 |  N:1  | type: VARCHAR(50) NOT NULL         |
| start_time: TIMESTAMPTZ NOT NULL   |       | location: VARCHAR(150) NOT NULL    |
| end_time: TIMESTAMPTZ NOT NULL     |       | capacity: INT NOT NULL CHECK (>=1) |
| status: VARCHAR(20) CHECK IN (...) |       | description: TEXT                  |
| purpose: TEXT                      |       | status: VARCHAR(20) CHECK IN (...) |
| created_at: TIMESTAMPTZ            |       | created_at: TIMESTAMPTZ            |
| updated_at: TIMESTAMPTZ            |       | updated_at: TIMESTAMPTZ            |
+------------------------------------+       +------------------------------------+
  CONSTRAINT no_double_booking
  EXCLUDE USING gist (
    resource_id WITH =,
    tstzrange(start_time, end_time) WITH &&
  ) WHERE (status = 'confirmed')
```

---

## 2. Table Specifications

### `users` Table
- `id`: UUID Primary Key with `gen_random_uuid()`
- `name`: Full user name
- `email`: Normalized lowercase unique email address
- `password_hash`: Bcrypt hashed password (10 salt rounds)
- `role`: Restricted by CHECK constraint to `'member'` or `'admin'`
- `created_at`: `TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP`

### `resources` Table
- `id`: UUID Primary Key
- `name`: Descriptive resource name (e.g. "Conference Room Alpha")
- `type`: Category (`meeting_room`, `conference_room`, `training_room`, `projector`, `workstation`, `lab_equipment`, `study_space`)
- `location`: Building, floor, or room identifier
- `capacity`: Maximum occupancy or units available (must be >= 1)
- `description`: Text specifications, AV equipment, or GPU models
- `status`: `'active'`, `'maintenance'`, or `'inactive'`
- `created_at` / `updated_at`: Audit timestamps

### `bookings` Table
- `id`: UUID Primary Key
- `resource_id`: Foreign key referencing `resources.id ON DELETE CASCADE`
- `user_id`: Foreign key referencing `users.id ON DELETE CASCADE`
- `start_time`: Time zone aware booking start timestamp
- `end_time`: Time zone aware booking end timestamp
- `status`: `'confirmed'` or `'cancelled'`
- `purpose`: Meeting topic, class title, or research agenda
- `created_at` / `updated_at`: Audit timestamps

---

## 3. Mathematical Overlap Logic & Exclusion Constraint

### Interval Overlap Condition
Two time intervals $A = [A_{start}, A_{end})$ and $B = [B_{start}, B_{end})$ overlap if and only if:
$$\text{Overlap}(A, B) \iff (A_{start} < B_{end}) \land (A_{end} > B_{start})$$

- **Overlapping Attempt (10:00–12:00 vs 11:00–13:00)**:
  $10:00 < 13:00$ (True) AND $12:00 > 11:00$ (True) $\implies$ **CONFLICT REJECTED (409)**.
- **Back-to-Back Allowed (10:00–12:00 vs 12:00–14:00)**:
  $10:00 < 14:00$ (True), but $12:00 > 12:00$ is (False) $\implies$ **ALLOWED (201)**.

### Exclusion Constraint Definition
```sql
CREATE EXTENSION IF NOT EXISTS "btree_gist";

ALTER TABLE bookings
ADD CONSTRAINT no_double_booking
EXCLUDE USING gist (
  resource_id WITH =,
  tstzrange(start_time, end_time) WITH &&
)
WHERE (status = 'confirmed');
```

- When status is changed to `'cancelled'`, the partial filter `WHERE (status = 'confirmed')` no longer applies, freeing the slot instantly without deleting the audit history.
