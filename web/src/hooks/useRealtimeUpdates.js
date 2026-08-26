import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { api } from "../app/api";
import { useSocket } from "./useSocket";

/*
 * Listens to Socket.IO events from the backend
 * and invalidates RTK Query tags so all subscribed
 * components automatically refetch fresh data.
 */
export function useRealtimeUpdates() {
  const { on, isConnected } = useSocket();
  const dispatch = useDispatch();

  useEffect(() => {
    if (!on) return;

    console.log("[Realtime] Registering Socket.IO listeners (connected:", isConnected, ")");

    const cleanups = [];

    cleanups.push(
      on("slot:updated", (data) => {
        console.log("[Realtime] slot:updated:", data.slotId, "booked:", data.bookedCount);
        dispatch(api.util.invalidateTags(["Slots", "Bookings", "Waitlist"]));
      })
    );

    cleanups.push(
      on("slot:created", (data) => {
        console.log("[Realtime] slot:created:", data.slotId);
        dispatch(api.util.invalidateTags(["Slots"]));
      })
    );

    cleanups.push(
      on("booking:created", (data) => {
        console.log("[Realtime] booking:created:", data.bookingId);
        dispatch(api.util.invalidateTags(["Slots", "Bookings", "Waitlist"]));
      })
    );

    cleanups.push(
      on("booking:cancelled", (data) => {
        console.log("[Realtime] booking:cancelled:", data.bookingId);
        dispatch(api.util.invalidateTags(["Slots", "Bookings", "Waitlist"]));
      })
    );

    cleanups.push(
      on("booking:promoted", (data) => {
        console.log("[Realtime] booking:promoted:", data.bookingId);
        dispatch(api.util.invalidateTags(["Slots", "Bookings", "Waitlist"]));
      })
    );

    cleanups.push(
      on("booking:outcome", (data) => {
        console.log("[Realtime] booking:outcome:", data.bookingId);
        dispatch(api.util.invalidateTags(["Bookings", "Analytics"]));
      })
    );

    cleanups.push(
      on("waitlist:joined", (data) => {
        console.log("[Realtime] waitlist:joined:", data.entryId);
        dispatch(api.util.invalidateTags(["Waitlist", "Slots"]));
      })
    );

    cleanups.push(
      on("waitlist:left", (data) => {
        console.log("[Realtime] waitlist:left:", data.entryId);
        dispatch(api.util.invalidateTags(["Waitlist", "Slots"]));
      })
    );

    return () => {
      cleanups.forEach((fn) => {
        if (typeof fn === "function") fn();
      });
    };
  }, [on, dispatch, isConnected]);
}
