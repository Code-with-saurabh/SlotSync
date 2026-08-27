import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { LogOut } from "lucide-react";

import DarkModeToggle from "../../components/DarkModeToggle";
import RealtimeStatus from "../../components/RealtimeStatus";

import {
  useGetSlotsQuery,
  useCreateSlotMutation,
  useUpdateSlotMutation,
} from "../../features/slots/slotApi";

import {
  useGetInstituteAnalyticsQuery,
  useGetCounsellorAnalyticsQuery,
  useGetAuditLogsQuery,
} from "../../features/admin/adminApi";

import {
  useGetCounsellorsQuery,
  useCreateCounsellorMutation,
  useUpdateCounsellorMutation,
  useUpdateCounsellorStatusMutation,
} from "../../features/counsellor/counsellorApi";

import { useLogoutMutation } from "../../features/auth/authApi";
import { clearCredentials } from "../../features/auth/authSlice";


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


function extractCounsellors(response) {
  if (Array.isArray(response?.data?.counsellors)) {
    return response.data.counsellors;
  }
  if (Array.isArray(response?.counsellors)) {
    return response.counsellors;
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
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}


function toDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}


function getStatusClasses(status) {
  switch (status) {
    case "open":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
    case "closed":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
    case "cancelled":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200";
  }
}


const TABS = [
  { id: "slots", label: "Slots" },
  { id: "counsellors", label: "Counsellors" },
  { id: "analytics", label: "Analytics" },
  { id: "audit", label: "Audit Log" },
];


/*
 * ==================================================
 * ADMIN DASHBOARD
 * ==================================================
 */

