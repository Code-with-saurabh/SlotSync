import {
  useEffect,
  useRef,
} from "react";

import { useDispatch } from "react-redux";

import {
  useRefreshMutation,
  useLazyGetMeQuery,
} from "./authApi";

import {
  setCredentials,
  clearCredentials,
  setInitialized,
} from "./authSlice";

function AuthInitializer({
  children,
}) {
  const dispatch = useDispatch();

  const [refresh] =
    useRefreshMutation();

  const [
    getMe,
  ] = useLazyGetMeQuery();

  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) {
      return;
    }

    startedRef.current = true;

    const initializeAuth =
      async () => {
        try {
          /*
           * Step 1:
           * Ask backend to rotate the
           * refresh token and issue
           * a fresh access token.
           */
          const refreshResponse =
            await refresh().unwrap();

          const refreshData =
            refreshResponse?.data ||
            refreshResponse;

          const accessToken =
            refreshData?.accessToken;

          if (!accessToken) {
            throw new Error(
              "Access token was not returned."
            );
          }

          /*
           * Step 2:
           * Store the new access token.
           *
           * User is temporarily null.
           * We populate it immediately
           * using /auth/me.
           */
          dispatch(
            setCredentials({
              user: null,
              accessToken,
            })
          );

          /*
           * Step 3:
           * Ask backend who the
           * authenticated user is.
           */
          const meResponse =
            await getMe().unwrap();

          const meData =
            meResponse?.data ||
            meResponse;

          dispatch(
            setCredentials({
              user: meData.user,
              accessToken,
            })
          );
        } catch {
          /*
           * No valid refresh session.
           *
           * This is a genuine unauthenticated
           * state, so clearing Redux is correct.
           */
          dispatch(
            clearCredentials()
          );
        } finally {
          dispatch(
            setInitialized(true)
          );
        }
      };

    initializeAuth();
  }, [
    dispatch,
    refresh,
    getMe,
  ]);

  return children;
}

export default AuthInitializer;