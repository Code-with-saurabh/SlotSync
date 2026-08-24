import {
  CalendarDays,
  Clock3,
  Users,
  CheckCircle2,
  ListChecks,
  XCircle,
} from "lucide-react";

/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

function formatDate(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function getSlotId(slot) {
  return slot?._id || slot?.id || null;
}

function getCounsellorName(slot) {
  return (
    slot?.counsellorId?.name ||
    slot?.counsellor?.name ||
    slot?.counsellor?.fullName ||
    slot?.counsellorName ||
    "Counsellor"
  );
}

function getSeatsLeft(slot) {
  const capacity = Number(slot?.capacity);
  const bookedCount = Number(
    slot?.bookedCount ?? slot?.booked ?? slot?.confirmedBookings ?? 0
  );

  if (!Number.isFinite(capacity)) return null;
  if (!Number.isFinite(bookedCount)) return capacity;
  return Math.max(0, capacity - bookedCount);
}

/*
 * =========================================================
 * SLOT CARD
 * =========================================================
 */

function SlotCard({
  slot,

  // BOOKING
  alreadyBooked = false,
  booking = null,
  onBook,
  onCancelBooking,
  isBooking = false,
  isCancellingBooking = false,

  // WAITLIST
  alreadyWaitlisted = false,
  waitlistEntry = null,
  onJoinWaitlist,
  onLeaveWaitlist,
  isJoiningWaitlist = false,
  isLeavingWaitlist = false,
}) {
  const slotId = getSlotId(slot);
  const seatsLeft = getSeatsLeft(slot);
  const status = slot?.status || "open";

  const isCancelled = status === "cancelled";
  const isClosed = status === "closed";
  const isFull = seatsLeft !== null && seatsLeft <= 0;

  const canBook = status === "open" && !isFull && !alreadyBooked && !alreadyWaitlisted;
  const canJoinWaitlist = status === "open" && isFull && !alreadyBooked && !alreadyWaitlisted;

  let statusLabel = "Available";
  let statusClasses = "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";

  if (alreadyBooked) {
    statusLabel = "Booked";
    statusClasses = "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
  } else if (alreadyWaitlisted) {
    statusLabel = "On Waitlist";
    statusClasses = "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
  } else if (isCancelled) {
    statusLabel = "Cancelled";
    statusClasses = "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
  } else if (isClosed) {
    statusLabel = "Closed";
    statusClasses = "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300";
  } else if (isFull) {
    statusLabel = "Full";
    statusClasses = "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  }

  const cardClasses = alreadyBooked
    ? "border-blue-200 bg-blue-50/40 dark:border-blue-800 dark:bg-blue-900/20"
    : alreadyWaitlisted
      ? "border-purple-200 bg-purple-50/40 dark:border-purple-800 dark:bg-purple-900/20"
      : isCancelled
        ? "border-red-200 bg-red-50/30 dark:border-red-800 dark:bg-red-900/20"
        : isClosed
          ? "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"
          : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800";

  return (
    <article className={`flex h-full flex-col rounded-2xl border p-5 shadow-sm transition hover:shadow-md ${cardClasses}`}>
      {/* HEADER */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">Counselling Session</p>
          <h3 className="mt-1 truncate text-lg font-bold text-slate-900 dark:text-white">{getCounsellorName(slot)}</h3>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses}`}>
          {statusLabel}
        </span>
      </div>

      {/* SLOT INFO */}
      <div className="mt-5 space-y-3">
        <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
          <CalendarDays size={17} className="shrink-0 text-slate-400" />
          <span>{formatDate(slot?.startAt)}</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
          <Clock3 size={17} className="shrink-0 text-slate-400" />
          <span>{formatTime(slot?.startAt)}{" - "}{formatTime(slot?.endAt)}</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
          <Users size={17} className="shrink-0 text-slate-400" />
          <span>
            {seatsLeft === null
              ? "Seats information unavailable"
              : seatsLeft === 0
                ? "No seats left"
                : `${seatsLeft} seat${seatsLeft === 1 ? "" : "s"} left`}
          </span>
        </div>
      </div>

      {/* ACTION AREA */}
      <div className="mt-auto pt-6">

        {alreadyBooked && (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 rounded-lg bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              <CheckCircle2 size={17} />
              You have already booked this slot
            </div>
            <button
              type="button"
              onClick={() => onCancelBooking?.(booking)}
              disabled={isCancellingBooking}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
            >
              <XCircle size={17} />
              {isCancellingBooking ? "Cancelling..." : "Cancel Booking"}
            </button>
          </div>
        )}

        {!alreadyBooked && alreadyWaitlisted && (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 rounded-lg bg-purple-50 px-4 py-3 text-sm font-semibold text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
              <ListChecks size={17} />
              You are on the waitlist
            </div>
            <button
              type="button"
              onClick={() => onLeaveWaitlist?.(waitlistEntry)}
              disabled={isLeavingWaitlist}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
            >
              <XCircle size={17} />
              {isLeavingWaitlist ? "Leaving..." : "Leave Waitlist"}
            </button>
          </div>
        )}

        {!alreadyBooked && !alreadyWaitlisted && isCancelled && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-center text-sm font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-300">
            Slot cancelled
          </div>
        )}

        {!alreadyBooked && !alreadyWaitlisted && !isCancelled && isClosed && (
          <div className="rounded-lg bg-slate-100 px-4 py-3 text-center text-sm font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
            Slot closed
          </div>
        )}

        {!alreadyBooked && !alreadyWaitlisted && canJoinWaitlist && (
          <button
            type="button"
            onClick={() => onJoinWaitlist?.(slot)}
            disabled={isJoiningWaitlist}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-4 py-3 text-sm font-semibold text-purple-700 transition hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-purple-800 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50"
          >
            <ListChecks size={17} />
            {isJoiningWaitlist ? "Joining..." : "Join Waitlist"}
          </button>
        )}

        {!alreadyBooked && !alreadyWaitlisted && canBook && (
          <button
            type="button"
            onClick={() => onBook?.(slot)}
            disabled={isBooking}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isBooking ? "Booking..." : "Book Slot"}
          </button>
        )}
      </div>
    </article>
  );
}

export default SlotCard;
