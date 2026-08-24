function generateRequestId() {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).substring(2, 10)
  );
}

export function requestLogger(req, res, next) {
  const requestId = req.headers["x-request-id"] || generateRequestId();
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);

  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;

    const log = {
      level: res.statusCode >= 400 ? "error" : "info",
      time: new Date().toISOString(),
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userId: req.user?.id || null,
    };

    if (process.env.NODE_ENV === "production") {
      console.log(JSON.stringify(log));
    } else {
      console.log(
        `[${log.level.toUpperCase()}] ${log.method} ${log.path} ${log.statusCode} ${log.duration} [${requestId}]`
      );
    }
  });

  next();
}
