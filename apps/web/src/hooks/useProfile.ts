import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProfileResponse {
  user: {
    id: string;
    email: string;
    role: string;
    isEmailVerified: boolean;
    isActive: boolean;
    createdAt: string;
  };
  profile: Record<string, unknown> | null;
}

export interface PatientProfileUpdate {
  firstName?: string;
  lastName?: string;
  phone?: string;
  bloodGroup?: string;
  allergies?: string[];
  chronicConditions?: string[];
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface DoctorProfileUpdate {
  firstName?: string;
  lastName?: string;
  specialty?: string;
  qualifications?: string[];
  experienceYears?: number;
  consultationFee?: number;
  languages?: string[];
  availableForVideo?: boolean;
  availableForInPerson?: boolean;
  slotDurationMinutes?: number;
}

export type ProfileUpdate = PatientProfileUpdate | DoctorProfileUpdate;

// ─── Availability types ───────────────────────────────────────────────────────

export type AvailabilityDay =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export interface AvailabilitySlot {
  id?: string;
  dayOfWeek: AvailabilityDay;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  isActive: boolean;
}

export interface DoctorAvailabilityResponse {
  settings: {
    consultationFee: number | null;
    slotDurationMinutes: number;
    availableForVideo: boolean;
    availableForInPerson: boolean;
  };
  slots: AvailabilitySlot[];
}

export interface DoctorSettingsUpdate {
  consultationFee?: number;
  slotDurationMinutes?: number;
  availableForVideo?: boolean;
  availableForInPerson?: boolean;
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const profileKeys = {
  me:           ['profile', 'me'] as const,
  availability: ['profile', 'availability'] as const,
};

// ─── Get current profile (GET /auth/me) ───────────────────────────────────────

export function useMyProfile() {
  return useQuery<ProfileResponse>({
    queryKey: profileKeys.me,
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: ProfileResponse }>('/auth/me');
      return data.data;
    },
    staleTime: 60_000,
  });
}

// ─── Update profile (PATCH /auth/profile) ─────────────────────────────────────

export function useUpdateProfile() {
  const qc = useQueryClient();
  const setAuth = useAuthStore((s) => s.setAuth);
  const currentUser = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);

  return useMutation<Record<string, unknown>, Error, ProfileUpdate>({
    mutationFn: async (payload) => {
      const { data } = await api.patch<{ success: boolean; data: Record<string, unknown> }>(
        '/auth/profile',
        payload,
      );
      return data.data;
    },
    onSuccess: (updatedProfile) => {
      qc.invalidateQueries({ queryKey: profileKeys.me });

      // Sync the auth store name if firstName/lastName changed
      if (currentUser && accessToken && refreshToken) {
        const firstName = (updatedProfile.firstName as string) ?? '';
        const lastName  = (updatedProfile.lastName as string) ?? '';
        const parts = [firstName, lastName].filter(Boolean);
        if (parts.length) {
          setAuth(
            { ...currentUser, name: parts.join(' ') },
            accessToken,
            refreshToken,
          );
        }
      }
    },
  });
}

// ─── Get doctor availability (GET /hospital/doctor/availability) ──────────────

export function useDoctorAvailability() {
  return useQuery<DoctorAvailabilityResponse>({
    queryKey: profileKeys.availability,
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: DoctorAvailabilityResponse }>(
        '/hospital/doctor/availability',
      );
      return data.data;
    },
    staleTime: 60_000,
  });
}

// ─── Set doctor availability (PUT /hospital/doctor/availability) ──────────────

export function useSetAvailability() {
  const qc = useQueryClient();
  return useMutation<AvailabilitySlot[], Error, { slots: Omit<AvailabilitySlot, 'id'>[] }>({
    mutationFn: async (payload) => {
      const { data } = await api.put<{ success: boolean; data: AvailabilitySlot[] }>(
        '/hospital/doctor/availability',
        payload,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: profileKeys.availability });
    },
  });
}

// ─── Update doctor settings (PATCH /hospital/doctor/settings) ─────────────────

export function useUpdateDoctorSettings() {
  const qc = useQueryClient();
  return useMutation<Record<string, unknown>, Error, DoctorSettingsUpdate>({
    mutationFn: async (payload) => {
      const { data } = await api.patch<{ success: boolean; data: Record<string, unknown> }>(
        '/hospital/doctor/settings',
        payload,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: profileKeys.availability });
      qc.invalidateQueries({ queryKey: profileKeys.me });
    },
  });
}
