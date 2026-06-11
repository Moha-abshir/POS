import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setupInterceptors, api } from '../../../lib/api';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  mobileNumber?: string;
  role: string;
  businessId: string;
  businessName?: string;
  isSetupComplete?: boolean;
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
      // Initialize interceptors with our store's getters/setters
      setupInterceptors(
        () => get().accessToken,
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
          try {
            await api.post('/auth/logout');
          } catch (error) {
            console.error('Logout failed:', error);
          }
          set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
            hasSkippedOnboarding: false
          });
        },
        
        skipOnboarding: () => set({ hasSkippedOnboarding: true })
      };
    },
    {
      name: 'pos-auth-storage-v2',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated
      }),
    }
  )
);
