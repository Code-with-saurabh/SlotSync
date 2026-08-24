# SlotSync — Counselling Slot Booking Platform

A full-stack web application for managing counselling session slots with real-time seat updates, waitlist management, and role-based access control.

## Quick Start

### Option A: Docker (one command)

```bash
docker compose up -d
cd api && npm run seed
# Open http://localhost:5173
```

### Option B: Local Development

```bash
# 1. Install dependencies
cd api && npm install && cd ../web && npm install && cd ..

# 2. Seed database
cd api && npm run seed

# 3. Start API (terminal 1)
cd api && npm run dev

# 4. Start frontend (terminal 2)
cd web && npm run dev

# 5. Open http://localhost:5173
```

## Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@slotsync.com | admin123 |
| Counsellor | counsellor@slotsync.com | counsellor123 |
| Student | student@slotsync.com | student123 |

## Test Results

```
Test Suites: 8 passed, 8 total
Tests:       23 passed, 23 total
```

## Features

| Feature | Status |
|---------|--------|
| Auth (register/login/refresh/logout) | Done |
| Role-based access (admin/counsellor/student) | Done |
| Slot CRUD (create/update/list) | Done |
| Booking with atomic seat reservation | Done |
| 40-concurrent hard gate (5 seats → 5 succeed, 35 rejected) | Done |
| Booking cancellation (2-hour window) | Done |
| Waitlist join/leave with FIFO promotion | Done |
| Optimistic concurrency (version field) | Done |
| Idempotency key support | Done |
| Cursor-based pagination | Done |
| SSE live seat updates (single broadcast) | Done |
| Dark mode (persisted) | Done |
| Institute-wide analytics (Recharts) | Done |
| Structured JSON logging with request-id | Done |
| Rate limiting | Done |
| Zod validation | Done |
| GitHub Actions CI | Done |
| Docker Compose | Done |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Tailwind CSS v4, Redux Toolkit (RTK Query) |
| Backend | Node.js, Express 5, Mongoose 9 |
| Database | MongoDB 7 (single-node replica set for transactions) |
| Testing | Jest, Supertest, mongodb-memory-server |
| Infra | Docker Compose, GitHub Actions CI |

## Project Structure

```
SlotSync/
├── api/                    # Express API
│   ├── src/
│   │   ├── models/         # Mongoose schemas (User, Slot, Booking, WaitlistEntry, AuditLog, IdempotencyKey)
│   │   ├── routes/         # Express routers
│   │   ├── controllers/    # Request handlers
│   │   ├── services/       # Business logic (bookingService, waitlistService)
│   │   ├── middleware/      # Auth, rate limit, idempotency, validation, error handler
│   │   ├── validators/     # Zod schemas
│   │   └── utils/          # AppError, logger, SSE, apiResponse
│   ├── tests/              # 8 test suites, 23 tests
│   └── scripts/            # seed.js, checkIndexes.js
├── web/                    # React frontend
│   └── src/
│       ├── app/            # Redux store + RTK Query base
│       ├── features/       # Auth, slots, bookings, waitlist, admin, counsellor APIs
│       ├── pages/          # StudentSlotsPage, CounsellorDashboard, AdminDashboard
│       ├── components/     # SlotCard, DarkModeToggle
│       └── hooks/          # useSlotSSE (single broadcast), useIdempotencyKey
├── .github/workflows/      # CI pipeline
├── docker-compose.yml
├── SETUP.txt               # Step-by-step setup for demo
├── PERFORMANCE.md
├── DECISIONS.md
└── PART_B_ANSWERS.md
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/slotsync?replicaSet=rs0` |
| `JWT_ACCESS_SECRET` | Access token secret | (required) |
| `JWT_REFRESH_SECRET` | Refresh token secret | (required) |
| `CORS_ORIGIN` | Frontend URL | `http://localhost:5173` |
| `JWT_ACCESS_EXPIRES_IN` | Access token expiry | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry | `7d` |
| `COOKIE_SECURE` | Secure cookies | `false` |
| `VITE_API_URL` | Backend API URL (frontend) | `http://localhost:5000/api` |

See `.env.example` for full list.

## API Endpoints

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/api/auth/register` | No | - | Register new user |
| POST | `/api/auth/login` | No | - | Login |
| POST | `/api/auth/refresh` | Cookie | - | Refresh access token |
| POST | `/api/auth/logout` | Yes | Any | Logout |
| GET | `/api/auth/me` | Yes | Any | Current user |
| GET | `/api/slots` | Yes | Any | List slots (cursor pagination) |
| POST | `/api/slots` | Yes | Admin/Counsellor | Create slot |
| PATCH | `/api/slots/:id` | Yes | Admin/Counsellor | Update slot |
| GET | `/api/slots/stream` | No | - | SSE broadcast (all slot updates) |
| POST | `/api/bookings` | Yes | Student | Book slot (idempotent) |
| GET | `/api/bookings` | Yes | Student | My bookings |
| POST | `/api/bookings/:id/cancel` | Yes | Student | Cancel booking |
| PATCH | `/api/bookings/:id/outcome` | Yes | Counsellor | Mark attended/no_show |
| GET | `/api/bookings/counsellor` | Yes | Counsellor | Counsellor's bookings |
| POST | `/api/waitlist` | Yes | Student | Join waitlist |
| GET | `/api/waitlist` | Yes | Student | My waitlist |
| DELETE | `/api/waitlist/:id` | Yes | Student | Leave waitlist |
| GET | `/api/analytics/institute` | Yes | Admin | Institute analytics |
| GET | `/api/analytics/counsellor` | Yes | Admin | Counsellor analytics |
| GET | `/api/audit` | Yes | Admin | Audit logs |
| GET | `/api/counsellors` | Yes | Admin | List counsellors |
| POST | `/api/counsellors` | Yes | Admin | Create counsellor |
