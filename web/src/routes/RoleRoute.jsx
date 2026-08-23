import {
  Navigate,
  Outlet,
} from "react-router-dom";

import {
  useSelector,
} from "react-redux";

function getDashboardPath(role) {
  switch (role) {
    case "student":
      return "/student/slots";

    case "counsellor":
      return "/counsellor/dashboard";

    case "admin":
      return "/admin/dashboard";

    default:
      return "/login";
  }
}

function RoleRoute({
  allowedRoles,
}) {
  const {
    user,
    initialized,
  } = useSelector(
    (state) => state.auth
  );

  /*
   * Wait for authentication
   * initialization.
   */
  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <p className="text-sm font-medium text-slate-600">
            Checking your session...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  /*
   * Authenticated but wrong role.
   *
   * IMPORTANT:
   * Do NOT clear credentials.
   * Do NOT logout.
   */
  if (
    !allowedRoles.includes(
      user.role
    )
  ) {
    return (
      <Navigate
        to={getDashboardPath(
          user.role
        )}
        replace
      />
    );
  }

  return <Outlet />;
}

export default RoleRoute;