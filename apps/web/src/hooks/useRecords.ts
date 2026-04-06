import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import type {
  MedicalRecord,
  RecordsListResponse,
  DownloadUrlResponse,
  UploadRecordPayload,
  GetRecordsParams,
} from '@/types/records';

// ─── Query keys ───────────────────────────────────────────────────────────────
export const recordKeys = {
  all:    ()              => ['records'] as const,
  list:   (uhid: string, params?: GetRecordsParams) => ['records', 'list', uhid, params] as const,
  detail: (id: string)   => ['records', 'detail', id] as const,
  download: (id: string) => ['records', 'download', id] as const,
};

// ─── Upload a record (staff only) ────────────────────────────────────────────
export function useUploadRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UploadRecordPayload) => {
      const form = new FormData();
      form.append('file',         payload.file);
      form.append('patientUhid',  payload.patientUhid);
      form.append('recordType',   payload.recordType);
      form.append('title',        payload.title);
      if (payload.subType)     form.append('subType',     payload.subType);
      if (payload.description) form.append('description', payload.description);
      if (payload.recordDate)  form.append('recordDate',  payload.recordDate);
      if (payload.tags)        form.append('tags',        payload.tags);

      const { data } = await api.post<{ success: boolean; data: MedicalRecord }>(
        '/records/upload',
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return data.data;
    },
    onSuccess: (_data, variables) => {
      // Invalidate the patient's record list so it shows the new upload
      qc.invalidateQueries({ queryKey: recordKeys.list(variables.patientUhid) });
    },
  });
}

// ─── Get records list for a patient UHID ─────────────────────────────────────
export function useGetRecords(uhid: string, params?: GetRecordsParams) {
  return useQuery({
    queryKey: recordKeys.list(uhid, params),
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: RecordsListResponse }>(
        `/records/${uhid}`,
        { params }
      );
      return data.data;
    },
    enabled: !!uhid,
    staleTime: 60_000,
  });
}

// ─── Get own records (patient only — uses UHID from store) ───────────────────
export function useMyRecords(params?: GetRecordsParams) {
  const uhid = useAuthStore((s) => s.user?.uhid ?? '');
  return useGetRecords(uhid, params);
}

// ─── Get a single record detail ───────────────────────────────────────────────
export function useGetRecord(id: string) {
  return useQuery({
    queryKey: recordKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: MedicalRecord }>(
        `/records/record/${id}`
      );
      return data.data;
    },
    enabled: !!id,
    staleTime: 30_000,
  });
}

// ─── Get signed download URL for a record ────────────────────────────────────
export function useDownloadRecord() {
  return useMutation({
    mutationFn: async (recordId: string) => {
      const { data } = await api.get<{ success: boolean; data: DownloadUrlResponse }>(
        `/records/record/${recordId}/download`
      );
      return data.data;
    },
    onSuccess: ({ downloadUrl, fileName }) => {
      // Trigger browser download
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = fileName;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.click();
    },
  });
}

// ─── Get signed view URL for a record ────────────────────────────────────────
export function useViewRecord() {
  return useMutation({
    mutationFn: async (recordId: string) => {
      const { data } = await api.get<{ success: boolean; data: DownloadUrlResponse }>(
        `/records/record/${recordId}/download`
      );
      return data.data;
    },
    onSuccess: ({ downloadUrl }) => {
      // Open in new tab to view
      window.open(downloadUrl, '_blank');
    },
  });
}

// ─── Decode record with AI ───────────────────────────────────────────────────
export function useDecodeRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (recordId: string) => {
      const { data } = await api.post<{ success: boolean; data: any }>(
        '/ai/decode',
        { recordId }
      );
      return data.data;
    },
    onSuccess: (_data, recordId) => {
      qc.invalidateQueries({ queryKey: recordKeys.detail(recordId) });
    },
  });
}

// ─── Helper: get error message ────────────────────────────────────────────────
export function getRecordErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const res = (err as { response?: { data?: { error?: string; message?: string } } }).response;
    return res?.data?.error ?? res?.data?.message ?? 'An unexpected error occurred';
  }
  if (err instanceof Error) return err.message;
  return 'An unexpected error occurred';
}
