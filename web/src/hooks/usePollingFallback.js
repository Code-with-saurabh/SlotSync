import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { api } from "../app/api";
import { useSocket } from "./useSocket";

const POLL_INTERVAL = 5000;

/*
 * Polling fallback — if Socket.IO is disconnected
 * for more than 10 seconds, start polling all active
 * RTK Query subscriptions every 5 seconds.
 *
 * Once Socket.IO reconnects, stop polling.
 */
export function usePollingFallback() {
  const { isConnected } = useSocket();
  const dispatch = useDispatch();
  const timerRef = useRef(null);
  const downSinceRef = useRef(null);

  useEffect(() => {
    if (isConnected) {
      downSinceRef.current = null;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        console.log("[Polling] Stopped — Socket.IO reconnected");
      }
      return;
    }

    if (!downSinceRef.current) {
      downSinceRef.current = Date.now();
    }

    const elapsed = Date.now() - downSinceRef.current;
    if (elapsed < 10000) return;

    if (timerRef.current) return;

    console.log("[Polling] Socket.IO down >10s, starting fallback poll every 5s");
    timerRef.current = setInterval(() => {
      dispatch(api.util.invalidateTags(["Slots", "Bookings", "Waitlist"]));
    }, POLL_INTERVAL);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isConnected, dispatch]);
}
