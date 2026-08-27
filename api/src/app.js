import express from "express";
import helmet from "helmet";
import cors from "cors";

import { env } from "./config/env.js";
import { globalRateLimiter } from "./middleware/rateLimit.js";
import { errorHandler } from "./middleware/errorHandler.js";
import cookieParser from "cookie-parser";
import { requestLogger } from "./utils/logger.js";

import healthRoutes from "./routes/healthRoutes.js";
import testRoutes from "./routes/testRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import slotRoutes from "./routes/slotRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import waitlistRoutes from "./routes/waitlistRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import auditRoutes from "./routes/auditRoutes.js";
import counsellorRoutes from "./routes/counsellorRoutes.js";

import Slot from "./models/Slot.js";
import { addClient, addGlobalClient } from "./utils/sse.js";

const app = express();

/*
 * Trust first proxy (Render, Heroku, etc.)
 * Required so req.secure works behind reverse proxy
 * and secure cookies are set correctly in production.
 */
if (env.nodeEnv === "production") {
  app.set("trust proxy", 1);
}

/*
 * Security
 */

app.disable("x-powered-by");

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:","https:"],
      connectSrc: ["'self'", "ws:", "wss:", env.corsOrigin, "http://localhost:5000", "http://localhost:5173"],
      fontSrc: ["'self'", "data:","https:"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(cookieParser());

/*
 * CORS
 */
const allowedOrigins = [
  env.corsOrigin,
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key"],
  })
);

/*
 * SSE: live seats-left for a slot
 *
 * GET /api/slots/:id/stream
 *
 * Registered FIRST — before requestLogger, body
 * parsing, and rate limiter. SSE connections are
 * long-lived and must not:
 *   - eat rate-limit tokens
 *   - create logger "finish" listeners that never fire
 *   - go through body parsing (no body in SSE)
 */
app.get("/api/slots/:id/stream", async (req, res) => {
  const { id } = req.params;

  try {
    const slot = await Slot.findById(id).lean().maxTimeMS(5000);
    if (!slot) {
      return res.status(404).json({ error: "Slot not found." });
    }

    addClient(id, req, res);

    res.write(`data: ${JSON.stringify({
      slotId: id,
      bookedCount: slot.bookedCount,
      capacity: slot.capacity,
      seatsLeft: slot.capacity - slot.bookedCount,
    })}\n\n`);
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ error: "SSE setup failed." });
    }
  }
});

/*
 * SSE: single broadcast stream for ALL slot updates.
 *
 * GET /api/slots/stream
 *
 * One connection per browser tab instead of one per slot.
 * Prevents HTTP/1.1 connection-pool exhaustion.
 */
app.get("/api/slots/stream", (req, res) => {
  addGlobalClient(req, res);
});

/*
 * Request logger with request-id
 */
app.use(requestLogger);

/*
 * Body parsing
 *
 * Keep the limit intentionally small for the API.
 * Increase only if a future requirement genuinely needs it.
 */
app.use(
  express.json({
    limit: "100kb",
  })
);

app.use(
  express.urlencoded({
    extended: false,
    limit: "100kb",
  })
);

/*
 * Rate limiting
 */
app.use(globalRateLimiter);

/*
 * Health
 */
app.use("/api/health",
  healthRoutes
);

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/test",
  testRoutes
);

app.use(
  "/api/slots",
  slotRoutes
);

app.use(
  "/api/bookings",
  bookingRoutes
);

app.use(
  "/api/waitlist",
  waitlistRoutes
);

app.use("/api/analytics",
  analyticsRoutes
);

app.use(
  "/api/audit",
  auditRoutes
);

app.use(
  "/api/counsellors",
  counsellorRoutes
);

/*
 * 404
 */
app.use((req, res) => {
  return res.status(404).json({
    success: false,
    data: null,
    error: {
      code: "RESOURCE_NOT_FOUND",
      message: `Route not found: ${req.method} ${req.originalUrl}`,
    },
    meta: {},
  });
});

/*
 * Central error handler
 *
 * Must remain the final middleware.
 */
app.use(errorHandler);

export default app;
