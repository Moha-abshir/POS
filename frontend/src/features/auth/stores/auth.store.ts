import { create } from 'zustand';
import { setupInterceptors } from '../../../lib/api';

interface User {
  id: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => {
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
});
