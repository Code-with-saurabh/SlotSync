import { Router } from "express";

import {
  joinWaitlistController,
  listWaitlistController,
  getWaitlistController,
  leaveWaitlistController,
} from "../controllers/waitlistController.js";

import {
  authenticate,
} from "../middleware/authenticate.js";

import {
  authorize,
} from "../middleware/authorize.js";

import {
  validate,
} from "../middleware/validate.js";

import {
  joinWaitlistSchema,
  waitlistIdSchema,
  listWaitlistSchema,
} from "../validators/waitlistSchemas.js";

const router = Router();

/*
 * GET /api/waitlist
 */
router.get(
  "/",
  authenticate,
  authorize("student"),
  validate(
    listWaitlistSchema,
    "query"
  ),
  listWaitlistController
);

/*
 * POST /api/waitlist
 */
router.post(
  "/",
  authenticate,
  authorize("student"),
  validate(
    joinWaitlistSchema,
    "body"
  ),
  joinWaitlistController
);

/*
 * GET /api/waitlist/:id
 */
router.get(
  "/:id",
  authenticate,
  authorize("student"),
  validate(
    waitlistIdSchema,
    "params"
  ),
  getWaitlistController
);

/*
 * DELETE /api/waitlist/:id
 */
router.delete(
  "/:id",
  authenticate,
  authorize("student"),
  validate(
    waitlistIdSchema,
    "params"
  ),
  leaveWaitlistController
);

export default router;