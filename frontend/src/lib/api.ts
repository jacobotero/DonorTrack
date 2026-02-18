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
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    } else if (error.response?.status === 402 && error.response?.data?.trialExpired) {
      // Trial expired - redirect to upgrade page
      window.location.href = "/app/upgrade?trial_expired=true";
    }
    return Promise.reject(error);
  }
);

export default api;
