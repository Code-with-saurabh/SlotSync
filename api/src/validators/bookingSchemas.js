import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(
    /^[0-9a-fA-F]{24}$/,
    "Invalid MongoDB ObjectId."
  );

export const createBookingSchema =
  z.object({
    slotId: objectIdSchema,
  });

export const bookingIdSchema =
  z.object({
    id: objectIdSchema,
  });

export const listBookingSchema =
  z.object({
    status: z
      .enum([
        "booked",
        "attended",
        "no_show",
        "cancelled",
      ])
      .optional(),

    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .default(20),
  });