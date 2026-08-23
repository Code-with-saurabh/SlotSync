import { useState } from "react";

import {
  useGetSlotsQuery,
  useCreateSlotMutation,
  useUpdateSlotMutation,
} from "../../features/slots/slotApi";

import {
  useGetAuditLogsQuery,
} from "../../features/admin/adminApi";


/*
 * ==================================================
 * HELPERS
 * ==================================================
 */

function getErrorMessage(error, fallback) {
  return (
    error?.data?.message ||
    error?.data?.error?.message ||
    error?.message ||
    fallback
  );
}


function extractSlots(response) {
  if (Array.isArray(response?.data?.slots)) {
    return response.data.slots;
  }

  if (Array.isArray(response?.slots)) {
    return response.slots;
  }

  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  return [];
}


function extractAuditLogs(response) {
  if (Array.isArray(response?.data?.logs)) {
    return response.data.logs;
  }

  if (Array.isArray(response?.logs)) {
    return response.logs;
  }

  if (Array.isArray(response)) {
    return response;
  }

  return [];
}


function extractPagination(response) {
  return (
    response?.data?.pagination ||
    response?.pagination ||
    null
  );
}


function getCounsellorName(slot) {
  return (
    slot?.counsellor?.name ||
    slot?.counsellor?.fullName ||
    slot?.counsellorName ||
    slot?.counsellorId?.name ||
    "Counsellor"
  );
}


function formatDateTime(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}


function toDateTimeLocal(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset =
    date.getTimezoneOffset();

  const localDate =
    new Date(
      date.getTime() -
        offset * 60 * 1000
    );

  return localDate
    .toISOString()
    .slice(0, 16);
}


function getStatusClasses(status) {
  switch (status) {
    case "open":
      return "bg-emerald-100 text-emerald-700";

    case "closed":
      return "bg-amber-100 text-amber-700";

    case "cancelled":
      return "bg-red-100 text-red-700";

    default:
      return "bg-slate-100 text-slate-700";
  }
}


/*
 * ==================================================
 * ADMIN DASHBOARD
 * ==================================================
 */

