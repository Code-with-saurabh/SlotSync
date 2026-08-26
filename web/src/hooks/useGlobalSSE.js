import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { api } from "../app/api";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
);

let eventSource = null;
let listeners = new Set();
let reconnectTimeout = null;

function connect() {
  if (eventSource) return;

  const url = `${API_URL}/slots/stream`;
  console.log("[SSE] Connecting to:", url);

  eventSource = new EventSource(url);

  eventSource.onopen = () => {
    console.log("[SSE] Connected");
  };

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      listeners.forEach((fn) => fn(data));
    } catch {
      // keep-alive comment, ignore
    }
  };

  eventSource.onerror = () => {
    console.warn("[SSE] Error, reconnecting in 3s...");
    eventSource.close();
    eventSource = null;
    reconnectTimeout = setTimeout(connect, 3000);
  };
}

function subscribe(callback) {
  connect();
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
    if (listeners.size === 0 && eventSource) {
      clearTimeout(reconnectTimeout);
      eventSource.close();
      eventSource = null;
    }
  };
}

/*
 * Global SSE hook — subscribes to the single
 * global SSE stream and invalidates RTK tags
 * for ALL slot updates. Backup for Socket.IO.
 */
export function useGlobalSSE() {
  const dispatch = useDispatch();

  useEffect(() => {
    const unsub = subscribe((data) => {
      if (!data?.slotId) return;
      console.log("[SSE] slot update:", data.slotId, "booked:", data.bookedCount);
      dispatch(api.util.invalidateTags(["Slots", "Bookings", "Waitlist"]));
    });

    return unsub;
  }, [dispatch]);
}
