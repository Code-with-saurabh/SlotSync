import mongoose from "mongoose";

import WaitlistEntry from "../models/WaitlistEntry.js";
import Slot from "../models/Slot.js";
import Booking from "../models/Booking.js";
import User from "../models/User.js";

import { AppError } from "../utils/AppError.js";
import {
  emitWaitlistJoined,
  emitWaitlistLeft,
} from "../utils/socketManager.js";
import { broadcastAll } from "../utils/sse.js";

const MAX_TRANSACTION_RETRIES = 3;

const ACTIVE_BOOKING_STATUSES = [
  "booked",
  "attended",
  "no_show",
];

/*
 * --------------------------------------------------
 * HELPERS
 * --------------------------------------------------
 */

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function assertStudent(actor) {
  if (!actor || actor.role !== "student") {
    throw new AppError(
      "Only students can use the waitlist.",
      403,
      "FORBIDDEN"
    );
  }
}

function assertObjectId(value, fieldName) {
  if (!isValidObjectId(value)) {
    throw new AppError(
      `Invalid ${fieldName}.`,
      422,
      "VALIDATION_ERROR"
    );
  }
}

/*
 * --------------------------------------------------
 * TRANSACTION HELPER
 * --------------------------------------------------
 */

async function runTransaction(operation) {
  let lastError;

  for (
    let attempt = 1;
    attempt <= MAX_TRANSACTION_RETRIES;
    attempt += 1
  ) {
    const session =
      await mongoose.startSession();

    try {
      let result;

      await session.withTransaction(
        async () => {
          result =
            await operation(session);
        },
        {
          readPreference: "primary",

          readConcern: {
            level: "snapshot",
          },

          writeConcern: {
            w: "majority",
          },
        }
      );

      return result;
    } catch (error) {
      lastError = error;

      const retryable =
        error?.errorLabels?.includes(
          "TransientTransactionError"
        );

      if (
        !retryable ||
        attempt === MAX_TRANSACTION_RETRIES
      ) {
        throw error;
      }
    } finally {
      await session.endSession();
    }
  }

  throw lastError;
}

async function normalizeWaitlistPositions(
  slotId,
  session
) {
  const entries =
    await WaitlistEntry.find({
      slotId,
      status: "waiting",
    })
      .sort({
        position: 1,
        createdAt: 1,
        _id: 1,
      })
      .session(session);

  for (
    let index = 0;
    index < entries.length;
    index += 1
  ) {
    const expectedPosition =
      index + 1;

    if (
      entries[index].position !==
      expectedPosition
    ) {
      entries[index].position =
        expectedPosition;

      await entries[index].save({
        session,
      });
    }
  }

  return entries;
}

/*
 * --------------------------------------------------
 * JOIN WAITLIST
 * --------------------------------------------------
 */

