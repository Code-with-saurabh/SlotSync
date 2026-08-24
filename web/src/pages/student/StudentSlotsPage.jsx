import { useMemo, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import {
  CalendarDays,
  LogOut,
  RefreshCw,
  UserRound,
  X,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";

import {
  useGetMyBookingsQuery,
  useBookSlotMutation,
  useCancelBookingMutation,
  useGetMyWaitlistQuery,
  useJoinWaitlistMutation,
  useLeaveWaitlistMutation,
} from "../../features/student/studentApi";

import {
  useGetSlotsQuery,
} from "../../features/slots/slotApi";

import {
  useLogoutMutation,
} from "../../features/auth/authApi";

import {
  clearCredentials,
} from "../../features/auth/authSlice";

import { useSlotSSE } from "../../hooks/useSlotSSE";
import { useIdempotencyKey } from "../../hooks/useIdempotencyKey";

import SlotCard from "../../components/slots/SlotCard";
import DarkModeToggle from "../../components/DarkModeToggle";


const PAGE_LIMIT = 20;

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
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function getSlotId(slot) { return slot?._id || slot?.id || null; }
function getBookingId(booking) { return booking?._id || booking?.id || null; }
function getWaitlistEntryId(entry) { return entry?._id || entry?.id || null; }

function getBookingSlotId(booking) {
  return booking?.slot?._id || booking?.slot?.id || booking?.slotId?._id || booking?.slotId?.id || booking?.slotId || null;
}

function getWaitlistSlotId(entry) {
  return entry?.slot?._id || entry?.slot?.id || entry?.slotId?._id || entry?.slotId?.id || entry?.slotId || null;
}

function getCounsellorName(slot, booking = null) {
  return slot?.counsellorId?.name || slot?.counsellor?.name || booking?.counsellorId?.name || booking?.counsellor?.name || "Counsellor";
}


function StudentSlotsPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const user = useSelector((state) => state.auth.user);

  const [notice, setNotice] = useState(null);
  const [bookingSlotId, setBookingSlotId] = useState(null);
  const [waitlistSlotId, setWaitlistSlotId] = useState(null);
  const [cancellingBookingId, setCancellingBookingId] = useState(null);
  const [leavingWaitlistId, setLeavingWaitlistId] = useState(null);

  const [pageHistory, setPageHistory] = useState([]);
  const [currentCursor, setCurrentCursor] = useState(undefined);

  const getKey = useIdempotencyKey();

  const {
    data: slotsResponse,
    isLoading: slotsLoading,
    isFetching: slotsFetching,
    error: slotsError,
    refetch: refetchSlots,
  } = useGetSlotsQuery({
    limit: PAGE_LIMIT,
    ...(currentCursor ? { cursor: currentCursor } : {}),
  });

  const {
    data: bookingsResponse,
    isLoading: bookingsLoading,
    error: bookingsError,
    refetch: refetchBookings,
  } = useGetMyBookingsQuery();

  const {
    data: waitlistResponse,
    isLoading: waitlistLoading,
    error: waitlistError,
    refetch: refetchWaitlist,
  } = useGetMyWaitlistQuery();

  const [bookSlot] = useBookSlotMutation();
  const [cancelBooking] = useCancelBookingMutation();
  const [joinWaitlist] = useJoinWaitlistMutation();
  const [leaveWaitlist, leaveWaitlistState] = useLeaveWaitlistMutation();
  const [logout, logoutState] = useLogoutMutation();

  const slots = useMemo(() => {
    if (!slotsResponse) return [];
    if (Array.isArray(slotsResponse)) return slotsResponse;
    return slotsResponse?.slots || [];
  }, [slotsResponse]);

  const nextCursor = slotsResponse?.nextCursor || null;
  const hasMore = slotsResponse?.hasMore || false;

  const bookings = useMemo(() => {
    if (!bookingsResponse) return [];
    if (Array.isArray(bookingsResponse)) return bookingsResponse;
    return bookingsResponse?.bookings || [];
  }, [bookingsResponse]);

  const waitlist = useMemo(() => {
    if (!waitlistResponse) return [];
    if (Array.isArray(waitlistResponse)) return waitlistResponse;
    return waitlistResponse?.entries || [];
  }, [waitlistResponse]);

  const bookingSlotIds = useMemo(() => {
    return new Set(
      bookings
        .filter((b) => b?.status === "booked")
        .map(getBookingSlotId)
        .filter(Boolean)
        .map(String)
    );
  }, [bookings]);

  const waitlistSlotIds = useMemo(() => {
    return new Set(
      waitlist
        .filter((e) => e?.status === "waiting")
        .map(getWaitlistSlotId)
        .filter(Boolean)
        .map(String)
    );
  }, [waitlist]);

  const handleLogout = async () => {
    try { await logout().unwrap(); } catch { }
    dispatch(clearCredentials());
    navigate("/login", { replace: true });
  };

  const handleBook = async (slot) => {
    const slotId = getSlotId(slot);
    if (!slotId || bookingSlotId !== null) return;
    setNotice(null);
    setBookingSlotId(slotId);
    try {
      await bookSlot({ slotId, idempotencyKey: getKey() }).unwrap();
      setNotice({ type: "success", message: "Slot booked successfully." });
    } catch (error) {
      setNotice({ type: "error", message: getErrorMessage(error, "Unable to book this slot.") });
    } finally {
      setBookingSlotId(null);
      await Promise.allSettled([refetchSlots(), refetchBookings(), refetchWaitlist()]);
    }
  };

  const handleCancel = async (booking) => {
    const bookingId = getBookingId(booking);
    if (!bookingId || cancellingBookingId !== null) return;
    setNotice(null);
    setCancellingBookingId(bookingId);
    try {
      await cancelBooking(bookingId).unwrap();
      setNotice({ type: "success", message: "Booking cancelled successfully." });
    } catch (error) {
      setNotice({ type: "error", message: getErrorMessage(error, "Unable to cancel this booking.") });
    } finally {
      setCancellingBookingId(null);
      await Promise.allSettled([refetchSlots(), refetchBookings(), refetchWaitlist()]);
    }
  };

  const handleWaitlist = async (slot) => {
    const slotId = getSlotId(slot);
    if (!slotId || waitlistSlotId !== null) return;
    setNotice(null);
    setWaitlistSlotId(slotId);
    try {
      await joinWaitlist(slotId).unwrap();
      setNotice({ type: "success", message: "You joined the waitlist successfully." });
    } catch (error) {
      setNotice({ type: "error", message: getErrorMessage(error, "Unable to join the waitlist.") });
    } finally {
      setWaitlistSlotId(null);
      await Promise.allSettled([refetchSlots(), refetchBookings(), refetchWaitlist()]);
    }
  };

  const handleLeaveWaitlist = async (entry) => {
    const entryId = getWaitlistEntryId(entry);
    if (!entryId || leavingWaitlistId !== null) return;
    setNotice(null);
    setLeavingWaitlistId(entryId);
    try {
      await leaveWaitlist(entryId).unwrap();
      setNotice({ type: "success", message: "You left the waitlist successfully." });
    } catch (error) {
      setNotice({ type: "error", message: getErrorMessage(error, "Unable to leave the waitlist.") });
    } finally {
      setLeavingWaitlistId(null);
      await Promise.allSettled([refetchWaitlist(), refetchSlots(), refetchBookings()]);
    }
  };

  const handleRefresh = async () => {
    setNotice(null);
    setPageHistory([]);
    setCurrentCursor(undefined);
    await Promise.allSettled([refetchSlots(), refetchBookings(), refetchWaitlist()]);
    setNotice({ type: "success", message: "Data refreshed successfully." });
  };

  const handleNextPage = () => {
    if (!nextCursor) return;
    setPageHistory((prev) => [...prev, currentCursor]);
    setCurrentCursor(nextCursor);
  };

  const handlePrevPage = () => {
    if (pageHistory.length === 0) return;
    const lastHistory = [...pageHistory];
    const prevCursor = lastHistory.pop();
    setPageHistory(lastHistory);
    setCurrentCursor(prevCursor);
  };

  const isInitialLoading = slotsLoading || bookingsLoading || waitlistLoading;
  const canGoBack = pageHistory.length > 0;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">

      {/* HEADER */}
      <header className="border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">SlotSync</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Counselling appointment platform</p>
          </div>
          <div className="flex items-center gap-3">
            <DarkModeToggle />
            <div className="hidden items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 sm:flex dark:bg-slate-700">
              <UserRound size={17} className="text-slate-500 dark:text-slate-300" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {user?.name || user?.email || "Student"}
              </span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={logoutState.isLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
            >
              <LogOut size={16} />
              {logoutState.isLoading ? "Signing out..." : "Logout"}
            </button>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {/* HERO */}
        <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-800">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-600">Student Portal</p>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">Find your counselling slot</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400 sm:text-base">
                Browse available counselling appointments, book a slot, cancel an existing booking, or join a waitlist when a slot is full.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={slotsFetching}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
            >
              <RefreshCw size={16} className={slotsFetching ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </section>

        {/* NOTICE */}
        {notice && (
          <div className={`mb-6 rounded-xl border p-4 text-sm ${notice.type === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
            : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300"
            }`}>
            {notice.message}
          </div>
        )}

        {slotsError && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/30">
            <p className="font-semibold text-red-700 dark:text-red-300">Unable to load counselling slots</p>
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{getErrorMessage(slotsError, "Please try again.")}</p>
          </div>
        )}

        {waitlistError && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/30">
            <p className="font-semibold text-amber-700 dark:text-amber-300">Waitlist information could not be loaded</p>
            <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">{getErrorMessage(waitlistError, "Please refresh the page.")}</p>
          </div>
        )}

        {/* AVAILABLE SLOTS */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Available Slots</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Choose a suitable counselling appointment.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevPage}
                disabled={!canGoBack || slotsFetching}
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={handleNextPage}
                disabled={!hasMore || slotsFetching}
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {isInitialLoading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-64 animate-pulse rounded-2xl bg-white shadow-sm dark:bg-slate-800" />
              ))}
            </div>
          ) : slots.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-600 dark:bg-slate-800">
              <CalendarDays size={38} className="mx-auto text-slate-400" />
              <h4 className="mt-4 font-semibold text-slate-900 dark:text-white">No slots available</h4>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Please check again later for new counselling slots.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {slots.map((slot) => {
                const slotId = getSlotId(slot);
                const alreadyBooked = bookingSlotIds.has(String(slotId));
                const currentBooking = bookings.find((b) => {
                  return b?.status === "booked" && String(getBookingSlotId(b)) === String(slotId);
                }) || null;
                const currentWaitlistEntry = waitlist.find((e) => e?.status === "waiting" && String(getWaitlistSlotId(e)) === String(slotId)) || null;
                const alreadyWaitlisted = Boolean(currentWaitlistEntry);

                return (
                  <SlotCardWrapper key={slotId} slot={slot}>
                    <SlotCard
                      slot={slot}
                      alreadyBooked={alreadyBooked}
                      booking={currentBooking}
                      alreadyWaitlisted={alreadyWaitlisted}
                      waitlistEntry={currentWaitlistEntry}
                      onBook={handleBook}
                      onCancelBooking={handleCancel}
                      onJoinWaitlist={handleWaitlist}
                      onLeaveWaitlist={handleLeaveWaitlist}
                      isBooking={bookingSlotId === slotId}
                      isCancellingBooking={cancellingBookingId === getBookingId(currentBooking)}
                      isJoiningWaitlist={waitlistSlotId === slotId}
                      isLeavingWaitlist={leavingWaitlistId === getWaitlistEntryId(currentWaitlistEntry)}
                    />
                  </SlotCardWrapper>
                );
              })}
            </div>
          )}
        </section>

        {/* MY BOOKINGS */}
        <section className="mt-10">
          <div className="mb-4">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">My Bookings</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage your upcoming counselling appointments.</p>
          </div>
          {bookingsError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
              {getErrorMessage(bookingsError, "Unable to load your bookings.")}
            </div>
          ) : bookings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-600 dark:bg-slate-800">
              <CalendarDays size={38} className="mx-auto text-slate-400" />
              <h4 className="mt-4 font-semibold text-slate-900 dark:text-white">No bookings yet</h4>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your confirmed counselling bookings will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map((booking) => {
                const bookingId = getBookingId(booking);
                const slot = booking?.slotId && typeof booking.slotId === "object" ? booking.slotId : booking;
                const status = booking?.status || "booked";
                return (
                  <div key={bookingId} className="flex flex-col gap-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 md:flex-row md:items-center md:justify-between dark:bg-slate-800 dark:ring-slate-700">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-semibold text-slate-900 dark:text-white">{getCounsellorName(slot, booking)}</h4>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                          {String(status).replaceAll("_", " ")}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-col gap-2 text-sm text-slate-600 dark:text-slate-400 sm:flex-row sm:flex-wrap sm:gap-x-6">
                        <div className="flex items-center gap-2">
                          <CalendarDays size={16} className="text-slate-400" />
                          <span className="font-medium">{formatDate(slot?.startAt)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">&#128336;</span>
                          <span className="font-medium">{formatTime(slot?.startAt)}{" - "}{formatTime(slot?.endAt)}</span>
                        </div>
                      </div>
                    </div>
                    {status === "booked" && (
                      <button
                        type="button"
                        onClick={() => handleCancel(booking)}
                        disabled={cancellingBookingId !== null}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <X size={16} />
                        {cancellingBookingId === bookingId ? "Cancelling..." : "Cancel Booking"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* MY WAITLIST */}
        {/* {waitlist.filter((e) => e?.status === "waiting").length > 0 && (
          <section className="mt-10">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">My Waitlist</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Slots you are currently waiting for.</p>
            </div>
            <div className="space-y-3">
              {waitlist.filter((e) => e?.status === "waiting").map((entry) => {
                const entryId = getWaitlistEntryId(entry);
                const slot = entry?.slot && typeof entry.slot === "object" ? entry.slot : entry?.slotId && typeof entry.slotId === "object" ? entry.slotId : null;
                return (
                  <div key={entryId} className="flex flex-col gap-4 rounded-2xl border border-purple-100 bg-purple-50/50 p-5 md:flex-row md:items-center md:justify-between dark:border-purple-800 dark:bg-purple-900/20">
                    <div>
                      <p className="text-sm font-semibold text-purple-600 dark:text-purple-400">Waitlist</p>
                      <h4 className="mt-1 font-semibold text-slate-900 dark:text-white">{getCounsellorName(slot, entry)}</h4>
                      {slot && (
                        <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400">
                          <span className="flex items-center gap-2">
                            <CalendarDays size={15} className="text-slate-400" />
                            {formatDate(slot?.startAt)}
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="text-slate-400">&#128336;</span>
                            {formatTime(slot?.startAt)}{" - "}{formatTime(slot?.endAt)}
                          </span>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleLeaveWaitlist(entry)}
                      disabled={leavingWaitlistId !== null}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <X size={16} />
                      {leavingWaitlistId === entryId ? "Leaving..." : "Leave Waitlist"}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )} */}
      </main>
    </div>
  );
}

function SlotCardWrapper({ slot, children }) {
  useSlotSSE(slot?._id || slot?.id);
  return children;
}

export default StudentSlotsPage;
