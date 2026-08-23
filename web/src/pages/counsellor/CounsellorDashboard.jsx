import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

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
// function getBookingSlot(booking) {
//   return (
//     booking?.slotId ||
//     booking?.slot ||
//     null
//   );
// }


function CounsellorDashboard() {
  const dispatch = useDispatch();

  const user = useSelector(
    (state) => state.auth.user
  );

  /*
   * ==========================================
   * SLOT API
   * ==========================================
   */

  const {
    data: slots = [],
    isLoading: slotsLoading,
    isFetching: slotsFetching,
    error: slotsError,
    refetch: refetchSlots,
  } = useGetSlotsQuery();


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
    user?.id || user?._id,
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
    <div className="min-h-screen bg-slate-100">

      {/* =====================================
          HEADER
      ====================================== */}

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">

          <div>
            <h1 className="text-xl font-bold text-slate-900">
              SlotSync
            </h1>

            <p className="text-sm text-slate-500">
              Counsellor Portal
            </p>
          </div>


          <div className="flex items-center gap-3">

            <div className="hidden items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 sm:flex">
              <UserRound
                size={17}
                className="text-slate-500"
              />

              <span className="text-sm font-medium text-slate-700">
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
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
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

        {/* =====================================
            HERO
        ====================================== */}

        <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">

          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">

            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-600">
                Counsellor Dashboard
              </p>

              <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                Manage your counselling sessions
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
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
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
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
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {notice.message}
          </div>
        )}


        {/* =====================================
            CREATE SLOT
        ====================================== */}

        <section className="mb-10 rounded-2xl bg-white p-6 shadow-sm">

          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <Plus size={19} />
            </div>

            <div>
              <h3 className="text-xl font-bold text-slate-900">
                Create Slot
              </h3>

              <p className="text-sm text-slate-500">
                Create a new counselling appointment.
              </p>
            </div>
          </div>


          <form
            onSubmit={handleCreateSlot}
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
          >

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
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
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>


            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
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
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>


            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
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
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>


            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
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
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
            SLOTS
        ====================================== */}

        <section className="mb-10">

          <div className="mb-4">
            <h3 className="text-xl font-bold text-slate-900">
              My Slots
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Manage the counselling sessions you created.
            </p>
          </div>


          {slotsError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
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
                  className="h-64 animate-pulse rounded-2xl bg-white shadow-sm"
                />
              ))}
            </div>
          ) : sortedSlots.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">

              <CalendarDays
                size={38}
                className="mx-auto text-slate-400"
              />

              <h4 className="mt-4 font-semibold text-slate-900">
                No slots created yet
              </h4>

              <p className="mt-1 text-sm text-slate-500">
                Create your first counselling slot above.
              </p>

            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

              {sortedSlots.map((slot) => {

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
                          {formatDate(
                            slot.startAt
                          )}
                        </h4>
                      </div>


                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                          slot.status === "open"
                            ? "bg-emerald-100 text-emerald-700"
                            : slot.status ===
                                "cancelled"
                              ? "bg-red-100 text-red-700"
                              : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {slot.status}
                      </span>

                    </div>


                    <div className="mt-5 space-y-3">

                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <Clock3
                          size={17}
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


                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <Users
                          size={17}
                          className="text-slate-400"
                        />

                        <span>
                          {booked} booked /{" "}
                          {capacity} capacity
                        </span>
                      </div>


                      <div className="text-sm font-medium text-slate-600">
                        {seatsLeft} seat
                        {seatsLeft === 1
                          ? ""
                          : "s"}{" "}
                        remaining
                      </div>

                    </div>


                    {isOpen && (
                      <div className="mt-auto flex gap-2 pt-6">

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
                          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
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
                          className="flex-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                        >
                          <span className="inline-flex items-center justify-center gap-1">
                            <X size={15} />
                            Cancel
                          </span>
                        </button>

                      </div>
                    )}

                  </article>
                );
              })}

            </div>
          )}

        </section>


        {/* =====================================
            BOOKINGS
        ====================================== */}

        <section>

          <div className="mb-4">
            <h3 className="text-xl font-bold text-slate-900">
              Booking Outcomes
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Record whether your students attended their sessions.
            </p>
          </div>


          {bookingsError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {getErrorMessage(
                bookingsError,
                "Unable to load bookings."
              )}
            </div>
          ) : bookings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">

              <Users
                size={38}
                className="mx-auto text-slate-400"
              />

              <h4 className="mt-4 font-semibold text-slate-900">
                No bookings yet
              </h4>

              <p className="mt-1 text-sm text-slate-500">
                Student bookings for your slots will appear here.
              </p>

            </div>
          ) : (
            <div className="space-y-3">

              {bookings.map((booking) => {

                const bookingId =
                  getBookingId(booking);

                const slot =
                  getBookingSlot(
                    booking
                  );

                const status =
                  booking.status ||
                  "booked";

                return (
                  <div
                    key={bookingId}
                    className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 md:flex-row md:items-center md:justify-between"
                  >

                    <div>

                      <div className="flex flex-wrap items-center gap-2">

                        <h4 className="font-semibold text-slate-900">
                          {getBookingStudentName(
                            booking
                          )}
                        </h4>

                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-600">
                          {status.replace(
                            "_",
                            " "
                          )}
                        </span>

                      </div>


                      {getBookingStudentEmail(
                        booking
                      ) && (
                        <p className="mt-1 text-sm text-slate-500">
                          {getBookingStudentEmail(
                            booking
                          )}
                        </p>
                      )}


                      {slot && (
                        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">

                          <span>
                            {formatDate(
                              slot.startAt
                            )}
                          </span>

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
                      )}

                    </div>


                    {status === "booked" && (
                      <div className="flex flex-col gap-2 sm:flex-row">

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
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <CheckCircle2
                            size={16}
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
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                        >
                          <XCircle
                            size={16}
                          />

                          No Show
                        </button>

                      </div>
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

export default CounsellorDashboard;