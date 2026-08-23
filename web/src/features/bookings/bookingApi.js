import { api } from "../../app/api";

export const bookingApi = api.injectEndpoints({
  endpoints: (builder) => ({
    /*
     * GET /api/bookings
     *
     * Student's own bookings.
     *
     * Optional query params:
     * - status
     * - limit
     */
    getMyBookings: builder.query({
      query: (params = {}) => ({
        url: "/bookings",
        params,
      }),

      transformResponse: (response) => {
        return response?.data?.bookings || [];
      },

      providesTags: (result = []) => [
        "Bookings",
        ...result.map((booking) => ({
          type: "Bookings",
          id: booking._id,
        })),
      ],
    }),

    /*
     * GET /api/bookings/:id
     *
     * Get one student's booking.
     */
    getBooking: builder.query({
      query: (bookingId) =>
        `/bookings/${bookingId}`,

      transformResponse: (response) => {
        return response?.data?.booking || null;
      },

      providesTags: (result, error, bookingId) => [
        {
          type: "Bookings",
          id: bookingId,
        },
      ],
    }),

    /*
     * POST /api/bookings
     *
     * Create a booking.
     *
     * Backend:
     * - student only
     * - capacity checked atomically
     * - overlap checked
     * - booking window checked
     *
     * 409 is expected for concurrency/full/duplicate
     * situations.
     */
    createBooking: builder.mutation({
      query: (data) => ({
        url: "/bookings",
        method: "POST",
        body: data,
      }),

      invalidatesTags: [
        "Bookings",
        "Slots",
        "Waitlist",
      ],
    }),

    /*
     * POST /api/bookings/:id/cancel
     *
     * Cancel student's booking.
     *
     * Backend may promote the earliest waitlist
     * entry during this operation.
     */
    cancelBooking: builder.mutation({
      query: (bookingId) => ({
        url: `/bookings/${bookingId}/cancel`,
        method: "POST",
      }),

      invalidatesTags: [
        "Bookings",
        "Slots",
        "Waitlist",
      ],
    }),

    /*
     * PATCH /api/bookings/:id/outcome
     *
     * Counsellor marks:
     * - attended
     * - no_show
     */
    markBookingOutcome: builder.mutation({
      query: ({
        bookingId,
        outcome,
      }) => ({
        url: `/bookings/${bookingId}/outcome`,
        method: "PATCH",
        body: {
          outcome,
        },
      }),

      invalidatesTags: (result, error, { bookingId }) => [
        "Bookings",
        "Analytics",
        {
          type: "Bookings",
          id: bookingId,
        },
      ],
    }),
  }),

  overrideExisting: false,
});

export const {
  useGetMyBookingsQuery,
  useGetBookingQuery,
  useCreateBookingMutation,
  useCancelBookingMutation,
  useMarkBookingOutcomeMutation,
} = bookingApi;