import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  ActiveConsent,
  PendingConsent,
  ConsentHistoryResponse,
  ConsentCheckResult,
  RequestConsentResult,
  ApproveConsentResult,
  RevokeConsentResult,
  RequestConsentFormValues,
  ApproveConsentFormValues,
} from '@/types/consent';

// ─── Query keys ───────────────────────────────────────────────────────────────
export const consentKeys = {
  all:     ()                  => ['consents'] as const,
  active:  ()                  => ['consents', 'active'] as const,
  pending: ()                  => ['consents', 'pending'] as const,
  history: (page?: number)     => ['consents', 'history', page] as const,
  check:   (uhid: string)      => ['consents', 'check', uhid] as const,
};

// ─── GET /consents/active ─────────────────────────────────────────────────────
export function useActiveConsents() {
  return useQuery({
    queryKey: consentKeys.active(),
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: ActiveConsent[] }>('/consents/active');
      return data.data;
    },
    staleTime: 30_000,
  });
}

// ─── GET /consents/pending ────────────────────────────────────────────────────
export function usePendingConsents() {
  return useQuery({
    queryKey: consentKeys.pending(),
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: PendingConsent[] }>('/consents/pending');
      return data.data;
    },
    staleTime: 15_000,
    refetchInterval: 30_000, // poll every 30s for new requests
  });
}

// ─── GET /consents/history ────────────────────────────────────────────────────
export function useConsentHistory(page = 1) {
  return useQuery({
    queryKey: consentKeys.history(page),
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: ConsentHistoryResponse }>(
        '/consents/history',
        { params: { page, limit: 10 } }
      );
      return data.data;
    },
    staleTime: 60_000,
  });
}

// ─── GET /consents/check/:uhid ────────────────────────────────────────────────
export function useConsentCheck(uhid: string) {
  return useQuery({
    queryKey: consentKeys.check(uhid),
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: ConsentCheckResult }>(
        `/consents/check/${uhid}`
      );
      return data.data;
    },
    enabled: !!uhid,
    staleTime: 30_000,
  });
}

// ─── POST /consents/request ───────────────────────────────────────────────────
export function useRequestConsent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: RequestConsentFormValues) => {
      const body = payload.isTemporary && payload.durationHours
        ? payload
        : { ...payload, isTemporary: false, durationHours: undefined };
      const { data } = await api.post<{ success: boolean; message: string; data: RequestConsentResult }>(
        '/consents/request',
        body
      );
      return data.data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: consentKeys.check(variables.patientUhid) });
    },
  });
}

// ─── POST /consents/otp/send ──────────────────────────────────────────────────
export function useSendConsentOtp() {
  return useMutation({
    mutationFn: async (consentId: string) => {
      const { data } = await api.post<{ success: boolean; message: string; expiresInMinutes: number }>(
        '/consents/otp/send',
        { consentId }
      );
      return data;
    },
  });
}

// ─── POST /consents/approve ───────────────────────────────────────────────────
export function useApproveConsent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ApproveConsentFormValues) => {
      const { data } = await api.post<{ success: boolean; message: string; data: ApproveConsentResult }>(
        '/consents/approve',
        payload
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: consentKeys.active() });
      qc.invalidateQueries({ queryKey: consentKeys.pending() });
      qc.invalidateQueries({ queryKey: consentKeys.history() });
    },
  });
}

// ─── POST /consents/deny ──────────────────────────────────────────────────────
export function useDenyConsent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (consentId: string) => {
      const { data } = await api.post<{ success: boolean; message: string }>(
        '/consents/deny',
        { consentId }
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: consentKeys.pending() });
      qc.invalidateQueries({ queryKey: consentKeys.history() });
    },
  });
}

// ─── DELETE /consents/:id ─────────────────────────────────────────────────────
export function useRevokeConsent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (consentId: string) => {
      const { data } = await api.delete<{ success: boolean; message: string; data: RevokeConsentResult }>(
        `/consents/${consentId}`
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: consentKeys.active() });
      qc.invalidateQueries({ queryKey: consentKeys.history() });
    },
  });
}

// ─── Error message helper ─────────────────────────────────────────────────────
export function getConsentErrorMessage(error: unknown): string {
  if (!error) return 'An unexpected error occurred';
  const e = error as { response?: { data?: { error?: string; message?: string } }; message?: string };
  return (
    e.response?.data?.error ??
    e.response?.data?.message ??
    e.message ??
    'An unexpected error occurred'
  );
}
