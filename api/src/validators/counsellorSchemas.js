import { z } from "zod";

const objectIdSchema = z
    .string()
    .regex(
        /^[0-9a-fA-F]{24}$/,
        "Invalid counsellor ID."
    );

const nameSchema = z
    .string()
    .trim()
    .min(
        2,
        "Name must contain at least 2 characters."
    )
    .max(
        100,
        "Name cannot exceed 100 characters."
    );

const emailSchema = z
    .string()
    .trim()
    .email(
        "Please provide a valid email address."
    )
    .transform((value) =>
        value.toLowerCase()
    );

const passwordSchema = z
    .string()
    .min(
        8,
        "Password must contain at least 8 characters."
    )
    .max(
        128,
        "Password cannot exceed 128 characters."
    );


export const createCounsellorSchema =
    z.object({
        name: nameSchema,

        email: emailSchema,

        password: passwordSchema,
    });


export const updateCounsellorSchema =
    z.object({
        name: nameSchema.optional(),

        email: emailSchema.optional(),
    })
        .refine(
            (data) =>
                Object.keys(data).length > 0,
            {
                message:
                    "At least one field must be provided.",
            }
        );


export const counsellorIdSchema =
    z.object({
        id: objectIdSchema,
    });


export const counsellorStatusSchema =
    z.object({
        isActive: z.boolean(),
    });


export const listCounsellorsSchema =
    z.object({
        search: z
            .string()
            .trim()
            .max(100)
            .optional(),

        status: z
            .enum([
                "active",
                "inactive",
                "all",
            ])
            .default("all"),
    });