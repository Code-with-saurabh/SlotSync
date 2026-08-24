# Part B — Debug / Review Answers

---

## B1 · React — Stale Closure in Booking Handler

**Bug:** The `handleBook` function captures `bookingSlotId` in its closure but never resets it if the user rapidly clicks another slot card while the first booking is in flight.

**Symptom:** Second click silently does nothing — the guard `bookingSlotId !== null` is true even though the first request already finished.

**Root cause:** The in-flight state `bookingSlotId` is set to `slotId` at the start of `handleBook`, but if the promise resolves/rejects and `setBookingSlotId(null)` fires inside `finally`, a second rapid click can race with the state update. React batches state updates, so `bookingSlotId` may still reference the old slot when the second handler runs.

**Fix:** Use a `useRef` for the in-flight id instead of `useState`:

```jsx
const bookingInFlight = useRef(null);

const handleBook = async (slot) => {
  const slotId = getSlotId(slot);
  if (!slotId || bookingInFlight.current) return;
  bookingInFlight.current = slotId;
  try {
    await bookSlot(slotId).unwrap();
    // ...
  } finally {
    bookingInFlight.current = null;
  }
};
```

Ref is not subject to React batching or stale closure issues — it's always the current value.

---

## B2 · Express + Mongoose — Missing AbortSignal on findOneAndUpdate

**Bug:** `Slot.findOneAndUpdate()` inside the booking transaction uses `{ session, new: true }` but does not set a `maxTimeMS` or abort signal. If MongoDB is under load, the transaction can hang indefinitely.

**Symptom:** Under 40+ concurrent requests, some transactions stall and the Express process never releases the connection, eventually causing a connection-pool exhaustion error.

**Root cause:** Mongoose does not enforce a default timeout on transactions. Each individual operation within the session can run without time bounds.

**Fix:** Set `maxTimeMS` on the operation and configure a transaction timeout:

```js
const updatedSlot = await Slot.findOneAndUpdate(
  filter,
  update,
  {
    session,
    new: true,
    maxTimeMS: 5000,
  }
);

// Also set transaction timeout at session level:
session.withTransaction(
  async () => { /* ... */ },
  { transactionLifetimeLimitSeconds: 10 }
);
```

---

## B3 · Aggregation — Incorrect $group After $lookup

**Bug:** The analytics pipeline groups by `counsellorId` using `$group: { _id: "$counsellorId" }` after a `$lookup` that already aliased the joined field. The grouped key references a nested object instead of the scalar ObjectId.

**Symptom:** Utilisation percentages are 0 or NaN for every counsellor. The group key is `{ _id: "...", name: "..." }` (the full joined document) instead of just the ObjectId string.

**Root cause:** After `$lookup`, the field `counsellorId` is replaced with the full joined document. The `$group` stage needs `$counsellorId._id` instead of `$counsellorId`.

**Fix:**

```js
{
  $group: {
    _id: "$counsellorId._id",   // ← not "$counsellorId"
    totalSlots: { $sum: 1 },
    totalBooked: { $sum: "$bookedCount" },
    // ...
  }
}
```

Or project the scalar id before grouping:

```js
{ $addFields: { counsellorId: "$counsellorId._id" } },
{ $group: { _id: "$counsellorId", /* ... */ } }
```

---

## B4 · Docker — Non-Optimal Multi-Stage Build

**Bug:** The Dockerfile copies `package.json` and `package-lock.json` into the same `COPY` layer as the rest of the source, so `npm ci` runs on every code change even if dependencies haven't changed.

**Symptom:** Docker builds take 2–3 minutes instead of 30 seconds when only application code changes. The layer cache is invalidated too early.

**Root cause:** Docker layers are cached based on the `COPY` instruction. If `COPY . .` is used before `npm ci`, any file change invalidates the cache and re-runs `npm ci`.

**Fix:** Separate dependency installation from source copy:

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm prune --omit=dev
EXPOSE 5000
CMD ["node", "src/server.js"]
```

Now `npm ci` only re-runs when `package.json` or `package-lock.json` change — not on every source edit.

---

## Summary Table

| ID | Area | Bug | Severity | Fix Complexity |
|---|---|---|---|---|
| B1 | React | Stale closure on rapid clicks | Medium | Low (useRef) |
| B2 | Express+Mongoose | No transaction timeout | High | Low (maxTimeMS) |
| B3 | Aggregation | Wrong `$group` key after `$lookup` | High | Low (field path) |
| B4 | Docker | Layer cache invalidated too early | Medium | Low (reorder COPY) |
