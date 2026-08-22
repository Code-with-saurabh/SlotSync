import mongoose from "mongoose";
import Slot from "../models/Slot.js";
import { AppError } from "../utils/AppError.js";

// Must match ACTIVE_BOOKING_STATUSES in bookingService.js
const CONFIRMED_STATUSES = ["booked", "attended", "no_show"];

function assertObjectId(value, fieldName) {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new AppError(`Invalid ${fieldName}.`, 422, "VALIDATION_ERROR");
  }
}

/*
 * Authorization: admin can view any counsellor; a counsellor
 * can only view their own analytics. Checked once, before the
 * pipeline runs — never inside the query itself.
 */
function assertCanViewAnalytics(actor, counsellorId) {
  if (actor.role === "admin") return;

  if (
    actor.role === "counsellor" &&
    actor.id.toString() === counsellorId.toString()
  ) {
    return;
  }

  throw new AppError(
    "You are not authorized to view this counsellor's analytics.",
    403,
    "FORBIDDEN"
  );
}

export async function getCounsellorAnalytics({ actor, counsellorId }) {
  assertObjectId(counsellorId, "counsellor ID");
  assertCanViewAnalytics(actor, counsellorId);

  const counsellorObjectId = new mongoose.Types.ObjectId(counsellorId);

  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [result] = await Slot.aggregate([
    // Base: this counsellor's slots only. Backed by an index
    // on { counsellorId: 1 } — cheap entry point for everything below.
    { $match: { counsellorId: counsellorObjectId } },

    // Bring in every booking for each slot. One $lookup, reused
    // by every $facet branch below — no repeated joins.
    {
      $lookup: {
        from: "bookings",
        localField: "_id",
        foreignField: "slotId",
        as: "bookings",
      },
    },

    {
      $facet: {
        /* ---- total slots ---- */
        totalSlots: [{ $count: "count" }],

        /* ---- capacity / utilisation ---- */
        capacity: [
          {
            $group: {
              _id: null,
              offeredSeats: { $sum: "$capacity" },
              bookedSeats: { $sum: "$bookedCount" },
            },
          },
        ],

        /* ---- booking-level stats: confirmed / no-show / cancelled / lead time ---- */
        bookingStats: [
          { $unwind: "$bookings" },
          {
            $addFields: {
              leadMinutes: {
                $divide: [
                  { $subtract: ["$startAt", "$bookings.createdAt"] },
                  60000,
                ],
              },
            },
          },
          {
            $group: {
              _id: null,
              totalBookings: { $sum: 1 },
              confirmedBookings: {
                $sum: {
                  $cond: [{ $in: ["$bookings.status", CONFIRMED_STATUSES] }, 1, 0],
                },
              },
              noShowBookings: {
                $sum: { $cond: [{ $eq: ["$bookings.status", "no_show"] }, 1, 0] },
              },
              cancelledBookings: {
                $sum: { $cond: [{ $eq: ["$bookings.status", "cancelled"] }, 1, 0] },
              },
              avgLeadMinutes: {
                $avg: {
                  $cond: [
                    { $in: ["$bookings.status", CONFIRMED_STATUSES] },
                    "$leadMinutes",
                    null,
                  ],
                },
              },
            },
          },
        ],

        /* ---- lead-time buckets (confirmed bookings only) ---- */
        leadBuckets: [
          { $unwind: "$bookings" },
          { $match: { "bookings.status": { $in: CONFIRMED_STATUSES } } },
          {
            $addFields: {
              leadMinutes: {
                $divide: [
                  { $subtract: ["$startAt", "$bookings.createdAt"] },
                  60000,
                ],
              },
            },
          },
          {
            $bucket: {
              groupBy: "$leadMinutes",
              boundaries: [0, 60, 240, 1440, Infinity],
              default: "unbucketed",
              output: { count: { $sum: 1 } },
            },
          },
        ],

        /* ---- busiest 5 slots by confirmed bookings ---- */
        busiestSlots: [
          { $unwind: "$bookings" },
          { $match: { "bookings.status": { $in: CONFIRMED_STATUSES } } },
          {
            $group: {
              _id: "$_id",
              startAt: { $first: "$startAt" },
              confirmedCount: { $sum: 1 },
            },
          },
          { $sort: { confirmedCount: -1 } },
          { $limit: 5 },
        ],

        /* ---- last 14 days, bucketed by IST calendar day ---- */
        dailySeries: [
          { $unwind: "$bookings" },
          { $match: { "bookings.createdAt": { $gte: fourteenDaysAgo } } },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$bookings.createdAt",
                  timezone: "Asia/Kolkata",
                },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ],
      },
    },
  ]);

  const totalSlots = result.totalSlots[0]?.count ?? 0;
  const { offeredSeats = 0, bookedSeats = 0 } = result.capacity[0] ?? {};
  const {
    totalBookings = 0,
    confirmedBookings = 0,
    noShowBookings = 0,
    cancelledBookings = 0,
    avgLeadMinutes = 0,
  } = result.bookingStats[0] ?? {};

  const pct = (num, den) => (den > 0 ? Number(((num / den) * 100).toFixed(2)) : 0);

  return {
    totalSlots,
    totalConfirmedBookings: confirmedBookings,
    utilisationPercent: pct(bookedSeats, offeredSeats),
    noShowPercent: pct(noShowBookings, confirmedBookings),
    cancellationPercent: pct(cancelledBookings, totalBookings),
    averageLeadTimeMinutes: Math.round(avgLeadMinutes),
    leadTimeBuckets: result.leadBuckets,
    busiestSlots: result.busiestSlots,
    dailySeriesIST: result.dailySeries,
  };
}