import "dotenv/config";

import bcrypt from "bcrypt";

import { connectDatabase, disconnectDatabase } from "../src/config/db.js";

import User from "../src/models/User.js";
import Slot from "../src/models/Slot.js";
import Booking from "../src/models/Booking.js";
import WaitlistEntry from "../src/models/WaitlistEntry.js";
import AuditLog from "../src/models/AuditLog.js";


/*
 * ==================================================
 * CONFIGURATION
 * ==================================================
 */

const ADMIN_COUNT = 1;
const COUNSELLOR_COUNT = 5;
const STUDENT_COUNT = 200;

const SLOT_COUNT = 300;
const TARGET_BOOKING_COUNT = 5000;
const TARGET_WAITLIST_COUNT = 800;

const PASSWORD = "Password123!";
const BCRYPT_ROUNDS = 12;


/*
 * ==================================================
 * DATE HELPERS
 * ==================================================
 */

function addDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function randomInt(min, max) {
  return Math.floor(
    Math.random() * (max - min + 1)
  ) + min;
}

function shuffle(array) {
  for (
    let i = array.length - 1;
    i > 0;
    i -= 1
  ) {
    const j = Math.floor(
      Math.random() * (i + 1)
    );

    [array[i], array[j]] = [
      array[j],
      array[i],
    ];
  }

  return array;
}


/*
 * ==================================================
 * CLEAN DATABASE
 * ==================================================
 *
 * AuditLog is append-only at the model layer.
 * We use collection-level deletion here because this
 * is a controlled seed reset, not an application
 * update/delete operation.
 */

async function clearDatabase() {
  console.log("Clearing existing database data...");

  await Booking.deleteMany({});
  await WaitlistEntry.deleteMany({});
  await Slot.deleteMany({});
  await User.deleteMany({});

  /*
   * AuditLog middleware rejects deleteMany().
   * For seed reset we bypass the model middleware.
   */
  await AuditLog.collection.deleteMany({});

  console.log("Database cleared.");
}


/*
 * ==================================================
 * CREATE USERS
 * ==================================================
 */

async function createUsers() {
  console.log("Creating users...");

  const passwordHash = await bcrypt.hash(
    PASSWORD,
    BCRYPT_ROUNDS
  );

  const admin = {
    name: "SlotSync Admin",
    email: "admin@slotsync.local",
    passwordHash,
    role: "admin",
    isActive: true,
  };

  const counsellors = [];

  for (
    let i = 1;
    i <= COUNSELLOR_COUNT;
    i += 1
  ) {
    counsellors.push({
      name: `Counsellor ${i}`,
      email: `counsellor${i}@slotsync.local`,
      passwordHash,
      role: "counsellor",
      isActive: true,
    });
  }

  const students = [];

  for (
    let i = 1;
    i <= STUDENT_COUNT;
    i += 1
  ) {
    students.push({
      name: `Student ${i}`,
      email: `student${i}@slotsync.local`,
      passwordHash,
      role: "student",
      isActive: true,
    });
  }

  const [createdAdmin] = await User.create([admin]);

  const createdCounsellors =
    await User.insertMany(counsellors);

  const createdStudents =
    await User.insertMany(students);

  console.log(
    `Created ${ADMIN_COUNT} admin.`
  );

  console.log(
    `Created ${createdCounsellors.length} counsellors.`
  );

  console.log(
    `Created ${createdStudents.length} students.`
  );

  return {
    admin: createdAdmin,
    counsellors: createdCounsellors,
    students: createdStudents,
  };
}


/*
 * ==================================================
 * CREATE SLOTS
 * ==================================================
 *
 * 300 slots distributed across:
 *
 * previous 14 days
 * current day
 * next 14 days
 *
 * All timestamps are generated as UTC Date objects.
 */

async function createSlots(counsellors) {
  console.log("Creating slots...");

  const slots = [];

  const now = new Date();

  for (
    let i = 0;
    i < SLOT_COUNT;
    i += 1
  ) {
    const dayOffset = randomInt(
      1,
      14
    );

    const counsellor =
      counsellors[
        i % counsellors.length
      ];

    /*
     * Spread slots across normal working hours.
     */
    const hour = randomInt(9, 17);

    const startAt = addDays(
      new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate(),
          hour,
          0,
          0
        )
      ),
      dayOffset
    );

    /*
     * Slot duration:
     * 30, 45 or 60 minutes.
     */
    const durationMinutes =
      [30, 45, 60][
        randomInt(0, 2)
      ];

    const endAt = new Date(
      startAt.getTime() +
        durationMinutes *
          60 *
          1000
    );

    /*
     * Capacity is deliberately high enough
     * to support approximately 5,000 bookings.
     */
    const capacity = randomInt(
      20,
      30
    );

    slots.push({
      counsellorId:
        counsellor._id,

      startAt,

      endAt,

      capacity,

      bookedCount: 0,

      waitlistSequence: 0,

      version: 0,

      status: "open",
    });
  }

  const createdSlots =
    await Slot.insertMany(slots);

  console.log(
    `Created ${createdSlots.length} slots.`
  );

  return createdSlots;
}


