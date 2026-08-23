import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  user: null,
  accessToken: null,
  initialized: false,
};

const authSlice = createSlice({
  name: "auth",

  initialState,

  reducers: {
    setCredentials: (
      state,
      action
    ) => {
      const {
        user,
        accessToken,
      } = action.payload;

      if (user !== undefined) {
        state.user = user;
      }

      if (accessToken !== undefined) {
        state.accessToken =
          accessToken;
      }
    },

    setUser: (
      state,
      action
    ) => {
      state.user =
        action.payload;
    },

    clearCredentials: (
      state
    ) => {
      state.user = null;
      state.accessToken = null;
    },

    setInitialized: (
      state,
      action
    ) => {
      state.initialized =
        action.payload;
    },
  },
});

export const {
  setCredentials,
  setUser,
  clearCredentials,
  setInitialized,
} = authSlice.actions;

export default authSlice.reducer;