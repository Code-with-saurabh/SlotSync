import rateLimit from "express-rate-limit";

export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 500, // 500(300) requests per 15 min (enough for polling + normal use)
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for SSE, health, and static routes
      if (req.url.startsWith("/api/slots/stream")) return true;
      if (req.url.startsWith("/api/slots/") && req.url.endsWith("/stream")) return true;
      if (req.url.startsWith("/api/health")) return true;
      return false;
    },

    handler: (req, res) => {
        return res.status(429).json({
            success: false,
            data: null,
            error: {
                code: "RATE_LIMIT_EXCEEDED",
                message: "Too many requests. Please try again later.",
            },
            meta: {},
        });
    },
});

export const loginRateLimiter =
  rateLimit({
    windowMs: 15 * 60 * 1000,

    limit: 7,

    standardHeaders: "draft-8",

    legacyHeaders: false,

    handler: (req, res) => {
      return res.status(429).json({
        success: false,
        data: null,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message:
            "Too many login attempts. Please try again later.",
        },
        meta: {},
      });
    },
  });
