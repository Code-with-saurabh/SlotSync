import AuditLog from "../models/AuditLog.js";
import { successResponse } from "../utils/apiResponse.js";

export async function listAuditController(req, res, next) {
  try {
    const entity = req.query.entity || undefined;
    const id = req.query.id || undefined;
    const pageNum = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    if (entity) {
      filter.entity = entity;
    }

    if (id) {
      filter.entityId = id;
    }

    const [
      logs,
      total,
    ] = await Promise.all([
      AuditLog.find(filter)
        .sort({
          createdAt: -1,
          _id: -1,
        })
        .skip(skip)
        .limit(limitNum)
        .lean(),

      AuditLog.countDocuments(filter),
    ]);

    const totalPages =
      Math.ceil(total / limitNum);

    return successResponse(res, {
      logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPreviousPage: pageNum > 1,
      },
    });
  } catch (error) {
    next(error);
  }
}
