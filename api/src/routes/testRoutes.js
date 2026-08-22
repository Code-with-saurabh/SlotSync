import { Router } from "express";

import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";

import { successResponse } from "../utils/apiResponse.js";

const router = Router();

router.get(
  "/protected",
  authenticate,
  (req, res) => {
    return successResponse(res, {
      message: "Authenticated successfully.",
      user: req.user,
    });
  }
);

router.get(
  "/student-only",
  authenticate,
  authorize("student"),
  (req, res) => {
    return successResponse(res, {
      message: "Student authorization successful.",
      user: req.user,
    });
  }
);

router.get(
  "/counsellor-only",
  authenticate,
  authorize("counsellor"),
  (req, res) => {
    return successResponse(res, {
      message:
        "Counsellor authorization successful.",
      user: req.user,
    });
  }
);

router.get(
  "/admin-only",
  authenticate,
  authorize("admin"),
  (req, res) => {
    return successResponse(res, {
      message: "Admin authorization successful.",
      user: req.user,
    });
  }
);


router.get(
  "/multiple-role",
  authenticate,
  authorize("admin", "counsellor"),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: "Admin or counsellor can access this endpoint",
      role: req.user.role
    });
  }
);

export default router;