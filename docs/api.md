# SpaceSync REST API Reference

The SpaceSync REST API follows OpenAPI 3.0 standards and provides interactive documentation via Swagger UI at `/api/docs`.

---

## 1. Authentication Endpoints

### Register
- **Endpoint**: `POST /api/auth/register`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "name": "Alex Johnson",
    "email": "alex@organization.com",
    "password": "Password123!",
    "role": "member"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "message": "Registration successful",
    "user": {
      "id": "uuid",
      "name": "Alex Johnson",
      "email": "alex@organization.com",
      "role": "member"
    },
    "token": "eyJhbGciOiJIUz..."
  }
  ```

### Login
- **Endpoint**: `POST /api/auth/login`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "admin@spacesync.io",
    "password": "Admin123!"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "message": "Login successful",
    "user": { ... },
    "token": "eyJhbGciOiJIUz..."
  }
  ```

### Current User Profile
- **Endpoint**: `GET /api/auth/me`
- **Access**: Authenticated (`Bearer <token>`)

---

## 2. Resource Management Endpoints

### List Resources
- **Endpoint**: `GET /api/resources`
- **Access**: Public / Member
- **Query Parameters**:
  - `type`: filter by category
  - `location`: filter by building/location
  - `min_capacity`: filter by minimum capacity
  - `status`: `'active'`, `'maintenance'`, `'inactive'`
  - `search`: search query
  - `page` & `limit`: pagination parameters

### Resource Details
- **Endpoint**: `GET /api/resources/:id`
- **Access**: Public / Member

### Hourly Availability
- **Endpoint**: `GET /api/resources/:id/availability?date=YYYY-MM-DD`
- **Access**: Public / Member
- **Response (200 OK)**:
  Returns 12 hourly blocks (08:00 to 20:00) with `isAvailable: boolean` and conflicting reservation metadata.

### Provision Resource (Admin Only)
- **Endpoint**: `POST /api/resources`
- **Access**: Admin Only (`role === 'admin'`)
- **Body**: `{ name, type, location, capacity, description, status }`

### Update Resource (Admin Only)
- **Endpoint**: `PATCH /api/resources/:id`
- **Access**: Admin Only

### Deactivate Resource (Admin Only)
- **Endpoint**: `DELETE /api/resources/:id`
- **Access**: Admin Only

---

## 3. Booking Endpoints

### Create Booking
- **Endpoint**: `POST /api/bookings`
- **Access**: Authenticated Member / Admin
- **Request Body**:
  ```json
  {
    "resource_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "start_time": "2026-09-05T10:00:00.000Z",
    "end_time": "2026-09-05T12:00:00.000Z",
    "purpose": "Sprint Planning"
  }
  ```
- **Response (201 Created)** on Success.
- **Response (409 Conflict)** on Overlap:
  ```json
  {
    "error": "Conflict",
    "message": "This resource is already booked during the selected time.",
    "statusCode": 409
  }
  ```

### List Bookings
- **Endpoint**: `GET /api/bookings`
- **Access**: Authenticated
  - **Member**: Receives only their own bookings.
  - **Admin**: Receives organization-wide bookings with filter support.

### Cancel Booking
- **Endpoint**: `PATCH /api/bookings/:id/cancel`
- **Access**: Booking Owner or Admin
- **Response (200 OK)**: Releases the time slot immediately.

---

## 4. Admin Analytics Endpoints

### KPI Statistics
- **Endpoint**: `GET /api/admin/statistics`
- **Access**: Admin Only
- **Response**: `{ resources, bookings, mostBookedResource }`

### Utilization & Trends
- **Endpoint**: `GET /api/admin/utilization`
- **Access**: Admin Only
- **Response**: `{ volumeOverTime, resourceUtilization, byResourceType, peakHours }`

---

## 5. Health Check Endpoint
- **Endpoint**: `GET /api/health`
- **Access**: Public
- **Response**:
  ```json
  {
    "status": "ok",
    "database": "connected",
    "uptime": 234.1,
    "latency": "3ms",
    "timestamp": "2026-09-05T10:30:00.000Z"
  }
  ```
