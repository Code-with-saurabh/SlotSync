import { api } from "../../app/api";

export const analyticsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    /*
     * GET /api/bookings/counsellor/:id
     *
     * IMPORTANT:
     * Current backend exposes analytics here.
     *
     * This will later be better aligned with the
     * exam's required:
     *
     * GET /api/analytics/counsellor/:id
     *
     * once backend route is finalized.
     */
    getCounsellorAnalytics: builder.query({
      query: (counsellorId) =>
        `/bookings/counsellor/${counsellorId}`,

      transformResponse: (response) => {
        return response?.data || null;
      },

      providesTags: (result, error, counsellorId) => [
        {
          type: "Analytics",
          id: counsellorId,
        },
      ],
    }),
  }),

  overrideExisting: false,
});

export const {
  useGetCounsellorAnalyticsQuery,
} = analyticsApi;