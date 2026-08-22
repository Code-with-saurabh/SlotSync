import {
  createApi,
  fetchBaseQuery,
} from "@reduxjs/toolkit/query/react";

export const api = createApi({
  reducerPath: "api",

  baseQuery: fetchBaseQuery({
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
  }),

  tagTypes: [
    "Auth",
    "Slots",
    "Bookings",
    "Waitlist",
    "Analytics",
  ],

  endpoints: () => ({}),
});