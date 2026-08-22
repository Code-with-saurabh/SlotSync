import User from "../models/User.js";

import {
  verifyAccessToken,
} from "../utils/jwt.js";

import { AppError } from "../utils/AppError.js";

export async function authenticate(
  req,
  res,
  next
) {
  try {
    const header =
      req.headers.authorization;

    if (!header?.startsWith("Bearer ")) {
      throw new AppError(
        "Authentication is required.",
        401,
        "AUTH_REQUIRED"
      );
    }

    const token =
      header.slice(7);

    let payload;

    try {
      payload =
        verifyAccessToken(token);
    } catch {
      throw new AppError(
        "Invalid or expired access token.",
        401,
        "AUTH_INVALID_TOKEN"
      );
    }

    if (payload.type !== "access") {
      throw new AppError(
        "Invalid access token.",
        401,
        "AUTH_INVALID_TOKEN"
      );
    }

    const user =
      await User.findById(payload.sub);

    if (!user || !user.isActive) {
      throw new AppError(
        "Authentication is required.",
        401,
        "AUTH_REQUIRED"
      );
    }

    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    next(error);
  }
}