function AdminDashboard() {

  /*
   * ==================================================
   * STATE
   * ==================================================
   */

  const [
    isCreateOpen,
    setIsCreateOpen,
  ] = useState(false);

  const [
    editingSlot,
    setEditingSlot,
  ] = useState(null);

  const [
    auditPage,
    setAuditPage,
  ] = useState(1);


  /*
   * ==================================================
   * API
   * ==================================================
   */

  const {
    data: auditResponse,
    isLoading: auditLoading,
    isError: auditIsError,
    error: auditError,
  } = useGetAuditLogsQuery({
    page: auditPage,
    limit: 10,
  });


  const {
    data: slotsResponse,
    isLoading: slotsLoading,
    isFetching: slotsFetching,
    isError: slotsIsError,
    error: slotsError,
  } = useGetSlotsQuery();


  const [
    createSlot,
    {
      isLoading: isCreatingSlot,
    },
  ] = useCreateSlotMutation();


  const [
    updateSlot,
    {
      isLoading: isUpdatingSlot,
    },
  ] = useUpdateSlotMutation();


  /*
   * ==================================================
   * NORMALIZED DATA
   * ==================================================
   */

  const slots =
    extractSlots(
      slotsResponse
    );

  const logs =
    extractAuditLogs(
      auditResponse
    );

  const pagination =
    extractPagination(
      auditResponse
    );


  /*
   * ==================================================
   * CREATE SLOT
   * ==================================================
   */

  async function handleCreateSlot(
    event
  ) {
    event.preventDefault();

    const form =
      new FormData(
        event.currentTarget
      );

    const counsellorId =
      form.get(
        "counsellorId"
      );

    const startAt =
      form.get("startAt");

    const endAt =
      form.get("endAt");

    const capacity =
      Number(
        form.get("capacity")
      );


    try {

      await createSlot({
        counsellorId,
        startAt: new Date(
          startAt
        ).toISOString(),
        endAt: new Date(
          endAt
        ).toISOString(),
        capacity,
      }).unwrap();


      setIsCreateOpen(
        false
      );

    } catch (error) {

      window.alert(
        getErrorMessage(
          error,
          "Failed to create slot."
        )
      );
    }
  }


  /*
   * ==================================================
   * UPDATE SLOT
   * ==================================================
   */

  async function handleUpdateSlot(
    event
  ) {
    event.preventDefault();

    if (!editingSlot) {
      return;
    }

    const form =
      new FormData(
        event.currentTarget
      );

    const startAt =
      form.get("startAt");

    const endAt =
      form.get("endAt");

    const capacity =
      Number(
        form.get("capacity")
      );

    const status =
      form.get("status");


    try {

      await updateSlot({
        slotId:
          editingSlot._id ||
          editingSlot.id,

        startAt:
          new Date(
            startAt
          ).toISOString(),

        endAt:
          new Date(
            endAt
          ).toISOString(),

        capacity,

        status,
      }).unwrap();


      setEditingSlot(
        null
      );

    } catch (error) {

      window.alert(
        getErrorMessage(
          error,
          "Failed to update slot."
        )
      );
    }
  }


  /*
   * ==================================================
   * SUMMARY
   * ==================================================
   */

  const totalSlots =
    slots.length;

  const openSlots =
    slots.filter(
      (slot) =>
        slot?.status === "open"
    ).length;

  const closedSlots =
    slots.filter(
      (slot) =>
        slot?.status === "closed"
    ).length;

  const cancelledSlots =
    slots.filter(
      (slot) =>
        slot?.status === "cancelled"
    ).length;


  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6 lg:p-8">

      <div className="mx-auto max-w-7xl">


        {/* ==================================================
            HEADER
        ================================================== */}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Admin Dashboard
            </h1>

            <p className="mt-2 text-sm text-slate-600 sm:text-base">
              Manage SlotSync slots, monitor activity and review platform operations.
            </p>

          </div>


          <button
            type="button"
            onClick={() =>
              setIsCreateOpen(true)
            }
            className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            + Create Slot
          </button>

        </div>


        {/* ==================================================
            OVERVIEW
        ================================================== */}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">


          <div className="rounded-xl bg-white p-6 shadow-sm">

            <p className="text-sm font-medium text-slate-500">
              Total Slots
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {slotsLoading
                ? "..."
                : totalSlots}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Currently loaded
            </p>

          </div>


          <div className="rounded-xl bg-white p-6 shadow-sm">

            <p className="text-sm font-medium text-slate-500">
              Open Slots
            </p>

            <p className="mt-2 text-3xl font-bold text-emerald-600">
              {slotsLoading
                ? "..."
                : openSlots}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Available for booking
            </p>

          </div>


          <div className="rounded-xl bg-white p-6 shadow-sm">

            <p className="text-sm font-medium text-slate-500">
              Closed Slots
            </p>

            <p className="mt-2 text-3xl font-bold text-amber-600">
              {slotsLoading
                ? "..."
                : closedSlots}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Not currently open
            </p>

          </div>


          <div className="rounded-xl bg-white p-6 shadow-sm">

            <p className="text-sm font-medium text-slate-500">
              Audit Records
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {auditLoading
                ? "..."
                : pagination?.total ??
                  logs.length}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Platform activity
            </p>

          </div>

        </div>


        {/* ==================================================
            SLOT MANAGEMENT
        ================================================== */}

        <div className="mt-8 overflow-hidden rounded-xl bg-white shadow-sm">


          <div className="flex flex-col gap-3 border-b border-slate-200 p-6 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <h2 className="text-xl font-semibold text-slate-900">
                Slot Management
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                View and manage counselling slots.
              </p>

            </div>


            {slotsFetching &&
              !slotsLoading && (
                <span className="text-sm text-blue-600">
                  Refreshing...
                </span>
              )}

          </div>


          {slotsLoading && (

            <div className="p-8 text-center text-sm text-slate-500">
              Loading slots...
            </div>

          )}


          {slotsIsError && (

            <div className="p-8">

              <p className="font-semibold text-red-600">
                Failed to load slots.
              </p>

              <p className="mt-1 text-sm text-red-500">
                {getErrorMessage(
                  slotsError,
                  "Please try again."
                )}
              </p>

            </div>

          )}


          {!slotsLoading &&
            !slotsIsError &&
            slots.length === 0 && (

              <div className="p-8 text-center">

                <p className="font-medium text-slate-700">
                  No slots found.
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Create the first counselling slot.
                </p>

              </div>

          )}


          {!slotsLoading &&
            !slotsIsError &&
            slots.length > 0 && (

              <div className="overflow-x-auto">

                <table className="min-w-full text-left text-sm">

                  <thead className="bg-slate-50">

                    <tr>

                      <th className="px-6 py-4 font-semibold text-slate-600">
                        Slot
                      </th>

                      <th className="px-6 py-4 font-semibold text-slate-600">
                        Counsellor
                      </th>

                      <th className="px-6 py-4 font-semibold text-slate-600">
                        Capacity
                      </th>

                      <th className="px-6 py-4 font-semibold text-slate-600">
                        Booked
                      </th>

                      <th className="px-6 py-4 font-semibold text-slate-600">
                        Seats
                      </th>

                      <th className="px-6 py-4 font-semibold text-slate-600">
                        Status
                      </th>

                      <th className="px-6 py-4 font-semibold text-slate-600">
                        Action
                      </th>

                    </tr>

                  </thead>


                  <tbody className="divide-y divide-slate-100">

                    {slots.map(
                      (slot) => {

                        const capacity =
                          Number(
                            slot?.capacity
                          ) || 0;

                        const bookedCount =
                          Number(
                            slot?.bookedCount
                          ) || 0;

                        const seatsLeft =
                          Math.max(
                            0,
                            capacity -
                              bookedCount
                          );

                        const status =
                          slot?.status ||
                          "open";

                        const slotId =
                          slot?._id ||
                          slot?.id;


                        return (

                          <tr
                            key={slotId}
                            className="transition hover:bg-slate-50"
                          >


                            <td className="px-6 py-4">

                              <div className="font-medium text-slate-900">
                                {formatDateTime(
                                  slot?.startAt
                                )}
                              </div>

                              <div className="mt-1 text-xs text-slate-500">
                                Until{" "}
                                {formatDateTime(
                                  slot?.endAt
                                )}
                              </div>

                            </td>


                            <td className="px-6 py-4 text-slate-600">
                              {getCounsellorName(
                                slot
                              )}
                            </td>


                            <td className="px-6 py-4 text-slate-600">
                              {capacity}
                            </td>


                            <td className="px-6 py-4 text-slate-600">
                              {bookedCount}
                            </td>


                            <td className="px-6 py-4">

                              <span
                                className={
                                  seatsLeft === 0
                                    ? "font-semibold text-red-600"
                                    : "font-semibold text-emerald-600"
                                }
                              >
                                {seatsLeft}
                              </span>

                            </td>


                            <td className="px-6 py-4">

                              <span
                                className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClasses(
                                  status
                                )}`}
                              >
                                {status}
                              </span>

                            </td>


                            <td className="px-6 py-4">

                              <button
                                type="button"
                                onClick={() =>
                                  setEditingSlot(
                                    slot
                                  )
                                }
                                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                              >
                                Edit
                              </button>

                            </td>

                          </tr>

                        );
                      }
                    )}

                  </tbody>

                </table>

              </div>

          )}

        </div>


        {/* ==================================================
            AUDIT LOGS
        ================================================== */}

        <div className="mt-8 overflow-hidden rounded-xl bg-white shadow-sm">


          <div className="border-b border-slate-200 p-6">

            <h2 className="text-xl font-semibold text-slate-900">
              Recent Platform Activity
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Latest audit records from SlotSync.
            </p>

          </div>


          {auditLoading && (

            <div className="p-8 text-center text-sm text-slate-500">
              Loading audit logs...
            </div>

          )}


          {auditIsError && (

            <div className="p-8">

              <p className="font-semibold text-red-600">
                Failed to load audit logs.
              </p>

              <p className="mt-1 text-sm text-red-500">
                {getErrorMessage(
                  auditError,
                  "Please try again."
                )}
              </p>

            </div>

          )}


          {!auditLoading &&
            !auditIsError &&
            logs.length === 0 && (

              <div className="p-8 text-center text-sm text-slate-500">
                No audit activity found.
              </div>

          )}


          {!auditLoading &&
            !auditIsError &&
            logs.length > 0 && (

              <>

                <div className="overflow-x-auto">

                  <table className="min-w-full text-left text-sm">

                    <thead className="bg-slate-50">

                      <tr>

                        <th className="px-6 py-4 font-semibold text-slate-600">
                          Action
                        </th>

                        <th className="px-6 py-4 font-semibold text-slate-600">
                          Entity
                        </th>

                        <th className="px-6 py-4 font-semibold text-slate-600">
                          Entity ID
                        </th>

                        <th className="px-6 py-4 font-semibold text-slate-600">
                          Reason
                        </th>

                        <th className="px-6 py-4 font-semibold text-slate-600">
                          Date
                        </th>

                      </tr>

                    </thead>


                    <tbody className="divide-y divide-slate-100">

                      {logs.map(
                        (log) => (

                          <tr
                            key={
                              log?._id ||
                              log?.id
                            }
                            className="hover:bg-slate-50"
                          >

                            <td className="px-6 py-4">

                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                                {log?.action ||
                                  "—"}
                              </span>

                            </td>


                            <td className="px-6 py-4 font-medium text-slate-900">
                              {log?.entity ||
                                "—"}
                            </td>


                            <td className="max-w-xs truncate px-6 py-4 font-mono text-xs text-slate-500">
                              {log?.entityId ||
                                "—"}
                            </td>


                            <td className="px-6 py-4 text-slate-500">
                              {log?.reason ||
                                "—"}
                            </td>


                            <td className="px-6 py-4 text-slate-500">
                              {formatDateTime(
                                log?.createdAt
                              )}
                            </td>

                          </tr>

                      ))}

                    </tbody>

                  </table>

                </div>


                {/* Pagination */}

                <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">

                  <p className="text-sm text-slate-500">

                    Page{" "}
                    <span className="font-medium text-slate-700">
                      {pagination?.page ??
                        auditPage}
                    </span>

                    {" "}of{" "}

                    <span className="font-medium text-slate-700">
                      {pagination?.totalPages ??
                        1}
                    </span>

                  </p>


                  <div className="flex gap-2">

                    <button
                      type="button"
                      disabled={
                        !pagination?.hasPreviousPage
                      }
                      onClick={() =>
                        setAuditPage(
                          (page) =>
                            Math.max(
                              1,
                              page - 1
                            )
                        )
                      }
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Previous
                    </button>


                    <button
                      type="button"
                      disabled={
                        !pagination?.hasNextPage
                      }
                      onClick={() =>
                        setAuditPage(
                          (page) =>
                            page + 1
                        )
                      }
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                    </button>

                  </div>

                </div>

              </>

          )}

        </div>

      </div>


      {/* ==================================================
          CREATE SLOT MODAL
      ================================================== */}

      {isCreateOpen && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">

          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">

            <div className="border-b border-slate-200 p-6">

              <div className="flex items-center justify-between">

                <div>

                  <h2 className="text-xl font-semibold text-slate-900">
                    Create Slot
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Add a new counselling slot.
                  </p>

                </div>


                <button
                  type="button"
                  onClick={() =>
                    setIsCreateOpen(false)
                  }
                  className="text-2xl text-slate-400 hover:text-slate-700"
                >
                  ×
                </button>

              </div>

            </div>


            <form
              onSubmit={
                handleCreateSlot
              }
              className="space-y-5 p-6"
            >

              <div>

                <label className="text-sm font-medium text-slate-700">
                  Counsellor ID
                </label>

                <input
                  name="counsellorId"
                  required
                  placeholder="Counsellor ObjectId"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
                />

              </div>


              <div>

                <label className="text-sm font-medium text-slate-700">
                  Start Time
                </label>

                <input
                  type="datetime-local"
                  name="startAt"
                  required
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
                />

              </div>


              <div>

                <label className="text-sm font-medium text-slate-700">
                  End Time
                </label>

                <input
                  type="datetime-local"
                  name="endAt"
                  required
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
                />

              </div>


              <div>

                <label className="text-sm font-medium text-slate-700">
                  Capacity
                </label>

                <input
                  type="number"
                  name="capacity"
                  min="1"
                  required
                  placeholder="10"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
                />

              </div>


              <div className="flex justify-end gap-3 pt-2">

                <button
                  type="button"
                  onClick={() =>
                    setIsCreateOpen(false)
                  }
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  disabled={
                    isCreatingSlot
                  }
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {isCreatingSlot
                    ? "Creating..."
                    : "Create Slot"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}


      {/* ==================================================
          EDIT SLOT MODAL
      ================================================== */}

      {editingSlot && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">

          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">


            <div className="border-b border-slate-200 p-6">

              <div className="flex items-center justify-between">

                <div>

                  <h2 className="text-xl font-semibold text-slate-900">
                    Edit Slot
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Update slot information.
                  </p>

                </div>


                <button
                  type="button"
                  onClick={() =>
                    setEditingSlot(
                      null
                    )
                  }
                  className="text-2xl text-slate-400 hover:text-slate-700"
                >
                  ×
                </button>

              </div>

            </div>


            <form
              onSubmit={
                handleUpdateSlot
              }
              className="space-y-5 p-6"
            >

              <div>

                <label className="text-sm font-medium text-slate-700">
                  Start Time
                </label>

                <input
                  type="datetime-local"
                  name="startAt"
                  required
                  defaultValue={toDateTimeLocal(
                    editingSlot.startAt
                  )}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
                />

              </div>


              <div>

                <label className="text-sm font-medium text-slate-700">
                  End Time
                </label>

                <input
                  type="datetime-local"
                  name="endAt"
                  required
                  defaultValue={toDateTimeLocal(
                    editingSlot.endAt
                  )}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
                />

              </div>


              <div>

                <label className="text-sm font-medium text-slate-700">
                  Capacity
                </label>

                <input
                  type="number"
                  name="capacity"
                  min="1"
                  required
                  defaultValue={
                    editingSlot.capacity
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
                />

              </div>


              <div>

                <label className="text-sm font-medium text-slate-700">
                  Status
                </label>

                <select
                  name="status"
                  defaultValue={
                    editingSlot.status ||
                    "open"
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-slate-500"
                >

                  <option value="open">
                    Open
                  </option>

                  <option value="closed">
                    Closed
                  </option>

                  <option value="cancelled">
                    Cancelled
                  </option>

                </select>

              </div>


              <div className="flex justify-end gap-3 pt-2">

                <button
                  type="button"
                  onClick={() =>
                    setEditingSlot(
                      null
                    )
                  }
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  disabled={
                    isUpdatingSlot
                  }
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {isUpdatingSlot
                    ? "Saving..."
                    : "Save Changes"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}


export default AdminDashboard;