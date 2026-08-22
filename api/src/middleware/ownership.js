import mongoose from "mongoose";
import { AppError } from "../utils/AppError.js";

export function requireOwnership({
  param = "id",
  getOwnerId,
  allowedRoles = ["admin"],
}) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(
          new AppError(
            "Authentication is required.",
            401,
            "AUTH_REQUIRED"
          )
        );
      }

      /*
       * Admins are allowed to bypass ownership
       * checks by default.
       */
      if (allowedRoles.includes(req.user.role)) {
        return next();
      }

      const resourceId = req.params[param];

      if (
        !mongoose.Types.ObjectId.isValid(
          resourceId
        )
      ) {
        return next(
          new AppError(
            "Invalid resource ID.",
            400,
            "VALIDATION_ERROR"
          )
        );
      }

      const ownerId = await getOwnerId(
        resourceId
      );

      if (!ownerId) {
        return next(
          new AppError(
            "Resource not found.",
            404,
            "NOT_FOUND"
          )
        );
      }

      if (
        ownerId.toString() !==
        req.user.id.toString()
      ) {
        return next(
          new AppError(
            "You do not have permission to access this resource.",
            403,
            "FORBIDDEN"
          )
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}