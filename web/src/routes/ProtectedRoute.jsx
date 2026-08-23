import {
  Navigate,
  Outlet,
} from "react-router-dom";

import { useSelector } from "react-redux";

function ProtectedRoute() {
  const {
    user,
    accessToken,
    initialized,
  } = useSelector(
    (state) => state.auth
  );

  /*
   * Wait until authentication restoration
   * has completed.
   */
  if (!initialized) {
    return null;
  }

  /*
   * Authentication initialization finished
   * and no valid session exists.
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