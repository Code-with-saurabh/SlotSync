import { useEffect, useRef, useCallback } from "react";

import { api } from "../app/api";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export function useSlotSSE(slotId) {
  const esRef = useRef(null);
  const dispatch = api.dispatch;

  useEffect(() => {
    if (!slotId) return;

    const es = new EventSource(`${API_URL}/slots/${slotId}/stream`);
    esRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        dispatch(
          api.util.updateQueryData("getSlots", undefined, (draft) => {
            if (!draft?.slots) return;
            const slot = draft.slots.find((s) => s._id === data.slotId);
            if (slot) {
              slot.bookedCount = data.bookedCount;
              slot.capacity = data.capacity;
            }
          })
        );
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      es.close();
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [slotId, dispatch]);
}
