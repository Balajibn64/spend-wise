import axios from "axios";
import type { ApiResponse, AuthResponse } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  // The refresh token now lives in an HttpOnly cookie set by the backend;
  // this makes the browser actually send/receive it.
  withCredentials: true,
});

// Auth endpoints that should NOT trigger token refresh on 401
const AUTH_PATHS = ["/api/auth/login", "/api/auth/signup", "/api/auth/refresh"];

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Shared across all concurrent 401s: the first one starts the refresh, every
// other request awaits the same promise instead of each firing its own
// refresh call (which used to race and, once refresh tokens rotate/expire on
// first use, would log the user out unpredictably).
let refreshPromise: Promise<string> | null = null;

function performRefresh(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post<ApiResponse<AuthResponse>>(`${API_BASE}/api/auth/refresh`, {}, { withCredentials: true })
      .then(({ data }) => {
        const accessToken = data.data.accessToken;
        localStorage.setItem("accessToken", accessToken);
        return accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const requestPath = originalRequest?.url || "";

    // Don't intercept auth endpoints — let the error propagate to the caller
    const isAuthRequest = AUTH_PATHS.some((p) => requestPath.includes(p));
    if (isAuthRequest) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const accessToken = await performRefresh();
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
        window.location.href = "/login?expired=true";
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
