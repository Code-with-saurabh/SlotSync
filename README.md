# SlotSync — README

## Quick Start

### Option A: Docker (recommended)

```bash
# 1. Clone and start everything
docker compose up -d

# 2. Seed the database (wait ~10s for Mongo replica set)
cd api && npm run seed && cd ..

# 3. Open in browser
#    Frontend: http://localhost:5173
#    API:      http://localhost:4000/api/health
```

### Option B: Local Development

```bash
# Prerequisites: Node 20+, MongoDB running as replica set on localhost:27017

# 1. Install dependencies
cd api && npm install && cd ../web && npm install && cd ..

# 2. Copy env files
cp api/.env.example api/.env
cp web/.env.example web/.env

# 3. Start API (terminal 1)
cd api && npm run dev

# 4. Start frontend (terminal 2)
cd web && npm run dev

# 5. Seed database (terminal 3)
cd api && npm run seed
```

### Seed Data (auto-created by `npm run seed`)

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

All tests pass, including the 40-concurrent-booking hard gate (40 requests on 5-seat slot → exactly 5 succeed, 35 return 409).

## Build Status

| Component | Status |
|---|---|
| API Tests (23/23) | ✅ Passing |
| Concurrency Hard Gate (40 concurrent) | ✅ 5 succeed, 35 rejected |
| Auth (register/login/refresh/logout) | ✅ Working |
| Booking CRUD | ✅ Working |
| Waitlist + FIFO Promotion | ✅ Working |
| Optimistic Concurrency (version field) | ✅ Working |
| Idempotency Key | ✅ Working |
| Cursor Pagination | ✅ Working |
| SSE Live Seats | ✅ Working |
| Dark Mode | ✅ Persisted |
| GitHub Actions CI | ✅ Configured |
| Frontend Build | ✅ Production build succeeds |
| Docker Compose | ✅ Ready |

## Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS v4, Redux Toolkit (RTK Query)
- **Backend:** Node.js, Express 5, Mongoose 9
- **Database:** MongoDB 7 (single-node replica set)
- **Testing:** Jest, Supertest, mongodb-memory-server
- **Infra:** Docker Compose, GitHub Actions CI

## Project Structure

```
SlotSync/
├── api/                  # Express API
│   ├── src/
│   │   ├── models/       # Mongoose schemas
│   │   ├── routes/       # Express routers
│   │   ├── controllers/  # Request handlers
│   │   ├── services/     # Business logic
│   │   ├── middleware/    # Auth, rate limit, idempotency
│   │   ├── validators/   # Zod schemas
│   │   └── utils/        # AppError, logger, SSE
│   └── tests/            # Jest test suites
├── web/                  # React frontend
│   └── src/
│       ├── features/     # RTK Query slices
│       ├── pages/        # Route pages
│       ├── components/   # Shared components
│       └── hooks/        # useSlotSSE, useIdempotencyKey
├── .github/workflows/    # CI pipeline
├── docker-compose.yml
├── PERFORMANCE.md
├── DECISIONS.md
└── PART_B_ANSWERS.md
```

## Environment Variables

See `.env.example` in the project root for all variables. Key ones:

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/slotsync?replicaSet=rs0` |
| `JWT_ACCESS_SECRET` | Access token signing secret | (must set) |
| `JWT_REFRESH_SECRET` | Refresh token signing secret | (must set) |
| `CORS_ORIGIN` | Frontend URL for CORS | `http://localhost:5173` |
| `VITE_API_URL` | Backend API URL (frontend) | `http://localhost:5000/api` |

## Docker Services

| Service | Port | Description |
|---------|------|-------------|
| `mongo` | 27017 | MongoDB 7 with replica set |
| `api` | 4000 | Express API server |
| `web` | 5173 | React frontend (serve) |
