import axios from "axios";
import {
  clearAuthSession,
  getStoredAccessToken,
  getStoredRefreshToken,
  setAuthSession
} from "../utils/authSession";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const API = axios.create({

  baseURL: API_BASE_URL

});

export const refreshClient = axios.create({
  baseURL: API_BASE_URL
});

const AUTH_BYPASS_PATHS = [
  "/login",
  "/register",
  "/refresh-token",
  "/logout",
  "/verify-email",
  "/resend-verification",
  "/forgot-password",
  "/reset-password"
];

const isBypassPath = (url = "") => AUTH_BYPASS_PATHS.some((path) => String(url).includes(path));

let refreshPromise = null;

API.interceptors.request.use((config) => {
  const nextConfig = { ...config };
  const accessToken = getStoredAccessToken();

  if (
    accessToken &&
    !nextConfig.headers?.Authorization &&
    !isBypassPath(nextConfig.url)
  ) {
    nextConfig.headers = {
      ...(nextConfig.headers || {}),
      Authorization: `Bearer ${accessToken}`
    };
  }

  return nextConfig;
});

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};

    if (
      !error.response ||
      error.response.status !== 401 ||
      originalRequest._retry ||
      originalRequest._skipAuthRefresh ||
      isBypassPath(originalRequest.url)
    ) {
      return Promise.reject(error);
    }

    const refreshToken = getStoredRefreshToken();

    if (!refreshToken) {
      clearAuthSession();
      return Promise.reject(error);
    }

    try {
      if (!refreshPromise) {
        refreshPromise = refreshClient
          .post(
            "/refresh-token",
            { refresh_token: refreshToken },
            { _skipAuthRefresh: true }
          )
          .then((response) => response.data)
          .finally(() => {
            refreshPromise = null;
          });
      }

      const session = await refreshPromise;

      setAuthSession({
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        user: session.user
      });

      originalRequest._retry = true;
      originalRequest.headers = {
        ...(originalRequest.headers || {}),
        Authorization: `Bearer ${session.access_token}`
      };

      return API(originalRequest);
    } catch (refreshError) {
      clearAuthSession();
      return Promise.reject(refreshError);
    }
  }
);

export default API;