function AdminDashboard() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState("slots");
  const [notice, setNotice] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [auditPage, setAuditPage] = useState(1);

  // Counsellor management state
  const [isCounsellorModalOpen, setIsCounsellorModalOpen] = useState(false);
  const [editingCounsellor, setEditingCounsellor] = useState(null);
  const [counsellorForm, setCounsellorForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  // Analytics state
  const [analyticsCounsellorId, setAnalyticsCounsellorId] = useState("");
  const [analyticsMode, setAnalyticsMode] = useState("institute");

  const [logout, logoutState] = useLogoutMutation();

  const handleLogout = async () => {
    try { await logout().unwrap(); } catch { }
    dispatch(clearCredentials());
    navigate("/login", { replace: true });
  };


  /*
   * ==================================================
   * API HOOKS
   * ==================================================
   */

  // Slots
  const {
    data: slotsResponse,
    isLoading: slotsLoading,
    isFetching: slotsFetching,
    error: slotsError,
  } = useGetSlotsQuery();

  const [createSlot, { isLoading: isCreatingSlot }] = useCreateSlotMutation();
  const [updateSlot, { isLoading: isUpdatingSlot }] = useUpdateSlotMutation();

  // Counsellors
  const {
    data: counsellorsResponse,
    isLoading: counsellorsLoading,
    error: counsellorsError,
  } = useGetCounsellorsQuery();

  const [createCounsellor, { isLoading: isCreatingCounsellor }] =
    useCreateCounsellorMutation();
  const [updateCounsellor, { isLoading: isUpdatingCounsellor }] =
    useUpdateCounsellorMutation();
  const [updateCounsellorStatus] = useUpdateCounsellorStatusMutation();

  // Institute analytics
  const {
    data: instituteData,
    isLoading: instituteLoading,
    error: instituteError,
  } = useGetInstituteAnalyticsQuery();

  // Per-counsellor analytics
  const {
    data: counsellorAnalyticsData,
    isLoading: counsellorAnalyticsLoading,
    error: counsellorAnalyticsError,
  } = useGetCounsellorAnalyticsQuery(analyticsCounsellorId, {
    skip: analyticsMode !== "counsellor" || !analyticsCounsellorId,
  });

  // Audit logs
  const {
    data: auditResponse,
    isLoading: auditLoading,
    error: auditError,
  } = useGetAuditLogsQuery({ page: auditPage, limit: 10 });


  /*
   * ==================================================
   * NORMALIZED DATA
   * ==================================================
   */

  const slots = extractSlots(slotsResponse);
  const counsellors = extractCounsellors(counsellorsResponse);
  const logs = extractAuditLogs(auditResponse);
  const pagination = extractPagination(auditResponse);
  const analyticsData = analyticsMode === "institute" ? instituteData : counsellorAnalyticsData;


  /*
   * ==================================================
   * SLOT HANDLERS
   * ==================================================
   */

  async function handleCreateSlot(event) {
    event.preventDefault();
    setNotice(null);

    const form = new FormData(event.currentTarget);
    const counsellorId = form.get("counsellorId");
    const startAt = form.get("startAt");
    const endAt = form.get("endAt");
    const capacity = Number(form.get("capacity"));

    try {
      await createSlot({
        counsellorId,
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        capacity,
      }).unwrap();

      setIsCreateOpen(false);
      setNotice({ type: "success", message: "Slot created successfully." });
    } catch (error) {
      setNotice({ type: "error", message: getErrorMessage(error, "Failed to create slot.") });
    }
  }

  async function handleUpdateSlot(event) {
    event.preventDefault();
    setNotice(null);
    if (!editingSlot) return;

    const form = new FormData(event.currentTarget);
    const startAt = form.get("startAt");
    const endAt = form.get("endAt");
    const capacity = Number(form.get("capacity"));
    const status = form.get("status");

    try {
      await updateSlot({
        slotId: editingSlot._id || editingSlot.id,
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        capacity,
        status,
      }).unwrap();

      setEditingSlot(null);
      setNotice({ type: "success", message: "Slot updated successfully." });
    } catch (error) {
      setNotice({ type: "error", message: getErrorMessage(error, "Failed to update slot.") });
    }
  }


  /*
   * ==================================================
   * COUNSELLOR HANDLERS
   * ==================================================
   */

  function openCreateCounsellor() {
    setEditingCounsellor(null);
    setCounsellorForm({ name: "", email: "", password: "" });
    setIsCounsellorModalOpen(true);
  }

  function openEditCounsellor(counsellor) {
    setEditingCounsellor(counsellor);
    setCounsellorForm({
      name: counsellor.name || "",
      email: counsellor.email || "",
      password: "",
    });
    setIsCounsellorModalOpen(true);
  }

  async function handleCreateCounsellor(event) {
    event.preventDefault();
    setNotice(null);

    try {
      await createCounsellor(counsellorForm).unwrap();
      setIsCounsellorModalOpen(false);
      setNotice({ type: "success", message: "Counsellor created successfully." });
    } catch (error) {
      setNotice({ type: "error", message: getErrorMessage(error, "Failed to create counsellor.") });
    }
  }

  async function handleUpdateCounsellor(event) {
    event.preventDefault();
    setNotice(null);
    if (!editingCounsellor) return;

    const updates = {
      counsellorId: editingCounsellor._id || editingCounsellor.id,
      name: counsellorForm.name,
      email: counsellorForm.email,
    };

    if (counsellorForm.password) {
      updates.password = counsellorForm.password;
    }

    try {
      await updateCounsellor(updates).unwrap();
      setIsCounsellorModalOpen(false);
      setEditingCounsellor(null);
      setNotice({ type: "success", message: "Counsellor updated successfully." });
    } catch (error) {
      setNotice({ type: "error", message: getErrorMessage(error, "Failed to update counsellor.") });
    }
  }

  async function handleToggleCounsellorStatus(counsellor) {
    setNotice(null);
    const newStatus = counsellor.isActive === false ? true : false;

    try {
      await updateCounsellorStatus({
        counsellorId: counsellor._id || counsellor.id,
        isActive: newStatus,
      }).unwrap();

      setNotice({
        type: "success",
        message: `Counsellor ${newStatus ? "activated" : "deactivated"} successfully.`,
      });
    } catch (error) {
      setNotice({ type: "error", message: getErrorMessage(error, "Failed to update status.") });
    }
  }


  /*
   * ==================================================
   * SUMMARY STATS
   * ==================================================
   */

  const totalSlots = slots.length;
  const openSlots = slots.filter((s) => s?.status === "open").length;
  const closedSlots = slots.filter((s) => s?.status === "closed").length;
  const totalCounsellors = counsellors.length;
  const activeCounsellors = counsellors.filter((c) => c.isActive !== false).length;


  /*
   * ==================================================
   * CHART DATA
   * ==================================================
   */

  const leadTimeChartData = (analyticsData?.leadTimeBuckets || []).map((bucket) => ({
    name: bucket._id === 0 ? "0-59" : bucket._id === 60 ? "60-239" : bucket._id === 240 ? "240-1439" : "1440+",
    count: bucket.count || 0,
  }));


  /*
   * ==================================================
   * RENDER
   * ==================================================
   */

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 p-3 sm:p-4 lg:p-8">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl lg:text-3xl">Admin Dashboard</h1>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 sm:mt-2 sm:text-sm">Manage SlotSync slots, counsellors, analytics and activity.</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <RealtimeStatus />
            <DarkModeToggle />
            <button
              type="button"
              onClick={handleLogout}
              disabled={logoutState.isLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 sm:gap-2 sm:px-3 sm:py-2 sm:text-sm"
            >
              <LogOut size={14} />
              {logoutState.isLoading ? "Signing out..." : "Logout"}
            </button>
          </div>
        </div>

        {/* NOTICE */}
        {notice && (
          <div className={`mt-4 rounded-xl border p-4 text-sm ${
            notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300"
          }`}>
            {notice.message}
          </div>
        )}

        {/* TABS */}
        <div className="mt-4 flex gap-1 overflow-x-auto rounded-xl bg-white p-1 shadow-sm sm:mt-6 dark:bg-slate-800">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition sm:flex-1 sm:px-4 sm:py-2.5 sm:text-sm ${
                activeTab === tab.id
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ==================================================
            TAB: SLOTS
        ================================================== */}
        {activeTab === "slots" && (
          <div className="mt-4 sm:mt-6">
            {/* Stats */}
            <div className="mb-4 grid grid-cols-3 gap-2 sm:mb-6 sm:gap-4">
              <div className="rounded-xl bg-white p-3 shadow-sm sm:p-5 dark:bg-slate-800">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 sm:text-sm">Total Slots</p>
                <p className="mt-1 text-xl font-bold text-slate-900 sm:text-3xl dark:text-white">{slotsLoading ? "..." : totalSlots}</p>
              </div>
              <div className="rounded-xl bg-white p-3 shadow-sm sm:p-5 dark:bg-slate-800">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 sm:text-sm">Open</p>
                <p className="mt-1 text-xl font-bold text-emerald-600 sm:text-3xl">{slotsLoading ? "..." : openSlots}</p>
              </div>
              <div className="rounded-xl bg-white p-3 shadow-sm sm:p-5 dark:bg-slate-800">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 sm:text-sm">Closed</p>
                <p className="mt-1 text-xl font-bold text-amber-600 sm:text-3xl">{slotsLoading ? "..." : closedSlots}</p>
              </div>
            </div>

            {/* Slot Table */}
            <div className="overflow-hidden rounded-xl bg-white shadow-sm dark:bg-slate-800">
              <div className="flex items-center justify-between border-b border-slate-200 p-3 sm:p-5 dark:border-slate-700">
                <h2 className="text-sm font-semibold text-slate-900 sm:text-lg dark:text-white">Slot Management</h2>
                <div className="flex gap-2">
                  {slotsFetching && <span className="text-xs text-blue-600 sm:text-sm">Refreshing...</span>}
                  <button onClick={() => setIsCreateOpen(true)} className="rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 sm:px-4 sm:text-sm">
                    + Create Slot
                  </button>
                </div>
              </div>

              {slotsLoading ? (
                <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">Loading slots...</div>
              ) : slotsError ? (
                <div className="p-8 text-sm text-red-600">{getErrorMessage(slotsError, "Failed to load slots.")}</div>
              ) : slots.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">No slots found. Create one above.</div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden overflow-x-auto md:block">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-700">
                        <tr>
                          <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-300">Slot</th>
                          <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-300">Counsellor</th>
                          <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-300">Capacity</th>
                          <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-300">Booked</th>
                          <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-300">Seats</th>
                          <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-300">Status</th>
                          <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-300">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {slots.map((slot) => {
                          const capacity = Number(slot?.capacity) || 0;
                          const bookedCount = Number(slot?.bookedCount) || 0;
                          const seatsLeft = Math.max(0, capacity - bookedCount);
                          const status = slot?.status || "open";
                          const slotId = slot?._id || slot?.id;

                          return (
                            <tr key={slotId} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                              <td className="px-5 py-3">
                                <div className="font-medium text-slate-900 dark:text-white">{formatDateTime(slot?.startAt)}</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">Until {formatDateTime(slot?.endAt)}</div>
                              </td>
                              <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{getCounsellorName(slot)}</td>
                              <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{capacity}</td>
                              <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{bookedCount}</td>
                              <td className="px-5 py-3">
                                <span className={seatsLeft === 0 ? "font-semibold text-red-600" : "font-semibold text-emerald-600"}>
                                  {seatsLeft}
                                </span>
                              </td>
                              <td className="px-5 py-3">
                                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClasses(status)}`}>
                                  {status}
                                </span>
                              </td>
                              <td className="px-5 py-3">
                                <button onClick={() => setEditingSlot(slot)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
                                  Edit
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="divide-y divide-slate-100 md:hidden dark:divide-slate-700">
                    {slots.map((slot) => {
                      const capacity = Number(slot?.capacity) || 0;
                      const bookedCount = Number(slot?.bookedCount) || 0;
                      const seatsLeft = Math.max(0, capacity - bookedCount);
                      const status = slot?.status || "open";

                      return (
                        <div key={slot?._id || slot?.id} className="p-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-sm font-medium text-slate-900 dark:text-white">{formatDateTime(slot?.startAt)}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">Until {formatDateTime(slot?.endAt)}</p>
                              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{getCounsellorName(slot)}</p>
                            </div>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusClasses(status)}`}>
                              {status}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <div className="flex gap-3 text-xs text-slate-600 dark:text-slate-400">
                              <span>{bookedCount}/{capacity} booked</span>
                              <span className={seatsLeft === 0 ? "font-semibold text-red-600" : "font-semibold text-emerald-600"}>
                                {seatsLeft} seats
                              </span>
                            </div>
                            <button onClick={() => setEditingSlot(slot)} className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
                              Edit
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ==================================================
            TAB: COUNSELLORS
        ================================================== */}
        {activeTab === "counsellors" && (
          <div className="mt-4 sm:mt-6">
            {/* Stats */}
            <div className="mb-4 grid grid-cols-2 gap-2 sm:mb-6 sm:gap-4">
              <div className="rounded-xl bg-white p-3 shadow-sm sm:p-5 dark:bg-slate-800">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 sm:text-sm">Total Counsellors</p>
                <p className="mt-1 text-xl font-bold text-slate-900 sm:text-3xl dark:text-white">{counsellorsLoading ? "..." : totalCounsellors}</p>
              </div>
              <div className="rounded-xl bg-white p-3 shadow-sm sm:p-5 dark:bg-slate-800">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 sm:text-sm">Active Counsellors</p>
                <p className="mt-1 text-xl font-bold text-emerald-600 sm:text-3xl">{counsellorsLoading ? "..." : activeCounsellors}</p>
              </div>
            </div>

            {/* Counsellor Table */}
            <div className="overflow-hidden rounded-xl bg-white shadow-sm dark:bg-slate-800">
              <div className="flex items-center justify-between border-b border-slate-200 p-3 sm:p-5 dark:border-slate-700">
                <h2 className="text-sm font-semibold text-slate-900 sm:text-lg dark:text-white">Counsellor Management</h2>
                <button onClick={openCreateCounsellor} className="rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 sm:px-4 sm:text-sm">
                  + Add Counsellor
                </button>
              </div>

              {counsellorsLoading ? (
                <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">Loading counsellors...</div>
              ) : counsellorsError ? (
                <div className="p-8 text-sm text-red-600">{getErrorMessage(counsellorsError, "Failed to load counsellors.")}</div>
              ) : counsellors.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">No counsellors found. Add one above.</div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden overflow-x-auto md:block">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-700">
                        <tr>
                          <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-300">Name</th>
                          <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-300">Email</th>
                          <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-300">Status</th>
                          <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-300">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {counsellors.map((counsellor) => {
                          const cid = counsellor?._id || counsellor?.id;
                          const isActive = counsellor?.isActive !== false;

                          return (
                            <tr key={cid} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                              <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">{counsellor?.name || "--"}</td>
                              <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{counsellor?.email || "--"}</td>
                              <td className="px-5 py-3">
                                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                  isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                }`}>
                                  {isActive ? "Active" : "Inactive"}
                                </span>
                              </td>
                              <td className="px-5 py-3">
                                <div className="flex gap-2">
                                  <button onClick={() => openEditCounsellor(counsellor)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
                                    Edit
                                  </button>
                                  <button onClick={() => handleToggleCounsellorStatus(counsellor)} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                                    isActive ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30" : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
                                  }`}>
                                    {isActive ? "Deactivate" : "Activate"}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="divide-y divide-slate-100 md:hidden dark:divide-slate-700">
                    {counsellors.map((counsellor) => {
                      const cid = counsellor?._id || counsellor?.id;
                      const isActive = counsellor?.isActive !== false;

                      return (
                        <div key={cid} className="p-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-sm font-medium text-slate-900 dark:text-white">{counsellor?.name || "--"}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{counsellor?.email || "--"}</p>
                            </div>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                            }`}>
                              {isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <div className="mt-2 flex gap-2">
                            <button onClick={() => openEditCounsellor(counsellor)} className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
                              Edit
                            </button>
                            <button onClick={() => handleToggleCounsellorStatus(counsellor)} className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                              isActive ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100" : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            }`}>
                              {isActive ? "Deactivate" : "Activate"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ==================================================
            TAB: ANALYTICS
        ================================================== */}
        {activeTab === "analytics" && (
          <div className="mt-4 sm:mt-6">
            {/* Mode Toggle */}
            <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center">
              <div className="flex gap-2">
                <button
                  onClick={() => setAnalyticsMode("institute")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition sm:px-4 sm:py-2 sm:text-sm ${
                    analyticsMode === "institute" ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  Institute-wide
                </button>
                <button
                  onClick={() => setAnalyticsMode("counsellor")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition sm:px-4 sm:py-2 sm:text-sm ${
                    analyticsMode === "counsellor" ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  Per Counsellor
                </button>
              </div>

              {analyticsMode === "counsellor" && (
                <select
                  value={analyticsCounsellorId}
                  onChange={(e) => setAnalyticsCounsellorId(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:focus:border-slate-400"
                >
                  <option value="">Select a counsellor</option>
                  {counsellors.map((c) => (
                    <option key={c._id || c.id} value={c._id || c.id}>
                      {c.name || c.email} ({c.email})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Loading / Error */}
            {analyticsMode === "institute" && instituteLoading && (
              <div className="rounded-xl bg-white p-8 text-center text-sm text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-400">Loading institute analytics...</div>
            )}
            {analyticsMode === "institute" && instituteError && (
              <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 shadow-sm dark:bg-red-900/30">
                {getErrorMessage(instituteError, "Failed to load institute analytics.")}
              </div>
            )}
            {analyticsMode === "counsellor" && !analyticsCounsellorId && (
              <div className="rounded-xl bg-white p-8 text-center text-sm text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-400">Select a counsellor to view their analytics.</div>
            )}
            {analyticsMode === "counsellor" && analyticsCounsellorId && counsellorAnalyticsLoading && (
              <div className="rounded-xl bg-white p-8 text-center text-sm text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-400">Loading counsellor analytics...</div>
            )}
            {analyticsMode === "counsellor" && counsellorAnalyticsError && (
              <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 shadow-sm dark:bg-red-900/30">
                {getErrorMessage(counsellorAnalyticsError, "Failed to load analytics.")}
              </div>
            )}

            {/* Analytics Content */}
            {analyticsData && (
              <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-slate-800">
                {/* Stats Grid */}
                <div className="mb-4 grid grid-cols-2 gap-2 sm:mb-6 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
                  {analyticsMode === "institute" && (
                    <div className="rounded-lg bg-slate-50 p-2.5 sm:p-4 dark:bg-slate-700">
                      <p className="text-xs text-slate-500 sm:text-sm dark:text-slate-400">Total Counsellors</p>
                      <p className="mt-1 text-lg font-bold text-slate-900 sm:text-2xl dark:text-white">{analyticsData.totalCounsellors ?? 0}</p>
                    </div>
                  )}
                  <div className="rounded-lg bg-slate-50 p-2.5 sm:p-4 dark:bg-slate-700">
                    <p className="text-xs text-slate-500 sm:text-sm dark:text-slate-400">Total Slots</p>
                    <p className="mt-1 text-lg font-bold text-slate-900 sm:text-2xl dark:text-white">{analyticsData.totalSlots ?? 0}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2.5 sm:p-4 dark:bg-slate-700">
                    <p className="text-xs text-slate-500 sm:text-sm dark:text-slate-400">Confirmed Bookings</p>
                    <p className="mt-1 text-lg font-bold text-slate-900 sm:text-2xl dark:text-white">{analyticsData.totalConfirmedBookings ?? 0}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2.5 sm:p-4 dark:bg-slate-700">
                    <p className="text-xs text-slate-500 sm:text-sm dark:text-slate-400">Utilisation</p>
                    <p className="mt-1 text-lg font-bold text-emerald-600 sm:text-2xl">{analyticsData.utilisationPercent ?? 0}%</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2.5 sm:p-4 dark:bg-slate-700">
                    <p className="text-xs text-slate-500 sm:text-sm dark:text-slate-400">Avg Lead Time</p>
                    <p className="mt-1 text-lg font-bold text-slate-900 sm:text-2xl dark:text-white">{analyticsData.averageLeadTimeMinutes ?? 0} min</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2.5 sm:p-4 dark:bg-slate-700">
                    <p className="text-xs text-slate-500 sm:text-sm dark:text-slate-400">No-Show Rate</p>
                    <p className="mt-1 text-lg font-bold text-amber-600 sm:text-2xl">{analyticsData.noShowPercent ?? 0}%</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2.5 sm:p-4 dark:bg-slate-700">
                    <p className="text-xs text-slate-500 sm:text-sm dark:text-slate-400">Cancellation Rate</p>
                    <p className="mt-1 text-lg font-bold text-red-600 sm:text-2xl">{analyticsData.cancellationPercent ?? 0}%</p>
                  </div>
                </div>

                {/* Lead Time Chart */}
                {leadTimeChartData.length > 0 && (
                  <div className="mt-6">
                    <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Lead Time Distribution</h3>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={leadTimeChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" label={{ value: "Minutes", position: "insideBottom", offset: -5 }} />
                          <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Bookings" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Daily Series */}
                {analyticsData.dailySeriesIST && analyticsData.dailySeriesIST.length > 0 && (
                  <div className="mt-8">
                    <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Daily Bookings (Last 14 Days, IST)</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analyticsData.dailySeriesIST.map((d) => ({ name: d._id, count: d.count }))} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" angle={-45} textAnchor="end" height={60} />
                          <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} name="Bookings" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ==================================================
            TAB: AUDIT LOG
        ================================================== */}
        {activeTab === "audit" && (
          <div className="mt-4 sm:mt-6">
            <div className="overflow-hidden rounded-xl bg-white shadow-sm dark:bg-slate-800">
              <div className="border-b border-slate-200 p-3 sm:p-5 dark:border-slate-700">
                <h2 className="text-sm font-semibold text-slate-900 sm:text-lg dark:text-white">Platform Activity</h2>
              </div>

              {auditLoading ? (
                <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">Loading audit logs...</div>
              ) : auditError ? (
                <div className="p-8 text-sm text-red-600">{getErrorMessage(auditError, "Failed to load audit logs.")}</div>
              ) : logs.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">No audit activity found.</div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden overflow-x-auto md:block">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-700">
                        <tr>
                          <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-300">Action</th>
                          <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-300">Entity</th>
                          <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-300">Entity Name</th>
                          <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-300">Actor</th>
                          <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-300">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {logs.map((log) => (
                          <tr key={log?._id || log?.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                            <td className="px-5 py-3">
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                                {log?.action || "--"}
                              </span>
                            </td>
                            <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">{log?.entity || "--"}</td>
                            <td className="px-5 py-3 text-sm text-slate-700 dark:text-slate-300">
                              {log?.entityName || (
                                <span className="font-mono text-xs text-slate-400">{String(log?.entityId || "--").slice(0, 12)}...</span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-400">{log?.actorName || "--"}</td>
                            <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{formatDateTime(log?.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="divide-y divide-slate-100 md:hidden dark:divide-slate-700">
                    {logs.map((log) => (
                      <div key={log?._id || log?.id} className="p-3">
                        <div className="flex items-start justify-between">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                            {log?.action || "--"}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">{formatDateTime(log?.createdAt)}</span>
                        </div>
                        <div className="mt-2">
                          <p className="text-sm font-medium text-slate-900 dark:text-white">
                            {log?.entityName || log?.entity || "--"}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            {log?.entity} by {log?.actorName || "--"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between border-t border-slate-200 px-3 py-2 dark:border-slate-700 sm:px-5 sm:py-3">
                    <p className="text-xs text-slate-500 sm:text-sm dark:text-slate-400">
                      Page <span className="font-medium text-slate-700 dark:text-slate-200">{pagination?.page ?? auditPage}</span> of{" "}
                      <span className="font-medium text-slate-700 dark:text-slate-200">{pagination?.totalPages ?? 1}</span>
                    </p>
                    <div className="flex gap-2">
                      <button
                        disabled={!pagination?.hasPreviousPage}
                        onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                        className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700 sm:px-3 sm:text-sm"
                      >
                        Previous
                      </button>
                      <button
                        disabled={!pagination?.hasNextPage}
                        onClick={() => setAuditPage((p) => p + 1)}
                        className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700 sm:px-3 sm:text-sm"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

      </div>


      {/* ==================================================
          CREATE SLOT MODAL
      ================================================== */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl dark:bg-slate-800">
            <div className="border-b border-slate-200 p-3 sm:p-5 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900 sm:text-lg dark:text-white">Create Slot</h2>
                <button onClick={() => setIsCreateOpen(false)} className="text-xl text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200">x</button>
              </div>
            </div>
            <form onSubmit={handleCreateSlot} className="space-y-3 p-3 sm:space-y-4 sm:p-5">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Counsellor</label>
                <select name="counsellorId" required className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:focus:border-slate-400">
                  <option value="">Select a counsellor</option>
                  {counsellors.map((c) => (
                    <option key={c._id || c.id} value={c._id || c.id}>
                      {c.name || c.email} ({c.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Start Time</label>
                <input type="datetime-local" name="startAt" required className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:focus:border-slate-400" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">End Time</label>
                <input type="datetime-local" name="endAt" required className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:focus:border-slate-400" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Capacity</label>
                <input type="number" name="capacity" min="1" required placeholder="10" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:focus:border-slate-400" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsCreateOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">Cancel</button>
                <button type="submit" disabled={isCreatingSlot} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
                  {isCreatingSlot ? "Creating..." : "Create Slot"}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl dark:bg-slate-800">
            <div className="border-b border-slate-200 p-3 sm:p-5 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900 sm:text-lg dark:text-white">Edit Slot</h2>
                <button onClick={() => setEditingSlot(null)} className="text-xl text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200">x</button>
              </div>
            </div>
            <form onSubmit={handleUpdateSlot} className="space-y-3 p-3 sm:space-y-4 sm:p-5">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Start Time</label>
                <input type="datetime-local" name="startAt" required defaultValue={toDateTimeLocal(editingSlot.startAt)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:focus:border-slate-400" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">End Time</label>
                <input type="datetime-local" name="endAt" required defaultValue={toDateTimeLocal(editingSlot.endAt)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:focus:border-slate-400" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Capacity</label>
                <input type="number" name="capacity" min="1" required defaultValue={editingSlot.capacity} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:focus:border-slate-400" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Status</label>
                <select name="status" defaultValue={editingSlot.status || "open"} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:focus:border-slate-400">
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditingSlot(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">Cancel</button>
                <button type="submit" disabled={isUpdatingSlot} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
                  {isUpdatingSlot ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================
          COUNSELLOR MODAL (CREATE / EDIT)
      ================================================== */}
      {isCounsellorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl dark:bg-slate-800">
            <div className="border-b border-slate-200 p-3 sm:p-5 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900 sm:text-lg dark:text-white">
                  {editingCounsellor ? "Edit Counsellor" : "Add Counsellor"}
                </h2>
                <button onClick={() => { setIsCounsellorModalOpen(false); setEditingCounsellor(null); }} className="text-xl text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200">x</button>
              </div>
            </div>
            <form onSubmit={editingCounsellor ? handleUpdateCounsellor : handleCreateCounsellor} className="space-y-3 p-3 sm:space-y-4 sm:p-5">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Full Name</label>
                <input
                  type="text"
                  required
                  value={counsellorForm.name}
                  onChange={(e) => setCounsellorForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:focus:border-slate-400"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Email</label>
                <input
                  type="email"
                  required
                  value={counsellorForm.email}
                  onChange={(e) => setCounsellorForm((f) => ({ ...f, email: e.target.value }))}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:focus:border-slate-400"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Password {editingCounsellor && "(leave blank to keep current)"}
                </label>
                <input
                  type="password"
                  required={!editingCounsellor}
                  minLength={8}
                  value={counsellorForm.password}
                  onChange={(e) => setCounsellorForm((f) => ({ ...f, password: e.target.value }))}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:focus:border-slate-400"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setIsCounsellorModalOpen(false); setEditingCounsellor(null); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">Cancel</button>
                <button type="submit" disabled={isCreatingCounsellor || isUpdatingCounsellor} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
                  {editingCounsellor
                    ? (isUpdatingCounsellor ? "Saving..." : "Save Changes")
                    : (isCreatingCounsellor ? "Creating..." : "Create Counsellor")}
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
