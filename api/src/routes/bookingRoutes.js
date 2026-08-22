import { Router } from "express";

import {
  createBookingController,
  listBookingsController,
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
} from "../validators/bookingSchemas.js";

const router = Router();

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
  markOutcome
);
export default router;