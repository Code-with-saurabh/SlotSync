import jwt from "jsonwebtoken";

import { env } from "../config/env.js";

export function createAccessToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      type: "access",
    },
    env.jwtAccessSecret,
    {
      expiresIn: env.jwtAccessExpiresIn,
    }
  );
}

export function createRefreshToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      tokenVersion: user.refreshTokenVersion,
      type: "refresh",
    },
    env.jwtRefreshSecret,
    {
      expiresIn: env.jwtRefreshExpiresIn,
    }
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(
    token,
    env.jwtAccessSecret
  );
}

export function verifyRefreshToken(token) {
  return jwt.verify(
    token,
    env.jwtRefreshSecret
  );
}