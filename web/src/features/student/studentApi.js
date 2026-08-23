import { api } from "../../app/api";

export const studentApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getSlots: builder.query({
      query: (params = {}) => ({
        url: "/slots",
        params,
      }),

      transformResponse: (response) => {
        return response?.data?.slots || [];
      },

      providesTags: ["Slots"],
    }),

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
  useGetSlotsQuery,
  useGetMyBookingsQuery,
  useBookSlotMutation,
  useCancelBookingMutation,
  useGetMyWaitlistQuery,
  useJoinWaitlistMutation,
  useLeaveWaitlistMutation,
} = studentApi;