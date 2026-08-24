import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(
    /^[0-9a-fA-F]{24}$/,
    "Invalid MongoDB ObjectId."
  );

const dateSchema = z
  .string()
  .datetime({
    offset: true,
    message:
      "Date must be a valid ISO-8601 timestamp with timezone.",
  })
  .transform((value) => new Date(value));

export const createSlotSchema = z
  .object({
    counsellorId: objectIdSchema.optional(),

    startAt: dateSchema,

    endAt: dateSchema,

    capacity: z
      .number()
      .int()
      .min(1)
      .max(100),
  })
  .refine(
    (data) => data.endAt > data.startAt,
    {
      message:
        "Slot end time must be after start time.",
      path: ["endAt"],
    }
  );

export const updateSlotSchema = z
  .object({
    startAt: dateSchema.optional(),

    endAt: dateSchema.optional(),

    capacity: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional(),

    status: z
      .enum([
        "open",
        "closed",
        "cancelled",
      ])
      .optional(),

    version: z
      .number()
      .int()
      .min(0)
      .optional(),
  })
  .refine(
    (data) =>
      Object.keys(data).length > 0,
    {
      message:
        "At least one field must be provided.",
    }
  );

export const listSlotsSchema = z.object({
  from: dateSchema.optional(),

  to: dateSchema.optional(),

  counsellorId:
    objectIdSchema.optional(),

  cursor: objectIdSchema.optional(),

  status: z
    .enum([
      "open",
      "closed",
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