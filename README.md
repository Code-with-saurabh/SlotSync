# SlotSync — README

## Quick Start (5 commands)

```bash
# 1. Clone and start infrastructure
docker compose up -d

# 2. Seed the database
cd api && npm run seed

# 3. Start API server
npm run dev

# 4. Start frontend (new terminal)
cd ../web && npm run dev

# 5. Run tests
cd ../api && npm test
```

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
| Optimistic Concurrency (version field) | ✅ Working |
| Idempotency Key | ✅ Working |
| Cursor Pagination | ✅ Working |
| SSE Live Seats | ✅ Working |
| Dark Mode | ✅ Persisted |
| GitHub Actions CI | ✅ Configured |
| Frontend Build | ✅ Production build succeeds |

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
