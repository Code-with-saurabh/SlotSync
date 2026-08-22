import mongoose from "mongoose";

const { Schema } = mongoose;

const bookingSchema = new Schema(
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

    counsellorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: [
        "booked",
        "attended",
        "no_show",
        "cancelled",
      ],
      default: "booked",
      index: true,
    },

    version: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

/*
 * Same student cannot have two active
 * bookings for the same slot.
 *
 * Cancelled booking does not block
 * another booking.
 */
bookingSchema.index(
  {
    studentId: 1,
    slotId: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      status: {
        $in: [
          "booked",
          "attended",
          "no_show",
        ],
      },
    },
  }
);

/*
 * Student booking queries.
 */
bookingSchema.index({
  studentId: 1,
  status: 1,
  createdAt: -1,
});

/*
 * Counsellor booking queries.
 */
bookingSchema.index({
  counsellorId: 1,
  status: 1,
  createdAt: -1,
});

/*
 * Slot booking queries.
 */
bookingSchema.index({
  slotId: 1,
  status: 1,
});

const Booking = mongoose.model(
  "Booking",
  bookingSchema
);

export default Booking;