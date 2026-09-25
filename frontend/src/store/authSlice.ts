import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// Redux slice: who is logged in

export type User = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: "USER" | "ADMIN";
};

type AuthState = {
  user: User | null;          // null = nobody logged in (guest)
  accessToken: string | null; // the 15-minute token, kept only in memory
  checked: boolean;           // false until we know (after page load) if the user is logged in
};

const initialState: AuthState = {
  user: null,
  accessToken: null,
  checked: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState: initialState,
  reducers: {

    // after login / refresh / page reload check -> remember the user and token
    setAuth(state, action: PayloadAction<{ user: User; accessToken: string }>) {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.checked = true;
    },

    // after /auth/refresh -> only the access token changes
    setAccessToken(state, action: PayloadAction<string>) {
      state.accessToken = action.payload;
    },

    // logout, or refresh failed -> forget everything
    clearAuth(state) {
      state.user = null;
      state.accessToken = null;
      state.checked = true;
    },
  },
});

export const { setAuth, setAccessToken, clearAuth } = authSlice.actions;
export default authSlice.reducer;
