import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import {
  CalendarDays,
  Clock3,
  LogOut,
  Plus,
  RefreshCw,
  UserRound,
  Users,
  X,
  CheckCircle2,
  XCircle,
} from "lucide-react";

import {
  useGetSlotsQuery,
  useCreateSlotMutation,
  useUpdateSlotMutation,
} from "../../features/slots/slotApi";

import {
  useLogoutMutation,
} from "../../features/auth/authApi";

import {
  clearCredentials,
} from "../../features/auth/authSlice";

import DarkModeToggle from "../../components/DarkModeToggle";
import RealtimeStatus from "../../components/RealtimeStatus";

import {
  useGetCounsellorBookingsQuery,
  useMarkBookingOutcomeMutation,
} from "../../features/counsellor/counsellorApi";


function getErrorMessage(error, fallback) {
  return (
    error?.data?.message ||
    error?.data?.error?.message ||
    error?.message ||
    fallback
  );
}


function formatDate(value) {
  if (!value) return "--";

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


function toIsoDateTime(date, time) {
  if (!date || !time) {
    return null;
  }

  const value = new Date(
    `${date}T${time}`
  );

  if (Number.isNaN(value.getTime())) {
    return null;
  }

  return value.toISOString();
}


function toDateKey(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}


function getBookingId(booking) {
  return booking?._id || booking?.id;
}


function getBookingStudentName(booking) {
  return (
    booking?.studentId?.name ||
    booking?.student?.name ||
    booking?.studentName ||
    "Student"
  );
}


function getBookingStudentEmail(booking) {
  return (
    booking?.studentId?.email ||
    booking?.student?.email ||
    booking?.studentEmail ||
    ""
  );
}


const getBookingSlot = (booking) => {
  if (
    booking?.slotId &&
    typeof booking.slotId === "object"
  ) {
    return booking.slotId;
  }

  if (
    booking?.slot &&
    typeof booking.slot === "object"
  ) {
    return booking.slot;
  }

  return null;
};


const getBookingSlotId = (booking) => {
  const slot = getBookingSlot(booking);

  return (
    slot?._id ||
    slot?.id ||
    booking?.slotId?._id ||
    booking?.slotId ||
    booking?.slot?._id ||
    booking?.slot ||
    null
  );
};


function CounsellorDashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const user = useSelector(
    (state) => state.auth.user
  );

  /*
   * ==========================================
   * SLOT API
   * ==========================================
   */

  const {
    data: slotsResponse,
    isLoading: slotsLoading,
    isFetching: slotsFetching,
    error: slotsError,
    refetch: refetchSlots,
  } = useGetSlotsQuery({
    counsellorId: user?.id || user?._id,
  }, {
    skip: !user?.id && !user?._id,
  });

  const slots = useMemo(() => {
    if (!slotsResponse) return [];
    if (Array.isArray(slotsResponse)) return slotsResponse;
    return slotsResponse?.slots || [];
  }, [slotsResponse]);


  const [
    createSlot,
    createSlotState,
  ] = useCreateSlotMutation();


  const [
    updateSlot,
    updateSlotState,
  ] = useUpdateSlotMutation();


  /*
   * ==========================================
   * BOOKING API
   * ==========================================
   */

  const {
    data: bookings = [],
    isLoading: bookingsLoading,
    isFetching: bookingsFetching,
    error: bookingsError,
    refetch: refetchBookings,
  } = useGetCounsellorBookingsQuery(
    undefined,
    {
      skip: !user?.id && !user?._id,
    }
  );


  const [
    markBookingOutcome,
    outcomeState,
  ] = useMarkBookingOutcomeMutation();


  /*
   * ==========================================
   * AUTH
   * ==========================================
   */

  const [
    logout,
    logoutState,
  ] = useLogoutMutation();


  /*
   * ==========================================
   * LOCAL STATE
   * ==========================================
   */

  const [
    notice,
    setNotice,
  ] = useState(null);

  const [
    selectedDate,
    setSelectedDate,
  ] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });

  const [
    form,
    setForm,
  ] = useState({
    date: "",
    startTime: "",
    endTime: "",
    capacity: "1",
  });


  /*
   * ==========================================
   * SORT SLOTS
   * ==========================================
   */

  const sortedSlots = useMemo(() => {
    return [...slots].sort(
      (a, b) =>
        new Date(a.startAt) -
        new Date(b.startAt)
    );
  }, [slots]);


  /*
   * ==========================================
   * FILTER SLOTS BY SELECTED DATE
   * ==========================================
   */

  const filteredSlots = useMemo(() => {
    if (!selectedDate) return sortedSlots;

    return sortedSlots.filter((slot) => {
      const slotDate = toDateKey(slot.startAt);
      return slotDate === selectedDate;
    });
  }, [sortedSlots, selectedDate]);


  /*
   * ==========================================
   * GROUP BOOKINGS BY SLOT
   * ==========================================
   */

  const bookingsBySlot = useMemo(() => {
    const map = {};

    for (const booking of bookings) {
      const slotId = getBookingSlotId(booking);
      if (!slotId) continue;

      if (!map[slotId]) {
        map[slotId] = [];
      }
      map[slotId].push(booking);
    }

    return map;
  }, [bookings]);


  /*
   * ==========================================
   * UNIQUE DATES FOR FILTER
   * ==========================================
   */

  const availableDates = useMemo(() => {
    const dates = new Set();
    for (const slot of sortedSlots) {
      const key = toDateKey(slot.startAt);
      if (key) dates.add(key);
    }
    return Array.from(dates).sort();
  }, [sortedSlots]);


  /*
   * ==========================================
   * CREATE SLOT
   * ==========================================
   */

  const handleCreateSlot = async (event) => {
    event.preventDefault();

    setNotice(null);

    const startAt = toIsoDateTime(
      form.date,
      form.startTime
    );

    const endAt = toIsoDateTime(
      form.date,
      form.endTime
    );

    if (!startAt || !endAt) {
      setNotice({
        type: "error",
        message:
          "Please provide a valid date, start time and end time.",
      });

      return;
    }

    if (
      new Date(endAt) <=
      new Date(startAt)
    ) {
      setNotice({
        type: "error",
        message:
          "End time must be after start time.",
      });

      return;
    }

    const capacity =
      Number(form.capacity);

    if (
      !Number.isInteger(capacity) ||
      capacity < 1 ||
      capacity > 100
    ) {
      setNotice({
        type: "error",
        message:
          "Capacity must be between 1 and 100.",
      });

      return;
    }

    try {
      await createSlot({
        startAt,
        endAt,
        capacity,
      }).unwrap();

      setForm({
        date: "",
        startTime: "",
        endTime: "",
        capacity: "1",
      });

      setNotice({
        type: "success",
        message:
          "Counselling slot created successfully.",
      });
    } catch (error) {
      setNotice({
        type: "error",
        message: getErrorMessage(
          error,
          "Unable to create slot."
        ),
      });
    }
  };


  /*
   * ==========================================
   * CLOSE SLOT
   * ==========================================
   */

  const handleCloseSlot = async (slot) => {
    const slotId =
      slot?._id || slot?.id;

    if (
      !slotId ||
      updateSlotState.isLoading
    ) {
      return;
    }

    setNotice(null);

    try {
      await updateSlot({
        slotId,
        status: "closed",
        version: slot.version,
      }).unwrap();

      setNotice({
        type: "success",
        message:
          "Slot closed successfully.",
      });
    } catch (error) {
      setNotice({
        type: "error",
        message: getErrorMessage(
          error,
          "Unable to close this slot."
        ),
      });
    }
  };


  /*
   * ==========================================
   * CANCEL SLOT
   * ==========================================
   */

  const handleCancelSlot = async (slot) => {
    const slotId =
      slot?._id || slot?.id;

    if (
      !slotId ||
      updateSlotState.isLoading
    ) {
      return;
    }

    setNotice(null);

    try {
      await updateSlot({
        slotId,
        status: "cancelled",
        version: slot.version,
      }).unwrap();

      setNotice({
        type: "success",
        message:
          "Slot cancelled successfully.",
      });
    } catch (error) {
      setNotice({
        type: "error",
        message: getErrorMessage(
          error,
          "Unable to cancel this slot."
        ),
      });
    }
  };


  /*
   * ==========================================
   * BOOKING OUTCOME
   * ==========================================
   */

  const handleOutcome = async (
    booking,
    outcome
  ) => {
    const bookingId =
      getBookingId(booking);

    if (
      !bookingId ||
      outcomeState.isLoading
    ) {
      return;
    }

    setNotice(null);

    try {
      await markBookingOutcome({
        bookingId,
        outcome,
      }).unwrap();

      setNotice({
        type: "success",
        message:
          `Booking marked as ${outcome.replace(
            "_",
            " "
          )}.`,
      });

      await refetchBookings();
    } catch (error) {
      setNotice({
        type: "error",
        message: getErrorMessage(
          error,
          "Unable to update booking outcome."
        ),
      });
    }
  };


  /*
   * ==========================================
   * LOGOUT
   * ==========================================
   */

  const handleLogout = async () => {
    try {
      await logout().unwrap();
    } catch {
      // Local logout still happens.
    } finally {
      dispatch(clearCredentials());
      navigate("/login", { replace: true });
    }
  };


  const handleRefresh = () => {
    refetchSlots();
    refetchBookings();
  };


  const isInitialLoading =
    slotsLoading ||
    bookingsLoading;


  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">

      {/* =====================================
          HEADER
      ====================================== */}

      <header className="border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-4 sm:py-4 lg:px-8">

          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-white sm:text-xl">
              SlotSync
            </h1>

            <p className="text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
              Counsellor Portal
            </p>
          </div>


          <div className="flex items-center gap-1.5 sm:gap-3">
            <RealtimeStatus />
            <DarkModeToggle />
            <div className="hidden items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 sm:flex dark:bg-slate-700">
              <UserRound
                size={17}
                className="text-slate-500 dark:text-slate-300"
              />

              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {user?.name ||
                  user?.email ||
                  "Counsellor"}
              </span>
            </div>


            <button
              type="button"
              onClick={handleLogout}
              disabled={
                logoutState.isLoading
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 sm:gap-2 sm:px-3 sm:py-2 sm:text-sm"
            >
              <LogOut size={14} />

              {logoutState.isLoading
                ? "Signing out..."
                : "Logout"}
            </button>

          </div>
        </div>
      </header>


      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6 lg:px-8">

        {/* =====================================
            HERO
        ====================================== */}

        <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-800">

          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">

            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-600">
                Counsellor Dashboard
              </p>

              <h2 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
                Manage your counselling sessions
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                Create appointment slots, manage
                availability, and record booking
                outcomes.
              </p>
            </div>


            <button
              type="button"
              onClick={handleRefresh}
              disabled={
                slotsFetching ||
                bookingsFetching
              }
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
            >
              <RefreshCw
                size={16}
                className={
                  slotsFetching ||
                  bookingsFetching
                    ? "animate-spin"
                    : ""
                }
              />

              Refresh
            </button>

          </div>
        </section>


        {/* =====================================
            NOTICE
        ====================================== */}

        {notice && (
          <div
            className={`mb-6 rounded-xl border p-4 text-sm ${
              notice.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300"
            }`}
          >
            {notice.message}
          </div>
        )}


        {/* =====================================
            CREATE SLOT
        ====================================== */}

        <section className="mb-10 rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-800">

          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <Plus size={19} />
            </div>

            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Create Slot
              </h3>

              <p className="text-sm text-slate-500 dark:text-slate-400">
                Create a new counselling appointment.
              </p>
            </div>
          </div>


          <form
            onSubmit={handleCreateSlot}
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
          >

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Date
              </label>

              <input
                type="date"
                value={form.date}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    date:
                      event.target.value,
                  }))
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:focus:ring-blue-900/40"
                required
              />
            </div>


            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Start Time
              </label>

              <input
                type="time"
                value={form.startTime}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    startTime:
                      event.target.value,
                  }))
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:focus:ring-blue-900/40"
                required
              />
            </div>


            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                End Time
              </label>

              <input
                type="time"
                value={form.endTime}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    endTime:
                      event.target.value,
                  }))
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:focus:ring-blue-900/40"
                required
              />
            </div>


            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Capacity
              </label>

              <input
                type="number"
                min="1"
                max="100"
                value={form.capacity}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    capacity:
                      event.target.value,
                  }))
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:focus:ring-blue-900/40"
                required
              />
            </div>


            <div className="md:col-span-2 lg:col-span-4">

              <button
                type="submit"
                disabled={
                  createSlotState.isLoading
                }
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus size={17} />

                {createSlotState.isLoading
                  ? "Creating..."
                  : "Create Slot"}
              </button>

            </div>

          </form>
        </section>


        {/* =====================================
            DAY VIEW FILTER
        ====================================== */}

        <section className="mb-6">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                My Slots
              </h3>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Manage the counselling sessions you created.
              </p>
            </div>


            <div className="flex items-center gap-2">

              <CalendarDays
                size={16}
                className="text-slate-400"
              />

              <select
                value={selectedDate}
                onChange={(e) =>
                  setSelectedDate(e.target.value)
                }
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              >
                <option value="">
                  All Dates
                </option>

                {availableDates.map((date) => (
                  <option key={date} value={date}>
                    {formatDate(date)}
                  </option>
                ))}
              </select>

            </div>

          </div>

        </section>


        {/* =====================================
            SLOTS
        ====================================== */}

        <section className="mb-10">

          {slotsError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
              {getErrorMessage(
                slotsError,
                "Unable to load slots."
              )}
            </div>
          ) : isInitialLoading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-64 animate-pulse rounded-2xl bg-white shadow-sm dark:bg-slate-800"
                />
              ))}
            </div>
          ) : filteredSlots.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-600 dark:bg-slate-800">

              <CalendarDays
                size={38}
                className="mx-auto text-slate-400"
              />

              <h4 className="mt-4 font-semibold text-slate-900 dark:text-white">
                {selectedDate
                  ? "No slots on this date"
                  : "No slots created yet"}
              </h4>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {selectedDate
                  ? "Try selecting a different date or create a new slot."
                  : "Create your first counselling slot above."}
              </p>

            </div>
          ) : (
            <div className="space-y-6">

              {filteredSlots.map((slot) => {

                const slotId =
                  slot?._id ||
                  slot?.id;

                const capacity =
                  Number(slot.capacity) || 0;

                const booked =
                  Number(slot.bookedCount) || 0;

                const seatsLeft =
                  Math.max(
                    0,
                    capacity - booked
                  );

                const isOpen =
                  slot.status === "open";

                const slotBookings =
                  bookingsBySlot[slotId] || [];

                return (
                  <article
                    key={slotId}
                    className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700"
                  >

                    {/* Slot Header */}
                    <div className="flex items-start justify-between gap-3">

                      <div>
                        <p className="text-sm font-semibold text-blue-600">
                          Counselling Session
                        </p>

                        <h4 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                          {formatDate(
                            slot.startAt
                          )}
                        </h4>
                      </div>


                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                          slot.status === "open"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                            : slot.status ===
                                "cancelled"
                              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {slot.status}
                      </span>

                    </div>


                    {/* Slot Details */}
                    <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-300">

                      <div className="flex items-center gap-2">
                        <Clock3
                          size={16}
                          className="text-slate-400"
                        />

                        <span>
                          {formatTime(
                            slot.startAt
                          )}{" "}
                          -{" "}
                          {formatTime(
                            slot.endAt
                          )}
                        </span>
                      </div>


                      <div className="flex items-center gap-2">
                        <Users
                          size={16}
                          className="text-slate-400"
                        />

                        <span>
                          {booked} booked /{" "}
                          {capacity} capacity
                        </span>
                      </div>


                      <div className="font-medium text-slate-600 dark:text-slate-300">
                        {seatsLeft} seat
                        {seatsLeft === 1
                          ? ""
                          : "s"}{" "}
                        remaining
                      </div>

                    </div>


                    {/* Slot Actions */}
                    {isOpen && (
                      <div className="mt-4 flex gap-2">

                        <button
                          type="button"
                          onClick={() =>
                            handleCloseSlot(
                              slot
                            )
                          }
                          disabled={
                            updateSlotState.isLoading
                          }
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                        >
                          Close
                        </button>


                        <button
                          type="button"
                          onClick={() =>
                            handleCancelSlot(
                              slot
                            )
                          }
                          disabled={
                            updateSlotState.isLoading
                          }
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30"
                        >
                          <span className="inline-flex items-center justify-center gap-1">
                            <X size={15} />
                            Cancel
                          </span>
                        </button>

                      </div>
                    )}


                    {/* Booking Roster for this Slot */}
                    {slotBookings.length > 0 && (
                      <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-700">

                        <h5 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                          Bookings ({slotBookings.length})
                        </h5>

                        <div className="space-y-2">

                          {slotBookings.map((booking) => {

                            const bookingId =
                              getBookingId(booking);

                            const status =
                              booking.status ||
                              "booked";

                            return (
                              <div
                                key={bookingId}
                                className="flex flex-col gap-3 rounded-lg bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between dark:bg-slate-700"
                              >

                                <div>

                                  <div className="flex flex-wrap items-center gap-2">

                                    <span className="font-medium text-slate-900 dark:text-white">
                                      {getBookingStudentName(
                                        booking
                                      )}
                                    </span>

                                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold capitalize text-slate-600 dark:bg-slate-600 dark:text-slate-300">
                                      {status.replace(
                                        "_",
                                        " "
                                      )}
                                    </span>

                                  </div>


                                  {getBookingStudentEmail(
                                    booking
                                  ) && (
                                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                      {getBookingStudentEmail(
                                        booking
                                      )}
                                    </p>
                                  )}

                                </div>


                                {status === "booked" && (
                                  <div className="flex gap-2">

                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleOutcome(
                                          booking,
                                          "attended"
                                        )
                                      }
                                      disabled={
                                        outcomeState.isLoading
                                      }
                                      className="inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                                    >
                                      <CheckCircle2
                                        size={13}
                                      />

                                      Attended
                                    </button>


                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleOutcome(
                                          booking,
                                          "no_show"
                                        )
                                      }
                                      disabled={
                                        outcomeState.isLoading
                                      }
                                      className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30"
                                    >
                                      <XCircle
                                        size={13}
                                      />

                                      No Show
                                    </button>

                                  </div>
                                )}

                              </div>
                            );
                          })}

                        </div>

                      </div>
                    )}

                  </article>
                );
              })}

            </div>
          )}

        </section>

      </main>
    </div>
  );
}

export default CounsellorDashboard;
