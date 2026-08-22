import { z } from "zod";

export const auditListSchema = z.object({
  entity: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .optional(),

  id: z
    .string()
    .regex(
      /^[0-9a-fA-F]{24}$/,
      "Invalid entity id."
    )
    .optional(),

  page: z.coerce
    .number()
    .int()
    .min(1)
    .default(1),

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20),
});