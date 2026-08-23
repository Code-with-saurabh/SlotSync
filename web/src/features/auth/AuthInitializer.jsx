import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  useRefreshMutation,
  useLazyGetMeQuery,
} from "../../features/auth/authApi";

import {
  setCredentials,
  clearCredentials,
  setInitialized,
} from "../../features/auth/authSlice";

function AuthInitializer({
  children,
}) {
  const dispatch = useDispatch();

  const initialized = useSelector(
    (state) => state.auth.initialized
  );

  const [
    refresh,
  ] = useRefreshMutation();

  const [
    getMe,
  ] = useLazyGetMeQuery();

  useEffect(() => {
    let cancelled = false;

    const initializeAuth =
      async () => {
        try {
          const refreshResponse =
            await refresh().unwrap();

          const accessToken =
            refreshResponse?.data
              ?.accessToken;

          if (!accessToken) {
            throw new Error(
              "No access token returned."
            );
          }

          dispatch(
            setCredentials({
              accessToken,
            })
          );

          const meResponse =
            await getMe().unwrap();

          const user =
            meResponse?.data?.user ||
            meResponse?.user;

          if (!user) {
            throw new Error(
              "Authenticated user was not returned."
            );
          }

          dispatch(
            setCredentials({
              user,
              accessToken,
            })
          );
        } catch {
          dispatch(
            clearCredentials()
          );
        } finally {
          if (!cancelled) {
            dispatch(
              setInitialized(true)
            );
          }
        }
      };

    initializeAuth();

    return () => {
      cancelled = true;
    };
  }, [
    dispatch,
    refresh,
    getMe,
  ]);

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <p className="text-sm font-medium text-slate-600">
            Restoring your session...
          </p>
        </div>
      </div>
    );
  }

  return children;
}

export default AuthInitializer;