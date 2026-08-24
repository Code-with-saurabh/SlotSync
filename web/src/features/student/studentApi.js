import { api } from "../../app/api";

export const studentApi = api.injectEndpoints({
  endpoints: (builder) => ({

    // ==================================================
    // MY BOOKINGS
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
        /*
         * Find the booking in cache to get its slotId,
         * then optimistically decrement that specific slot.
         */
        const patchResults = [];

        const bookingsData = getState().api?.queries?.["getMyBookings(undefined)"]?.data;
        const bookings = Array.isArray(bookingsData) ? bookingsData : bookingsData?.bookings || [];
        const booking = bookings.find((b) => (b?._id || b?.id) === bookingId);
        const targetSlotId = booking?.slotId?._id || booking?.slotId?.id || booking?.slotId;

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
