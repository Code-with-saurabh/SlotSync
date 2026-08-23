import { api } from "../../app/api";

export const slotApi = api.injectEndpoints({
  endpoints: (builder) => ({
    /*
     * GET /api/slots
     *
     * Used by:
     * - Student
     * - Counsellor
     * - Admin
     */
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