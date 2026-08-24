import { useEffect, useRef } from "react";

import { api } from "../app/api";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api";

let globalES = null;
let globalListeners = new Set();
let reconnectTimer = null;

function ensureGlobalConnection() {
  if (globalES) return;

  globalES = new EventSource(
    `${API_URL}/slots/stream`
  );

  globalES.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      for (const fn of globalListeners) {
        fn(data);
      }
    } catch {}
  };

  globalES.onerror = () => {
    globalES.close();
    globalES = null;
    reconnectTimer = setTimeout(
      ensureGlobalConnection,
      3000
    );
  };
}

function subscribeGlobal(callback) {
  ensureGlobalConnection();
  globalListeners.add(callback);

  return () => {
    globalListeners.delete(callback);
    if (
      globalListeners.size === 0 &&
      globalES
    ) {
      clearTimeout(reconnectTimer);
      globalES.close();
      globalES = null;
    }
  };
}

export function useSlotSSE(slotId) {
  const slotIdRef = useRef(slotId);
  slotIdRef.current = slotId;

  const dispatch = api.dispatch;

  useEffect(() => {
    if (!slotId) return;

    const unsub = subscribeGlobal((data) => {
      if (data.slotId !== slotIdRef.current)
        return;

      dispatch(
        api.util.updateQueryData(
          "getSlots",
          undefined,
          (draft) => {
            if (!draft?.slots) return;
            const slot = draft.slots.find(
              (s) => s._id === data.slotId
            );
            if (slot) {
              slot.bookedCount =
                data.bookedCount;
              slot.capacity = data.capacity;
            }
          }
        )
      );

      /*
       * When a slot update arrives via SSE, it
       * means someone booked/cancelled/promoted.
       * Invalidate Bookings + Waitlist so the
       * current user sees their own updated state
       * without manual refresh.
       */
      dispatch(
        api.util.invalidateTags([
          { type: "Bookings" },
          { type: "Waitlist" },
        ])
      );
    });

    return unsub;
  }, [slotId, dispatch]);
}
