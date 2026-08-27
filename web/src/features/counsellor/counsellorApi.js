import { api } from "../../app/api";

export const counsellorApi =
  api.injectEndpoints({
    endpoints: (builder) => ({

      /*
       * GET /api/counsellors
       */
      getCounsellors:
        builder.query({
          query: (params = {}) => ({
            url: "/counsellors",
            params,
          }),

          transformResponse:
            (response) =>
              response?.data?.counsellors ||
              [],

          providesTags: [
            "Counsellors",
          ],
        }),


      /*
       * POST /api/counsellors
       */
      createCounsellor:
        builder.mutation({
          query: (data) => ({
            url: "/counsellors",
            method: "POST",
            body: data,
          }),

          invalidatesTags: [
            "Counsellors",
          ],
        }),


      /*
       * PATCH /api/counsellors/:id
       */
      updateCounsellor:
        builder.mutation({
          query: ({
            counsellorId,
            ...updates
          }) => ({
            url:
              `/counsellors/${counsellorId}`,

            method: "PATCH",

            body: updates,
          }),

          invalidatesTags: [
            "Counsellors",
          ],
        }),


      /*
       * PATCH /api/counsellors/:id/status
       */
      updateCounsellorStatus:
        builder.mutation({
          query: ({
            counsellorId,
            isActive,
          }) => ({
            url:
              `/counsellors/${counsellorId}/status`,

            method: "PATCH",

            body: {
              isActive,
            },
          }),

          invalidatesTags: [
            "Counsellors",
            "Slots",
          ],
        }),


      /*
       * GET /api/bookings/counsellor
       *
       * pollingInterval: 8000 — auto-refetch every 8s
       */
      getCounsellorBookings:
        builder.query({
          query: (params = {}) => ({
            url: "/bookings/counsellor",
            params,
          }),

          transformResponse:
            (response) =>
              response?.data?.bookings ||
              [],

          providesTags: (result = []) => [
            "Bookings",
            ...result.map((b) => ({
              type: "Bookings",
              id: b._id,
            })),
          ],

          pollingInterval: 8000,
        }),


      /*
       * PATCH /api/bookings/:id/outcome
       *
       * Counsellor marks:
       * - attended
       * - no_show
       */
      markBookingOutcome:
        builder.mutation({
          query: ({
            bookingId,
            outcome,
          }) => ({
            url:
              `/bookings/${bookingId}/outcome`,

            method: "PATCH",

            body: {
              outcome,
            },
          }),

          invalidatesTags: (
            result,
            error,
            { bookingId }
          ) => [
            "Bookings",
            "Analytics",
            {
              type: "Bookings",
              id: bookingId,
            },
          ],
        }),


      /*
       * GET /api/waitlist/counsellor
       *
       * Waitlist entries for counsellor's slots.
       */
      getCounsellorWaitlist:
        builder.query({
          query: (params = {}) => ({
            url: "/waitlist/counsellor",
            params,
          }),

          transformResponse:
            (response) =>
              response?.data?.entries ||
              [],

          providesTags: [
            "Waitlist",
          ],
        }),
    }),

    overrideExisting: false,
  });


export const {
  useGetCounsellorsQuery,
  useCreateCounsellorMutation,
  useUpdateCounsellorMutation,
  useUpdateCounsellorStatusMutation,
  useGetCounsellorBookingsQuery,
  useMarkBookingOutcomeMutation,
  useGetCounsellorWaitlistQuery,
} = counsellorApi;
