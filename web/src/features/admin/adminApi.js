import { api } from "../../app/api";

export const adminApi = api.injectEndpoints({
  endpoints: (builder) => ({
    /*
     * GET /api/analytics/institute
     *
     * Institute-wide analytics. Admin only.
     */
    getInstituteAnalytics: builder.query({
      query: () => "/analytics/institute",

      transformResponse: (response) => {
        return response?.data || null;
      },

      providesTags: ["Analytics"],
    }),

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

    /*
     * GET /api/audit
     *
     * Admin only.
     *
     * Supported query parameters:
     * - entity
     * - id
     * - page
     * - limit
     */
    getAuditLogs: builder.query({
      query: (params = {}) => ({
        url: "/audit",
        params,
      }),

      transformResponse: (response) => {
        const data = response?.data || {};
        return {
          logs: data?.logs || [],
          pagination: data?.pagination || {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        };
      },

      providesTags: ["Analytics"],
    }),
  }),

  overrideExisting: false,
});

export const {
  useGetInstituteAnalyticsQuery,
  useGetCounsellorAnalyticsQuery,
  useGetAuditLogsQuery,
} = adminApi;
