import request from "supertest";
import User from "../src/models/User.js";
import Slot from "../src/models/Slot.js";
import { makeUser, makeSlot } from "./helpers.js";
import app from "../src/app.js";

afterEach(async () => {
  await User.deleteMany({});
  await Slot.deleteMany({});
});

describe("Analytics", () => {
  it("returns correct utilisation % for a known seeded fixture", async () => {
    const { user: counsellor, token } = await makeUser("counsellor");

    // 2 slots, capacity 5 each = 10 offered; 4 booked = 40% utilisation
    await makeSlot(counsellor._id, { capacity: 5, bookedCount: 3 });
    await makeSlot(counsellor._id, { capacity: 5, bookedCount: 1 });

    const res = await request(app)
      .get(`/api/analytics/counsellor/${counsellor._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.utilisationPercent).toBe(40);
  });
});