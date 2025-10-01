import Axios from "axios";

export const api = Axios.create({
  baseURL: "",
  withCredentials: true,
});

// Redirect to login on 401 anywhere
api.interceptors.response.use(
  (res) => res,
  (error) => {
    try {
      const status = error?.response?.status;
      if (status === 401 && typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    } catch {}
    return Promise.reject(error);
  },
);
