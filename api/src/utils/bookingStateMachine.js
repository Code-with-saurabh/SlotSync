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