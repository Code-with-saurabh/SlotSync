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

import { useRealtimeUpdates } from "../../hooks/useRealtimeUpdates";
import { useGlobalSSE } from "../../hooks/useGlobalSSE";
import { usePollingFallback } from "../../hooks/usePollingFallback";

function AuthInitializer({
  children,
}) {
  const dispatch = useDispatch();

  /* Layer 1: Socket.IO real-time events */
  useRealtimeUpdates();

  /* Layer 2: SSE global stream */
  useGlobalSSE();

  /* Layer 3: Polling fallback when Socket.IO is down */
  usePollingFallback();

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

          dispatch(
            setCredentials({
              user: null,
              accessToken,
            })
          );

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
