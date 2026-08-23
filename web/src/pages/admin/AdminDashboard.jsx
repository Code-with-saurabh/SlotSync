import {
  useGetAuditLogsQuery,
} from "../../features/admin/adminApi";

function AdminDashboard() {
  const {
    data,
    isLoading,
    isError,
    error,
  } = useGetAuditLogsQuery({
    page: 1,
    limit: 10,
  });

  const logs = data?.logs || [];
  const pagination = data?.pagination;

  return (
    <div className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Admin Dashboard
          </h1>

          <p className="mt-2 text-slate-600">
            View SlotSync analytics and platform activity.
          </p>
        </div>

        {/* Overview Cards */}
        <div className="mt-8 grid gap-6 md:grid-cols-3">

          <div className="rounded-xl bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Platform
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              SlotSync
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Administration
            </p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Audit Records
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {isLoading
                ? "..."
                : pagination?.total ?? 0}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Total platform activity records
            </p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Current Page
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {isLoading
                ? "..."
                : pagination?.page ?? 1}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Audit activity
            </p>
          </div>

        </div>

        {/* Audit Logs */}
        <div className="mt-8 rounded-xl bg-white shadow-sm">

          <div className="border-b border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900">
              Recent Platform Activity
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Latest audit records from SlotSync.
            </p>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="p-6 text-slate-500">
              Loading audit logs...
            </div>
          )}

          {/* Error */}
          {isError && (
            <div className="p-6 text-red-600">
              Failed to load audit logs.
              {error?.data?.error?.message && (
                <span className="ml-1">
                  {error.data.error.message}
                </span>
              )}
            </div>
          )}

          {/* Empty */}
          {!isLoading &&
            !isError &&
            logs.length === 0 && (
              <div className="p-6 text-slate-500">
                No audit activity found.
              </div>
            )}

      {/* Table */}
{!isLoading &&
  !isError &&
  logs.length > 0 && (
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
          {logs.map((log) => (
            <tr
              key={log._id}
              className="hover:bg-slate-50"
            >
              {/* Action */}
              <td className="px-6 py-4">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  {log.action}
                </span>
              </td>

              {/* Entity */}
              <td className="px-6 py-4 font-medium text-slate-900">
                {log.entity}
              </td>

              {/* Entity ID */}
              <td className="px-6 py-4 text-xs text-slate-500">
                {log.entityId}
              </td>

              {/* Reason */}
              <td className="px-6 py-4 text-slate-500">
                {log.reason || "—"}
              </td>

              {/* Date */}
              <td className="px-6 py-4 text-slate-500">
                {log.createdAt
                  ? new Date(
                      log.createdAt
                    ).toLocaleString()
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>

      </table>
    </div>
)}

        </div>

      </div>
    </div>
  );
}

export default AdminDashboard;