import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { CalendarDays, Clock3, ChevronDown, ChevronUp, Plus, UserRound, Users, X } from "lucide-react";

import {
  useGetSlotsQuery,
  useCreateSlotMutation,
  useUpdateSlotMutation,
} from "../../features/slots/slotApi";
import { useGetCounsellorBookingsQuery } from "../../features/counsellor/counsellorApi";

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

function toIsoDateTime(date, time) {
  if (!date || !time) return null;
  const value = new Date(`${date}T${time}`);
  if (Number.isNaN(value.getTime())) return null;
  return value.toISOString();
}

function toDateKey(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

function getStatusClasses(status) {
  switch (status) {
    case "open":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
    case "cancelled":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
    default:
      return "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300";
  }
}

function CounsellorSlotsPage() {
  const user = useSelector((state) => state.auth.user);

  const [notice, setNotice] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [form, setForm] = useState({ date: "", startTime: "", endTime: "", capacity: "1" });

  const {
    data: slotsResponse,
    isLoading: slotsLoading,
    isFetching: slotsFetching,
    error: slotsError,
    refetch: refetchSlots,
  } = useGetSlotsQuery(
    { counsellorId: user?.id || user?._id },
    { skip: !user?.id && !user?._id }
  );

  const slots = useMemo(() => {
    if (!slotsResponse) return [];
    if (Array.isArray(slotsResponse)) return slotsResponse;
    return slotsResponse?.slots || [];
  }, [slotsResponse]);

  const [createSlot, createSlotState] = useCreateSlotMutation();
  const [updateSlot, updateSlotState] = useUpdateSlotMutation();
  const [expandedSlotId, setExpandedSlotId] = useState(null);

  const {
    data: bookings = [],
  } = useGetCounsellorBookingsQuery(undefined, { skip: !user?.id && !user?._id });

  const bookingsBySlot = useMemo(() => {
    const map = {};
    for (const b of bookings) {
      const sid = b?.slotId?._id || b?.slotId?.id || b?.slotId || b?.slot?._id || b?.slot?.id || b?.slot;
      if (!sid) continue;
      if (!map[sid]) map[sid] = [];
      map[sid].push(b);
    }
    return map;
  }, [bookings]);

  const sortedSlots = useMemo(() => {
    return [...slots].sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
  }, [slots]);

  const filteredSlots = useMemo(() => {
    if (!selectedDate) return sortedSlots;
    return sortedSlots.filter((slot) => toDateKey(slot.startAt) === selectedDate);
  }, [sortedSlots, selectedDate]);

  const PAGE_SIZE = 6;
  const totalPages = Math.max(1, Math.ceil(filteredSlots.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedSlots = filteredSlots.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const availableDates = useMemo(() => {
    const dates = new Set();
    for (const slot of sortedSlots) {
      const key = toDateKey(slot.startAt);
      if (key) dates.add(key);
    }
    return Array.from(dates).sort();
  }, [sortedSlots]);

  const handleCreateSlot = async (event) => {
    event.preventDefault();
    setNotice(null);

    const startAt = toIsoDateTime(form.date, form.startTime);
    const endAt = toIsoDateTime(form.date, form.endTime);

    if (!startAt || !endAt) {
      setNotice({ type: "error", message: "Please provide a valid date, start time and end time." });
      return;
    }

    if (new Date(endAt) <= new Date(startAt)) {
      setNotice({ type: "error", message: "End time must be after start time." });
      return;
    }

    const capacity = Number(form.capacity);
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100) {
      setNotice({ type: "error", message: "Capacity must be between 1 and 100." });
      return;
    }

    try {
      await createSlot({ startAt, endAt, capacity }).unwrap();
      setForm({ date: "", startTime: "", endTime: "", capacity: "1" });
      setNotice({ type: "success", message: "Counselling slot created successfully." });
    } catch (error) {
      setNotice({ type: "error", message: getErrorMessage(error, "Unable to create slot.") });
    }
  };

  const handleCloseSlot = async (slot) => {
    const slotId = slot?._id || slot?.id;
    if (!slotId || updateSlotState.isLoading) return;
    setNotice(null);
    try {
      await updateSlot({ slotId, status: "closed", version: slot.version }).unwrap();
      setNotice({ type: "success", message: "Slot closed successfully." });
    } catch (error) {
      setNotice({ type: "error", message: getErrorMessage(error, "Unable to close this slot.") });
    }
  };

  const handleCancelSlot = async (slot) => {
    const slotId = slot?._id || slot?.id;
    if (!slotId || updateSlotState.isLoading) return;
    setNotice(null);
    try {
      await updateSlot({ slotId, status: "cancelled", version: slot.version }).unwrap();
      setNotice({ type: "success", message: "Slot cancelled successfully." });
    } catch (error) {
      setNotice({ type: "error", message: getErrorMessage(error, "Unable to cancel this slot.") });
    }
  };

  const totalSlots = slots.length;
  const openSlots = slots.filter((s) => s?.status === "open").length;

  return (
    <div>
      <section className="mb-6 rounded-2xl bg-white p-4 shadow-sm sm:p-6 dark:bg-slate-800">
        <div className="mb-4 flex items-center gap-3 sm:mb-5">
          <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
            <Plus size={19} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 sm:text-xl dark:text-white">Create Slot</h3>
            <p className="text-xs text-slate-500 sm:text-sm dark:text-slate-400">Create a new counselling appointment.</p>
          </div>
        </div>

        <form onSubmit={handleCreateSlot} className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Date</label>
            <input
              type="date"
              value={form.date}
              min={getTodayStr()}
              onChange={(e) => setForm((c) => ({ ...c, date: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:focus:ring-blue-900/40"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Start Time</label>
            <input
              type="time"
              value={form.startTime}
              onChange={(e) => setForm((c) => ({ ...c, startTime: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:focus:ring-blue-900/40"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">End Time</label>
            <input
              type="time"
              value={form.endTime}
              onChange={(e) => setForm((c) => ({ ...c, endTime: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:focus:ring-blue-900/40"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Capacity</label>
            <input
              type="number"
              min="1"
              max="100"
              value={form.capacity}
              onChange={(e) => setForm((c) => ({ ...c, capacity: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:focus:ring-blue-900/40"
              required
            />
          </div>
          <div className="md:col-span-2 lg:col-span-4">
            <button
              type="submit"
              disabled={createSlotState.isLoading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={17} />
              {createSlotState.isLoading ? "Creating..." : "Create Slot"}
            </button>
          </div>
        </form>
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
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-slate-900 sm:text-xl dark:text-white">My Slots</h3>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                {totalSlots} total, {openSlots} open
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CalendarDays size={16} className="text-slate-400" />
            <select
              value={selectedDate}
              onChange={(e) => { setSelectedDate(e.target.value); setCurrentPage(1); }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="">All Dates</option>
              {availableDates.map((date) => (
                <option key={date} value={date}>{formatDate(date)}</option>
              ))}
            </select>
            <button
              onClick={() => refetchSlots()}
              disabled={slotsFetching}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
            >
              Refresh
            </button>
          </div>
        </div>
      </section>

      <section>
        {slotsError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
            {getErrorMessage(slotsError, "Unable to load slots.")}
          </div>
        ) : slotsLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl bg-white shadow-sm dark:bg-slate-800" />
            ))}
          </div>
        ) : filteredSlots.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-600 dark:bg-slate-800">
            <CalendarDays size={38} className="mx-auto text-slate-400" />
            <h4 className="mt-4 font-semibold text-slate-900 dark:text-white">
              {selectedDate ? "No slots on this date" : "No slots created yet"}
            </h4>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {selectedDate ? "Try selecting a different date or create a new slot." : "Create your first counselling slot above."}
            </p>
          </div>
        ) : (
          <>
          <div className="space-y-4 sm:space-y-6">
            {paginatedSlots.map((slot) => {
              const slotId = slot?._id || slot?.id;
              const capacity = Number(slot.capacity) || 0;
              const booked = Number(slot.bookedCount) || 0;
              const seatsLeft = Math.max(0, capacity - booked);
              const isOpen = slot.status === "open";

              return (
                <article
                  key={slotId}
                  className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5 dark:bg-slate-800 dark:ring-slate-700"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-blue-600">Counselling Session</p>
                      <h4 className="mt-1 text-base font-bold text-slate-900 sm:text-lg dark:text-white">
                        {formatDate(slot.startAt)}
                      </h4>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${getStatusClasses(slot.status)}`}>
                      {slot.status}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600 sm:mt-4 sm:gap-4 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <Clock3 size={16} className="text-slate-400" />
                      <span>{formatTime(slot.startAt)} - {formatTime(slot.endAt)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-slate-400" />
                      <span>{booked} booked / {capacity} capacity</span>
                    </div>
                    <div className="font-medium text-slate-600 dark:text-slate-300">
                      {seatsLeft} seat{seatsLeft === 1 ? "" : "s"} remaining
                    </div>
                  </div>

                  {isOpen && (
                    <div className="mt-3 flex gap-2 sm:mt-4">
                      <button
                        type="button"
                        onClick={() => handleCloseSlot(slot)}
                        disabled={updateSlotState.isLoading}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                      >
                        Close
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCancelSlot(slot)}
                        disabled={updateSlotState.isLoading}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30"
                      >
                        <span className="inline-flex items-center justify-center gap-1">
                          <X size={15} />
                          Cancel
                        </span>
                      </button>
                    </div>
                  )}

                  {booked > 0 && (
                    <div className={`mt-3 ${isOpen ? "border-t border-slate-100 pt-3 dark:border-slate-700" : "border-t border-slate-100 pt-3 dark:border-slate-700"} sm:mt-4`}>
                      <button
                        type="button"
                        onClick={() => setExpandedSlotId(expandedSlotId === slotId ? null : slotId)}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30"
                      >
                        <Users size={15} />
                        View Students ({booked})
                        {expandedSlotId === slotId ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </button>

                      {expandedSlotId === slotId && (
                        <div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
                          {(bookingsBySlot[slotId] || []).map((booking) => {
                            const name = booking?.studentId?.name || booking?.student?.name || booking?.studentName || "Student";
                            const email = booking?.studentId?.email || booking?.student?.email || booking?.studentEmail || "";
                            const status = booking?.status || "booked";
                            const statusColor = status === "attended" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                              : status === "no_show" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                              : status === "cancelled" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";

                            return (
                              <div key={booking?._id || booking?.id} className="flex items-center justify-between gap-3 p-3">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700">
                                    <UserRound size={15} className="text-slate-500 dark:text-slate-300" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-slate-900 dark:text-white">{name}</p>
                                    {email && <p className="text-xs text-slate-500 dark:text-slate-400">{email}</p>}
                                  </div>
                                </div>
                                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${statusColor}`}>
                                  {status.replace("_", " ")}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between sm:mt-6">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Page {safePage} of {totalPages} ({filteredSlots.length} slots)
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

export default CounsellorSlotsPage;
