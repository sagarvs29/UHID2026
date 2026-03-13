import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';
import type { AxiosError } from 'axios';

// ─── Types ───────────────────────────────────────────────

export type RegisterRole = 'patient' | 'doctor' | 'staff' | 'insurance';

/** Common fields for ALL roles */
interface BaseRegisterPayload {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

/** Patient-specific */
export interface PatientRegisterPayload extends BaseRegisterPayload {
  role: 'patient';
  dateOfBirth: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
  bloodGroup?: string;
  allergies?: string[];
  chronicConditions?: string[];
}

/** Doctor-specific */
export interface DoctorRegisterPayload extends BaseRegisterPayload {
  role: 'doctor';
  hospitalId: string;
  specialty: string;
  licenseNumber: string;
  qualifications: string[];
  experienceYears: number;
  consultationFee?: number;
}

/** Staff-specific */
export interface StaffRegisterPayload extends BaseRegisterPayload {
  role: 'staff';
  hospitalId: string;
  staffType: 'NURSE' | 'PHARMACIST' | 'LAB_TECHNICIAN' | 'RECEPTIONIST' | 'RADIOLOGIST' | 'OTHER';
  employeeId?: string;
}

/** Insurance-specific */
export interface InsuranceRegisterPayload extends BaseRegisterPayload {
  role: 'insurance';
  companyName: string;
  licenseNumber: string;
}

export type RegisterPayload =
  | PatientRegisterPayload
  | DoctorRegisterPayload
  | StaffRegisterPayload
  | InsuranceRegisterPayload;

interface LoginPayload {
  email: string;
  password: string;
}

interface AuthUser {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: string;
  uhid?: string | null;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
}

interface AuthResponse {
  success: boolean;
  data: {
    user: AuthUser;
    tokens: {
      accessToken: string;
      refreshToken: string;
    };
    // some endpoints return tokens at top-level data
    accessToken?: string;
    refreshToken?: string;
  };
}

export interface Hospital {
  id: string;
  name: string;
  city: string;
  state: string;
}

// ─── Helpers ─────────────────────────────────────────────

function extractError(err: unknown): string {
  const axErr = err as AxiosError<{ error?: string; message?: string }>;
  return (
    axErr.response?.data?.error ??
    axErr.response?.data?.message ??
    'Something went wrong'
  );
}

export function getErrorMessage(err: unknown): string {
  return extractError(err);
}

function nameFromUser(user: AuthUser): string {
  if (user.name) return user.name;
  const parts = [user.firstName, user.lastName].filter(Boolean);
  return parts.length ? parts.join(' ') : user.email.split('@')[0];
}

// ─── Hooks ────────────────────────────────────────────────

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const res = await api.post<AuthResponse>('/auth/login', payload);
      return res.data;
    },
    onSuccess: (data) => {
      const { user } = data.data;
      const tokens = data.data.tokens ?? {
        accessToken: data.data.accessToken!,
        refreshToken: data.data.refreshToken!,
      };
      setAuth(
        {
          userId: user.id,
          role: user.role as never,
          name: nameFromUser(user),
          email: user.email,
          uhid: user.uhid,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
        },
        tokens.accessToken,
        tokens.refreshToken
      );
    },
  });
}

export function useRegister() {
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: async (payload: RegisterPayload) => {
      const { role, ...body } = payload;
      const res = await api.post<AuthResponse>(`/auth/register/${role}`, body);
      return res.data;
    },
    onSuccess: (data) => {
      const { user } = data.data;
      const tokens = data.data.tokens ?? {
        accessToken: data.data.accessToken!,
        refreshToken: data.data.refreshToken!,
      };
      setAuth(
        {
          userId: user.id,
          role: user.role as never,
          name: nameFromUser(user),
          email: user.email,
          uhid: user.uhid,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
        },
        tokens.accessToken,
        tokens.refreshToken
      );
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

export function useVerifyEmail() {
  return useMutation({
    mutationFn: async (token: string) => {
      const res = await api.get(`/auth/verify-email?token=${token}`);
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
    mutationFn: async (payload: { token: string; newPassword: string; confirmPassword: string }) => {
      const res = await api.post('/auth/reset-password', payload);
      return res.data;
    },
  });
}

export function useHospitals(search = '') {
  return useQuery<Hospital[]>({
    queryKey: ['hospitals', search],
    queryFn: async () => {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await api.get<{ success: boolean; data: Hospital[] }>(`/hospitals${params}`);
      return res.data.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}
