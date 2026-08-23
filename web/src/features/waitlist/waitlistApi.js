import { api } from "../../app/api";

export const waitlistApi = api.injectEndpoints({
  endpoints: (builder) => ({
    /*
     * GET /api/waitlist
     *
     * Student's own waitlist entries.
     */
    getMyWaitlist: builder.query({
      query: (params = {}) => ({
        url: "/waitlist",
        params,
      }),

      transformResponse: (response) => {
        return response?.data?.entries || [];
      },

      providesTags: (result = []) => [
        "Waitlist",
        ...result.map((entry) => ({
          type: "Waitlist",
          id: entry._id,
        })),
      ],
    }),

    /*
     * GET /api/waitlist/:id
     */
    getWaitlistEntry: builder.query({
      query: (entryId) =>
        `/waitlist/${entryId}`,

      transformResponse: (response) => {
        return response?.data?.entry || null;
      },

      providesTags: (result, error, entryId) => [
        {
          type: "Waitlist",
          id: entryId,
        },
      ],
    }),

    /*
     * POST /api/waitlist
     *
     * Body:
     * {
     *   slotId
     * }
     */
    joinWaitlist: builder.mutation({
      query: (data) => ({
        url: "/waitlist",
        method: "POST",
        body: data,
      }),

      invalidatesTags: [
        "Waitlist",
        "Slots",
      ],
    }),

    /*
     * DELETE /api/waitlist/:id
     */
    leaveWaitlist: builder.mutation({
      query: (entryId) => ({
        url: `/waitlist/${entryId}`,
        method: "DELETE",
      }),

      invalidatesTags: [
        "Waitlist",
        "Slots",
      ],
    }),
  }),

  overrideExisting: false,
});

export const {
  useGetMyWaitlistQuery,
  useGetWaitlistEntryQuery,
  useJoinWaitlistMutation,
  useLeaveWaitlistMutation,
} = waitlistApi;