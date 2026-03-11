import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';
import type { AxiosError } from 'axios';

interface RegisterPayload {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: string;
}

interface LoginPayload {
  email: string;
  password: string;
}

interface AuthResponse {
  success: boolean;
  data: {
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      uhid?: string | null;
      isEmailVerified: boolean;
      isPhoneVerified: boolean;
    };
    tokens: {
      accessToken: string;
      refreshToken: string;
    };
  };
}

function extractError(err: unknown): string {
  const axErr = err as AxiosError<{ error?: string }>;
  return axErr.response?.data?.error ?? 'Something went wrong';
}

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const res = await api.post<AuthResponse>('/auth/login', payload);
      return res.data;
    },
    onSuccess: (data) => {
      const { user, tokens } = data.data;
      setAuth(
        {
          userId: user.id,
          role: user.role as never,
          name: user.name,
          email: user.email,
          uhid: user.uhid,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
        },
        tokens.accessToken,
        tokens.refreshToken
      );
    },
    onError: (err) => {
      console.error('[Login]', extractError(err));
    },
  });
}

export function useRegister() {
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: async (payload: RegisterPayload) => {
      const res = await api.post<AuthResponse>('/auth/register', payload);
      return res.data;
    },
    onSuccess: (data) => {
      const { user, tokens } = data.data;
      setAuth(
        {
          userId: user.id,
          role: user.role as never,
          name: user.name,
          email: user.email,
          uhid: user.uhid,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
        },
        tokens.accessToken,
        tokens.refreshToken
      );
    },
    onError: (err) => {
      console.error('[Register]', extractError(err));
    },
  });
}

export function useLogout() {
  const clearAuth = useAuthStore((s) => s.clearAuth);

  return useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout');
    },
    onSettled: () => {
      clearAuth();
      window.location.href = '/login';
    },
  });
}

export function useSendOtp() {
  return useMutation({
    mutationFn: async (payload: {
      email?: string;
      phone?: string;
      purpose: string;
    }) => {
      const res = await api.post('/auth/send-otp', payload);
      return res.data;
    },
  });
}

export function useVerifyOtp() {
  return useMutation({
    mutationFn: async (payload: {
      email?: string;
      phone?: string;
      otp: string;
      purpose: string;
    }) => {
      const res = await api.post('/auth/verify-otp', payload);
      return res.data;
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (email: string) => {
      const res = await api.post('/auth/forgot-password', { email });
      return res.data;
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async (payload: { token: string; newPassword: string }) => {
      const res = await api.post('/auth/reset-password', payload);
      return res.data;
    },
  });
}
