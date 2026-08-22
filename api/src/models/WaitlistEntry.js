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

waitlistEntrySchema.index(
  {
    studentId: 1,
    slotId: 1,
  },
  {
    unique: true,
  }
);

waitlistEntrySchema.index({
  slotId: 1,
  status: 1,
  createdAt: 1,
});

const WaitlistEntry = mongoose.model(
  "WaitlistEntry",
  waitlistEntrySchema
);

export default WaitlistEntry;