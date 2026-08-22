export function successResponse(
  res,
  data = null,
  meta = {},
  statusCode = 200
) {
  return res.status(statusCode).json({
    success: true,
    data,
    error: null,
    meta,
  });
}

export function errorResponse(
  res,
  code,
  message,
  statusCode = 500,
  meta = {},
  details = null
) {
  return res.status(statusCode).json({
    success: false,
    data: null,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
    meta,
  });
}