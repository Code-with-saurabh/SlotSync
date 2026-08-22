import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(
    /^[0-9a-fA-F]{24}$/,
    "Invalid MongoDB ObjectId."
  );

export const joinWaitlistSchema = z.object({
  slotId: objectIdSchema,
});

export const waitlistIdSchema = z.object({
  id: objectIdSchema,
});

export const listWaitlistSchema = z.object({
  status: z
    .enum([
      "waiting",
      "promoted",
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