/*
 * ==================================================
 * CREATE BOOKINGS
 * ==================================================
 *
 * Important rules:
 *
 * 1. No slot exceeds capacity.
 * 2. Same student is not inserted twice into same slot.
 * 3. Slot.bookedCount matches active bookings.
 *
 * We deliberately create unique student-slot pairs.
 */

async function createBookings(
  slots,
  students
) {
  console.log("Creating bookings...");

  const bookingDocuments = [];

  /*
   * Track unique student-slot combinations.
   */
  const usedPairs = new Set();

  /*
   * Track confirmed count for every slot.
   */
  const slotBookedCounts =
    new Map();

  for (const slot of slots) {
    slotBookedCounts.set(
      slot._id.toString(),
      0
    );
  }

  /*
   * We shuffle slots repeatedly so bookings
   * are distributed instead of filling only
   * the first slots.
   */
  let attempts = 0;

  const maxAttempts =
    TARGET_BOOKING_COUNT * 100;

  while (
    bookingDocuments.length <
      TARGET_BOOKING_COUNT &&
    attempts < maxAttempts
  ) {
    attempts += 1;

    const slot =
      slots[
        randomInt(
          0,
          slots.length - 1
        )
      ];

    const slotId =
      slot._id.toString();

    const currentCount =
      slotBookedCounts.get(slotId);

    /*
     * Never exceed slot capacity.
     */
    if (
      currentCount >= slot.capacity
    ) {
      continue;
    }

    const student =
      students[
        randomInt(
          0,
          students.length - 1
        )
      ];

    const studentId =
      student._id.toString();

    const pairKey =
      `${studentId}:${slotId}`;

    /*
     * Database unique index protection.
     * We also avoid creating duplicates
     * before insertMany.
     */
    if (
      usedPairs.has(pairKey)
    ) {
      continue;
    }

    usedPairs.add(pairKey);

    /*
     * Most generated bookings are booked.
     * Historical slots also contain realistic
     * attended/no_show/cancelled states.
     */
    let status = "booked";

    if (
      slot.endAt < new Date()
    ) {
      const roll =
        randomInt(1, 100);

      if (roll <= 70) {
        status = "attended";
      } else if (roll <= 85) {
        status = "no_show";
      } else {
        status = "cancelled";
      }
    }

    bookingDocuments.push({
      studentId:
        student._id,

      slotId:
        slot._id,

      counsellorId:
        slot.counsellorId,

      status,

      version: 0,

      /*
       * Historical lead times are useful
       * for analytics.
       */
      createdAt: new Date(
        slot.startAt.getTime() -
          randomInt(
            60,
            14 * 24 * 60
          ) *
            60 *
            1000
      ),

      updatedAt:
        new Date(),
    });

    /*
     * Only active statuses consume capacity.
     */
    if (
      [
        "booked",
        "attended",
        "no_show",
      ].includes(status)
    ) {
      slotBookedCounts.set(
        slotId,
        currentCount + 1
      );
    }
  }

  if (
    bookingDocuments.length !==
    TARGET_BOOKING_COUNT
  ) {
    throw new Error(
      `Could not generate ${TARGET_BOOKING_COUNT} bookings. Generated ${bookingDocuments.length}.`
    );
  }

  await Booking.insertMany(
    bookingDocuments,
    {
      ordered: true,
    }
  );

  /*
   * Synchronise Slot.bookedCount with the
   * number of active bookings generated.
   */
  const bulkOperations = [];

  for (const slot of slots) {
    const slotId =
      slot._id.toString();

    const bookedCount =
      slotBookedCounts.get(slotId);

    bulkOperations.push({
      updateOne: {
        filter: {
          _id: slot._id,
        },

        update: {
          $set: {
            bookedCount,
          },
        },
      },
    });
  }

  await Slot.bulkWrite(
    bulkOperations
  );

  console.log(
    `Created ${bookingDocuments.length} bookings.`
  );

  return {
    bookingDocuments,
    usedPairs,
    slotBookedCounts,
  };
}


/*
 * ==================================================
 * CREATE WAITLIST ENTRIES
 * ==================================================
 *
 * Waitlist entries are assigned FIFO positions.
 *
 * A student cannot have duplicate waiting entries
 * for the same slot.
 */

