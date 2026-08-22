import request from "supertest";
import app from "../src/app.js";
import User from "../src/models/User.js";
import Slot from "../src/models/Slot.js";
import Booking from "../src/models/Booking.js";
import WaitlistEntry from "../src/models/WaitlistEntry.js";
import { makeUser, makeSlot, futureDate } from "./helpers.js";

afterEach(async () => {
  await User.deleteMany({});
  await Slot.deleteMany({});
  await Booking.deleteMany({});
  await WaitlistEntry.deleteMany({});
});

describe("Waitlist promotion", () => {
  it("cancel outside cutoff promotes the earliest waitlist entry exactly once", async () => {
    const { user: counsellor } = await makeUser("counsellor");
    const { user: bookedStudent, token: bookedToken } = await makeUser("student");
    const { user: waitingStudent } = await makeUser("student");

    const slot = await makeSlot(counsellor._id, {
      startAt: futureDate(24 * 60 * 60 * 1000),
      endAt: futureDate(25 * 60 * 60 * 1000),
      capacity: 1,
      bookedCount: 1,
    });

    const booking = await Booking.create({
      studentId: bookedStudent._id,
      slotId: slot._id,
      counsellorId: counsellor._id,
      status: "booked",
      version: 0,
    });

    await WaitlistEntry.create({
      studentId: waitingStudent._id,
      slotId: slot._id,
      status: "waiting",
      position: 1,
    });

    const res = await request(app)
      .delete(`/api/bookings/${booking._id}`)
      .set("Authorization", `Bearer ${bookedToken}`);

    expect(res.status).toBe(200);

    const promotedBooking = await Booking.findOne({
      studentId: waitingStudent._id,
      slotId: slot._id,
      status: "booked",
    });
    expect(promotedBooking).not.toBeNull();

    const entry = await WaitlistEntry.findOne({ studentId: waitingStudent._id });
    expect(entry.status).toBe("promoted");

    const finalSlot = await Slot.findById(slot._id);
    expect(finalSlot.bookedCount).toBe(1);
  });
});