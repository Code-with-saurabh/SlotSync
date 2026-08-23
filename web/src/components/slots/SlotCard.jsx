function SlotCard({
  slot,
  onBook,
  onJoinWaitlist,
  isBooking,
  isJoiningWaitlist,
}) {
  const seatsLeft =
    Math.max(
      0,
      (slot.capacity ?? 0) -
        (slot.bookedCount ?? 0)
    );

  const isFull =
    seatsLeft <= 0 ||
    slot.status !== "open";

  const startAt = new Date(
    slot.startAt
  );

  const endAt = new Date(
    slot.endAt
  );

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            {startAt.toLocaleDateString(
              "en-IN",
              {
                day: "2-digit",
                month: "short",
                year: "numeric",
              }
            )}
          </h3>

          <p className="mt-1 text-sm text-slate-600">
            {startAt.toLocaleTimeString(
              "en-IN",
              {
                hour: "2-digit",
                minute: "2-digit",
              }
            )}
            {" - "}
            {endAt.toLocaleTimeString(
              "en-IN",
              {
                hour: "2-digit",
                minute: "2-digit",
              }
            )}
          </p>

          {slot.counsellorId && (
            <p className="mt-2 text-sm text-slate-500">
              Counsellor:{" "}
              <span className="font-medium text-slate-700">
                {slot.counsellorId.name ||
                  "Counsellor"}
              </span>
            </p>
          )}
        </div>

        <div className="flex flex-col items-start gap-3 sm:items-end">
          <span
            className={`rounded-full px-3 py-1 text-sm font-semibold ${
              seatsLeft > 0
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {seatsLeft > 0
              ? `${seatsLeft} seat${
                  seatsLeft === 1
                    ? ""
                    : "s"
                } left`
              : "Full"}
          </span>

          <div className="flex flex-wrap gap-2">
            {!isFull && (
              <button
                type="button"
                onClick={() => onBook(slot)}
                disabled={isBooking}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isBooking
                  ? "Booking..."
                  : "Book"}
              </button>
            )}

            {isFull && (
              <button
                type="button"
                onClick={() =>
                  onJoinWaitlist(slot)
                }
                disabled={isJoiningWaitlist}
                className="rounded-lg border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isJoiningWaitlist
                  ? "Joining..."
                  : "Join Waitlist"}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export default SlotCard;