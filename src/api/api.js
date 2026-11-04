import axios from "axios";
import { getToken } from "../utils/auth";
const api = axios.create({
  baseURL: "https://bcknd.mathshouse.net", 
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      if (
        window.location.pathname !== "/" &&
        window.location.pathname !== "/logindrive"
      ) {
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
