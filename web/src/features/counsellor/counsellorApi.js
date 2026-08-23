import { api } from "../../app/api";

export const counsellorApi = api.injectEndpoints({
  endpoints: (builder) => ({
    /*
     * GET /api/bookings/counsellor/:id
     *
     * Used by:
     * - Counsellor
     * - Admin
     */
    getCounsellorBookings: builder.query({
      query: (counsellorId) =>
        `/bookings/counsellor/${counsellorId}`,

      transformResponse: (response) => {
        return response?.data?.bookings || [];
      },

      providesTags: ["Bookings", "Analytics"],
    }),

    /*
     * PATCH /api/bookings/:id/outcome
     *
     * Used by:
     * - Counsellor
     *
     * outcome:
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

      invalidatesTags: [
        "Bookings",
        "Analytics",
        "Slots",
      ],
    }),
  }),

  overrideExisting: false,
});

export const {
  useGetCounsellorBookingsQuery,
  useMarkBookingOutcomeMutation,
} = counsellorApi;