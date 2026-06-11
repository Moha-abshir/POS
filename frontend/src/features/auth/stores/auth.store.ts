import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setupInterceptors } from '../../../lib/api';

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
  setAuth: (user: User, accessToken: string) => void;
  logout: () => void;
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
        
        setAuth: (user, accessToken) => set({
          user,
          accessToken,
          isAuthenticated: true
        }),
        
        logout: () => set({
          user: null,
          accessToken: null,
          isAuthenticated: false
        })
      };
    },
    {
      name: 'pos-auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated
      }),
    }
  )
);