async function createWaitlistEntries(
  slots,
  students,
  usedPairs
) {
  console.log(
    "Creating waitlist entries..."
  );

  const waitlistDocuments = [];

  /*
   * Keep track of student-slot waitlist pairs.
   */
  const usedWaitlistPairs =
    new Set();

  /*
   * Position counter per slot.
   */
  const positions =
    new Map();

  for (const slot of slots) {
    positions.set(
      slot._id.toString(),
      0
    );
  }

  let attempts = 0;

  const maxAttempts =
    TARGET_WAITLIST_COUNT * 100;

  while (
    waitlistDocuments.length <
      TARGET_WAITLIST_COUNT &&
    attempts < maxAttempts
  ) {
    attempts += 1;

    const slot =
      slots[
        randomInt(
          0,
          slots.length - 1
        )
      ];

    const student =
      students[
        randomInt(
          0,
          students.length - 1
        )
      ];

    const slotId =
      slot._id.toString();

    const studentId =
      student._id.toString();

    const bookingPair =
      `${studentId}:${slotId}`;

    const waitlistPair =
      `${studentId}:${slotId}`;

    /*
     * Do not place a student on the waitlist
     * if they already hold a booking for the
     * same slot.
     */
    if (
      usedPairs.has(bookingPair)
    ) {
      continue;
    }

    if (
      usedWaitlistPairs.has(
        waitlistPair
      )
    ) {
      continue;
    }

    usedWaitlistPairs.add(
      waitlistPair
    );

    const nextPosition =
      positions.get(slotId) + 1;

    positions.set(
      slotId,
      nextPosition
    );

    waitlistDocuments.push({
      studentId:
        student._id,

      slotId:
        slot._id,

      position:
        nextPosition,

      status:
        "waiting",

      promotedAt:
        null,
    });
  }

  if (
    waitlistDocuments.length !==
    TARGET_WAITLIST_COUNT
  ) {
    throw new Error(
      `Could not generate ${TARGET_WAITLIST_COUNT} waitlist entries. Generated ${waitlistDocuments.length}.`
    );
  }

  await WaitlistEntry.insertMany(
    waitlistDocuments,
    {
      ordered: true,
    }
  );

  /*
   * Keep waitlistSequence aligned with
   * the highest assigned FIFO position.
   */
  const bulkOperations = [];

  for (const slot of slots) {
    const slotId =
      slot._id.toString();

    bulkOperations.push({
      updateOne: {
        filter: {
          _id: slot._id,
        },

        update: {
          $set: {
            waitlistSequence:
              positions.get(slotId),
          },
        },
      },
    });
  }

  await Slot.bulkWrite(
    bulkOperations
  );

  console.log(
    `Created ${waitlistDocuments.length} waitlist entries.`
  );

  return waitlistDocuments;
}


/*
 * ==================================================
 * VERIFY SEED DATA
 * ==================================================
 */

async function verifySeedData() {
  const [
    adminCount,
    counsellorCount,
    studentCount,
    slotCount,
    bookingCount,
    waitlistCount,
  ] = await Promise.all([
    User.countDocuments({
      role: "admin",
    }),

    User.countDocuments({
      role: "counsellor",
    }),

    User.countDocuments({
      role: "student",
    }),

    Slot.countDocuments(),

    Booking.countDocuments(),

    WaitlistEntry.countDocuments(),
  ]);

  console.log("\n=================================");
  console.log("SLOT SYNC SEED COMPLETE");
  console.log("=================================");

  console.log(
    `Admins: ${adminCount}`
  );

  console.log(
    `Counsellors: ${counsellorCount}`
  );

  console.log(
    `Students: ${studentCount}`
  );

  console.log(
    `Slots: ${slotCount}`
  );

  console.log(
    `Bookings: ${bookingCount}`
  );

  console.log(
    `Waitlist entries: ${waitlistCount}`
  );

  console.log("=================================\n");
}


/*
 * ==================================================
 * MAIN
 * ==================================================
 */

async function seed() {
  try {
    console.log(
      "Starting SlotSync database seed..."
    );

    await connectDatabase();

    await clearDatabase();

    const {
      counsellors,
      students,
    } = await createUsers();

    const slots =
      await createSlots(
        counsellors
      );

    const {
      usedPairs,
    } = await createBookings(
      slots,
      students
    );

    await createWaitlistEntries(
      slots,
      students,
      usedPairs
    );

    await verifySeedData();

    console.log(
      "Seed completed successfully."
    );
  } catch (error) {
    console.error(
      "Seed failed:"
    );

    console.error(error);
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
}

seed();