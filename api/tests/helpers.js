import mongoose from "mongoose";
import User from "../src/models/User.js";
import Slot from "../src/models/Slot.js";
import { hashPassword } from "../src/utils/password.js";
import { createAccessToken } from "../src/utils/jwt.js";

export async function makeUser(role, overrides = {}) {
  const user = await User.create({
    name: `${role} user`,
    email: `${role}-${Date.now()}-${Math.random()}@test.com`,
  passwordHash: await hashPassword("Password123!"), 
    role,
    isActive: true,
    ...overrides,
  });
  const token = createAccessToken(user);
  return { user, token };
}

export function futureDate(msFromNow) {
  return new Date(Date.now() + msFromNow);
}

export async function makeSlot(counsellorId, overrides = {}) {
  return Slot.create({
    counsellorId,
    startAt: futureDate(24 * 60 * 60 * 1000),
    endAt: futureDate(24 * 60 * 60 * 1000 + 60 * 60 * 1000),
    capacity: 5,
    bookedCount: 0,
    status: "open",
    version: 0,
    ...overrides,
  });
}