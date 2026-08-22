import request from "supertest";
import app from "../src/app.js";
import User from "../src/models/User.js";
import Slot from "../src/models/Slot.js";
import Booking from "../src/models/Booking.js";
import { makeUser, makeSlot, futureDate } from "./helpers.js";

afterEach(async () => {
  await User.deleteMany({});
  await Slot.deleteMany({});
  await Booking.deleteMany({});
});

describe("Cancellation rules", () => {
  it("cancel inside the 2-hour cutoff returns 422", async () => {
    const { user: counsellor } = await makeUser("counsellor");
    const { user: student, token } = await makeUser("student");

    const slot = await makeSlot(counsellor._id, {
      startAt: futureDate(60 * 60 * 1000), // 1hr away — inside cutoff
      endAt: futureDate(120 * 60 * 1000),
      bookedCount: 1,
    });

    const booking = await Booking.create({
      studentId: student._id,
      slotId: slot._id,
      counsellorId: counsellor._id,
      status: "booked",
      version: 0,
    });

    const res = await request(app)
      .delete(`/api/bookings/${booking._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(422);
  });

  it("illegal status transition returns 422", async () => {
    const { user: counsellor, token } = await makeUser("counsellor");
    const { user: student } = await makeUser("student");

    const slot = await makeSlot(counsellor._id, {
      startAt: futureDate(-60 * 60 * 1000),
      endAt: futureDate(-30 * 60 * 1000),
    });

    const booking = await Booking.create({
      studentId: student._id,
      slotId: slot._id,
      counsellorId: counsellor._id,
      status: "cancelled", // already terminal
      version: 0,
    });

    const res = await request(app)
      .patch(`/api/bookings/${booking._id}/outcome`)
      .set("Authorization", `Bearer ${token}`)
      .send({ outcome: "attended" });

    expect(res.status).toBe(422);
  });
});