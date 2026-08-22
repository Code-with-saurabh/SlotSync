import mongoose from "mongoose";
import AuditLog from "../src/models/AuditLog.js";

describe("AuditLog — append-only enforcement", () => {
  let entry;

  beforeEach(async () => {
    entry = await AuditLog.create({
      actorId: new mongoose.Types.ObjectId(),
      action: "BOOKING_CANCELLED",
      entityType: "Booking",
      entityId: new mongoose.Types.ObjectId(),
      metadata: {},
    });
  });

  it("rejects updateOne", async () => {
    await expect(
      AuditLog.updateOne({ _id: entry._id }, { $set: { action: "HACKED" } })
    ).rejects.toThrow(/append-only/i);
  });

  it("rejects findOneAndUpdate", async () => {
    await expect(
      AuditLog.findOneAndUpdate({ _id: entry._id }, { $set: { action: "HACKED" } })
    ).rejects.toThrow(/append-only/i);
  });

  it("rejects deleteOne (query form)", async () => {
    await expect(
      AuditLog.deleteOne({ _id: entry._id })
    ).rejects.toThrow(/append-only/i);
  });

  it("rejects findOneAndDelete", async () => {
    await expect(
      AuditLog.findOneAndDelete({ _id: entry._id })
    ).rejects.toThrow(/append-only/i);
  });

  it("rejects re-saving an existing document", async () => {
    entry.action = "HACKED";
    await expect(entry.save()).rejects.toThrow(/append-only/i);
  });

  it("still allows initial creation", async () => {
    const fresh = await AuditLog.create({
      actorId: new mongoose.Types.ObjectId(),
      action: "BOOKING_CANCELLED",
      entityType: "Booking",
      entityId: new mongoose.Types.ObjectId(),
      metadata: {},
    });
    expect(fresh._id).toBeDefined();
  });
});