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
      state.user =
        action.payload.user;

      state.accessToken =
        action.payload.accessToken;
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