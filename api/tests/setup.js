import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";

let replSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({
    replSet: {
      count: 1,
      storageEngine: "wiredTiger",
    },
  });

  const mongoUri = replSet.getUri();

  process.env.MONGO_URI = mongoUri;

  await mongoose.connect(mongoUri);
});

afterEach(async () => {
  const collections = mongoose.connection.collections;

  for (const collection of Object.values(collections)) {
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();

  if (replSet) {
    await replSet.stop();
  }
});