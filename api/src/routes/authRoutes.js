import { Router } from "express";

import {
  register,
  login,
  refresh,
  logout,
  getCurrentUser,
} from "../controllers/authController.js";

import { validate } from "../middleware/validate.js";

import {
  registerSchema,
  loginSchema,
} from "../validators/authValidators.js";

import { authenticate } from "../middleware/authenticate.js";

import { loginRateLimiter } from "../middleware/rateLimit.js";

const router = Router();

router.post(
  "/register",
  validate(registerSchema),
  register
);

router.post(
  "/login",
  loginRateLimiter,
  validate(loginSchema),
  login
);

router.post(
  "/refresh",
  refresh
);

router.post(
  "/logout",
  authenticate,
  logout
);

router.get(
  "/me",
  authenticate,
  getCurrentUser
);
 

export default router;