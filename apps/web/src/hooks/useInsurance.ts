import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  ClaimsListResponse,
  ClaimDetail,
  SubmitClaimInput,
  SubmitClaimResponse,
  RequestAccessInput,
  ClaimDecisionInput,
  ConsentedRecordsResponse,
  VerifyRecordResponse,
} from '@/types/insurance';

// ─── Query keys ───────────────────────────────────────────────────────────────
export const insuranceKeys = {
  all:    ()           => ['insurance'] as const,
  claims: ()           => ['insurance', 'claims'] as const,
  claim:  (id: string) => ['insurance', 'claims', id] as const,
  records:(id: string) => ['insurance', 'claims', id, 'records'] as const,
};

// ─── GET /insurance/claims — list with filters ────────────────────────────────
export function useInsuranceClaims(filters?: {
  status?:    string;
  claimType?: string;
  riskLevel?: string;
  from?:      string;
  to?:        string;
  page?:      number;
  limit?:     number;
}) {
  return useQuery({
    queryKey: [...insuranceKeys.claims(), filters] as const,
    queryFn:  async () => {
      const params = new URLSearchParams();
      if (filters?.status)    params.set('status',    filters.status);
      if (filters?.claimType) params.set('claimType', filters.claimType);
      if (filters?.riskLevel) params.set('riskLevel', filters.riskLevel);
      if (filters?.from)      params.set('from',      filters.from);
      if (filters?.to)        params.set('to',        filters.to);
      if (filters?.page)      params.set('page',      String(filters.page));
      if (filters?.limit)     params.set('limit',     String(filters.limit));
      const qs = params.toString();
      const { data } = await api.get<{ success: boolean } & ClaimsListResponse>(
        `/insurance/claims${qs ? `?${qs}` : ''}`,
      );
      return { claims: data.claims, pagination: data.pagination };
    },
    staleTime: 30 * 1000,
  });
}

// ─── GET /insurance/claims/:id — full detail ──────────────────────────────────
export function useClaimDetail(id: string) {
  return useQuery({
    queryKey: insuranceKeys.claim(id),
    queryFn:  async () => {
      const { data } = await api.get<{ success: boolean; data: ClaimDetail }>(
        `/insurance/claims/${id}`,
      );
      return data.data;
    },
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

// ─── GET /insurance/claims/:id/records ───────────────────────────────────────
export function useClaimRecords(id: string) {
  return useQuery({
    queryKey: insuranceKeys.records(id),
    queryFn:  async () => {
      const { data } = await api.get<{ success: boolean; data: ConsentedRecordsResponse }>(
        `/insurance/claims/${id}/records`,
      );
      return data.data;
    },
    enabled:  !!id,
    staleTime: 60 * 1000,
  });
}

// ─── POST /insurance/claims — submit new claim ────────────────────────────────
export function useSubmitClaim() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SubmitClaimInput) => {
      const { data } = await api.post<{ success: boolean; data: SubmitClaimResponse }>(
        '/insurance/claims',
        input,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: insuranceKeys.claims() });
    },
  });
}

// ─── POST /insurance/claims/:id/request-access ───────────────────────────────
export function useRequestAccess(claimId: string) {
  return useMutation({
    mutationFn: async (input: RequestAccessInput) => {
      const { data } = await api.post<{ success: boolean; data: unknown }>(
        `/insurance/claims/${claimId}/request-access`,
        input,
      );
      return data.data;
    },
  });
}

// ─── PATCH /insurance/claims/:id/decision ────────────────────────────────────
export function useClaimDecision(claimId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ClaimDecisionInput) => {
      const { data } = await api.patch<{ success: boolean; data: ClaimDetail }>(
        `/insurance/claims/${claimId}/decision`,
        input,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: insuranceKeys.claim(claimId) });
      queryClient.invalidateQueries({ queryKey: insuranceKeys.claims() });
    },
  });
}

// ─── POST /insurance/verify-record — multipart ───────────────────────────────
export function useVerifyRecord() {
  return useMutation({
    mutationFn: async ({ file, recordId }: { file: File; recordId: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('recordId', recordId);
      const { data } = await api.post<{ success: boolean; data: VerifyRecordResponse }>(
        '/insurance/verify-record',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return data.data;
    },
  });
}
