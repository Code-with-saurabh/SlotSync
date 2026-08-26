import { api } from "../../app/api";

export const studentApi = api.injectEndpoints({
  endpoints: (builder) => ({

    // ==================================================
    // MY BOOKINGS
    // pollingInterval: 8000 — auto-refetch every 8s
    // ==================================================

    getMyBookings: builder.query({
      query: (params = {}) => ({
        url: "/bookings",
        params,
      }),

      transformResponse: (response) => {
        return response?.data?.bookings || [];
      },

      providesTags: ["Bookings"],

      pollingInterval: 8000,
    }),


    // ==================================================
    // BOOK SLOT — with optimistic update + 409 rollback
    // ==================================================

    bookSlot: builder.mutation({
      query: (slotIdOrObj) => {
        const slotId = typeof slotIdOrObj === "string" ? slotIdOrObj : slotIdOrObj?.slotId;
        const idempotencyKey = typeof slotIdOrObj === "object" ? slotIdOrObj?.idempotencyKey : undefined;
        return {
          url: "/bookings",
          method: "POST",
          body: { slotId },
          headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {},
        };
      },

      async onQueryStarted(slotId, { dispatch, queryFulfilled }) {
        const patchResults = [];

        const patches = dispatch(
          api.util.updateQueryData("getSlots", undefined, (draft) => {
            if (!draft) return;
            const slots = Array.isArray(draft) ? draft : draft?.slots || [];
            for (const slot of slots) {
              if ((slot._id || slot.id) === (typeof slotId === "string" ? slotId : slotId?.slotId)) {
                const prev = slot.bookedCount || 0;
                slot.bookedCount = prev + 1;
                patchResults.push({ prevBookedCount: prev });
                break;
              }
            }
          })
        );

        patchResults.push(patches);

        try {
          await queryFulfilled;
        } catch {
          for (const p of patchResults) {
            if (p?.undo) p.undo();
          }
        }
      },

      invalidatesTags: ["Slots", "Bookings", "Waitlist"],
    }),


    // ==================================================
    // CANCEL BOOKING — with optimistic update + 409 rollback
    // ==================================================

    cancelBooking: builder.mutation({
      query: (bookingId) => ({
        url: `/bookings/${bookingId}/cancel`,
        method: "POST",
      }),

      async onQueryStarted(bookingId, { dispatch, queryFulfilled, getState }) {
        const patchResults = [];

        const allQueries = getState().api?.queries || {};
        let targetSlotId = null;
        let bookings = [];

        for (const key of Object.keys(allQueries)) {
          if (key.startsWith("getMyBookings(")) {
            const data = allQueries[key]?.data;
            bookings = Array.isArray(data) ? data : data?.bookings || [];
            const booking = bookings.find((b) => (b?._id || b?.id) === bookingId);
            if (booking) {
              targetSlotId = booking?.slotId?._id || booking?.slotId?.id || booking?.slotId;
              break;
            }
          }
        }

        if (targetSlotId) {
          const patches = dispatch(
            api.util.updateQueryData("getSlots", undefined, (draft) => {
              if (!draft) return;
              const slots = Array.isArray(draft) ? draft : draft?.slots || [];
              for (const slot of slots) {
                if ((slot._id || slot.id) === String(targetSlotId) && slot.bookedCount > 0) {
                  const prev = slot.bookedCount;
                  slot.bookedCount = prev - 1;
                  patchResults.push({ prevBookedCount: prev });
                  break;
                }
              }
            })
          );
          patchResults.push(patches);
        }

        try {
          await queryFulfilled;
        } catch {
          for (const p of patchResults) {
            if (p?.undo) p.undo();
          }
        }
      },

      invalidatesTags: ["Slots", "Bookings", "Waitlist"],
    }),


    // ==================================================
    // MY WAITLIST
    // pollingInterval: 8000 — auto-refetch every 8s
    // ==================================================

    getMyWaitlist: builder.query({
      query: (params = {}) => ({
        url: "/waitlist",
        params,
      }),

      transformResponse: (response) => {
        return response?.data?.entries || [];
      },

      providesTags: ["Waitlist"],

      pollingInterval: 8000,
    }),


    // ==================================================
    // JOIN WAITLIST
    // ==================================================

    joinWaitlist: builder.mutation({
      query: (slotId) => ({
        url: "/waitlist",
        method: "POST",
        body: { slotId },
      }),

      async onQueryStarted(slotId, { dispatch, queryFulfilled }) {
        const patchResults = [];

        const patches = dispatch(
          api.util.updateQueryData("getSlots", undefined, (draft) => {
            if (!draft) return;
            const slots = Array.isArray(draft) ? draft : draft?.slots || [];
            for (const slot of slots) {
              if ((slot._id || slot.id) === slotId) {
                const prev = slot.bookedCount || 0;
                slot.bookedCount = prev + 1;
                patchResults.push({ prevBookedCount: prev });
                break;
              }
            }
          })
        );
        patchResults.push(patches);

        try {
          await queryFulfilled;
        } catch {
          for (const p of patchResults) {
            if (p?.undo) p.undo();
          }
        }
      },

      invalidatesTags: ["Slots", "Waitlist"],
    }),


    // ==================================================
    // LEAVE WAITLIST
    // ==================================================

    leaveWaitlist: builder.mutation({
      query: (entryId) => ({
        url: `/waitlist/${entryId}`,
        method: "DELETE",
      }),

      async onQueryStarted(entryId, { dispatch, queryFulfilled, getState }) {
        const patchResults = [];

        const allQueries = getState().api?.queries || {};
        let targetSlotId = null;

        for (const key of Object.keys(allQueries)) {
          if (key.startsWith("getMyWaitlist(")) {
            const data = allQueries[key]?.data;
            const entries = Array.isArray(data) ? data : data?.entries || [];
            const entry = entries.find((e) => (e?._id || e?.id) === entryId);
            if (entry) {
              targetSlotId = entry?.slotId?._id || entry?.slotId?.id || entry?.slotId;
              break;
            }
          }
        }

        if (targetSlotId) {
          const patches = dispatch(
            api.util.updateQueryData("getSlots", undefined, (draft) => {
              if (!draft) return;
              const slots = Array.isArray(draft) ? draft : draft?.slots || [];
              for (const slot of slots) {
                if ((slot._id || slot.id) === String(targetSlotId) && slot.bookedCount > 0) {
                  const prev = slot.bookedCount;
                  slot.bookedCount = prev - 1;
                  patchResults.push({ prevBookedCount: prev });
                  break;
                }
              }
            })
          );
          patchResults.push(patches);
        }

        try {
          await queryFulfilled;
        } catch {
          for (const p of patchResults) {
            if (p?.undo) p.undo();
          }
        }
      },

      invalidatesTags: ["Slots", "Waitlist"],
    }),

  }),
});


export const {
  useGetMyBookingsQuery,
  useBookSlotMutation,
  useCancelBookingMutation,
  useGetMyWaitlistQuery,
  useJoinWaitlistMutation,
  useLeaveWaitlistMutation,
} = studentApi;
