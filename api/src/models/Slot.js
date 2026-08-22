import mongoose from "mongoose";

const { Schema } = mongoose;

const slotSchema = new Schema(
  {
    counsellorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    startAt: {
      type: Date,
      required: true,
      index: true,
    },

    endAt: {
      type: Date,
      required: true,
      index: true,
    },

    capacity: {
      type: Number,
      required: true,
      min: 1,
    },

    bookedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    waitlistSequence: {
      type: Number,
      default: 0,
      min: 0,
    },

    version: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["open", "closed", "cancelled"],
      default: "open",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

slotSchema.index({
  counsellorId: 1,
  startAt: 1,
  endAt: 1,
});

slotSchema.index({
  status: 1,
  startAt: 1,
});

// slotSchema.pre("validate", async function () {
//   if (this.endAt <= this.startAt) {
//     throw new Error("Slot end time must be after start time.");
//   }

//   if (this.bookedCount > this.capacity) {
//     throw new Error(
//       "Booked count cannot exceed slot capacity."
//     );
//   }
// });

slotSchema.pre("validate", async function () {
  if (this.endAt <= this.startAt) {
    throw new Error(
      "Slot end time must be after start time."
    );
  }

  if (this.bookedCount > this.capacity) {
    throw new Error(
      "Booked count cannot exceed slot capacity."
    );
  }
});
//  slotSchema.pre("validate", function (next) {
//   if (this.endAt <= this.startAt) {
//     return next(
//       new Error("Slot end time must be after start time.")
//     );
//   }

//   if (this.bookedCount > this.capacity) {
//     return next(
//       new Error("Booked count cannot exceed slot capacity.")
//     );
//   }

//   next();
// });

const Slot = mongoose.model("Slot", slotSchema);

export default Slot;