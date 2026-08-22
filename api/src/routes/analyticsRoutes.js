import { Router } from "express";

import { getAnalytics } from "../controllers/analyticsController.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";

const router = Router();

router.get(
  "/counsellor/:id",
  authenticate,
  authorize("admin", "counsellor"),
  getAnalytics
);

export default router;