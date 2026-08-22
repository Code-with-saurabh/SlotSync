import mongoose from "mongoose";

import Booking from "../models/Booking.js";
import Slot from "../models/Slot.js";
import User from "../models/User.js";

import { AppError } from "../utils/AppError.js";
import AuditLog from "../models/AuditLog.js";

import {
  assertBookingCanBeCancelled,
} from "../utils/bookingStateMachine.js";

const BOOKING_WINDOW_MINUTES = 30;

const MAX_TRANSACTION_RETRIES = 3;

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(
    id
  );
}

function isActiveBookingStatus(status) {
  return [
    "booked",
    "attended",
    "no_show",
  ].includes(status);
}

function assertStudent(actor) {
  if (actor.role !== "student") {
    throw new AppError(
      "Only students can create bookings.",
      403,
      "FORBIDDEN"
    );
  }
}

function assertObjectId(
  value,
  fieldName
) {
  if (!isValidObjectId(value)) {
    throw new AppError(
      `Invalid ${fieldName}.`,
      422,
      "VALIDATION_ERROR"
    );
  }
}

/*
 * MongoDB transaction can occasionally
 * experience a transient write conflict
 * under high concurrency.
 *
 * Retry a small number of times.
 */
async function runTransaction(
  operation
) {
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

async function createBookingTransaction(
  studentId,
  slotId,
  session
) {
  /*
   * Lock the student's booking stream.
   *
   * This makes concurrent booking attempts
   * for the same student serialize.
   */
  const student =
    await User.findOneAndUpdate(
      {
        _id: studentId,
        role: "student",
        isActive: true,
      },
      {
        $inc: {
          bookingLockVersion: 1,
        },
      },
      {
        session,
        new: true,
      }
    ).select("_id");

  if (!student) {
    throw new AppError(
      "Student account not found.",
      401,
      "AUTH_REQUIRED"
    );
  }

  /*
   * Get slot inside the transaction.
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
   * Slot must be open.
   */
  if (slot.status !== "open") {
    throw new AppError(
      "This slot is not available for booking.",
      409,
      "SLOT_NOT_AVAILABLE"
    );
  }

  /*
   * Server-controlled booking window.
   */
  const now = new Date();

  const minimumStart =
    new Date(
      now.getTime() +
        BOOKING_WINDOW_MINUTES *
          60 *
          1000
    );

  if (slot.startAt < minimumStart) {
    throw new AppError(
      "This slot cannot be booked because it starts in less than 30 minutes.",
      422,
      "BOOKING_WINDOW_CLOSED"
    );
  }

  /*
   * Duplicate booking check.
   */
  const existingBooking =
    await Booking.findOne({
      studentId,
      slotId,
      status: {
        $in: [
          "booked",
          "attended",
          "no_show",
        ],
      },
    })
      .session(session)
      .select("_id status");

  if (existingBooking) {
    throw new AppError(
      "Student has already booked this slot.",
      409,
      "DUPLICATE_BOOKING"
    );
  }

  /*
   * Student overlap protection.
   *
   * Existing active booking
   * overlaps requested slot when:
   *
   * existing.startAt < requested.endAt
   * AND
   * existing.endAt > requested.startAt
   */
  const overlappingBooking =
    await Booking.findOne({
      studentId,
      status: {
        $in: [
          "booked",
          "attended",
          "no_show",
        ],
      },
    })
      .populate({
        path: "slotId",
        select:
          "startAt endAt status",
      })
      .session(session);

  if (overlappingBooking?.slotId) {
    const existingSlot =
      overlappingBooking.slotId;

    const overlaps =
      existingSlot.startAt <
        slot.endAt &&
      existingSlot.endAt >
        slot.startAt;

    if (overlaps) {
      throw new AppError(
        "Student already has an overlapping booking.",
        409,
        "BOOKING_OVERLAP"
      );
    }
  }

  /*
   * IMPORTANT:
   *
   * Do NOT simply:
   *
   * find slot
   * check bookedCount
   * increment bookedCount
   *
   * Instead use a conditional atomic
   * update inside the transaction.
   */
  const updatedSlot =
    await Slot.findOneAndUpdate(
      {
        _id: slot._id,
        status: "open",

        $expr: {
          $lt: [
            "$bookedCount",
            "$capacity",
          ],
        },
      },
      {
        $inc: {
          bookedCount: 1,
        },
        $set: {
          version:
            slot.version + 1,
        },
      },
      {
        session,
        new: true,
      }
    );

  if (!updatedSlot) {
    throw new AppError(
      "No seats are available.",
      409,
      "SLOT_FULL"
    );
  }

  /*
   * Create booking only after the
   * atomic seat reservation succeeds.
   */
  const [booking] =
    await Booking.create(
      [
        {
          studentId,
          slotId: slot._id,
          counsellorId:
            slot.counsellorId,
          status: "booked",
          version: 0,
        },
      ],
      {
        session,
      }
    );

  return booking;
}

export async function createBooking({
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

  return runTransaction(
    (session) =>
      createBookingTransaction(
        actor.id,
        slotId,
        session
      )
  );
}

export async function listStudentBookings({
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

  return Booking.find(filter)
    .sort({
      createdAt: -1,
      _id: -1,
    })
    .limit(limit)
    .populate(
      "slotId",
      "counsellorId startAt endAt capacity bookedCount status"
    )
    .populate(
      "counsellorId",
      "name email"
    )
    .lean();
}

export async function getStudentBookingById({
  actor,
  bookingId,
}) {
  assertStudent(actor);

  assertObjectId(
    bookingId,
    "booking ID"
  );

  const booking =
    await Booking.findOne({
      _id: bookingId,
      studentId: actor.id,
    })
      .populate(
        "slotId",
        "counsellorId startAt endAt capacity bookedCount status"
      )
      .populate(
        "counsellorId",
        "name email"
      )
      .lean();

  if (!booking) {
    throw new AppError(
      "Booking not found.",
      404,
      "RESOURCE_NOT_FOUND"
    );
  }

  return booking;
}


export async function cancelBooking({
  actor,
  bookingId,
}) {
  assertStudent(actor);

  assertObjectId(
    actor.id,
    "student ID"
  );

  assertObjectId(
    bookingId,
    "booking ID"
  );

  return runTransaction(
    async (session) => {
      /*
       * Find the booking belonging to
       * the authenticated student.
       */
      const booking =
        await Booking.findOne({
          _id: bookingId,
          studentId: actor.id,
        }).session(session);

      if (!booking) {
        throw new AppError(
          "Booking not found.",
          404,
          "RESOURCE_NOT_FOUND"
        );
      }

      /*
       * Validate booking state.
       *
       * Only "booked" can currently
       * transition to "cancelled".
       */
      assertBookingCanBeCancelled(
        booking.status
      );

      /*
       * Change booking state first.
       *
       * The status condition protects
       * against concurrent cancellation.
       */
      const updatedBooking =
        await Booking.findOneAndUpdate(
          {
            _id: booking._id,
            studentId: actor.id,
            status: "booked",
          },
          {
            $set: {
              status: "cancelled",
            },
            $inc: {
              version: 1,
            },
          },
          {
            session,
            new: true,
          }
        );

      if (!updatedBooking) {
        throw new AppError(
          "Booking could not be cancelled.",
          409,
          "BOOKING_CANCELLATION_CONFLICT"
        );
      }

      /*
       * Release one seat atomically.
       *
       * bookedCount can never become negative.
       */
      const updatedSlot =
        await Slot.findOneAndUpdate(
          {
            _id: booking.slotId,
            bookedCount: {
              $gt: 0,
            },
          },
          {
            $inc: {
              bookedCount: -1,
              version: 1,
            },
          },
          {
            session,
            new: true,
          }
        );

      if (!updatedSlot) {
        throw new AppError(
          "Unable to release the slot capacity.",
          409,
          "SLOT_CAPACITY_ERROR"
        );
      }

      /*
       * Record the cancellation in the
       * audit log inside the same transaction.
       */
      await AuditLog.create(
        [
          {
            actorId: actor.id,
            action: "BOOKING_CANCELLED",
            entityType: "Booking",
            entityId: updatedBooking._id,
            metadata: {
              bookingId:
                updatedBooking._id.toString(),

              slotId:
                updatedBooking.slotId.toString(),

              previousStatus: "booked",

              newStatus: "cancelled",
            },
          },
        ],
        {
          session,
        }
      );

      /*
       * Transaction commits only after:
       *
       * 1. Booking cancelled
       * 2. Slot capacity released
       * 3. Audit log created
       */
      return updatedBooking;
    }
  );
}