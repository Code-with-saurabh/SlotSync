import IdempotencyKey from "../models/IdempotencyKey.js";

const IDEMPOTENCY_TTL_HOURS = 24;

export async function idempotencyCheck(req, res, next) {
  const key = req.headers["idempotency-key"];

  if (!key) {
    return next();
  }

  const userId = req.user?.id;

  if (!userId) {
    return next();
  }

  const existing = await IdempotencyKey.findOne({
    key,
    userId,
  });

  if (existing) {
    if (existing.response) {
      return res.status(existing.statusCode).json(existing.response);
    }

    return res.status(409).json({
      success: false,
      data: null,
      error: {
        code: "IDEMPOTENCY_IN_PROGRESS",
        message: "A request with this idempotency key is already being processed.",
      },
    });
  }

  const expiresAt = new Date(
    Date.now() + IDEMPOTENCY_TTL_HOURS * 60 * 60 * 1000
  );

  await IdempotencyKey.create({
    key,
    userId,
    request: {
      method: req.method,
      path: req.originalUrl,
      body: req.body,
    },
    expiresAt,
  });

  const originalJson = res.json.bind(res);

  res.json = function (body) {
    IdempotencyKey.findOneAndUpdate(
      { key, userId },
      {
        $set: {
          response: body,
          statusCode: res.statusCode,
        },
      }
    ).catch(() => {});

    return originalJson(body);
  };

  next();
}
