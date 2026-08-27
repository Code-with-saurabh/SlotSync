import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { CalendarDays, Clock3, ListChecks, UserRound, Users } from "lucide-react";

import { useGetSlotsQuery } from "../../features/slots/slotApi";
import { useGetCounsellorWaitlistQuery } from "../../features/counsellor/counsellorApi";

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

function getStatusBadge(status) {
  switch (status) {
    case "waiting":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
    case "promoted":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
    case "cancelled":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
    default:
      return "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300";
  }
}

function CounsellorWaitlistPage() {
  const user = useSelector((state) => state.auth.user);
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
    data: waitlistEntries = [],
    isLoading: waitlistLoading,
    error: waitlistError,
  } = useGetCounsellorWaitlistQuery(undefined, { skip: !user?.id && !user?._id });

  const entriesBySlot = useMemo(() => {
    const map = {};
    for (const entry of waitlistEntries) {
      const slotId = entry?.slotId?._id || entry?.slotId?.id || entry?.slotId;
      if (!slotId) continue;
      if (!map[slotId]) map[slotId] = [];
      map[slotId].push(entry);
    }
    return map;
  }, [waitlistEntries]);

  const filteredEntries = useMemo(() => {
    if (!selectedSlotId) return waitlistEntries;
    return waitlistEntries.filter((e) => {
      const sid = e?.slotId?._id || e?.slotId?.id || e?.slotId;
      return String(sid) === String(selectedSlotId);
    });
  }, [waitlistEntries, selectedSlotId]);

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedEntries = filteredEntries.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const paginatedBySlot = useMemo(() => {
    const map = {};
    for (const entry of paginatedEntries) {
      const slotId = entry?.slotId?._id || entry?.slotId?.id || entry?.slotId;
      if (!slotId) continue;
      if (!map[slotId]) map[slotId] = [];
      map[slotId].push(entry);
    }
    return map;
  }, [paginatedEntries]);

  const waitingCount = waitlistEntries.filter((e) => e?.status === "waiting").length;
  const promotedCount = waitlistEntries.filter((e) => e?.status === "promoted").length;

  const displaySlotOrder = useMemo(() => {
    if (selectedSlotId) {
      const slot = sortedSlots.find((s) => String(s?._id || s?.id) === String(selectedSlotId));
      return slot ? [slot] : [];
    }
    return sortedSlots.filter((s) => (entriesBySlot[s?._id || s?.id] || []).length > 0);
  }, [sortedSlots, selectedSlotId, entriesBySlot]);

  return (
    <div>
      <section className="mb-4 grid grid-cols-2 gap-2 sm:mb-6 sm:gap-4">
        <div className="rounded-xl bg-white p-3 shadow-sm sm:p-5 dark:bg-slate-800">
          <p className="text-xs font-medium text-slate-500 sm:text-sm dark:text-slate-400">Total Waiting</p>
          <p className="mt-1 text-xl font-bold text-amber-600 sm:text-3xl">{waitlistLoading ? "..." : waitingCount}</p>
        </div>
        <div className="rounded-xl bg-white p-3 shadow-sm sm:p-5 dark:bg-slate-800">
          <p className="text-xs font-medium text-slate-500 sm:text-sm dark:text-slate-400">Promoted</p>
          <p className="mt-1 text-xl font-bold text-emerald-600 sm:text-3xl">{waitlistLoading ? "..." : promotedCount}</p>
        </div>
      </section>

      <section className="mb-4 sm:mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 sm:text-xl dark:text-white">Waitlist by Slot</h3>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm dark:text-slate-400">Students waiting for a seat when a slot becomes available.</p>
          </div>
          <select
            value={selectedSlotId}
            onChange={(e) => { setSelectedSlotId(e.target.value); setCurrentPage(1); }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          >
            <option value="">All Slots ({sortedSlots.length})</option>
            {sortedSlots.map((slot) => {
              const sid = slot?._id || slot?.id;
              const count = (entriesBySlot[sid] || []).filter((e) => e?.status === "waiting").length;
              if (count === 0) return null;
              return (
                <option key={sid} value={sid}>
                  {formatDate(slot.startAt)} {formatTime(slot.startAt)}-{formatTime(slot.endAt)} ({count} waiting)
                </option>
              );
            })}
          </select>
        </div>
      </section>

      {waitlistError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
          {getErrorMessage(waitlistError, "Unable to load waitlist data.")}
        </div>
      )}

      <section>
        {waitlistLoading || slotsLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-white shadow-sm dark:bg-slate-800" />
            ))}
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-600 dark:bg-slate-800">
            <ListChecks size={38} className="mx-auto text-slate-400" />
            <h4 className="mt-4 font-semibold text-slate-900 dark:text-white">No waitlist entries</h4>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {selectedSlotId ? "No students are waiting for this slot." : "No students are on any waitlist."}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {displaySlotOrder.map((slot) => {
                const slotId = slot?._id || slot?.id;
                const slotEntries = paginatedBySlot[slotId] || [];
                const totalForSlot = (entriesBySlot[slotId] || []).length;
                if (slotEntries.length === 0) return null;

                const capacity = Number(slot.capacity) || 0;
                const booked = Number(slot.bookedCount) || 0;
                const seatsLeft = Math.max(0, capacity - booked);

                return (
                  <div key={slotId} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
                    <div className="border-b border-slate-100 bg-slate-50 p-3 sm:p-4 dark:border-slate-700 dark:bg-slate-700/50">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 sm:text-base dark:text-white">{formatDate(slot.startAt)}</h4>
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500 sm:text-sm dark:text-slate-400">
                            <span className="flex items-center gap-1"><Clock3 size={14} /> {formatTime(slot.startAt)} - {formatTime(slot.endAt)}</span>
                            <span className="flex items-center gap-1"><Users size={14} /> {booked}/{capacity} booked</span>
                            <span className="flex items-center gap-1"><ListChecks size={14} /> {totalForSlot} waiting</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 self-start">
                          {seatsLeft === 0 ? (
                            <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-300">Full</span>
                          ) : (
                            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">{seatsLeft} seats open</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                      {slotEntries
                        .sort((a, b) => (a.position || 0) - (b.position || 0))
                        .map((entry) => {
                          const studentName = entry?.studentId?.name || "Student";
                          const studentEmail = entry?.studentId?.email || "";

                          return (
                            <div key={entry?._id || entry?.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700">
                                  <UserRound size={17} className="text-slate-500 dark:text-slate-300" />
                                </div>
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-medium text-slate-900 dark:text-white">{studentName}</p>
                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                                      #{entry.position || "?"}
                                    </span>
                                  </div>
                                  {studentEmail && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{studentEmail}</p>
                                  )}
                                </div>
                              </div>
                              <span className={`pl-12 sm:pl-0 self-start rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${getStatusBadge(entry.status)}`}>
                                {entry.status}
                              </span>
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
                  Page {safePage} of {totalPages} ({filteredEntries.length} entries)
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

export default CounsellorWaitlistPage;
