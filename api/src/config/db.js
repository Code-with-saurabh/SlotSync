import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDatabase() {
  try {
   const conn =  await mongoose.connect(env.mongoUri);

    console.log("MongoDB connected successfully",conn.connection.host);
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    throw error;
  }
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
  console.log("MongoDB disconnected");
}