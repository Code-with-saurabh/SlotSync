import {
  createApi,
  fetchBaseQuery,
} from "@reduxjs/toolkit/query/react";

import {
  clearCredentials,
  setCredentials,
} from "../features/auth/authSlice";

const baseQuery = fetchBaseQuery({
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
  let result = await baseQuery(
    args,
    api,
    extraOptions
  );

  /*
   * If the access token is expired,
   * attempt to obtain a new access token
   * using the HttpOnly refresh cookie.
   */
  if (result?.error?.status === 401) {
    const refreshResult =
      await baseQuery(
        {
          url: "/auth/refresh",
          method: "POST",
        },
        api,
        extraOptions
      );

    if (refreshResult?.data?.data?.accessToken) {
      const newAccessToken =
        refreshResult.data.data.accessToken;

      /*
       * The refresh endpoint only returns
       * a new access token.
       *
       * The refresh token itself remains
       * inside the HttpOnly cookie.
       */
      api.dispatch(
        setCredentials({
          user:
            api.getState().auth?.user,
          accessToken: newAccessToken,
        })
      );

      /*
       * Retry the original request with
       * the new access token.
       */
      result = await baseQuery(
        args,
        api,
        extraOptions
      );
    } else {
      /*
       * Refresh failed.
       *
       * The current session can no longer
       * be trusted, so clear frontend auth state.
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

  baseQuery: baseQueryWithReauth,

  tagTypes: [
    "Auth",
    "Slots",
    "Bookings",
    "Waitlist",
    "Analytics",
  ],

  endpoints: () => ({}),
});