export async function joinWaitlist({
  actor,
  slotId,
}) {
  assertStudent(actor);

  assertObjectId(
    actor.id,
    "student ID"
  );

  assertObjectId(
    slotId,
    "slot ID"
  );

  const entry = await runTransaction(
    async (session) => {
      /*
       * --------------------------------------------------
       * VALIDATE STUDENT
       * --------------------------------------------------
       */

      const student =
        await User.findOne({
          _id: actor.id,
          role: "student",
          isActive: true,
        })
          .session(session)
          .select("_id");

      if (!student) {
        throw new AppError(
          "Student account not found.",
          401,
          "AUTH_REQUIRED"
        );
      }

      /*
       * --------------------------------------------------
       * LOAD SLOT
       * --------------------------------------------------
       */

      const slot =
        await Slot.findById(
          slotId
        ).session(session);

      if (!slot) {
        throw new AppError(
          "Slot not found.",
          404,
          "RESOURCE_NOT_FOUND"
        );
      }

      /*
       * --------------------------------------------------
       * SLOT VALIDATION
       * --------------------------------------------------
       */

      if (
        slot.status !==
        "open"
      ) {
        throw new AppError(
          "This slot is not available.",
          409,
          "SLOT_NOT_AVAILABLE"
        );
      }

      /*
       * Waitlist is only allowed when
       * the slot is completely full.
       */

      if (
        slot.bookedCount <
        slot.capacity
      ) {
        throw new AppError(
          "A seat is currently available. Please book the slot directly.",
          409,
          "SLOT_AVAILABLE"
        );
      }

      /*
       * --------------------------------------------------
       * DUPLICATE BOOKING PROTECTION
       * --------------------------------------------------
       */

      const existingBooking =
        await Booking.findOne({
          studentId:
            actor.id,

          slotId,

          status: {
            $in:
              ACTIVE_BOOKING_STATUSES,
          },
        })
          .session(session)
          .select(
            "_id"
          );

      if (existingBooking) {
        throw new AppError(
          "Student already has a booking for this slot.",
          409,
          "DUPLICATE_BOOKING"
        );
      }

      /*
       * --------------------------------------------------
       * EXISTING WAITLIST ENTRY
       * --------------------------------------------------
       */

      const existingWaitlist =
        await WaitlistEntry.findOne({
          studentId:
            actor.id,

          slotId,
        })
          .session(session)
          .select(
            "_id status position"
          );

      /*
       * --------------------------------------------------
       * ALREADY WAITING
       * --------------------------------------------------
       */

      if (
        existingWaitlist?.status ===
        "waiting"
      ) {
        throw new AppError(
          "Student is already on the waitlist.",
          409,
          "ALREADY_WAITLISTED"
        );
      }

      /*
       * --------------------------------------------------
       * PROMOTED ENTRY CANNOT REJOIN
       * --------------------------------------------------
       */

      if (
        existingWaitlist?.status ===
        "promoted"
      ) {
        throw new AppError(
          "Student cannot join this waitlist again because the entry was already promoted.",
          409,
          "WAITLIST_ENTRY_EXISTS"
        );
      }

      /*
       * --------------------------------------------------
       * ATOMIC FIFO POSITION
       * --------------------------------------------------
       *
       * We do NOT use:
       *
       * lastPosition + 1
       *
       * because two concurrent requests could both
       * read the same last position.
       *
       * Instead, MongoDB atomically increments the
       * slot's waitlistSequence.
       */

      const updatedSlot =
        await Slot.findOneAndUpdate(
          {
            _id:
              slot._id,

            status:
              "open",

            /*
             * Re-check that the slot is still full
             * inside the transaction.
             */
            $expr: {
              $gte: [
                "$bookedCount",
                "$capacity",
              ],
            },
          },
          {
            $inc: {
              waitlistSequence:
                1,

              version:
                1,
            },
          },
          {
            session,

            new: true,
          }
        );

      if (!updatedSlot) {
        throw new AppError(
          "The slot is no longer full. Please book the slot directly.",
          409,
          "SLOT_AVAILABLE"
        );
      }

      /*
       * The atomically incremented sequence becomes
       * the student's FIFO position.
       */

      const position =
        updatedSlot.waitlistSequence;

      /*
       * --------------------------------------------------
       * REACTIVATE CANCELLED ENTRY
       * --------------------------------------------------
       *
       * Historical cancelled entries are reused.
       *
       * Their new position is the latest sequence value,
       * so they correctly go to the end of the queue.
       */

      if (
        existingWaitlist?.status ===
        "cancelled"
      ) {
        existingWaitlist.status =
          "waiting";

        existingWaitlist.position =
          position;

        existingWaitlist.promotedAt =
          null;

        await existingWaitlist.save({
          session,
        });

        return existingWaitlist;
      }

      /*
       * --------------------------------------------------
       * CREATE NEW WAITLIST ENTRY
       * --------------------------------------------------
       */

      const [entry] =
        await WaitlistEntry.create(
          [
            {
              studentId:
                actor.id,

              slotId:
                slot._id,

              position,

              status:
                "waiting",

              promotedAt:
                null,
            },
          ],
          {
            session,
          }
        );

      return entry;
    }
  );

  if (entry) {
    emitWaitlistJoined({
      entryId: String(entry._id),
      slotId: String(entry.slotId),
      studentId: String(entry.studentId),
      position: entry.position,
    });

    const freshSlot = await Slot.findById(entry.slotId).lean();
    if (freshSlot) {
      broadcastAll({
        slotId: String(freshSlot._id),
        bookedCount: freshSlot.bookedCount,
        capacity: freshSlot.capacity,
        seatsLeft: freshSlot.capacity - freshSlot.bookedCount,
        version: freshSlot.version,
        status: freshSlot.status,
      });
    }
  }

  return entry;
}

