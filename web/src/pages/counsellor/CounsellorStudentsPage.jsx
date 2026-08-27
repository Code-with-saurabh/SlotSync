import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { CalendarDays, Clock3, CheckCircle2, XCircle, ListChecks, UserRound, Users } from "lucide-react";

import { useGetSlotsQuery } from "../../features/slots/slotApi";
import {
  useGetCounsellorBookingsQuery,
  useMarkBookingOutcomeMutation,
} from "../../features/counsellor/counsellorApi";

const PAGE_SIZE = 10;

function getErrorMessage(error, fallback) {
  return error?.data?.message || error?.data?.error?.message || error?.message || fallback;
}

function formatDate(value) {
  if (!value) return "--";
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

function getBookingId(b) { return b?._id || b?.id; }
function getStudentName(b) { return b?.studentId?.name || b?.student?.name || b?.studentName || "Student"; }
function getStudentEmail(b) { return b?.studentId?.email || b?.student?.email || b?.studentEmail || ""; }
function getBookingSlotId(b) {
  return b?.slotId?._id || b?.slotId?.id || b?.slotId || b?.slot?._id || b?.slot?.id || b?.slot || null;
}

function getStatusBadge(status) {
  switch (status) {
    case "booked":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
    case "attended":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
    case "no_show":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
    case "cancelled":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
    default:
      return "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300";
  }
}

function CounsellorStudentsPage() {
  const user = useSelector((state) => state.auth.user);
  const [notice, setNotice] = useState(null);
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const {
    data: slotsResponse,
    isLoading: slotsLoading,
  } = useGetSlotsQuery(
    { counsellorId: user?.id || user?._id },
    { skip: !user?.id && !user?._id }
  );

  const slots = useMemo(() => {
    if (!slotsResponse) return [];
    if (Array.isArray(slotsResponse)) return slotsResponse;
    return slotsResponse?.slots || [];
  }, [slotsResponse]);

  const sortedSlots = useMemo(() => {
    return [...slots].sort((a, b) => new Date(b.startAt) - new Date(a.startAt));
  }, [slots]);

  const {
    data: bookings = [],
    isLoading: bookingsLoading,
    refetch: refetchBookings,
  } = useGetCounsellorBookingsQuery(undefined, { skip: !user?.id && !user?._id });

  const [markBookingOutcome, outcomeState] = useMarkBookingOutcomeMutation();

  const bookingsBySlot = useMemo(() => {
    const map = {};
    for (const booking of bookings) {
      const slotId = getBookingSlotId(booking);
      if (!slotId) continue;
      if (!map[slotId]) map[slotId] = [];
      map[slotId].push(booking);
    }
    return map;
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    if (!selectedSlotId) return bookings;
    return bookings.filter((b) => String(getBookingSlotId(b)) === String(selectedSlotId));
  }, [bookings, selectedSlotId]);

  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedBookings = filteredBookings.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const paginatedBySlot = useMemo(() => {
    const map = {};
    for (const booking of paginatedBookings) {
      const slotId = getBookingSlotId(booking);
      if (!slotId) continue;
      if (!map[slotId]) map[slotId] = [];
      map[slotId].push(booking);
    }
    return map;
  }, [paginatedBookings]);

  const handleOutcome = async (booking, outcome) => {
    const bookingId = getBookingId(booking);
    if (!bookingId || outcomeState.isLoading) return;
    setNotice(null);
    try {
      await markBookingOutcome({ bookingId, outcome }).unwrap();
      setNotice({ type: "success", message: `Booking marked as ${outcome.replace("_", " ")}.` });
      await refetchBookings();
    } catch (error) {
      setNotice({ type: "error", message: getErrorMessage(error, "Unable to update booking outcome.") });
    }
  };

  const totalBookings = bookings.length;
  const bookedCount = bookings.filter((b) => b?.status === "booked").length;
  const attendedCount = bookings.filter((b) => b?.status === "attended").length;

  const displaySlotOrder = useMemo(() => {
    if (selectedSlotId) {
      const slot = sortedSlots.find((s) => String(s?._id || s?.id) === String(selectedSlotId));
      return slot ? [slot] : [];
    }
    return sortedSlots.filter((s) => (bookingsBySlot[s?._id || s?.id] || []).length > 0);
  }, [sortedSlots, selectedSlotId, bookingsBySlot]);

  return (
    <div>
      <section className="mb-4 grid grid-cols-3 gap-2 sm:mb-6 sm:gap-4">
        <div className="rounded-xl bg-white p-3 shadow-sm sm:p-5 dark:bg-slate-800">
          <p className="text-xs font-medium text-slate-500 sm:text-sm dark:text-slate-400">Total Bookings</p>
          <p className="mt-1 text-xl font-bold text-slate-900 sm:text-3xl dark:text-white">{bookingsLoading ? "..." : totalBookings}</p>
        </div>
        <div className="rounded-xl bg-white p-3 shadow-sm sm:p-5 dark:bg-slate-800">
          <p className="text-xs font-medium text-slate-500 sm:text-sm dark:text-slate-400">Active</p>
          <p className="mt-1 text-xl font-bold text-blue-600 sm:text-3xl">{bookingsLoading ? "..." : bookedCount}</p>
        </div>
        <div className="rounded-xl bg-white p-3 shadow-sm sm:p-5 dark:bg-slate-800">
          <p className="text-xs font-medium text-slate-500 sm:text-sm dark:text-slate-400">Attended</p>
          <p className="mt-1 text-xl font-bold text-emerald-600 sm:text-3xl">{bookingsLoading ? "..." : attendedCount}</p>
        </div>
      </section>

      {notice && (
        <div className={`mb-4 rounded-xl border p-3 text-sm sm:mb-6 sm:p-4 ${
          notice.type === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
            : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300"
        }`}>
          {notice.message}
        </div>
      )}

      <section className="mb-4 sm:mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 sm:text-xl dark:text-white">Students by Slot</h3>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm dark:text-slate-400">See which students booked each slot and mark attendance.</p>
          </div>
          <select
            value={selectedSlotId}
            onChange={(e) => { setSelectedSlotId(e.target.value); setCurrentPage(1); }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          >
            <option value="">All Slots ({sortedSlots.length})</option>
            {sortedSlots.map((slot) => {
              const sid = slot?._id || slot?.id;
              const count = (bookingsBySlot[sid] || []).length;
              return (
                <option key={sid} value={sid}>
                  {formatDate(slot.startAt)} {formatTime(slot.startAt)}-{formatTime(slot.endAt)} ({count} students)
                </option>
              );
            })}
          </select>
        </div>
      </section>

      <section>
        {bookingsLoading || slotsLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-white shadow-sm dark:bg-slate-800" />
            ))}
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-600 dark:bg-slate-800">
            <Users size={38} className="mx-auto text-slate-400" />
            <h4 className="mt-4 font-semibold text-slate-900 dark:text-white">No bookings found</h4>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {selectedSlotId ? "No students have booked this slot yet." : "No bookings across any slots yet."}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {displaySlotOrder.map((slot) => {
                const slotId = slot?._id || slot?.id;
                const slotBookings = paginatedBySlot[slotId] || [];
                const totalForSlot = (bookingsBySlot[slotId] || []).length;
                if (slotBookings.length === 0) return null;

                return (
                  <div key={slotId} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
                    <div className="border-b border-slate-100 bg-slate-50 p-3 sm:p-4 dark:border-slate-700 dark:bg-slate-700/50">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 sm:text-base dark:text-white">{formatDate(slot.startAt)}</h4>
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500 sm:text-sm dark:text-slate-400">
                            <span className="flex items-center gap-1"><Clock3 size={14} /> {formatTime(slot.startAt)} - {formatTime(slot.endAt)}</span>
                            <span className="flex items-center gap-1"><Users size={14} /> {totalForSlot} students</span>
                          </div>
                        </div>
                        <span className={`self-start rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                          slot.status === "open" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                          : slot.status === "cancelled" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                        }`}>
                          {slot.status}
                        </span>
                      </div>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                      {slotBookings.map((booking) => {
                        const bookingId = getBookingId(booking);
                        const status = booking?.status || "booked";

                        return (
                          <div key={bookingId} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700">
                                <UserRound size={17} className="text-slate-500 dark:text-slate-300" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-900 dark:text-white">{getStudentName(booking)}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{getStudentEmail(booking)}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 pl-12 sm:pl-0">
                              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${getStatusBadge(status)}`}>
                                {status.replace("_", " ")}
                              </span>
                              {status === "booked" && (
                                <div className="flex gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleOutcome(booking, "attended")}
                                    disabled={outcomeState.isLoading}
                                    className="inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                                  >
                                    <CheckCircle2 size={13} />
                                    Attended
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOutcome(booking, "no_show")}
                                    disabled={outcomeState.isLoading}
                                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30"
                                  >
                                    <XCircle size={13} />
                                    No Show
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between sm:mt-6">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Page {safePage} of {totalPages} ({filteredBookings.length} students)
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage >= totalPages}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

export default CounsellorStudentsPage;
