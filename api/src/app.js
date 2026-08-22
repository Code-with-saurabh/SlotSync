import express from "express";
import helmet from "helmet";
import cors from "cors";

import { env } from "./config/env.js";
import { globalRateLimiter } from "./middleware/rateLimit.js";
import { errorHandler } from "./middleware/errorHandler.js";
import cookieParser from "cookie-parser";

import healthRoutes from "./routes/healthRoutes.js";
import testRoutes from "./routes/testRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import slotRoutes from "./routes/slotRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import waitlistRoutes from "./routes/waitlistRoutes.js";

const app = express();

/*
 * Security
 */

app.disable("x-powered-by");

app.use(helmet());
app.use(cookieParser());

/*
 * CORS
 */
app.use(
  cors({
    origin: env.corsOrigin,
    credentials: true,
  })
);


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