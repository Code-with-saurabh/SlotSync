import {
  Navigate,
  Outlet,
} from "react-router-dom";

import {
  useSelector,
} from "react-redux";

function ProtectedRoute() {
  const {
    user,
    accessToken,
    initialized,
  } = useSelector(
    (state) => state.auth
  );

  /*
   * Authentication check is still running.
   *
   * Do not redirect to login yet.
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

  /*
   * Authentication initialization finished
   * but no valid session exists.
   */
  if (!user || !accessToken) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return <Outlet />;
}

export default ProtectedRoute;