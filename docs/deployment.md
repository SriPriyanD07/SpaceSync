# SpaceSync Cloud Deployment Guide

This guide details the step-by-step production deployment of SpaceSync across modern cloud providers:
- **Frontend** -> Vercel
- **Backend API** -> Render or Railway
- **PostgreSQL Database** -> Supabase, Neon, or Render PostgreSQL

---

## 1. Cloud Database Setup (Neon / Supabase)

1. Create a free PostgreSQL database on [Neon](https://neon.tech) or [Supabase](https://supabase.com).
2. Retrieve the pooled connection string:
   ```
   postgresql://username:password@ep-cool-fog-123456.us-east-2.aws.neon.tech/spacesync?sslmode=require
   ```
3. Run the migrations and seed data from your local machine:
   ```bash
   cd backend
   # Set the cloud DATABASE_URL in your .env or shell
   export DATABASE_URL="postgresql://username:password@ep-cool-fog-123456.us-east-2.aws.neon.tech/spacesync?sslmode=require"
   
   npm run migrate
   npm run seed
   ```

---

## 2. Backend Deployment (Render / Railway)

### Using Render
1. Create a **New Web Service** pointing to your Git repository.
2. Select **Root Directory**: `backend`.
3. Set **Runtime**: `Node`.
4. Configure commands:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
5. Add Environment Variables:
   - `NODE_ENV`: `production`
   - `PORT`: `5000` (or leave default for Render)
   - `DATABASE_URL`: Cloud PostgreSQL connection string (with `?sslmode=require`)
   - `JWT_SECRET`: A secure random 32+ character string
   - `JWT_EXPIRES_IN`: `7d`
   - `CLIENT_URL`: `https://your-spacesync-frontend.vercel.app`
6. Deploy and verify health at: `https://your-spacesync-api.onrender.com/api/health`.

---

## 3. Frontend Deployment (Vercel)

1. Import your Git repository into [Vercel](https://vercel.com).
2. Set **Root Directory**: `frontend`.
3. Framework Preset: **Next.js**.
4. Configure Environment Variables:
   - `NEXT_PUBLIC_API_URL`: `https://your-spacesync-api.onrender.com/api`
5. Deploy! Vercel handles global edge distribution, asset optimization, and automatic HTTPS.

---

## 4. Local Development with Docker

To run the complete system locally:
```bash
# 1. Start local PostgreSQL 16 container
docker compose up -d

# 2. Run migrations & seed data
cd backend
npm run migrate
npm run seed

# 3. Start Backend server
npm run dev

# 4. In another terminal, start Frontend
cd ../frontend
npm run dev
```

Open `http://localhost:3000` to interact with SpaceSync!
