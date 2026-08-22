import { AppError } from "./AppError.js";

const CANCELLABLE_BOOKING_STATUSES = [
  "booked",
];

export function assertBookingCanBeCancelled(
  currentStatus
) {
  if (
    !CANCELLABLE_BOOKING_STATUSES.includes(
      currentStatus
    )
  ) {
    throw new AppError(
      `Booking cannot be cancelled from status "${currentStatus}".`,
      409,
      "BOOKING_NOT_CANCELLABLE"
    );
  }
}

export function isBookingCancellable(
  currentStatus
) {
  return CANCELLABLE_BOOKING_STATUSES.includes(
    currentStatus
  );
}


const CANCELLATION_CUTOFF_MINUTES = 120;

/**
 * Cancellation is only allowed when the slot starts at least
 * CANCELLATION_CUTOFF_MINUTES from now. Computed from server
 * time only — never trust a client-sent "now".
 */
export function assertCancellationWithinWindow(slotStartAt) {
  const now = new Date();

  const cutoff = new Date(
    now.getTime() + CANCELLATION_CUTOFF_MINUTES * 60 * 1000
  );

  if (slotStartAt < cutoff) {
    throw new AppError(
      "Bookings can only be cancelled at least 2 hours before the slot starts.",
      422,
      "CANCELLATION_WINDOW_CLOSED"
    );
  }
}


const VALID_OUTCOMES = ["attended", "no_show"];

/**
 * Outcome transitions are only legal from "booked".
 * Any other current status, or any outcome value outside
 * VALID_OUTCOMES, is rejected with 422.
 *
 * Centralised here so it's enforced in exactly one place —
 * not duplicated across controllers/services.
 */
export function assertValidOutcomeTransition(currentStatus, outcome) {
  if (!VALID_OUTCOMES.includes(outcome)) {
    throw new AppError(
      `"${outcome}" is not a valid booking outcome.`,
      422,
      "INVALID_OUTCOME"
    );
  }

  if (currentStatus !== "booked") {
    throw new AppError(
      `Cannot set outcome on a booking with status "${currentStatus}".`,
      422,
      "ILLEGAL_STATUS_TRANSITION"
    );
  }
}