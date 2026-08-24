# Part D — Defence Prep Guide

## 1. What Did You Build?

**One-liner:** SlotSync is a counselling-slot booking platform where students book 30-minute sessions with counsellors, with real-time seat updates, waitlist promotion, and admin analytics.

**Tech stack (say this):**
- Frontend: React 19 + Vite + Tailwind CSS + Redux Toolkit (RTK Query)
- Backend: Node.js + Express 5 + Mongoose 9
- Database: MongoDB 7 running as a single-node replica set (required for transactions)
- Infrastructure: Docker Compose, GitHub Actions CI

---

## 2. How Does Concurrency Work? (Most Important Question)

**Say this:**

"The hard gate is 40 concurrent bookings on a 5-seat slot — exactly 5 must succeed, 35 must get 409."

**How it works:**
1. All 40 requests enter a MongoDB transaction
2. Each does `Slot.findOneAndUpdate()` with an atomic condition:
   ```
   { $expr: { $lt: ["$bookedCount", "$capacity"] } }
   ```
3. MongoDB evaluates this condition atomically — only 5 requests find `bookedCount < capacity` and increment it
4. The other 35 get `null` back → we throw `AppError("No seats available", 409, "SLOT_FULL")`
5. All 5 winners commit the transaction together (booking insert + count increment)
6. If any step fails, the whole transaction rolls back

**Why this works:** The `$expr` check + increment happens in ONE atomic MongoDB operation inside a transaction. No race condition is possible.

**If asked "why not just a normal check-then-write?"**
"Two concurrent requests could both read `bookedCount = 4`, both see seats available, both write `bookedCount = 5` — that's 6 bookings on a 5-seat slot. The atomic `$expr` condition prevents this."

---

## 3. How Does Optimistic Concurrency Work?

**Say this:**

"Every Slot document has a `version` field starting at 0. When a counsellor updates a slot (change time, capacity, status), they must send the current version. The backend does:

```
Slot.findOneAndUpdate({ _id, version: expectedVersion }, { $set: updates, $inc: { version: 1 } })
```

If another request modified the slot between the read and the write, the version won't match → 409 Stale Write. This prevents lost updates without locking."

---

## 4. How Does the Waitlist Work?

**Say this:**

"When a slot is full and a student clicks 'Join Waitlist', a WaitlistEntry is created with a `createdAt` timestamp. When someone cancels, the system finds the oldest waitlist entry (FIFO), promotes it to a booking atomically inside the same transaction, and sends an AuditLog entry. The entire cancel + promote happens in one transaction — either both succeed or both fail."

---

## 5. How Does Refresh Token Rotation Work?

**Say this:**

"Access tokens are short-lived (15 min). Refresh tokens are stored in an httpOnly cookie and are single-use. On each refresh:
1. The server checks if the token version matches the User's `tokenVersion`
2. If valid, it issues a new refresh token and bumps the version
3. If someone replays an old refresh token, the version won't match → family revocation

This means if a refresh token is stolen, the legitimate user's next attempt fails, and we know to revoke everything."

---

## 6. How Does the Idempotency Key Work?

**Say this:**

"When a student books a slot, the frontend sends an `Idempotency-Key` header. The backend checks if that key already exists for that user:
- If not, it stores the key + request body in an IdempotencyKey collection (24h TTL)
- After the booking completes, it stores the response
- If the same key comes again, it returns the cached response — no duplicate booking
- This prevents double-booking from network retries or double-clicks"

---

## 7. How Does SSE Work for Live Seats?

**Say this:**

"Each slot has an SSE endpoint at `GET /api/slots/:id/stream`. When a booking or cancellation happens, the backend broadcasts the updated seat count to all connected clients. The frontend uses an `EventSource` and updates the RTK Query cache in real-time — no polling needed."

---

## 8. How Does Cursor Pagination Work?

**Say this:**

"Instead of `skip(n)` which scans and discards n documents, we use `_id > cursor`. The frontend stores the last `_id` from the previous page and sends it as the `cursor` parameter. MongoDB uses the `_id` index to jump directly to that position — O(log n) regardless of page number. We fetch `limit + 1` to know if there's a next page."

