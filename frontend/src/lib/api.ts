import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // For sending/receiving HttpOnly cookies (refresh token)
  timeout: 30000, // 30 seconds timeout default
});

// Add an interceptor to inject the Access Token if we have it in memory
export const setupInterceptors = (
  getAccessToken: () => string | null,
  setAccessToken: (token: string) => void,
  logout: () => void,
  updateUser?: (fields: any) => void
) => {
  api.interceptors.request.use((config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  api.interceptors.response.use(
    (response) => {
      // Check response headers for real-time payment status
      try {
        const paymentStatus = response.headers['x-business-payment-status'];
        if (paymentStatus && updateUser) {
          const rawStorage = localStorage.getItem('pos-auth-storage-v2');
          if (rawStorage) {
            const parsed = JSON.parse(rawStorage);
            const currentUser = parsed.state?.user;
            if (currentUser && currentUser.type !== 'admin') {
              const amountHeader = response.headers['x-business-payment-amount'];
              const reasonHeader = response.headers['x-business-payment-reason'];
              const reason = reasonHeader ? decodeURIComponent(reasonHeader) : null;
              const isLocked = paymentStatus === 'locked';

              if (
                currentUser.paymentStatus !== paymentStatus ||
                Boolean(currentUser.isPaymentLocked) !== isLocked
              ) {
                updateUser({
                  paymentStatus,
                  isPaymentLocked: isLocked,
                  paymentAmountDue: amountHeader !== undefined ? amountHeader : currentUser.paymentAmountDue,
                  paymentLockReason: reason !== null ? reason : currentUser.paymentLockReason,
                });
              }
            }
          }
        }
      } catch {
        // Silently ignore header parsing errors
      }
      return response;
    },
    async (error) => {
      const originalRequest = error.config;
      
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        
        try {
          // Attempt to refresh token
          const res = await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
          const newAccessToken = res.data.data.accessToken;
          setAccessToken(newAccessToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        } catch (refreshError: any) {
          if (refreshError.response?.status === 401) {
            logout();
          }
          return Promise.reject(refreshError);
        }
      }
      if (
        error.response?.status === 403 && 
        (error.response?.data?.error?.code === 'INACTIVE_BUSINESS' || error.response?.data?.error?.code === 'PAYMENT_REQUIRED')
      ) {
        if (error.response?.data?.error?.code === 'PAYMENT_REQUIRED') {
          try {
            const rawStorage = localStorage.getItem('pos-auth-storage-v2');
            if (rawStorage) {
              const parsed = JSON.parse(rawStorage);
              if (parsed.state?.user) {
                parsed.state.user.isPaymentLocked = true;
                parsed.state.user.paymentStatus = 'locked';
                if (error.response?.data?.error?.paymentDetails?.reason) {
                  parsed.state.user.paymentLockReason = error.response.data.error.paymentDetails.reason;
                }
                if (error.response?.data?.error?.paymentDetails?.amountDue) {
                  parsed.state.user.paymentAmountDue = error.response.data.error.paymentDetails.amountDue;
                }
                localStorage.setItem('pos-auth-storage-v2', JSON.stringify(parsed));
              }
            }
          } catch {}
        }

        const redirectUrl = error.response?.data?.error?.redirect || '/payment-required';
        if (redirectUrl && window.location.pathname !== redirectUrl) {
          window.location.href = redirectUrl;
          return new Promise(() => {});
        }
      }
      return Promise.reject(error);
    }
  );
};
