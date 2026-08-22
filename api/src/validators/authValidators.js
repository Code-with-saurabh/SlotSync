import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must contain at least 8 characters.")
  .max(128, "Password cannot exceed 128 characters.");

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2)
    .max(100),

  email: z
    .string()
    .trim()
    .email()
    .transform((value) =>
      value.toLowerCase()
    ),

  password: passwordSchema,

  role: z
    .enum([
      "student",
      "counsellor",
      "admin",
    ])
    .optional(),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .transform((value) =>
      value.toLowerCase()
    ),

  password: passwordSchema,
});