---

## 9. What About the Analytics Pipeline?

**Say this:**

"The analytics endpoint uses a single `aggregate()` call with `$facet` to get everything in one round-trip:
- Utilisation % = total booked / total capacity
- No-show % and cancellation %
- Average lead time (time between slot creation and first booking)
- Lead time buckets (within 1h, 1-6h, 6-24h, 1-3 days, 3+ days)
- Busiest 5 slots by booking count
- Daily booking series (IST timezone)

Using `$facet` means one database query instead of 6 separate ones."

---

## 10. How to Demo (Live Walkthrough)

**Step 1: Show the concurrency test**
```bash
cd api && npm test
```
Point out: 23/23 tests pass, including the 40-concurrent hard gate.

**Step 2: Show the app**
- Register as student → book a slot → show optimistic UI (instant feedback)
- Cancel → show waitlist promotion
- Login as counsellor → show day-view, outcome marking
- Login as admin → show analytics charts, counsellor CRUD

**Step 3: Show dark mode**
Click the moon icon → persisted in localStorage

**Step 4: Show code structure**
- `api/src/services/bookingService.js` — the transaction logic
- `api/src/middleware/idempotency.js` — idempotency check
- `web/src/hooks/useSlotSSE.js` — SSE hook
- `web/src/features/student/studentApi.js` — optimistic UI

---

## 11. Common Questions & Answers

**Q: Why MongoDB over PostgreSQL?**
"A: MongoDB transactions give us atomic booking logic in a single document-oriented operation. The `$expr` condition inside `findOneAndUpdate` is evaluated atomically — no need for application-level locks."

**Q: Why not use Redis for rate limiting?**
"A: For this scale, Express rate limiter with in-memory store is sufficient. Redis would add infrastructure complexity without meaningful benefit for a single-server deployment."

**Q: How would you scale this to 10,000 concurrent users?**
"A: Add MongoDB sharding on `slotId`, use Redis for rate limiting and session store, add a load balancer with sticky sessions for SSE connections, and move to separate microservices for auth, bookings, and analytics."

**Q: What happens if the MongoDB transaction fails midway?**
"A: The entire transaction rolls back — no booking is created, no count is incremented, no waitlist entry is promoted. The student gets a 500 error and can retry safely."

**Q: Why SSE over WebSocket?**
"A: SSE is unidirectional (server → client) which is exactly what we need for seat updates. It's a native browser API, auto-reconnects, and requires no extra dependencies. WebSocket is overkill for this use case."

**Q: How does the append-only AuditLog work?**
"A: The Mongoose schema rejects `update()` and `deleteOne()` at the model level. Any attempt to modify or delete an audit record throws an error. This is stronger than middleware enforcement because it can't be bypassed."

---

## 12. Key Files to Know

| File | What It Does |
|---|---|
| `api/src/services/bookingService.js` | Transaction logic, atomic seat reservation, waitlist promotion |
| `api/src/middleware/idempotency.js` | Idempotency key check + response caching |
| `api/src/utils/sse.js` | SSE client management + broadcast |
| `api/src/utils/logger.js` | Request-id generation + structured logging |
| `web/src/hooks/useSlotSSE.js` | Frontend SSE hook, updates RTK cache |
| `web/src/features/student/studentApi.js` | Optimistic UI with rollback |
| `web/src/components/DarkModeToggle.jsx` | Dark mode with localStorage persistence |

---

## 13. Numbers to Remember

- **40 concurrent requests** → 5 succeed, 35 rejected (hard gate)
- **5-seat slot** → capacity = 5
- **30-minute window** → bookings must be within 30 min of slot start
- **2-hour cutoff** → cancellations allowed up to 2 hours before
- **15-minute access token** → short-lived JWT
- **24-hour idempotency key TTL** → auto-expired by MongoDB
- **$expr atomic check** → `bookedCount < capacity` evaluated by MongoDB engine
