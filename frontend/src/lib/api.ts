import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // For sending/receiving HttpOnly cookies (refresh token)
});

// Add an interceptor to inject the Access Token if we have it in memory
export const setupInterceptors = (getAccessToken: () => string | null, logout: () => void) => {
  api.interceptors.request.use((config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        
        try {
          // Attempt to refresh token
          // const res = await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
          // setAccessToken(res.data.data.accessToken);
          // originalRequest.headers.Authorization = `Bearer ${res.data.data.accessToken}`;
          // return api(originalRequest);
          
          // For now, we just logout because we haven't implemented /refresh yet
          logout();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (refreshError) {
          logout();
        }
      }
      return Promise.reject(error);
    }
  );
};
