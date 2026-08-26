import { api } from "../../app/api";

export const slotApi = api.injectEndpoints({
  endpoints: (builder) => ({
    /*
     * GET /api/slots
     *
     * Cursor-based pagination: no skip().
     * Returns { slots, nextCursor, hasMore }.
     *
     * pollingInterval: 8000 — auto-refetch every 8s
     * as a guaranteed fallback. Socket.IO / SSE events
     * will trigger instant refetch via tag invalidation.
     */
    getSlots: builder.query({
      query: (params = {}) => ({
        url: "/slots",
        params,
      }),

      transformResponse: (response) => {
        const data = response?.data;
        return {
          slots: data?.slots || [],
          nextCursor: data?.nextCursor || null,
          hasMore: data?.hasMore || false,
        };
      },

      providesTags: ["Slots"],

      pollingInterval: 8000,
    }),

    /*
     * GET /api/slots/:id
     */
    getSlot: builder.query({
      query: (slotId) => `/slots/${slotId}`,

      transformResponse: (response) => {
        return response?.data?.slot || null;
      },

      providesTags: (result, error, slotId) => [
        {
          type: "Slots",
          id: slotId,
        },
      ],
    }),

    /*
     * POST /api/slots
     *
     * Allowed by backend:
     * - admin
     * - counsellor
     */
    createSlot: builder.mutation({
      query: (data) => ({
        url: "/slots",
        method: "POST",
        body: data,
      }),

      invalidatesTags: ["Slots"],
    }),

    /*
     * PATCH /api/slots/:id
     *
     * Allowed by backend:
     * - admin
     * - counsellor
     */
    updateSlot: builder.mutation({
      query: ({ slotId, ...updates }) => ({
        url: `/slots/${slotId}`,
        method: "PATCH",
        body: updates,
      }),

      invalidatesTags: (result, error, { slotId }) => [
        "Slots",
        {
          type: "Slots",
          id: slotId,
        },
      ],
    }),
  }),

  overrideExisting: false,
});

export const {
  useGetSlotsQuery,
  useGetSlotQuery,
  useCreateSlotMutation,
  useUpdateSlotMutation,
} = slotApi;
