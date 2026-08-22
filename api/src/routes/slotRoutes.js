import { Router } from "express";

import {
  createSlotController,
  listSlotsController,
  getSlotController,
  updateSlotController,
} from "../controllers/slotController.js";

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
  createSlotSchema,
  updateSlotSchema,
  listSlotsSchema,
} from "../validators/slotSchemas.js";

const router = Router();

/*
 * GET /api/slots
 */
router.get(
  "/",
  authenticate,
  validate(
    listSlotsSchema,
    "query"
  ),
  listSlotsController
);

/*
 * GET /api/slots/:id
 */
router.get(
  "/:id",
  authenticate,
  getSlotController
);

/*
 * POST /api/slots
 */
router.post(
  "/",
  authenticate,
  authorize(
    "admin",
    "counsellor"
  ),
  validate(
    createSlotSchema,
    "body"
  ),
  createSlotController
);

/*
 * PATCH /api/slots/:id
 */
router.patch(
  "/:id",
  authenticate,
  authorize(
    "admin",
    "counsellor"
  ),
  validate(
    updateSlotSchema,
    "body"
  ),
  updateSlotController
);

export default router;