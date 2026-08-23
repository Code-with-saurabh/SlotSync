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
    // BOOK SLOT
    // ==================================================

    bookSlot: builder.mutation({
      query: (slotId) => ({
        url: "/bookings",
        method: "POST",
        body: {
          slotId,
        },
      }),

      invalidatesTags: [
        "Slots",
        "Bookings",
        "Waitlist",
      ],
    }),


    // ==================================================
    // CANCEL BOOKING
    // ==================================================

    cancelBooking: builder.mutation({
      query: (bookingId) => ({
        url: `/bookings/${bookingId}/cancel`,
        method: "POST",
      }),

      invalidatesTags: [
        "Slots",
        "Bookings",
        "Waitlist",
      ],
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
        body: {
          slotId,
        },
      }),

      invalidatesTags: [
        "Slots",
        "Waitlist",
      ],
    }),


    // ==================================================
    // LEAVE WAITLIST
    // ==================================================

    leaveWaitlist: builder.mutation({
      query: (entryId) => ({
        url: `/waitlist/${entryId}`,
        method: "DELETE",
      }),

      invalidatesTags: [
        "Slots",
        "Waitlist",
      ],
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