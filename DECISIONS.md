# Decisions — SlotSync Architecture

---

## 1. Concurrency Strategy: Transaction + Atomic $expr

**Decision:** Use MongoDB transactions with `$expr: { $lt: ["$bookedCount", "$capacity"] }` inside `findOneAndUpdate` to enforce seat limits atomically.

**Alternatives considered:**
- **Optimistic lock (version field) only:** Would prevent double-booking but requires retry logic on 409. Adds complexity for the client. The transaction approach guarantees exactly one winner without retries.
- **Pessimistic lock (mutex/semaphore):** Would serialize all bookings, killing throughput. MongoDB transactions already provide the atomicity we need.
- **Application-level check-then-write:** Two concurrent requests could both read `bookedCount = 4` and both write `5`, overselling the slot.

**Why this way:** The `$expr` condition inside `findOneAndUpdate` is evaluated atomically by MongoDB — it either succeeds (bookedCount < capacity) or returns null (slot full). No race condition is possible. Combined with a session transaction, the booking insert + count increment + waitlist promotion all succeed or all fail as a unit.

---

## 2. Cursor-Based Pagination Instead of skip()

**Decision:** Use `_id > cursor` with `sort({ startAt: 1, _id: 1 })` instead of `.skip(n).limit(20)` for slot listing.

**Alternatives considered:**
- **skip()+limit():** Simple, works for small datasets. But at 10K+ documents, page 500 requires scanning and discarding 10K documents — O(n) per page.
- **Keyset pagination on startAt:** Could work, but startAt is not unique (multiple slots can start at the same time). Using `_id` as tiebreaker is more reliable.

**Why this way:** Cursor pagination uses the `_id` index to jump directly to the right position. Performance is O(log n) regardless of page number. The frontend stores the last `_id` and passes it as the `cursor` parameter. The `limit + 1` trick tells us if there's a next page without a COUNT query.

---

## 3. Append-Only AuditLog with Model-Level Guards

**Decision:** AuditLog rejects `update()` and `deleteOne()` at the Mongoose model level, making the collection append-only by construction.

**Alternatives considered:**
- **Middleware-based enforcement:** Could intercept update/delete operations, but a developer could bypass middleware by using `collection.updateOne()` directly.
- **No enforcement, trust the application:** Any bug or malicious actor could tamper with audit records, destroying the integrity of the compliance trail.

**Why this way:** Model-level rejection (`schema.methods.update = () => throw`) is the strongest guarantee we can give without MongoDB-level collection permissions. It catches accidental modifications during development and prevents intentional tampering in production. The error is thrown early and clearly, making bugs easy to diagnose.

---

## 4. Refresh Token Rotation with Family Tracking

**Decision:** Issue a new refresh token on each use, store a `tokenVersion` on the User document, and revoke the entire family if a reused token is detected.

**Alternatives considered:**
- **Static refresh token (no rotation):** Simpler, but if a token is stolen, the attacker has permanent access until manual revocation.
- **Short-lived access tokens only (no refresh):** Forces frequent re-login, degrading UX.
- **Redis-based token store:** Adds infrastructure complexity. MongoDB version field is sufficient for this scale.

**Why this way:** Rotation means each refresh token is single-use. If an attacker uses a stolen token, the legitimate user's next refresh attempt will fail (token already used), triggering family revocation. The `tokenVersion` check on the User document provides a global kill-switch — incrementing it invalidates all refresh tokens for that user instantly.

---

## 5. Optimistic UI with Cache Patch + Rollback

**Decision:** `bookSlot` and `cancelBooking` mutations optimistically update the RTK Query slot cache before the server responds, rolling back on error.

**Alternatives considered:**
- **No optimistic update (wait for server):** Simpler, but the UI feels sluggish — the user clicks "Book" and waits 200–500ms before seeing confirmation.
- **Refetch after mutation:** Safe, but causes a flash of stale data followed by a re-render. Two network round-trips.

**Why this way:** Optimistic updates make the UI feel instant. The `onQueryStarted` callback patches the cache immediately, then awaits `queryFulfilled`. On success, the patch stays. On error, we call `undo()` on each patch, reverting to the previous state. This gives the best UX with zero data inconsistency risk.

---

## 6. SSE Over WebSocket for Live Seats

**Decision:** Use Server-Sent Events (SSE) for broadcasting seat count changes, instead of WebSocket.

**Alternatives considered:**
- **WebSocket:** Full duplex, but requires a separate library (ws, socket.io), connection management, and heartbeats. Overkill for a unidirectional data stream.
- **Polling:** Simple, but wastes bandwidth — clients poll every N seconds even when nothing changes. Adds unnecessary load.
- **GraphQL subscriptions:** Would require switching the entire API layer. Not justified for one feature.

**Why this way:** SSE is native browser API (EventSource), requires no extra dependencies, automatically reconnects, and is unidirectional by design — exactly what we need (server pushes seat updates to clients). The endpoint `GET /api/slots/:id/stream` sends `text/event-stream` responses. On booking/cancellation, `broadcastToSlot()` writes to all connected clients for that slot. The frontend `useSlotSSE` hook subscribes and updates the RTK cache in real-time.
