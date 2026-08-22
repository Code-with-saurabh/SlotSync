import request from "supertest";
import mongoose from "mongoose";
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

describe("Role & ownership authorization", () => {
  it("student hitting a counsellor-only route returns 403", async () => {
    const { token } = await makeUser("student");

    const res = await request(app)
      .patch(`/api/bookings/${new mongoose.Types.ObjectId()}/outcome`)
      .set("Authorization", `Bearer ${token}`)
      .send({ outcome: "attended" });

    expect(res.status).toBe(403);
  });

  it("counsellor marking outcome on another counsellor's slot returns 403", async () => {
    const { user: counsellorA } = await makeUser("counsellor");
    const { token: tokenB } = await makeUser("counsellor");
    const { user: student } = await makeUser("student");

    const slot = await makeSlot(counsellorA._id, {
      startAt: futureDate(-60 * 60 * 1000),
      endAt: futureDate(-30 * 60 * 1000),
    });

    const booking = await Booking.create({
      studentId: student._id,
      slotId: slot._id,
      counsellorId: counsellorA._id,
      status: "booked",
      version: 0,
    });

    const res = await request(app)
      .patch(`/api/bookings/${booking._id}/outcome`)
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ outcome: "attended" });

    expect(res.status).toBe(403);
  });
});