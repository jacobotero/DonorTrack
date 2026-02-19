import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url || "";
    const isAuthRoute = requestUrl.startsWith("/auth/");
    if (error.response?.status === 401 && !isAuthRoute) {
      // Only redirect on 401 for protected routes, not login/register failures
      localStorage.removeItem("token");
      window.location.href = "/login";
    } else if (error.response?.status === 402 && error.response?.data?.trialExpired) {
      window.location.href = "/app/upgrade?trial_expired=true";
    } else if (error.response?.status === 402 && error.response?.data?.subscriptionCanceled) {
      window.location.href = "/upgrade?subscription_canceled=true";
    }
    return Promise.reject(error);
  }
);

export default api;
