import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  DoctorCard,
  DoctorsResponse,
  DoctorSearchFilters,
  SlotsResponse,
  AppointmentsResponse,
  AppointmentListFilters,
  BookAppointmentInput,
  BookAppointmentResult,
  JitsiTokenResult,
} from '@/types/telehealth';

// ─── Query Key Factory ────────────────────────────────────────────────────────

export const telehealthKeys = {
  all:              ['telehealth'] as const,
  doctors:          (filters: DoctorSearchFilters) => [...telehealthKeys.all, 'doctors', filters] as const,
  doctor:           (id: string) => [...telehealthKeys.all, 'doctor', id] as const,
  slots:            (doctorId: string, from?: string, to?: string) =>
                      [...telehealthKeys.all, 'slots', doctorId, from, to] as const,
  appointments:     (filters: AppointmentListFilters) =>
                      [...telehealthKeys.all, 'appointments', filters] as const,
  jitsiToken:       (appointmentId: string) =>
                      [...telehealthKeys.all, 'jitsi', appointmentId] as const,
};

// ─── Doctor Search ────────────────────────────────────────────────────────────

export function useDoctorSearch(filters: DoctorSearchFilters = {}) {
  return useQuery<DoctorsResponse>({
    queryKey: telehealthKeys.doctors(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== '') params.set(k, String(v));
      });
      const { data } = await api.get<{ success: boolean; data: DoctorsResponse }>(`/hospital/doctors?${params}`);
      return data.data;
    },
    staleTime: 60_000,
  });
}

// ─── Doctor Slots ─────────────────────────────────────────────────────────────

export function useDoctorSlots(doctorId: string, from?: string, to?: string) {
  return useQuery<SlotsResponse>({
    queryKey: telehealthKeys.slots(doctorId, from, to),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to)   params.set('to', to);
      const { data } = await api.get<{ success: boolean; data: SlotsResponse }>(
        `/hospital/doctors/${doctorId}/slots?${params}`,
      );
      return data.data;
    },
    enabled: !!doctorId,
    staleTime: 30_000,
  });
}

// ─── Book Appointment ─────────────────────────────────────────────────────────

export function useBookAppointment() {
  const qc = useQueryClient();
  return useMutation<BookAppointmentResult, Error, BookAppointmentInput>({
    mutationFn: async (input) => {
      const { data } = await api.post<{ success: boolean; data: BookAppointmentResult }>('/hospital/appointments', input);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: telehealthKeys.all });
    },
  });
}

// ─── List Appointments ────────────────────────────────────────────────────────

export function useAppointments(filters: AppointmentListFilters = {}) {
  return useQuery<AppointmentsResponse>({
    queryKey: telehealthKeys.appointments(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== '') params.set(k, String(v));
      });
      const { data } = await api.get<{ success: boolean; data: AppointmentsResponse }>(`/hospital/appointments?${params}`);
      return data.data;
    },
    staleTime: 30_000,
  });
}

// ─── Cancel Appointment ───────────────────────────────────────────────────────

export function useCancelAppointment() {
  const qc = useQueryClient();
  return useMutation<{ message: string }, Error, { appointmentId: string; reason: string }>({
    mutationFn: async ({ appointmentId, reason }) => {
      const { data } = await api.patch<{ success: boolean; data: { message: string } }>(
        `/hospital/appointments/${appointmentId}/cancel`,
        { reason },
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: telehealthKeys.all });
    },
  });
}

// ─── Jitsi Token (join call) ──────────────────────────────────────────────────

export function useJitsiToken(appointmentId: string | null) {
  return useQuery<JitsiTokenResult>({
    queryKey: telehealthKeys.jitsiToken(appointmentId ?? ''),
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: JitsiTokenResult }>(
        `/hospital/appointments/join/${appointmentId}`,
      );
      return data.data;
    },
    enabled: !!appointmentId,
    staleTime: 60_000,
    retry: false,
  });
}

// ─── Submit Review ────────────────────────────────────────────────────────────

export function useSubmitReview() {
  const qc = useQueryClient();
  return useMutation<
    { message: string },
    Error,
    { appointmentId: string; rating: number; comment?: string; isAnonymous?: boolean }
  >({
    mutationFn: async ({ appointmentId, ...body }) => {
      const { data } = await api.post<{ success: boolean; data: { message: string } }>(
        `/hospital/appointments/${appointmentId}/review`,
        body,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: telehealthKeys.all });
    },
  });
}

// ─── Quick helper: single doctor card (from cached list) ─────────────────────

export function useDoctorById(doctors: DoctorCard[] | undefined, id: string) {
  return doctors?.find((d) => d.id === id);
}
