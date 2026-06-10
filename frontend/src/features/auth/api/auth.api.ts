import { useMutation } from '@tanstack/react-query';
import { api } from '../../../lib/api';

interface RequestOtpResponse {
  success: boolean;
  message: string;
}

interface VerifyOtpResponse {
  success: boolean;
  data: {
    accessToken: string;
    user: {
      id: string;
      email: string;
      role: string;
    };
  };
}

export const useRequestOtp = () => {
  return useMutation({
    mutationFn: async (email: string) => {
      const response = await api.post<RequestOtpResponse>('/auth/request-otp', { email });
      return response.data;
    },
  });
};

export const useVerifyOtp = () => {
  return useMutation({
    mutationFn: async (data: { email: string; otp: string }) => {
      const response = await api.post<VerifyOtpResponse>('/auth/verify-otp', data);
      return response.data;
    },
  });
};
