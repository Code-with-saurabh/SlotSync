import mongoose from "mongoose";

const { Schema } = mongoose;

const waitlistEntrySchema = new Schema(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    slotId: {
      type: Schema.Types.ObjectId,
      ref: "Slot",
      required: true,
      index: true,
    },

    position: {
      type: Number,
      required: true,
      min: 1,
    },

    status: {
      type: String,
      enum: [
        "waiting",
        "promoted",
        "cancelled",
      ],
      default: "waiting",
      index: true,
    },

    promotedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/*
 * One student can have only one waitlist
 * entry for the same slot.
 */
waitlistEntrySchema.index(
  {
    studentId: 1,
    slotId: 1,
  },
  {
    unique: true,

    partialFilterExpression: {
      status: "waiting",
    },
  }
);
/*
 * FIFO queue lookup.
 */
waitlistEntrySchema.index({
  slotId: 1,
  status: 1,
  position: 1,
  createdAt: 1,
});

/*
 * Useful for student waitlist queries.
 */
waitlistEntrySchema.index({
  studentId: 1,
  status: 1,
  createdAt: -1,
});

const WaitlistEntry = mongoose.model(
  "WaitlistEntry",
  waitlistEntrySchema
);

export default WaitlistEntry;