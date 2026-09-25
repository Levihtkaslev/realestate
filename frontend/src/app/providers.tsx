"use client";


import { useEffect } from "react";
import { Provider } from "react-redux";
import { ToastContainer } from "react-toastify";
import { store } from "@/store";
import { setAuth, clearAuth } from "@/store/authSlice";
import api, { getNewAccessToken } from "@/lib/api";

const Providers = ({ children }: { children: React.ReactNode }) => {

  //================ STAY LOGGED IN after page reload: refresh token -> new access token -> /auth/me ================
  useEffect(() => {
    const restoreLogin = async () => {

      // 1. new access token (null = no refresh token, or it expired)
      const accessToken = await getNewAccessToken();
      if (!accessToken) {
        store.dispatch(clearAuth()); // guest (also marks "checked")
        return;
      }

      // 2. who am I
      try {
        const res = await api.get("/auth/me");
        // 3. remember the user
        store.dispatch(setAuth({ user: res.data, accessToken: accessToken }));
      } catch {
        store.dispatch(clearAuth());
      }
    };

    restoreLogin();
  }, []);

  return (
    <Provider store={store}>
      {children}

      {/* toasts appear bottom-right, so they never cover top buttons */}
      <ToastContainer position="top-center" theme="dark" autoClose={3000} newestOnTop />
    </Provider>
  );
};

export default Providers;
