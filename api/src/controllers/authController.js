import {
  registerUser,
  loginUser,
  refreshUserSession,
  logoutUser,
} from "../services/authService.js";

import {
  successResponse,
} from "../utils/apiResponse.js";

import { AppError } from "../utils/AppError.js";
import { env } from "../config/env.js";

function setRefreshCookie(
  res,
  refreshToken
) {
  res.cookie(
    "slotsync_refresh",
    refreshToken,
    {
      httpOnly: true,
      secure: env.cookieSecure,
      sameSite: env.cookieSameSite,
      path: "/api/auth",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    }
  );
}

function clearRefreshCookie(res) {
  res.clearCookie(
    "slotsync_refresh",
    {
      httpOnly: true,
      secure: env.cookieSecure,
      sameSite: env.cookieSameSite,
      path: "/api/auth",
    }
  );
}

export async function register(
  req,
  res,
  next
) {
  try {
    const user =
      await registerUser(req.body);

    return successResponse(
      res,
      {
        user,
      },
      {},
      201
    );
  } catch (error) {
    next(error);
  }
}

export async function login(
  req,
  res,
  next
) {
  try {
    const result =
      await loginUser(req.body);

    setRefreshCookie(
      res,
      result.refreshToken
    );

    return successResponse(res, {
      user: result.user,
      accessToken: result.accessToken,
    });
  } catch (error) {
    next(error);
  }
}

export async function refresh(
  req,
  res,
  next
) {
  try {
    const refreshToken =
      req.cookies?.slotsync_refresh;

    if (!refreshToken) {
      throw new AppError(
        "Refresh token is required.",
        401,
        "AUTH_REQUIRED"
      );
    }

    const result =
      await refreshUserSession(
        refreshToken
      );

    setRefreshCookie(
      res,
      result.refreshToken
    );

    return successResponse(res, {
      accessToken:
        result.accessToken,
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(
  req,
  res,
  next
) {
  try {
    if (req.user?.id) {
      await logoutUser(req.user.id);
    }

    clearRefreshCookie(res);

    return successResponse(res, {
      loggedOut: true,
    });
  } catch (error) {
    next(error);
  }
}




export async function getCurrentUser(
  req,
  res,
  next
) {
  try {
    return successResponse(res, {
      user: req.user,
    });
  } catch (error) {
    next(error);
  }
}



