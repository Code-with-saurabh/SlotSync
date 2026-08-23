import { api } from "../../app/api";

export const adminApi = api.injectEndpoints({
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
        return {
          logs: response?.data || [],
          pagination: response?.pagination || {
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
  useGetCounsellorAnalyticsQuery,
  useGetAuditLogsQuery,
} = adminApi;