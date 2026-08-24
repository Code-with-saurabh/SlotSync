import { api } from "../../app/api";

export const analyticsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    /*
     * GET /api/analytics/counsellor/:id
     *
     * Allowed by backend:
     * - admin
     * - counsellor (own analytics)
     */
    getCounsellorAnalytics: builder.query({
      query: (counsellorId) =>
        `/analytics/counsellor/${counsellorId}`,

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
