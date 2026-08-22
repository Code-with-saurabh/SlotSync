import { Router } from "express";

import {
  listAuditController,
} from "../controllers/auditController.js";

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
  auditListSchema,
} from "../validators/auditSchemas.js";

const router = Router();

/*
 * GET /api/audit
 *
 * Admin only.
 *
 * Optional filters:
 * ?entity=Booking
 * ?id=<entityId>
 * ?page=1
 * ?limit=20
 */

router.get(
  "/",
  authenticate,
  authorize("admin"),
  validate(
    auditListSchema,
    "query"
  ),
  listAuditController
);

export default router;