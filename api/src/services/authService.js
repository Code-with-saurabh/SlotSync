import User from "../models/User.js";

import {
  hashPassword,
  comparePassword,
} from "../utils/password.js";

import {
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt.js";

import { hashToken } from "../utils/tokenHash.js";

import { AppError } from "../utils/AppError.js";

async function findUserByEmail(email) {
  return User.findOne({
    email,
  }).select("+passwordHash +refreshTokenHash");
}

export async function registerUser({
  name,
  email,
  password,
}) {
  const existingUser = await User.findOne({
    email,
  });

  if (existingUser) {
    throw new AppError(
      "An account with this email already exists.",
      409,
      "DUPLICATE_RESOURCE"
    );
  }

  const passwordHash =
    await hashPassword(password);

  const user = await User.create({
    name,
    email,
    passwordHash,
    role: "student",
  });

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export async function loginUser({
  email,
  password,
}) {
  const user = await findUserByEmail(email);

  if (!user) {
    throw new AppError(
      "Invalid email or password.",
      401,
      "AUTH_INVALID_CREDENTIALS"
    );
  }

  if (!user.isActive) {
    throw new AppError(
      "This account is inactive.",
      403,
      "FORBIDDEN"
    );
  }

  const passwordMatches =
    await comparePassword(
      password,
      user.passwordHash
    );

  if (!passwordMatches) {
    throw new AppError(
      "Invalid email or password.",
      401,
      "AUTH_INVALID_CREDENTIALS"
    );
  }

  const accessToken =
    createAccessToken(user);

  const refreshToken =
    createRefreshToken(user);

  user.refreshTokenHash =
    hashToken(refreshToken);

  await user.save();

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },

    accessToken,

    refreshToken,
  };
}

export async function refreshUserSession(
  refreshToken
) {
  let payload;

  try {
    payload =
      verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError(
      "Invalid or expired refresh token.",
      401,
      "AUTH_INVALID_REFRESH_TOKEN"
    );
  }

  if (payload.type !== "refresh") {
    throw new AppError(
      "Invalid refresh token.",
      401,
      "AUTH_INVALID_REFRESH_TOKEN"
    );
  }

  const user = await User.findById(
    payload.sub
  ).select("+refreshTokenHash");

  if (!user || !user.isActive) {
    throw new AppError(
      "Invalid refresh token.",
      401,
      "AUTH_INVALID_REFRESH_TOKEN"
    );
  }

  if (
    payload.tokenVersion !==
    user.refreshTokenVersion
  ) {
    throw new AppError(
      "Refresh token has been revoked.",
      401,
      "AUTH_INVALID_REFRESH_TOKEN"
    );
  }

  if (!user.refreshTokenHash) {
    throw new AppError(
      "Refresh token has been revoked.",
      401,
      "AUTH_INVALID_REFRESH_TOKEN"
    );
  }

  const tokenMatches =
    hashToken(refreshToken) ===
    user.refreshTokenHash;

  if (!tokenMatches) {
    throw new AppError(
      "Refresh token has been revoked.",
      401,
      "AUTH_INVALID_REFRESH_TOKEN"
    );
  }

  /*
   * Refresh token rotation.
   */
  const newRefreshToken =
    createRefreshToken(user);

  const newAccessToken =
    createAccessToken(user);

  user.refreshTokenHash =
    hashToken(newRefreshToken);

  await user.save();

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}

export async function logoutUser(userId) {
  const user = await User.findById(
    userId
  ).select("+refreshTokenHash");

  if (!user) {
    return;
  }

  /*
   * Revoke all existing refresh tokens.
   */
  user.refreshTokenVersion += 1;
  user.refreshTokenHash = null;

  await user.save();
}