import { Router } from "express";

import { getAnalytics, getInstituteAnalyticsController } from "../controllers/analyticsController.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";

const router = Router();

/*
 * GET /api/analytics/institute
 *
 * Institute-wide analytics. Admin only.
 */
router.get(
  "/institute",
  authenticate,
  authorize("admin"),
  getInstituteAnalyticsController
);

router.get(
  "/counsellor/:id",
  authenticate,
  authorize("admin", "counsellor"),
  getAnalytics
);

export default router;