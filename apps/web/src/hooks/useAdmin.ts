import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  PendingMember,
  ActiveStaffResponse,
  HospitalAnalytics,
  PlatformAnalytics,
  AuditLogsResponse,
  AuditLogFilters,
  HospitalRow,
  VerifyStaffInput,
} from '@/types/admin';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const adminKeys = {
  all:                () => ['admin'] as const,
  pendingVerifications: () => ['admin', 'pending-verifications'] as const,
  staff:              () => ['admin', 'staff'] as const,
  analytics:          () => ['admin', 'analytics'] as const,
  auditLogs:          (f?: AuditLogFilters) => ['admin', 'audit-logs', f] as const,
  hospitals:          () => ['admin', 'super', 'hospitals'] as const,
  platformAnalytics:  () => ['admin', 'super', 'analytics'] as const,
};

// ─── GET /admin/pending-verifications ────────────────────────────────────────

export function usePendingVerifications() {
  return useQuery({
    queryKey: adminKeys.pendingVerifications(),
    queryFn:  async () => {
      const res = await api.get<{ success: true; data: PendingMember[] }>(
        '/admin/pending-verifications'
      );
      return res.data.data;
    },
  });
}

// ─── PATCH /admin/verify-staff/:userId ───────────────────────────────────────

export function useVerifyStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, input }: { userId: string; input: VerifyStaffInput }) => {
      const res = await api.patch(`/admin/verify-staff/${userId}`, input);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.pendingVerifications() });
      qc.invalidateQueries({ queryKey: adminKeys.staff() });
    },
  });
}

// ─── PATCH /admin/deactivate-staff/:userId ────────────────────────────────────

export function useDeactivateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      const res = await api.patch(`/admin/deactivate-staff/${userId}`, { reason });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.staff() });
    },
  });
}

// ─── GET /admin/staff ────────────────────────────────────────────────────────

export function useActiveStaff() {
  return useQuery({
    queryKey: adminKeys.staff(),
    queryFn:  async () => {
      const res = await api.get<{ success: true; data: ActiveStaffResponse }>(
        '/admin/staff'
      );
      return res.data.data;
    },
  });
}

// ─── GET /admin/analytics ────────────────────────────────────────────────────

export function useHospitalAnalytics() {
  return useQuery({
    queryKey: adminKeys.analytics(),
    queryFn:  async () => {
      const res = await api.get<{ success: true; data: HospitalAnalytics }>(
        '/admin/analytics'
      );
      return res.data.data;
    },
  });
}

// ─── GET /admin/audit-logs ───────────────────────────────────────────────────

export function useAuditLogs(filters?: AuditLogFilters) {
  return useQuery({
    queryKey: adminKeys.auditLogs(filters),
    queryFn:  async () => {
      const params = new URLSearchParams();
      if (filters?.action)     params.set('action',     filters.action);
      if (filters?.actorRole)  params.set('actorRole',  filters.actorRole);
      if (filters?.severity)   params.set('severity',   filters.severity);
      if (filters?.hospitalId) params.set('hospitalId', filters.hospitalId);
      if (filters?.search)     params.set('search',     filters.search);
      if (filters?.dateFrom)   params.set('dateFrom',   filters.dateFrom);
      if (filters?.dateTo)     params.set('dateTo',     filters.dateTo);
      if (filters?.page)       params.set('page',       String(filters.page));
      if (filters?.limit)      params.set('limit',      String(filters.limit));
      const qs = params.toString();
      const res = await api.get<{ success: true; data: AuditLogsResponse }>(
        `/admin/audit-logs${qs ? `?${qs}` : ''}`
      );
      return res.data.data;
    },
  });
}

// ─── GET /admin/super/hospitals ──────────────────────────────────────────────

export function useHospitalList() {
  return useQuery({
    queryKey: adminKeys.hospitals(),
    queryFn:  async () => {
      const res = await api.get<{ success: true; data: HospitalRow[] }>(
        '/admin/super/hospitals'
      );
      return res.data.data;
    },
  });
}

// ─── PATCH /admin/super/hospitals/:id/verify ─────────────────────────────────

export function useHospitalAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      hospitalId,
      action,
      notes,
    }: {
      hospitalId: string;
      action:     'VERIFY' | 'SUSPEND';
      notes?:     string;
    }) => {
      const res = await api.patch(`/admin/super/hospitals/${hospitalId}/verify`, { action, notes });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.hospitals() });
    },
  });
}

// ─── POST /admin/super/hospitals ─────────────────────────────────────────────

export interface CreateHospitalInput {
  name:               string;
  registrationNumber: string;
  address:            string;
  city:               string;
  state:              string;
  pincode:            string;
  phone?:             string;
  email?:             string;
  isNABH?:            boolean;
  specialties?:       string[];
  // Hospital Admin details
  adminFirstName:     string;
  adminLastName:      string;
  adminEmail:         string;
  adminPhone:         string;
}

export function useCreateHospital() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateHospitalInput) => {
      const res = await api.post('/admin/super/hospitals', data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.hospitals() });
    },
  });
}

// ─── GET /admin/super/analytics ──────────────────────────────────────────────

export function usePlatformAnalytics() {
  return useQuery({
    queryKey: adminKeys.platformAnalytics(),
    queryFn:  async () => {
      const res = await api.get<{ success: true; data: PlatformAnalytics }>(
        '/admin/super/analytics'
      );
      return res.data.data;
    },
  });
}
