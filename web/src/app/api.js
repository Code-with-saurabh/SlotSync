import {
  createApi,
  fetchBaseQuery,
} from "@reduxjs/toolkit/query/react";

import {
  setCredentials,
  clearCredentials,
} from "../features/auth/authSlice";

const rawBaseQuery = fetchBaseQuery({
  baseUrl:
    import.meta.env.VITE_API_URL ||
    "http://localhost:5000/api",

  credentials: "include",

  prepareHeaders: (
    headers,
    { getState }
  ) => {
    const token =
      getState().auth?.accessToken;

    if (token) {
      headers.set(
        "Authorization",
        `Bearer ${token}`
      );
    }

    return headers;
  },
});

const baseQueryWithReauth = async (
  args,
  api,
  extraOptions
) => {
  let result = await rawBaseQuery(
    args,
    api,
    extraOptions
  );

  /*
   * Only authentication failure should
   * trigger token refresh.
   *
   * 403 is NOT handled here because:
   *
   * 403 = authenticated but not authorized
   *
   * 401 = authentication problem
   */
  if (result?.error?.status === 401) {
    const refreshResult =
      await rawBaseQuery(
        {
          url: "/auth/refresh",
          method: "POST",
        },
        api,
        extraOptions
      );

    if (refreshResult?.data) {
      const refreshData =
        refreshResult.data?.data ||
        refreshResult.data;

      const newAccessToken =
        refreshData?.accessToken;

      if (newAccessToken) {
        const currentUser =
          api.getState().auth?.user;

        api.dispatch(
          setCredentials({
            user: currentUser,
            accessToken:
              newAccessToken,
          })
        );

        /*
         * Retry the original request
         * with the newly generated token.
         */
        result = await rawBaseQuery(
          args,
          api,
          extraOptions
        );
      } else {
        api.dispatch(
          clearCredentials()
        );
      }
    } else {
      /*
       * Refresh token is invalid,
       * expired or revoked.
       *
       * The session is genuinely over.
       */
      api.dispatch(
        clearCredentials()
      );
    }
  }

  return result;
};

export const api = createApi({
  reducerPath: "api",

  baseQuery:
    baseQueryWithReauth,

  tagTypes: [
    "Auth",
    "Slots",
    "Bookings",
    "Waitlist",
    "Analytics",
  ],

  endpoints: () => ({}),
});