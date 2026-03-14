import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  PublicEmergencyData,
  DoctorScanData,
  GeneratedQr,
  QrScanLog,
  InvalidateResult,
  SosResult,
  OverrideResult,
} from '@/types/qr';

// ─── Query keys ───────────────────────────────────────────────────────────────
export const qrKeys = {
  all:       ()          => ['qr'] as const,
  scanLogs:  ()          => ['qr', 'scan-logs'] as const,
  emergency: (uhid: string) => ['qr', 'emergency', uhid] as const,
};

// ─── GET /qr/emergency/:uhid — public Tier 1 data (no auth) ──────────────────
export function usePublicEmergency(uhid: string) {
  return useQuery({
    queryKey: qrKeys.emergency(uhid),
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; tier: number; data: PublicEmergencyData }>(
        `/qr/emergency/${uhid}`,
      );
      return data.data;
    },
    enabled: !!uhid,
    staleTime: 0, // always fresh — every call logs a scan
    retry: false,
  });
}

// ─── POST /qr/scan/doctor — Tier 2, doctor scans QR ─────────────────────────
export function useDoctorScanQr() {
  return useMutation({
    mutationFn: async (qrToken: string) => {
      const { data } = await api.post<{ success: boolean; tier: number; data: DoctorScanData }>(
        '/qr/scan/doctor',
        { qrToken },
      );
      return data.data;
    },
  });
}

// ─── POST /qr/generate — Tier 3, patient generates one-time share ────────────
export function useGenerateQr() {
  return useMutation({
    mutationFn: async (input: {
      scope: string[];
      durationMinutes: number;
      label?: string;
    }) => {
      const { data } = await api.post<{ success: boolean; tier: number; data: GeneratedQr }>(
        '/qr/generate',
        input,
      );
      return data.data;
    },
  });
}

// ─── GET /qr/scan-logs — patient views their QR scan history ─────────────────
export function useScanLogs() {
  return useQuery({
    queryKey: qrKeys.scanLogs(),
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: QrScanLog[] }>('/qr/scan-logs');
      return data.data;
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

// ─── POST /qr/invalidate — patient invalidates all active QRs ────────────────
export function useInvalidateQr() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reason?: string) => {
      const { data } = await api.post<{ success: boolean; data: InvalidateResult }>(
        '/qr/invalidate',
        { reason: reason ?? 'Manual invalidation' },
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qrKeys.all() });
    },
  });
}

// ─── POST /qr/sos — patient activates SOS ────────────────────────────────────
export function useSos() {
  return useMutation({
    mutationFn: async (input: {
      latitude: number;
      longitude: number;
      message?: string;
    }) => {
      const { data } = await api.post<{ success: boolean; message: string; data: SosResult }>(
        '/qr/sos',
        input,
      );
      return data.data;
    },
  });
}

// ─── POST /qr/emergency/override — doctor emergency override ─────────────────
export function useEmergencyOverride() {
  return useMutation({
    mutationFn: async (input: {
      patientUhid: string;
      reasonType: string;
      reason: string;
      acknowledgement: true;
    }) => {
      const { data } = await api.post<{ success: boolean; data: OverrideResult }>(
        '/qr/emergency/override',
        input,
      );
      return data.data;
    },
  });
}
