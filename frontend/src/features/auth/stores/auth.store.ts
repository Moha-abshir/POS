import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setupInterceptors, api, API_URL } from '../../../lib/api';
import axios from 'axios';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  mobileNumber?: string;
  role: string;
  businessId?: string;
  businessName?: string;
  isSetupComplete?: boolean;
  isBankingEnabled?: boolean;
  businessStatus?: string;
  type?: 'user' | 'admin';
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  hasSkippedOnboarding?: boolean;
  setAuth: (user: User, accessToken: string) => void;
  logout: () => void;
  skipOnboarding: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => {
      setupInterceptors(
        () => get().accessToken,
        (token) => set({ accessToken: token }),
        () => get().logout()
      );

      return {
        user: null,
        accessToken: null,
        isAuthenticated: false,
        hasSkippedOnboarding: false,
        
        setAuth: (user, accessToken) => set({
          user,
          accessToken,
          isAuthenticated: true
        }),
        
        logout: async () => {
          set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
            hasSkippedOnboarding: false
          });
          try {
            await axios.post(`${API_URL}/auth/logout`, {}, { withCredentials: true });
          } catch (error) {
            console.error('Logout failed:', error);
          }
        },
        
        skipOnboarding: () => set({ hasSkippedOnboarding: true })
      };
    },
    {
      name: 'pos-auth-storage-v2',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        accessToken: state.accessToken
      }),
    }
  )
);
