import mongoose from "mongoose";

import Booking from "../models/Booking.js";
import Slot from "../models/Slot.js";
import User from "../models/User.js";
import WaitlistEntry from "../models/WaitlistEntry.js";
import AuditLog from "../models/AuditLog.js";

import { AppError } from "../utils/AppError.js";

import {
  assertBookingCanBeCancelled,
  assertCancellationWithinWindow,
  assertValidOutcomeTransition,
} from "../utils/bookingStateMachine.js";

const BOOKING_WINDOW_MINUTES = 30;

const MAX_TRANSACTION_RETRIES = 3;

const ACTIVE_BOOKING_STATUSES = [
  "booked",
  "attended",
  "no_show",
];


/*
 * ==================================================
 * VALIDATION HELPERS
 * ==================================================
 */

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function assertStudent(actor) {
  if (!actor || actor.role !== "student") {
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
 * ==================================================
 * TRANSACTION HELPER
 * ==================================================
 *
 * MongoDB transactions can experience transient
 * conflicts during high concurrency.
 *
 * Retry only when MongoDB explicitly marks the
 * transaction as retryable.
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


/*
 * ==================================================
 * CREATE BOOKING TRANSACTION
 * ==================================================
 */

async function createBookingTransaction(
  studentId,
  slotId,
  session
) {
  /*
   * Touch the student's document inside the
   * transaction.
   *
   * This creates a write dependency for concurrent
   * booking attempts from the same student.
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
   * Read slot inside transaction.
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
   *
   * Booking is allowed only when the slot starts
   * at least 30 minutes from now.
   */
  const now = new Date();

  const minimumStart =
    new Date(
      now.getTime() +
        BOOKING_WINDOW_MINUTES *
          60 *
          1000
    );

  if (
    slot.startAt <
    minimumStart
  ) {
    throw new AppError(
      "This slot cannot be booked because it starts in less than 30 minutes.",
      422,
      "BOOKING_WINDOW_CLOSED"
    );
  }


  /*
   * ==================================================
   * DUPLICATE BOOKING PROTECTION
   * ==================================================
   */

  const existingBooking =
    await Booking.findOne({
      studentId,
      slotId,

      status: {
        $in:
          ACTIVE_BOOKING_STATUSES,
      },
    })
      .session(session)
      .select(
        "_id status"
      );

  if (existingBooking) {
    throw new AppError(
      "Student has already booked this slot.",
      409,
      "DUPLICATE_BOOKING"
    );
  }


  /*
   * ==================================================
   * OVERLAPPING BOOKING PROTECTION
   * ==================================================
   *
   * Existing booking overlaps requested slot when:
   *
   * existing.startAt < requested.endAt
   *
   * AND
   *
   * existing.endAt > requested.startAt
   */

  const overlappingBooking =
    await Booking.findOne({
      studentId,

      status: {
        $in:
          ACTIVE_BOOKING_STATUSES,
      },
    })
      .populate({
        path: "slotId",
        select:
          "startAt endAt status",
      })
      .session(session);

  if (
    overlappingBooking?.slotId
  ) {
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
   * ==================================================
   * ATOMIC SEAT RESERVATION
   * ==================================================
   *
   * Capacity check and bookedCount increment happen
   * inside ONE atomic database operation.
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
      "No seats are available.",
      409,
      "SLOT_FULL"
    );
  }


  /*
   * ==================================================
   * CREATE BOOKING
   * ==================================================
   */

  const [booking] =
    await Booking.create(
      [
        {
          studentId,

          slotId:
            slot._id,

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


/*
 * ==================================================
 * CREATE BOOKING
 * ==================================================
 */

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


/*
 * ==================================================
 * LIST STUDENT BOOKINGS
 * ==================================================
 */

export async function listStudentBookings({
  actor,
  status,
  limit = 20,
}) {
  assertStudent(actor);

  const filter = {
    studentId:
      actor.id,
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


/*
 * ==================================================
 * GET STUDENT BOOKING
 * ==================================================
 */

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
      studentId:
        actor.id,
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


/*
 * ==================================================
 * PROMOTE NEXT WAITLIST STUDENT
 * ==================================================
 *
 * Called after a booking cancellation releases a seat.
 *
 * Responsibilities:
 *
 * 1. Find FIFO waitlist entry.
 * 2. Remove stale entries.
 * 3. Validate student.
 * 4. Prevent duplicate booking.
 * 5. Prevent overlapping booking.
 * 6. Atomically claim waitlist entry.
 * 7. Atomically reserve seat.
 * 8. Create promoted booking.
 */

async function promoteNextWaitlistStudent(
  slot,
  session
) {
  /*
   * --------------------------------------------------
   * RE-READ SLOT
   * --------------------------------------------------
   */

  const currentSlot =
    await Slot.findById(
      slot._id
    ).session(session);

  if (!currentSlot) {
    throw new AppError(
      "Slot not found.",
      404,
      "RESOURCE_NOT_FOUND"
    );
  }

  /*
   * Promotion is only possible when the slot is open
   * and an actual seat is available.
   */

  if (
    currentSlot.status !== "open" ||
    currentSlot.bookedCount >=
      currentSlot.capacity
  ) {
    return null;
  }

  /*
   * --------------------------------------------------
   * GET FIFO WAITLIST
   * --------------------------------------------------
   *
   * Lower position always wins.
   *
   * createdAt and _id provide deterministic ordering
   * if two historical entries somehow have the same
   * position.
   */

  const waitingEntries =
    await WaitlistEntry.find({
      slotId:
        currentSlot._id,

      status:
        "waiting",
    })
      .sort({
        position: 1,
        createdAt: 1,
        _id: 1,
      })
      .limit(100)
      .session(session);

  if (
    !waitingEntries.length
  ) {
    return null;
  }

  /*
   * --------------------------------------------------
   * PROCESS FIFO CANDIDATES
   * --------------------------------------------------
   */

  for (
    const entry
    of waitingEntries
  ) {
    /*
     * ------------------------------------------------
     * 1. LOCK STUDENT BOOKING STREAM
     * ------------------------------------------------
     *
     * This is important.
     *
     * Booking creation already touches the student's
     * User document through bookingLockVersion.
     *
     * Promotion must do the same.
     *
     * Therefore a normal booking and a waitlist
     * promotion for the same student cannot freely
     * race against each other.
     */

    const student =
      await User.findOneAndUpdate(
        {
          _id:
            entry.studentId,

          role:
            "student",

          isActive:
            true,
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

    /*
     * ------------------------------------------------
     * STALE STUDENT
     * ------------------------------------------------
     */

    if (!student) {
      await WaitlistEntry.findOneAndUpdate(
        {
          _id:
            entry._id,

          status:
            "waiting",
        },
        {
          $set: {
            status:
              "cancelled",
          },
        },
        {
          session,
        }
      );

      continue;
    }

    /*
     * ------------------------------------------------
     * 2. DUPLICATE BOOKING CHECK
     * ------------------------------------------------
     */

    const existingBooking =
      await Booking.findOne({
        studentId:
          entry.studentId,

        slotId:
          currentSlot._id,

        status: {
          $in:
            ACTIVE_BOOKING_STATUSES,
        },
      })
        .session(session)
        .select(
          "_id status"
        );

    if (existingBooking) {
      /*
       * The student already has this slot.
       *
       * The waitlist entry is stale.
       */

      await WaitlistEntry.findOneAndUpdate(
        {
          _id:
            entry._id,

          status:
            "waiting",
        },
        {
          $set: {
            status:
              "cancelled",
          },
        },
        {
          session,
        }
      );

      continue;
    }

    /*
     * ------------------------------------------------
     * 3. OVERLAP CHECK
     * ------------------------------------------------
     */

    const activeBookings =
      await Booking.find({
  studentId,

  status: {
    $in: ACTIVE_BOOKING_STATUSES,
  },
})
  .populate({
    path: "slotId",
    select: "startAt endAt status",
  })
  .session(session);

    let hasOverlap =
      false;

    
for (const existingBooking of activeBookings) {
  if (!existingBooking.slotId) {
    continue;
  }

  const existingSlot = existingBooking.slotId;

  const overlaps =
    existingSlot.startAt < slot.endAt &&
    existingSlot.endAt > slot.startAt;

  if (overlaps) {
    throw new AppError(
      "Student already has an overlapping booking.",
      409,
      "BOOKING_OVERLAP"
    );
  }
}
    if (hasOverlap) {
      /*
       * This student cannot be promoted because
       * another active booking overlaps this slot.
       *
       * Remove the stale entry and continue to
       * the next FIFO candidate.
       */

      await WaitlistEntry.findOneAndUpdate(
        {
          _id:
            entry._id,

          status:
            "waiting",
        },
        {
          $set: {
            status:
              "cancelled",
          },
        },
        {
          session,
        }
      );

      continue;
    }

    /*
     * ------------------------------------------------
     * 4. ATOMIC WAITLIST CLAIM
     * ------------------------------------------------
     *
     * waiting -> promoted
     *
     * The status condition is critical.
     *
     * If another transaction already claimed this
     * entry, this update returns null.
     */

    const claimedEntry =
      await WaitlistEntry.findOneAndUpdate(
        {
          _id:
            entry._id,

          status:
            "waiting",
        },
        {
          $set: {
            status:
              "promoted",

            promotedAt:
              new Date(),
          },
        },
        {
          session,

          new: true,
        }
      );

    if (!claimedEntry) {
      /*
       * Another concurrent promotion won this entry.
       *
       * Continue to the next candidate.
       */

      continue;
    }

    /*
     * ------------------------------------------------
     * 5. ATOMIC SEAT RESERVATION
     * ------------------------------------------------
     */

    const updatedSlot =
      await Slot.findOneAndUpdate(
        {
          _id:
            currentSlot._id,

          status:
            "open",

          $expr: {
            $lt: [
              "$bookedCount",
              "$capacity",
            ],
          },
        },
        {
          $inc: {
            bookedCount:
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
      /*
       * The transaction will roll back the waitlist
       * claim because this operation throws.
       */

      throw new AppError(
        "The slot is no longer available for promotion.",
        409,
        "PROMOTION_CAPACITY_CONFLICT"
      );
    }

    /*
     * ------------------------------------------------
     * 6. CREATE PROMOTED BOOKING
     * ------------------------------------------------
     */

    const [booking] =
      await Booking.create(
        [
          {
            studentId:
              entry.studentId,

            slotId:
              currentSlot._id,

            counsellorId:
              currentSlot.counsellorId,

            status:
              "booked",

            version:
              0,
          },
        ],
        {
          session,
        }
      );

    /*
     * ------------------------------------------------
     * 7. WAITLIST PROMOTION AUDIT
     * ------------------------------------------------
     */

 await AuditLog.create(
  [
    {
      actorId: entry.studentId,

      action: "WAITLIST_PROMOTED",

      entity: "WaitlistEntry",

      entityId: claimedEntry._id,

      details: {
        waitlistEntryId:
          claimedEntry._id.toString(),

        studentId:
          entry.studentId.toString(),

        slotId:
          currentSlot._id.toString(),

        bookingId:
          booking._id.toString(),

        position:
          entry.position,
      },
    },
  ],
  {
    session,
  }
);

    /*
     * ------------------------------------------------
     * 8. RETURN PROMOTION
     * ------------------------------------------------
     */

    return {
      entry:
        claimedEntry,

      booking,
    };
  }

  /*
   * Every candidate was either stale, invalid,
   * overlapping, already booked, or unavailable.
   */

  return null;
}



/*
 * ==================================================
 * CANCEL BOOKING
 * ==================================================
 *
 * Flow:
 *
 * booking -> cancelled
 *       ↓
 * slot capacity - 1
 *       ↓
 * FIFO waitlist
 *       ↓
 * stale/invalid candidates removed
 *       ↓
 * candidate validated
 *       ↓
 * seat reserved
 *       ↓
 * booking created
 *       ↓
 * waitlist -> promoted
 *       ↓
 * audit log
 *       ↓
 * COMMIT
 */

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
       * ----------------------------------------------
       * 1. FIND BOOKING
       * ----------------------------------------------
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
       * ----------------------------------------------
       * 1b. LOAD SLOT START TIME FOR CUTOFF CHECK
       * ----------------------------------------------
       */
      const slotForCutoff =
        await Slot.findById(booking.slotId)
          .select("startAt")
          .session(session);

      if (!slotForCutoff) {
        throw new AppError(
          "Slot not found.",
          404,
          "RESOURCE_NOT_FOUND"
        );
      }

      /*
       * ----------------------------------------------
       * 2. STATE VALIDATION
       * ----------------------------------------------
       */
      assertBookingCanBeCancelled(booking.status);
      assertCancellationWithinWindow(slotForCutoff.startAt);

      /*
       * ----------------------------------------------
       * 3. ATOMIC CANCELLATION
       * ----------------------------------------------
       */

      const updatedBooking =
        await Booking.findOneAndUpdate(
          {
            _id:
              booking._id,

            studentId:
              actor.id,

            status:
              "booked",
          },
          {
            $set: {
              status:
                "cancelled",
            },

            $inc: {
              version:
                1,
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
       * ----------------------------------------------
       * 4. RELEASE SEAT
       * ----------------------------------------------
       */

      const updatedSlot =
        await Slot.findOneAndUpdate(
          {
            _id:
              booking.slotId,

            bookedCount: {
              $gt: 0,
            },
          },
          {
            $inc: {
              bookedCount:
                -1,

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
          "Unable to release the slot capacity.",
          409,
          "SLOT_CAPACITY_ERROR"
        );
      }


      /*
       * ----------------------------------------------
       * 5. PROMOTE NEXT WAITLIST STUDENT
       * ----------------------------------------------
       */

      const promotion =
        await promoteNextWaitlistStudent(
          updatedSlot,
          session
        );


      /*
       * ----------------------------------------------
       * 6. AUDIT LOG
       * ----------------------------------------------
       */

    await AuditLog.create(
  [
    {
      actorId: actor.id,

      action: "BOOKING_CANCELLED",

      entity: "Booking",

      entityId: updatedBooking._id,

      details: {
        bookingId:
          updatedBooking._id.toString(),

        slotId:
          updatedBooking.slotId.toString(),

        previousStatus:
          "booked",

        newStatus:
          "cancelled",

        promotedBookingId:
          promotion?.booking?._id
            ? promotion.booking._id.toString()
            : null,

        promotedWaitlistEntryId:
          promotion?.entry?._id
            ? promotion.entry._id.toString()
            : null,
      },
    },
  ],
  {
    session,
  }
);


      /*
       * ----------------------------------------------
       * 7. RETURN RESULT
       * ----------------------------------------------
       */

      return {
        booking:
          updatedBooking,

        promotion,
      };
    }
  );
}


function assertCounsellor(actor) {
  if (!actor || actor.role !== "counsellor") {
    throw new AppError(
      "Only counsellors can set booking outcomes.",
      403,
      "FORBIDDEN"
    );
  }
}

/*
 * ==================================================
 * MARK BOOKING OUTCOME
 * ==================================================
 *
 * booked -> attended
 * booked -> no_show
 *
 * Ownership: a counsellor may only mark outcomes on
 * bookings belonging to their own slots. Enforced by
 * scoping the query to counsellorId — not a separate
 * "check then act" step, so there's no gap to race.
 */
export async function markBookingOutcome({
  actor,
  bookingId,
  outcome,
}) {
  assertCounsellor(actor);

  assertObjectId(bookingId, "booking ID");

  return runTransaction(async (session) => {
    /*
     * 1. FIND BOOKING SCOPED TO THIS COUNSELLOR
     *
     * Deliberately filtering by counsellorId in the same
     * query rather than fetching-then-comparing. A booking
     * that exists but belongs to someone else must look
     * identical to a booking that doesn't exist, from this
     * counsellor's point of view — hence 403 below, decided
     * by whether the scoped lookup found anything.
     */
    const booking = await Booking.findOne({
      _id: bookingId,
    }).session(session);

    if (!booking) {
      throw new AppError(
        "Booking not found.",
        404,
        "RESOURCE_NOT_FOUND"
      );
    }

    if (
      booking.counsellorId.toString() !== actor.id.toString()
    ) {
      throw new AppError(
        "You do not own the slot this booking belongs to.",
        403,
        "FORBIDDEN"
      );
    }

    /*
     * 2. STATE VALIDATION — centralised, single source of truth
     */
    assertValidOutcomeTransition(booking.status, outcome);

    /*
     * 3. ATOMIC UPDATE
     *
     * Status condition in the filter (not just the id) closes
     * the race where two outcome requests land concurrently —
     * only the first "booked" match wins; the second gets null
     * and a clean 409 rather than silently overwriting.
     */
    const updatedBooking = await Booking.findOneAndUpdate(
      {
        _id: booking._id,
        status: "booked",
      },
      {
        $set: { status: outcome },
        $inc: { version: 1 },
      },
      { session, new: true }
    );

    if (!updatedBooking) {
      throw new AppError(
        "Booking outcome could not be updated.",
        409,
        "OUTCOME_UPDATE_CONFLICT"
      );
    }

    /*
     * 4. AUDIT LOG
     */
   await AuditLog.create(
  [
    {
      actorId: actor.id,

      action: "BOOKING_OUTCOME_SET",

      entity: "Booking",

      entityId: updatedBooking._id,

      details: {
        bookingId:
          updatedBooking._id.toString(),

        previousStatus:
          "booked",

        newStatus:
          outcome,
      },
    },
  ],
  {
    session,
  }
);

    return updatedBooking;
  });
}

