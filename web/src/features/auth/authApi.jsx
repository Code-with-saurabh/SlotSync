import { api } from "../../app/api";

export const authApi =
  api.injectEndpoints({
    endpoints: (builder) => ({
      register:
        builder.mutation({
          query: (data) => ({
            url: "/auth/register",
            method: "POST",
            body: data,
          }),
        }),

      login:
        builder.mutation({
          query: (data) => ({
            url: "/auth/login",
            method: "POST",
            body: data,
          }),
        }),

      refresh:
        builder.mutation({
          query: () => ({
            url: "/auth/refresh",
            method: "POST",
          }),
        }),

      logout:
        builder.mutation({
          query: () => ({
            url: "/auth/logout",
            method: "POST",
          }),

          invalidatesTags: [
            "Auth",
          ],
        }),

      getMe:
        builder.query({
          query: () =>
            "/auth/me",

          providesTags: [
            "Auth",
          ],
        }),
    }),
  });
 
  export const {
  useRegisterMutation,
  useLoginMutation,
  useRefreshMutation,
  useLogoutMutation,
  useGetMeQuery,
  useLazyGetMeQuery,
} = authApi;