/*
 * --------------------------------------------------
 * LIST STUDENT WAITLIST
 * --------------------------------------------------
 */

export async function listStudentWaitlist({
  actor,
  status,
  limit = 20,
}) {
  assertStudent(actor);

  const filter = {
    studentId: actor.id,
  };

  if (status) {
    filter.status = status;
  }

  return WaitlistEntry.find(filter)
    .sort({
      createdAt: -1,
      _id: -1,
    })
    .limit(limit)
    .populate(
      "slotId",
      "counsellorId startAt endAt capacity bookedCount status"
    )
    .lean();
}

/*
 * --------------------------------------------------
 * GET WAITLIST ENTRY
 * --------------------------------------------------
 */

export async function getStudentWaitlistEntry({
  actor,
  entryId,
}) {
  assertStudent(actor);

  assertObjectId(
    entryId,
    "waitlist entry ID"
  );

  const entry =
    await WaitlistEntry.findOne({
      _id: entryId,
      studentId: actor.id,
    })
      .populate(
        "slotId",
        "counsellorId startAt endAt capacity bookedCount status"
      )
      .lean();

  if (!entry) {
    throw new AppError(
      "Waitlist entry not found.",
      404,
      "RESOURCE_NOT_FOUND"
    );
  }

  return entry;
}

/*
 * --------------------------------------------------
 * LEAVE WAITLIST
 * --------------------------------------------------
 */

export async function leaveWaitlist({
  actor,
  entryId,
}) {
  assertStudent(actor);

  assertObjectId(
    entryId,
    "waitlist entry ID"
  );

  const entry = await runTransaction(
    async (session) => {
      const entry =
        await WaitlistEntry.findOne({
          _id: entryId,
          studentId: actor.id,
        }).session(session);

      if (!entry) {
        throw new AppError(
          "Waitlist entry not found.",
          404,
          "RESOURCE_NOT_FOUND"
        );
      }

      if (
        entry.status !==
        "waiting"
      ) {
        throw new AppError(
          "Only waiting entries can be cancelled.",
          409,
          "WAITLIST_NOT_ACTIVE"
        );
      }

      entry.status =
        "cancelled";

      await entry.save({
        session,
      });

      /*
       * Position normalization is handled
       * separately so historical positions
       * are not rewritten unnecessarily.
       */

      return entry;
    }
  );

  if (entry) {
    emitWaitlistLeft({
      entryId: String(entry._id),
      slotId: String(entry.slotId),
      studentId: String(entry.studentId),
    });

    const freshSlot = await Slot.findById(entry.slotId).lean();
    if (freshSlot) {
      broadcastAll({
        slotId: String(freshSlot._id),
        bookedCount: freshSlot.bookedCount,
        capacity: freshSlot.capacity,
        seatsLeft: freshSlot.capacity - freshSlot.bookedCount,
        version: freshSlot.version,
        status: freshSlot.status,
      });
    }
  }

  return entry;
}

/*
 * --------------------------------------------------
 * LIST COUNSELLOR WAITLIST
 * --------------------------------------------------
 */

export async function listCounsellorWaitlist({
  actor,
  status,
  limit = 100,
}) {
  if (!actor || actor.role !== "counsellor") {
    throw new AppError(
      "Only counsellors can view this.",
      403,
      "FORBIDDEN"
    );
  }

  const slotIds = await Slot.find({ counsellorId: actor.id })
    .select("_id")
    .lean();

  const ids = slotIds.map((s) => s._id);

  if (ids.length === 0) return [];

  const filter = { slotId: { $in: ids } };

  if (status) {
    filter.status = status;
  }

  return WaitlistEntry.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit)
    .populate("slotId", "counsellorId startAt endAt capacity bookedCount status")
    .populate("studentId", "name email")
    .lean();
}