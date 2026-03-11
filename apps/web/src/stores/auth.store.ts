import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Role =
  | 'PATIENT'
  | 'DOCTOR'
  | 'HOSPITAL_STAFF'
  | 'HOSPITAL_ADMIN'
  | 'INSURANCE_PROVIDER'
  | 'SUPER_ADMIN';

export interface AuthUser {
  userId: string;
  role: Role;
  name: string;
  email: string;
  uhid?: string | null;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;

  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true }),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      clearAuth: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'uhid-auth',
      storage: createJSONStorage(() => localStorage),
      // Only persist tokens and user — not callbacks
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
