import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { store } from "@/store";
import { setAccessToken, clearAuth } from "@/store/authSlice";

// Backend address from .env.local -> "http://localhost:5000"
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";




// The refresh token (7 days)  kept in localStorage so the user stays logged in after closing the tab.  The access token (15 min) is kept only in Redux memory.
const REFRESH_KEY = "refreshToken";

export const saveRefreshToken = (token: string) => {
  localStorage.setItem(REFRESH_KEY, token);
}
export const getRefreshToken = () => {
  return localStorage.getItem(REFRESH_KEY);
}
export const removeRefreshToken = () => {
  localStorage.removeItem(REFRESH_KEY);
}



//================================================================================== the axios instance ==========================================================================
// usage: api.get("/properties/mine")  ("/api" is added automatically)

const api = axios.create({
  baseURL: API_URL + "/api",
});




//================================================================================== BEFORE every request ==========================================================================
// if we have an access token, add the header   Authorization: Bearer <token>

api.interceptors.request.use((config) => {
  const token = store.getState().auth.accessToken;
  if (token) {
    config.headers.Authorization = "Bearer " + token;
  }
  return config;
});



//================================================================================== CALL /auth/refresh ==========================================================================
// POST /auth/refresh -> new tokens (null = failed, user is logged out)

const callRefreshApi = async () => {

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return null; // never logged in on this browser
  }

  try {
    const res = await axios.post(API_URL + "/api/auth/refresh", { refreshToken: refreshToken });

    saveRefreshToken(res.data.refreshToken);              // new refresh token -> localStorage
    store.dispatch(setAccessToken(res.data.accessToken)); // new access token  -> Redux
    return res.data.accessToken as string;
  } catch {
    removeRefreshToken(); 
    store.dispatch(clearAuth());
    return null;
  }
}




//================================================================================== ONLY ONE REFRESH AT A TIME ==========================================================================
// many 401s at once -> only one refresh runs, the others wait for it

let runningRefresh: Promise<string | null> | null = null; // the refresh that is running now (or null)

export const getNewAccessToken = async () => {
  // nobody is refreshing yet -> I start it
  if (runningRefresh === null) {
    runningRefresh = callRefreshApi();
  }
  // wait for the result (mine, or the one someone else started)
  const newToken = await runningRefresh;

  // finished -> next time a new refresh can start
  runningRefresh = null;

  return newToken;
}



//================================================================================== AFTER every response ==========================================================================
// 401 (token expired) -> refresh -> send the same request again

api.interceptors.response.use(

  // success
  (response) => {
    return response;
  },

  // error
  async (error: AxiosError) => {

    const request = error.config as InternalAxiosRequestConfig & { retried?: boolean };

    // STEP 1: not a 401? -> nothing to do, give the error to the page
    if (!error.response || error.response.status !== 401 || !request) {
      return Promise.reject(error);
    }

    // STEP 2: 401 from login / register / refresh / logout means "wrong password" or "bad refresh token", NOT "token expired" -> give the error to the page
    const url = request.url;
    if (url === "/auth/login" || url === "/auth/register" || url === "/auth/refresh" || url === "/auth/logout") {
      return Promise.reject(error);
    }

    // STEP 3: we already retried this request once -> stop (no endless loop)
    if (request.retried === true) {
      return Promise.reject(error);
    }
    request.retried = true;

    // STEP 4: get a new access token
    const newToken = await getNewAccessToken();

    // STEP 5: refresh failed -> user is logged out, give the error to the page
    if (newToken === null) {
      return Promise.reject(error);
    }

    // STEP 6: send the SAME request again, now with the new token
    request.headers.Authorization = "Bearer " + newToken;
    return api(request);
  }
);





//================================================================================== error message helper ==========================================================================
// backend errors are { message } -> toast.error(getErrorMessage(err))

export const getErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    if (error.response && error.response.data && error.response.data.message) {
      return error.response.data.message as string;
    }
    if (!error.response) {
      return "cannot reach the server, please check your connection";
    }
  }
  return "something went wrong";
}

export default api;
