import mongoose from "mongoose";
import dotenv from "dotenv";

import User from "../src/models/User.js";
import Slot from "../src/models/Slot.js";
import Booking from "../src/models/Booking.js";
import WaitlistEntry from "../src/models/WaitlistEntry.js";
import AuditLog from "../src/models/AuditLog.js";
import { hashPassword } from "../src/utils/password.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/slotsync";

const COUNSELLOR_COUNT = 5;
const STUDENT_COUNT = 200;
const SLOT_COUNT = 300;
const TARGET_BOOKINGS = 5000;
const TARGET_WAITLIST = 800;

const ACTIVE_STATUSES = ["booked", "attended", "no_show"];

/* ---------- utils ---------- */

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Random day offset in [-14, +14], excluding 0 bunching too hard
function randomSlotWindow() {
  const dayOffset = randInt(-14, 14);
  const hour = randInt(8, 17); // working hours
  const start = new Date();
  start.setDate(start.getDate() + dayOffset);
  start.setHours(hour, 0, 0, 0);
  const end = new Date(start.getTime() + 60 * 60 * 1000); // 1-hour slots
  return { start, end };
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart;
}

/* ---------- main ---------- */

async function seed() {
  console.log("Connecting to", MONGO_URI);
  await mongoose.connect(MONGO_URI);

  console.log("Clearing existing data...");
  await Promise.all([
    User.deleteMany({}),
    Slot.deleteMany({}),
    Booking.deleteMany({}),
    WaitlistEntry.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);

  const passwordHash = await hashPassword("Password123!");

  /* ---------- Admin ---------- */
  console.log("Creating admin...");
  const admin = await User.create({
    name: "Admin User",
    email: "admin@slotsync.test",
    password: passwordHash,
    role: "admin",
    isActive: true,
  });

  /* ---------- Counsellors ---------- */
  console.log(`Creating ${COUNSELLOR_COUNT} counsellors...`);
  const counsellors = [];
  for (let i = 0; i < COUNSELLOR_COUNT; i++) {
    const c = await User.create({
      name: `Counsellor ${i + 1}`,
      email: `counsellor${i + 1}@slotsync.test`,
      password: passwordHash,
      role: "counsellor",
      isActive: true,
    });
    counsellors.push(c);
  }

  /* ---------- Students ---------- */
  console.log(`Creating ${STUDENT_COUNT} students...`);
  const students = [];
  const studentDocs = [];
  for (let i = 0; i < STUDENT_COUNT; i++) {
    studentDocs.push({
      name: `Student ${i + 1}`,
      email: `student${i + 1}@slotsync.test`,
      password: passwordHash,
      role: "student",
      isActive: true,
    });
  }
  const insertedStudents = await User.insertMany(studentDocs);
  students.push(...insertedStudents);

  /* ---------- Slots ---------- */
  console.log(`Creating ${SLOT_COUNT} slots...`);
  const slots = [];
  for (let i = 0; i < SLOT_COUNT; i++) {
    const counsellor = pick(counsellors);
    const { start, end } = randomSlotWindow();
    const capacity = randInt(3, 10);

    slots.push({
      counsellorId: counsellor._id,
      startAt: start,
      endAt: end,
      capacity,
      bookedCount: 0,
      status: "open",
      version: 0,
    });
  }
  const insertedSlots = await Slot.insertMany(slots);

  /*
   * ---------- Bookings + Waitlist ----------
   *
   * Done in JS here (not via the transactional service layer)
   * because seeding needs bulk speed, not per-request atomicity —
   * there's no real concurrency during a single-process seed run.
   * We still enforce the *rules* (capacity, no duplicate/overlap)
   * in-memory so the resulting data is realistic and won't break
   * your analytics or break assumptions your tests rely on.
   */
  console.log("Generating bookings and waitlist entries...");

  // Track each student's active booking windows to avoid overlap/dupe
  const studentBookedWindows = new Map(); // studentId -> [{start, end, slotId}]
  const slotBookedCounts = new Map(); // slotId -> current bookedCount
  insertedSlots.forEach((s) => slotBookedCounts.set(s._id.toString(), 0));

  const bookingDocs = [];
  const waitlistDocs = [];
  const auditDocs = [];

  let bookingsCreated = 0;
  let waitlistCreated = 0;

  // Shuffle slots so bookings aren't front-loaded onto early slots
  const slotPool = shuffle(insertedSlots);

  let attempts = 0;
  const MAX_ATTEMPTS = (TARGET_BOOKINGS + TARGET_WAITLIST) * 5;

  while (
    (bookingsCreated < TARGET_BOOKINGS || waitlistCreated < TARGET_WAITLIST) &&
    attempts < MAX_ATTEMPTS
  ) {
    attempts++;

    const slot = pick(slotPool);
    const slotIdStr = slot._id.toString();
    const student = pick(students);
    const studentIdStr = student._id.toString();

    const existingWindows = studentBookedWindows.get(studentIdStr) || [];

    // Skip if student already has active booking on this exact slot
    const alreadyOnThisSlot = existingWindows.some((w) => w.slotId === slotIdStr);
    if (alreadyOnThisSlot) continue;

    const currentBooked = slotBookedCounts.get(slotIdStr);
    const isFull = currentBooked >= slot.capacity;

    if (!isFull && bookingsCreated < TARGET_BOOKINGS) {
      // Check overlap against student's other active bookings
      const hasOverlap = existingWindows.some((w) =>
        overlaps(w.start, w.end, slot.startAt, slot.endAt)
      );
      if (hasOverlap) continue;

      // Random status distribution: mostly booked, some attended/no_show/cancelled
      const roll = Math.random();
      let status = "booked";
      if (slot.startAt < new Date()) {
        // only past slots can have attended/no_show
        if (roll < 0.7) status = "attended";
        else if (roll < 0.85) status = "no_show";
        else if (roll < 0.95) status = "booked";
        else status = "cancelled";
      } else if (roll < 0.1) {
        status = "cancelled";
      }

      const createdAt = new Date(
        slot.startAt.getTime() - randInt(30, 20000) * 60 * 1000
      );

      bookingDocs.push({
        studentId: student._id,
        slotId: slot._id,
        counsellorId: slot.counsellorId,
        status,
        version: 0,
        createdAt,
      });

      if (ACTIVE_STATUSES.includes(status)) {
        slotBookedCounts.set(slotIdStr, currentBooked + 1);
        existingWindows.push({
          start: slot.startAt,
          end: slot.endAt,
          slotId: slotIdStr,
        });
        studentBookedWindows.set(studentIdStr, existingWindows);
      }

      bookingsCreated++;
    } else if (isFull && waitlistCreated < TARGET_WAITLIST) {
      waitlistDocs.push({
        studentId: student._id,
        slotId: slot._id,
        status: "waiting",
        position: randInt(1, 20), // relative FIFO order per slot; fine for seed data
        createdAt: new Date(),
      });
      waitlistCreated++;
    }
  }

  console.log(`Inserting ${bookingDocs.length} bookings...`);
  const insertedBookings = await Booking.insertMany(bookingDocs);

  console.log(`Inserting ${waitlistDocs.length} waitlist entries...`);
  await WaitlistEntry.insertMany(waitlistDocs);

  // Sync each slot's bookedCount to match reality
  console.log("Syncing slot bookedCount...");
  const bulkOps = insertedSlots.map((slot) => ({
    updateOne: {
      filter: { _id: slot._id },
      update: { $set: { bookedCount: slotBookedCounts.get(slot._id.toString()) } },
    },
  }));
  await Slot.bulkWrite(bulkOps);

  // A handful of audit log entries for cancellations, so AuditLog isn't empty
  const cancelledBookings = insertedBookings.filter((b) => b.status === "cancelled");
  cancelledBookings.slice(0, 50).forEach((b) => {
    auditDocs.push({
      actorId: b.studentId,
      action: "BOOKING_CANCELLED",
      entityType: "Booking",
      entityId: b._id,
      metadata: {
        bookingId: b._id.toString(),
        slotId: b.slotId.toString(),
        previousStatus: "booked",
        newStatus: "cancelled",
      },
    });
  });
  if (auditDocs.length) {
    await AuditLog.insertMany(auditDocs);
  }

  console.log("\n✅ Seed complete:");
  console.log(`  Admin: 1`);
  console.log(`  Counsellors: ${counsellors.length}`);
  console.log(`  Students: ${students.length}`);
  console.log(`  Slots: ${insertedSlots.length}`);
  console.log(`  Bookings: ${insertedBookings.length}`);
  console.log(`  Waitlist entries: ${waitlistDocs.length}`);
  console.log(`  Audit logs: ${auditDocs.length}`);

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});