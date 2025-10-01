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

// Prevent browser-level caching for API requests
api.interceptors.request.use((config) => {
  config.headers = config.headers || {} as any;
  (config.headers as any)['Cache-Control'] = 'no-store, no-cache, must-revalidate, proxy-revalidate';
  (config.headers as any)['Pragma'] = 'no-cache';
  (config.headers as any)['Expires'] = '0';
  return config;
});
