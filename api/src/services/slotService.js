import mongoose from "mongoose";

import Slot from "../models/Slot.js";
import User from "../models/User.js";

import { AppError } from "../utils/AppError.js";
import {
  emitSlotCreated,
  emitSlotUpdated,
} from "../utils/socketManager.js";
import { broadcastAll } from "../utils/sse.js";

function validateTimeRange(
  startAt,
  endAt
) {
  if (
    !(startAt instanceof Date) ||
    Number.isNaN(startAt.getTime())
  ) {
    throw new AppError(
      "Invalid slot start time.",
      422,
      "VALIDATION_ERROR"
    );
  }

  if (
    !(endAt instanceof Date) ||
    Number.isNaN(endAt.getTime())
  ) {
    throw new AppError(
      "Invalid slot end time.",
      422,
      "VALIDATION_ERROR"
    );
  }

  if (endAt <= startAt) {
    throw new AppError(
      "Slot end time must be after start time.",
      422,
      "VALIDATION_ERROR"
    );
  }
}

async function validateCounsellor(
  counsellorId
) {
  const counsellor =
    await User.findOne({
      _id: counsellorId,
      role: "counsellor",
      isActive: true,
    }).select("_id");

  if (!counsellor) {
    throw new AppError(
      "Active counsellor not found.",
      404,
      "RESOURCE_NOT_FOUND"
    );
  }

  return counsellor;
}

async function checkOverlap({
  counsellorId,
  startAt,
  endAt,
  excludeSlotId = null,
}) {
  const query = {
    counsellorId,

    status: {
      $ne: "cancelled",
    },

    startAt: {
      $lt: endAt,
    },

    endAt: {
      $gt: startAt,
    },
  };

  if (excludeSlotId) {
    query._id = {
      $ne: excludeSlotId,
    };
  }

  const existingSlot =
    await Slot.findOne(query)
      .select("_id startAt endAt");

  if (existingSlot) {
    throw new AppError(
      "This counsellor already has an overlapping slot.",
      409,
      "SLOT_OVERLAP"
    );
  }
}

export async function createSlot({
  actor,
  counsellorId,
  startAt,
  endAt,
  capacity,
}) {
  validateTimeRange(
    startAt,
    endAt
  );

  let ownerId;

  if (actor.role === "counsellor") {
    ownerId = actor.id;
  } else if (actor.role === "admin") {
    ownerId = counsellorId;
  }

  if (!ownerId) {
    throw new AppError(
      "counsellorId is required.",
      422,
      "VALIDATION_ERROR"
    );
  }

  if (
    !mongoose.Types.ObjectId.isValid(
      ownerId
    )
  ) {
    throw new AppError(
      "Invalid counsellor ID.",
      422,
      "VALIDATION_ERROR"
    );
  }

  await validateCounsellor(
    ownerId
  );

  await checkOverlap({
    counsellorId: ownerId,
    startAt,
    endAt,
  });

  const slot =
    await Slot.create({
      counsellorId: ownerId,
      startAt,
      endAt,
      capacity,
      bookedCount: 0,
      version: 0,
      status: "open",
    });

  emitSlotCreated({
    slotId: String(slot._id),
    counsellorId: String(slot.counsellorId),
    startAt: slot.startAt,
    endAt: slot.endAt,
    capacity: slot.capacity,
    bookedCount: slot.bookedCount,
    status: slot.status,
    version: slot.version,
  });

  broadcastAll({
    slotId: String(slot._id),
    counsellorId: String(slot.counsellorId),
    startAt: slot.startAt,
    endAt: slot.endAt,
    capacity: slot.capacity,
    bookedCount: slot.bookedCount,
    status: slot.status,
    version: slot.version,
  });

  return slot;
}

