import mongoose from "mongoose";
import { errorResponse } from "../utils/apiResponse.js";

function isProduction() {
  return process.env.NODE_ENV === "production";
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    console.error("Error after headers sent:", err?.message);
    return;
  }

  /*
   * Operational application errors
   */
  if (err?.isOperational) {
    return errorResponse(
      res,
      err.code,
      err.message,
      err.statusCode,
      {},
      err.details
    );
  }

  /*
   * Mongoose validation error
   */
  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((error) => ({
      field: error.path,
      message: error.message,
    }));

    return errorResponse(
      res,
      "VALIDATION_ERROR",
      "Database validation failed.",
      422,
      {},
      details
    );
  }

  /*
   * Invalid MongoDB ObjectId
   */
  if (err instanceof mongoose.Error.CastError) {
    return errorResponse(
      res,
      "INVALID_ID",
      "The supplied resource ID is invalid.",
      400
    );
  }

  /*
   * MongoDB duplicate-key error
   */
  if (err?.code === 11000) {
    return errorResponse(
      res,
      "DUPLICATE_RESOURCE",
      "A resource with the same unique value already exists.",
      409
    );
  }

  /*
   * JSON parsing failure
   */
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return errorResponse(
      res,
      "INVALID_JSON",
      "Request body contains invalid JSON.",
      400
    );
  }

  /*
   * Production:
   * never expose internal implementation details.
   */
  if (isProduction()) {
    return errorResponse(
      res,
      "INTERNAL_SERVER_ERROR",
      "An unexpected error occurred.",
      500
    );
  }

  /*
   * Development:
   * useful debugging information.
   */
  console.error("Unhandled error:", err);

  return errorResponse(
    res,
    "INTERNAL_SERVER_ERROR",
    err?.message || "An unexpected error occurred.",
    500,
    {},
    {
      name: err?.name,
      stack: err?.stack,
    }
  );
}