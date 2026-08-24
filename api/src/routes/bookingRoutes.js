import { Router } from "express";

import {
  createBookingController,
  listBookingsController,
  listCounsellorBookingsController,
  getBookingController,
  cancelBookingController,
  markOutcome,
} from "../controllers/bookingController.js";

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
  createBookingSchema,
  bookingIdSchema,
  listBookingSchema,
  outcomeSchema,
  listCounsellorBookingsSchema,
} from "../validators/bookingSchemas.js";
import { idempotencyCheck } from "../middleware/idempotency.js";

const router = Router();

/*
 * Counsellor booking list.
 *
 * GET /api/bookings/counsellor
 *
 * IMPORTANT: This route MUST be defined before /:id
 * to prevent Express from matching "counsellor" as an id param.
 */
router.get(
  "/counsellor",
  authenticate,
  authorize("counsellor"),
  validate(
    listCounsellorBookingsSchema,
    "query"
  ),
  listCounsellorBookingsController
);

/*
 * Student booking list.
 *
 * GET /api/bookings
 */
router.get(
  "/",
  authenticate,
  authorize("student"),
  validate(
    listBookingSchema,
    "query"
  ),
  listBookingsController
);

/*
 * Create booking.
 *
 * POST /api/bookings
 */
router.post(
  "/",
  authenticate,
  authorize("student"),
  idempotencyCheck,
  validate(
    createBookingSchema,
    "body"
  ),
  createBookingController
);

/*
 * Get one student's booking.
 *
 * GET /api/bookings/:id
 */
router.get(
  "/:id",
  authenticate,
  authorize("student"),
  validate(
    bookingIdSchema,
    "params"
  ),
  getBookingController
);

/*
 * Cancel student's booking.
 *
 * POST /api/bookings/:id/cancel
 */
router.post(
  "/:id/cancel",
  authenticate,
  authorize("student"),
  validate(
    bookingIdSchema,
    "params"
  ),
  cancelBookingController
);


router.patch(
  "/:id/outcome",
  authenticate,
  authorize("counsellor"),
  validate(bookingIdSchema, "params"),
  validate(outcomeSchema, "body"),
  markOutcome
);


export default router;
