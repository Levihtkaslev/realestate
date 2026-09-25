import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";

// Redux store = shared memory of the app
export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
});

// TypeScript types for the store (used by hooks.ts)
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