export async function listSlots({
  from,
  to,
  counsellorId,
  status,
  cursor,
  limit = 20,
}) {
  const filter = {};

  if (from || to) {
    filter.startAt = {};

    if (from) {
      filter.startAt.$gte = from;
    }

    if (to) {
      filter.startAt.$lt = to;
    }
  }

  if (counsellorId) {
    filter.counsellorId =
      counsellorId;
  }

  if (status) {
    filter.status = status;
  }

  /*
   * Cursor-based pagination: no skip().
   *
   * The cursor is the _id of the last document
   * from the previous page. We fetch documents
   * where _id > cursor, sorted by startAt, _id.
   *
   * Why not skip()? With large collections,
   * skip(n) forces MongoDB to scan and discard
   * n documents before returning results.
   * Cursor pagination uses the _id index to
   * jump directly to the right position — O(log n)
   * vs O(n).
   */
  if (cursor) {
    if (!mongoose.Types.ObjectId.isValid(cursor)) {
      throw new AppError(
        "Invalid cursor.",
        422,
        "VALIDATION_ERROR"
      );
    }
    filter._id = { $gt: cursor };
  }

  const slots = await Slot.find(filter)
    .sort({
      startAt: 1,
      _id: 1,
    })
    .limit(limit + 1)
    .populate(
      "counsellorId",
      "name email"
    )
    .lean();

  const hasMore = slots.length > limit;
  const data = hasMore ? slots.slice(0, limit) : slots;
  const nextCursor = hasMore ? data[data.length - 1]._id : null;

  return {
    slots: data,
    nextCursor,
    hasMore,
  };
}

export async function getSlotById(
  slotId
) {
  if (
    !mongoose.Types.ObjectId.isValid(
      slotId
    )
  ) {
    throw new AppError(
      "Invalid slot ID.",
      422,
      "VALIDATION_ERROR"
    );
  }

  const slot =
    await Slot.findById(slotId)
      .populate(
        "counsellorId",
        "name email"
      )
      .lean();

  if (!slot) {
    throw new AppError(
      "Slot not found.",
      404,
      "RESOURCE_NOT_FOUND"
    );
  }

  return slot;
}

export async function updateSlot({
  actor,
  slotId,
  updates,
}) {
  if (
    !mongoose.Types.ObjectId.isValid(
      slotId
    )
  ) {
    throw new AppError(
      "Invalid slot ID.",
      422,
      "VALIDATION_ERROR"
    );
  }

  const slot =
    await Slot.findById(slotId);

  if (!slot) {
    throw new AppError(
      "Slot not found.",
      404,
      "RESOURCE_NOT_FOUND"
    );
  }

  /*
   * Counsellor can modify only
   * their own slot.
   */
  if (
    actor.role === "counsellor" &&
    slot.counsellorId.toString() !==
      actor.id.toString()
  ) {
    throw new AppError(
      "You do not have permission to modify this slot.",
      403,
      "FORBIDDEN"
    );
  }

  /*
   * Optimistic concurrency.
   */
  if (
    updates.version !== undefined &&
    updates.version !== slot.version
  ) {
    throw new AppError(
      "Slot was modified by another request.",
      409,
      "STALE_RESOURCE"
    );
  }

  const nextStartAt =
    updates.startAt ??
    slot.startAt;

  const nextEndAt =
    updates.endAt ??
    slot.endAt;

  validateTimeRange(
    nextStartAt,
    nextEndAt
  );

  const nextCapacity =
    updates.capacity ??
    slot.capacity;

  if (
    nextCapacity <
    slot.bookedCount
  ) {
    throw new AppError(
      "Capacity cannot be lower than the current booked count.",
      422,
      "VALIDATION_ERROR"
    );
  }

  const timeChanged =
    nextStartAt.getTime() !==
      slot.startAt.getTime() ||
    nextEndAt.getTime() !==
      slot.endAt.getTime();

  if (timeChanged) {
    await checkOverlap({
      counsellorId:
        slot.counsellorId,

      startAt: nextStartAt,

      endAt: nextEndAt,

      excludeSlotId:
        slot._id,
    });
  }

  slot.startAt =
    nextStartAt;

  slot.endAt =
    nextEndAt;

  slot.capacity =
    nextCapacity;

  if (updates.status) {
    slot.status =
      updates.status;
  }

  slot.version += 1;

  await slot.save();

  emitSlotUpdated({
    slotId: String(slot._id),
    counsellorId: String(slot.counsellorId),
    startAt: slot.startAt,
    endAt: slot.endAt,
    capacity: slot.capacity,
    bookedCount: slot.bookedCount,
    status: slot.status,
    version: slot.version,
  });

  broadcastAll({
    slotId: String(slot._id),
    counsellorId: String(slot.counsellorId),
    startAt: slot.startAt,
    endAt: slot.endAt,
    capacity: slot.capacity,
    bookedCount: slot.bookedCount,
    status: slot.status,
    version: slot.version,
  });

  return slot;
}