import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { api } from '@/lib/api';
import type { DecodeResponse, ClinicalSummaryResponse, AiSummaryCache } from '@/types/ai';

// ─── Query keys ───────────────────────────────────────────────────────────────
export const aiKeys = {
  all:             ()                  => ['ai'] as const,
  cachedSummary:   (recordId: string)  => ['ai', 'summary', recordId] as const,
  clinicalSummary: (uhid: string)      => ['ai', 'clinical', uhid] as const,
};

// ─── POST /ai/decode — patient decodes their own record ──────────────────────
export function useDecodeReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (recordId: string) => {
      const { data } = await api.post<{ success: boolean; data: DecodeResponse }>(
        '/ai/decode',
        { recordId },
      );
      return data.data;
    },
    onSuccess: (result) => {
      // Warm the cache so the GET endpoint can serve it immediately
      queryClient.setQueryData(aiKeys.cachedSummary(result.recordId), result);
    },
  });
}

// ─── POST /ai/clinical-summary — doctor requests AI briefing ─────────────────
export function useClinicalSummary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patientUhid: string) => {
      const { data } = await api.post<{ success: boolean; data: ClinicalSummaryResponse }>(
        '/ai/clinical-summary',
        { patientUhid },
      );
      return data.data;
    },
    onSuccess: (result) => {
      queryClient.setQueryData(aiKeys.clinicalSummary(result.patientUhid), result);
    },
  });
}

// ─── GET /ai/summary/:recordId — fetch cached decode result ──────────────────
export function useCachedSummary(recordId: string) {
  return useQuery({
    queryKey: aiKeys.cachedSummary(recordId),
    queryFn: async () => {
      try {
        const { data } = await api.get<{ success: boolean; data: AiSummaryCache }>(
          `/ai/summary/${recordId}`,
        );
        return data.data;
      } catch (err) {
        // 404 means no cached summary exists — return null instead of throwing
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          return null;
        }
        throw err;
      }
    },
    enabled:   !!recordId,
    staleTime: 7 * 24 * 60 * 60 * 1000, // 7 days — mirrors server-side TTL
    retry:     false,
  });
}
