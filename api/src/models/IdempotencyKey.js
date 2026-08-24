import mongoose from "mongoose";

const { Schema } = mongoose;

const idempotencyKeySchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    request: {
      type: Schema.Types.Mixed,
      required: true,
    },
    response: {
      type: Schema.Types.Mixed,
      default: null,
    },
    statusCode: {
      type: Number,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
  },
  {
    timestamps: true,
  }
);

const IdempotencyKey = mongoose.model(
  "IdempotencyKey",
  idempotencyKeySchema
);

export default IdempotencyKey;
