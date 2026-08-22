import { Router } from "express";
import mongoose from "mongoose";
import { successResponse } from "../utils/apiResponse.js";

const router = Router();

router.get("/", (req, res) => {
  const databaseState =
    mongoose.connection.readyState === 1
      ? "connected"
      : "disconnected";

  return successResponse(res, {
    service: "slotsync-api",
    status: "ok",
    database: databaseState,
    timestamp: new Date().toISOString(),
  });
});

export default router;