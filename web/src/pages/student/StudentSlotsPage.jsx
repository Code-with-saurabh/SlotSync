import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Clock3,
  LogOut,
  RefreshCw,
  UserRound,
  Users,
  X,
  CheckCircle2,
  ListChecks,
} from "lucide-react";

import {
  // useGetSlotsQuery,
  useGetMyBookingsQuery,
  useBookSlotMutation,
  useCancelBookingMutation,
  useJoinWaitlistMutation,
} from "../../features/student/studentApi";
import {
  useGetSlotsQuery
} from "../../features/slots/slotApi";

import {
  useLogoutMutation,
} from "../../features/auth/authApi";

import {
  clearCredentials,
} from "../../features/auth/authSlice";

function getErrorMessage(error, fallback) {
  return (
    error?.data?.message ||
    error?.data?.error?.message ||
    error?.message ||
    fallback
  );
}

function formatDate(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value) {
  if (!value) return "--";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getSlotId(slot) {
  return slot?._id || slot?.id;
}

function getSeatsLeft(slot) {
  if (
    typeof slot?.capacity !== "number" ||
    typeof slot?.bookedCount !== "number"
  ) {
    return null;
  }

  return Math.max(
    0,
    slot.capacity - slot.bookedCount
  );
}

function getSlotDate(slot) {
  return slot?.startAt || null;
}

function getSlotEnd(slot) {
  return slot?.endAt || null;
}

function getCounsellorName(slot) {
  return (
    slot?.counsellorId?.name ||
    slot?.counsellor?.fullName ||
    slot?.counsellorName ||
    "Counsellor"
  );
}

// function getCounsellorName(slot) {
//   return (
//     slot?.counsellor?.name ||
//     slot?.counsellor?.fullName ||
//     slot?.counsellorName ||
//     "Counsellor"
//   );
// }

 

function StudentSlotsPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const user = useSelector((state) => state.auth.user);

  const [notice, setNotice] = useState(null);

  const {
    data: slotsResponse,
    isLoading: slotsLoading,
    isFetching: slotsFetching,
    error: slotsError,
    refetch: refetchSlots,
  } = useGetSlotsQuery();

  const {
    data: bookingsResponse,
    isLoading: bookingsLoading,
    error: bookingsError,
  } = useGetMyBookingsQuery();

  const [bookSlot, bookState] = useBookSlotMutation();
  const [cancelBooking, cancelState] =
    useCancelBookingMutation();
  const [joinWaitlist, waitlistState] =
    useJoinWaitlistMutation();

  const [logout, logoutState] = useLogoutMutation();

  const slots = slotsResponse || [];
const bookings = bookingsResponse || [];

 

  const bookingSlotIds = useMemo(() => {
    return new Set(
      bookings
        .map((booking) => {
          return (
            booking?.slot?._id ||
            booking?.slot?.id ||
            booking?.slotId
          );
        })
        .filter(Boolean)
    );
  }, [bookings]);

  const handleLogout = async () => {
    try {
      await logout().unwrap();
    } catch {
      // Even if the server logout fails, clear local auth.
    } finally {
      dispatch(clearCredentials());
      navigate("/login", { replace: true });
    }
  };

  const handleBook = async (slot) => {
    const slotId = getSlotId(slot);

    if (!slotId || bookState.isLoading) {
      return;
    }

    setNotice(null);

    try {
      await bookSlot(slotId).unwrap();

      setNotice({
        type: "success",
        message: "Slot booked successfully.",
      });
    } catch (error) {
      setNotice({
        type: "error",
        message: getErrorMessage(
          error,
          "Unable to book this slot."
        ),
      });
    }
  };

  const handleCancel = async (booking) => {
    const bookingId =
      booking?._id || booking?.id;

    if (!bookingId || cancelState.isLoading) {
      return;
    }

    setNotice(null);

    try {
      await cancelBooking(bookingId).unwrap();

      setNotice({
        type: "success",
        message: "Booking cancelled successfully.",
      });
    } catch (error) {
      setNotice({
        type: "error",
        message: getErrorMessage(
          error,
          "Unable to cancel this booking."
        ),
      });
    }
  };

  const handleWaitlist = async (slot) => {
    const slotId = getSlotId(slot);

    if (!slotId || waitlistState.isLoading) {
      return;
    }

    setNotice(null);

    try {
      await joinWaitlist(slotId).unwrap();

      setNotice({
        type: "success",
        message: "You joined the waitlist successfully.",
      });
    } catch (error) {
      setNotice({
        type: "error",
        message: getErrorMessage(
          error,
          "Unable to join the waitlist."
        ),
      });
    }
  };

  const isInitialLoading =
    slotsLoading || bookingsLoading;

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              SlotSync
            </h1>

            <p className="text-sm text-slate-500">
              Counselling appointment platform
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 sm:flex">
              <UserRound
                size={17}
                className="text-slate-500"
              />

              <span className="text-sm font-medium text-slate-700">
                {user?.name || user?.email || "Student"}
              </span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={logoutState.isLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LogOut size={16} />

              {logoutState.isLoading
                ? "Signing out..."
                : "Logout"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Hero */}
        <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-600">
                Student Portal
              </p>

              <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                Find your counselling slot
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                Browse available counselling appointments,
                book a slot, cancel an existing booking, or
                join a waitlist when a slot is full.
              </p>
            </div>

            <button
              type="button"
              onClick={refetchSlots}
              disabled={slotsFetching}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={
                  slotsFetching
                    ? "animate-spin"
                    : ""
                }
              />

              Refresh
            </button>
          </div>
        </section>

        {/* Notice */}
        {notice && (
          <div
            className={`mb-6 rounded-xl border p-4 text-sm ${notice.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
              }`}
          >
            {notice.message}
          </div>
        )}

        {/* API error */}
        {slotsError && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="font-semibold text-red-700">
              Unable to load counselling slots
            </p>

            <p className="mt-1 text-sm text-red-600">
              {getErrorMessage(
                slotsError,
                "Please try again."
              )}
            </p>
          </div>
        )}

        {/* Available slots */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                Available Slots
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Choose a suitable counselling appointment.
              </p>
            </div>
          </div>

          {isInitialLoading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-64 animate-pulse rounded-2xl bg-white shadow-sm"
                />
              ))}
            </div>
          ) : slots.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <CalendarDays
                size={38}
                className="mx-auto text-slate-400"
              />

              <h4 className="mt-4 font-semibold text-slate-900">
                No slots available
              </h4>

              <p className="mt-1 text-sm text-slate-500">
                Please check again later for new counselling
                slots.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {slots.map((slot) => {
                const slotId = getSlotId(slot);
                const seatsLeft = getSeatsLeft(slot);
                const alreadyBooked =
                  bookingSlotIds.has(slotId);

                const slotStatus =
                  slot?.status || "open";

                const isFull =
                  seatsLeft !== null &&
                  seatsLeft <= 0;

                const isCancelled =
                  slotStatus === "cancelled";

                const isClosed =
                  slotStatus === "closed";

                const isUnavailable =
                  isCancelled ||
                  isClosed ||
                  isFull;

                return (
                  <article
                    key={slotId}
                    className="flex flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
                  >


                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-blue-600">
                          Counselling Session
                        </p>

                        <h4 className="mt-1 text-lg font-bold text-slate-900">
                          {getCounsellorName(slot)}
                        </h4>
                      </div>

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isCancelled
                            ? "bg-red-100 text-red-700"
                            : isClosed
                              ? "bg-slate-100 text-slate-700"
                              : isFull
                                ? "bg-amber-100 text-amber-700"
                                : "bg-emerald-100 text-emerald-700"
                          }`}
                      >
                        {isCancelled
                          ? "Cancelled"
                          : isClosed
                            ? "Closed"
                            : isFull
                              ? "Full"
                              : "Available"}
                      </span>
                    </div>

                    <div className="mt-5 space-y-3">
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <CalendarDays
                          size={17}
                          className="text-slate-400"
                        />

                        <span>
                          {formatDate(
                            getSlotDate(slot)
                          )}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <Clock3
                          size={17}
                          className="text-slate-400"
                        />

                        <span>
                          {formatTime(
                            getSlotDate(slot)
                          )}{" "}
                          -{" "}
                          {formatTime(
                            getSlotEnd(slot)
                          )}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <Users
                          size={17}
                          className="text-slate-400"
                        />

                        <span>
                          {seatsLeft === null
                            ? "Seats information unavailable"
                            : `${seatsLeft} seat${seatsLeft === 1
                              ? ""
                              : "s"
                            } left`}
                        </span>
                      </div>
                    </div>

                    <div className="mt-auto pt-6">
                      {alreadyBooked ? (
                        <div className="flex items-center justify-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                          <CheckCircle2 size={17} />
                          Already booked
                        </div>
                      ) : isCancelled ? (
                        <div className="rounded-lg bg-red-50 px-4 py-3 text-center text-sm font-semibold text-red-700">
                          Slot cancelled
                        </div>
                      ) : isClosed ? (
                        <div className="rounded-lg bg-slate-100 px-4 py-3 text-center text-sm font-semibold text-slate-600">
                          Slot closed
                        </div>
                      ) : isFull ? (
                        <button
                          type="button"
                          onClick={() => handleWaitlist(slot)}
                          disabled={waitlistState.isLoading}
                          className="flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <ListChecks size={17} />

                          {waitlistState.isLoading
                            ? "Joining..."
                            : "Join Waitlist"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleBook(slot)}
                          disabled={bookState.isLoading}
                          className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {bookState.isLoading
                            ? "Booking..."
                            : "Book Slot"}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* My bookings */}
        <section className="mt-10">
          <div className="mb-4">
            <h3 className="text-xl font-bold text-slate-900">
              My Bookings
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Manage your upcoming counselling appointments.
            </p>
          </div>

          {bookingsError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {getErrorMessage(
                bookingsError,
                "Unable to load your bookings."
              )}
            </div>
          ) : bookings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <CalendarDays
                size={38}
                className="mx-auto text-slate-400"
              />

              <h4 className="mt-4 font-semibold text-slate-900">
                No bookings yet
              </h4>

              <p className="mt-1 text-sm text-slate-500">
                Your confirmed counselling bookings will
                appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map((booking) => {
                const bookingId =
                  booking?._id || booking?.id;

                const slot =
                  booking?.slot || booking;

                const status =
                  booking?.status || "booked";

                return (
                  <div
                    key={bookingId}
                    className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-semibold text-slate-900">
                          {getCounsellorName(slot)}
                        </h4>

                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-600">
                          {String(status).replace(
                            "_",
                            " "
                          )}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
                        <span>
                          {formatDate(
                            getSlotDate(slot)
                          )}
                        </span>

                        <span>
                          {formatTime(
                            getSlotDate(slot)
                          )}{" "}
                          -{" "}
                          {formatTime(
                            getSlotEnd(slot)
                          )}
                        </span>
                      </div>
                    </div>

                    {status === "booked" && (
                      <button
                        type="button"
                        onClick={() =>
                          handleCancel(booking)
                        }
                        disabled={
                          cancelState.isLoading
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <X size={16} />

                        {cancelState.isLoading
                          ? "Cancelling..."
                          : "Cancel Booking"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default StudentSlotsPage;