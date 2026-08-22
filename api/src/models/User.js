import mongoose from "mongoose";

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    role: {
      type: String,
      enum: [
        "student",
        "counsellor",
        "admin",
      ],
      required: true,
      default: "student",
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    refreshTokenVersion: {
      type: Number,
      default: 0,
    },

    refreshTokenHash: {
      type: String,
      select: false,
      default: null,
    },
    bookingLockVersion: {
  type: Number,
  default: 0,
},
  },
  {
    timestamps: true,
  }
);

userSchema.index({
  role: 1,
  isActive: 1,
});

const User = mongoose.model(
  "User",
  userSchema
);

export default User;