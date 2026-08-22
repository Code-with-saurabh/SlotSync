import mongoose from "mongoose";

import { env } from "../src/config/env.js";
import User from "../src/models/User.js";
import Slot from "../src/models/Slot.js";
import Booking from "../src/models/Booking.js";
import WaitlistEntry from "../src/models/WaitlistEntry.js";
import AuditLog from "../src/models/AuditLog.js";

async function main() {
  await mongoose.connect(env.mongoUri);

  const models = [
    User,
    Slot,
    Booking,
    WaitlistEntry,
    AuditLog,
  ];

  for (const model of models) {
    console.log(`\n=== ${model.modelName} ===`);

    const indexes = await model.collection.indexes();

    for (const index of indexes) {
      console.log(index);
    }
  }

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);

  await mongoose.disconnect();

  process.exit(1);
});