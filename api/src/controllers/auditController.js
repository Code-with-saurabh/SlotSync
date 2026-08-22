import AuditLog from "../models/AuditLog.js";

export async function listAuditController(req, res, next) {
  try {
    const {
      entity,
      id,
      page,
      limit,
    } = req.query;

    const filter = {};

    if (entity) {
      filter.entity = entity;
    }

    if (id) {
      filter.entityId = id;
    }

    const skip = (page - 1) * limit;

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
        .limit(limit)
        .lean(),

      AuditLog.countDocuments(filter),
    ]);

    const totalPages =
      Math.ceil(total / limit);

    return res.status(200).json({
      success: true,

      data: logs,

      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage:
          page < totalPages,
        hasPreviousPage:
          page > 1,
      },
    });
  } catch (error) {
    next(error);
  }
}