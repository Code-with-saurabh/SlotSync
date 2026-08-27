import AuditLog from "../models/AuditLog.js";
import User from "../models/User.js";
import Booking from "../models/Booking.js";
import Slot from "../models/Slot.js";
import { successResponse } from "../utils/apiResponse.js";

const ENTITY_MODELS = {
  User,
  Booking,
  Slot,
};

async function enrichLogsWithNames(logs) {
  const userIds = new Set();
  const entityIdsByType = {};

  for (const log of logs) {
    if (log.actorId) userIds.add(String(log.actorId));

    const entityType = log.entity;
    if (!entityIdsByType[entityType]) {
      entityIdsByType[entityType] = new Set();
    }
    entityIdsByType[entityType].add(String(log.entityId));
  }

  const userMap = {};
  if (userIds.size > 0) {
    const users = await User.find({ _id: { $in: [...userIds] } })
      .select("name email")
      .lean();
    for (const u of users) {
      userMap[String(u._id)] = u.name || u.email || "Unknown User";
    }
  }

  const entityNameMaps = {};
  for (const [entityType, ids] of Object.entries(entityIdsByType)) {
    const Model = ENTITY_MODELS[entityType];
    if (!Model || ids.size === 0) continue;

    const docs = await Model.find({ _id: { $in: [...ids] } })
      .select("name email studentId")
      .lean();

    const nameMap = {};
    for (const doc of docs) {
      let name = doc.name || doc.email || null;

      if (!name && entityType === "Booking" && doc.studentId) {
        const student = await User.findById(doc.studentId).select("name email").lean();
        name = student?.name || student?.email || null;
      }

      nameMap[String(doc._id)] = name || "Unknown";
    }
    entityNameMaps[entityType] = nameMap;
  }

  return logs.map((log) => ({
    ...log,
    actorName: userMap[String(log.actorId)] || "System",
    entityName: entityNameMaps[log.entity]?.[String(log.entityId)] || null,
  }));
}

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

    const enrichedLogs = await enrichLogsWithNames(logs);

    const totalPages =
      Math.ceil(total / limitNum);

    return successResponse(res, {
      logs: enrichedLogs,
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
