import User from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { hashPassword } from "../utils/password.js";

/*
 * Get all counsellors.
 *
 * Admin only.
 */
export async function listCounsellors({
    search,
    status,
}) {
    const filter = {
        role: "counsellor",
    };

    if (status === "active") {
        filter.isActive = true;
    }

    if (status === "inactive") {
        filter.isActive = false;
    }

    if (search?.trim()) {
        const keyword = search.trim();

        filter.$or = [
            {
                name: {
                    $regex: keyword,
                    $options: "i",
                },
            },
            {
                email: {
                    $regex: keyword,
                    $options: "i",
                },
            },
        ];
    }

    return User.find(filter)
        .select("_id name email role isActive createdAt updatedAt")
        .sort({
            name: 1,
            _id: 1,
        })
        .lean();
}


/*
 * Create a counsellor account.
 *
 * Password is created by Admin.
 * The account becomes active by default.
 */
export async function createCounsellor({
    name,
    email,
    password,
}) {
    const normalizedEmail =
        email.trim().toLowerCase();

    const existingUser =
        await User.findOne({
            email: normalizedEmail,
        }).select("_id");

    if (existingUser) {
        throw new AppError(
            "An account with this email already exists.",
            409,
            "DUPLICATE_RESOURCE"
        );
    }

    const passwordHash =
        await hashPassword(password);

    const counsellor =
        await User.create({
            name: name.trim(),
            email: normalizedEmail,
            passwordHash,
            role: "counsellor",
            isActive: true,
        });

    return {
        id: counsellor._id,
        name: counsellor.name,
        email: counsellor.email,
        role: counsellor.role,
        isActive: counsellor.isActive,
        createdAt: counsellor.createdAt,
        updatedAt: counsellor.updatedAt,
    };
}


/*
 * Update counsellor profile.
 *
 * For now:
 * - name
 * - email
 *
 * Password management will be handled separately.
 */
export async function updateCounsellor({
    counsellorId,
    name,
    email,
}) {
    const counsellor =
        await User.findOne({
            _id: counsellorId,
            role: "counsellor",
        });

    if (!counsellor) {
        throw new AppError(
            "Counsellor not found.",
            404,
            "RESOURCE_NOT_FOUND"
        );
    }

    if (name !== undefined) {
        counsellor.name = name.trim();
    }

    if (email !== undefined) {
        const normalizedEmail =
            email.trim().toLowerCase();

        const existingUser =
            await User.findOne({
                email: normalizedEmail,
                _id: {
                    $ne: counsellorId,
                },
            }).select("_id");

        if (existingUser) {
            throw new AppError(
                "An account with this email already exists.",
                409,
                "DUPLICATE_RESOURCE"
            );
        }

        counsellor.email =
            normalizedEmail;
    }

    await counsellor.save();

    return {
        id: counsellor._id,
        name: counsellor.name,
        email: counsellor.email,
        role: counsellor.role,
        isActive: counsellor.isActive,
        createdAt: counsellor.createdAt,
        updatedAt: counsellor.updatedAt,
    };
}


/*
 * Activate / deactivate counsellor.
 */
export async function setCounsellorStatus({
    counsellorId,
    isActive,
}) {
    const counsellor =
        await User.findOne({
            _id: counsellorId,
            role: "counsellor",
        });

    if (!counsellor) {
        throw new AppError(
            "Counsellor not found.",
            404,
            "RESOURCE_NOT_FOUND"
        );
    }

    counsellor.isActive = isActive;

    await counsellor.save();

    return {
        id: counsellor._id,
        name: counsellor.name,
        email: counsellor.email,
        role: counsellor.role,
        isActive: counsellor.isActive,
        createdAt: counsellor.createdAt,
        updatedAt: counsellor.updatedAt,
    };
}