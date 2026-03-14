import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  PatientProfile,
  ClinicalNote,
  Prescription,
  PharmaCheckResult,
  CreateClinicalNoteFormValues,
  CreatePrescriptionFormValues,
} from '@/types/clinical';

// ─── Query keys ───────────────────────────────────────────────────────────────
export const clinicalKeys = {
  all:              ()              => ['clinical'] as const,
  patient:          (uhid: string)  => ['clinical', 'patient', uhid] as const,
  notes:            (uhid: string)  => ['clinical', 'notes', uhid] as const,
  note:             (id: string)    => ['clinical', 'note', id] as const,
  prescriptions:    (uhid: string)  => ['clinical', 'prescriptions', uhid] as const,
  prescription:     (id: string)    => ['clinical', 'prescription', id] as const,
};

// ─── GET /clinical/patient/:uhid ──────────────────────────────────────────────
export function usePatientProfile(uhid: string) {
  return useQuery({
    queryKey: clinicalKeys.patient(uhid),
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: PatientProfile }>(
        `/clinical/patient/${uhid}`
      );
      return data.data;
    },
    enabled: !!uhid,
    staleTime: 60_000,
    retry: false,
  });
}

// ─── GET /clinical/notes/:patientUhid ────────────────────────────────────────
export function useClinicalNotes(patientUhid: string) {
  return useQuery({
    queryKey: clinicalKeys.notes(patientUhid),
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: ClinicalNote[] }>(
        `/clinical/notes/${patientUhid}`
      );
      return data.data;
    },
    enabled: !!patientUhid,
    staleTime: 30_000,
  });
}

// ─── GET /clinical/notes/single/:id ──────────────────────────────────────────
export function useSingleClinicalNote(id: string) {
  return useQuery({
    queryKey: clinicalKeys.note(id),
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: ClinicalNote }>(
        `/clinical/notes/single/${id}`
      );
      return data.data;
    },
    enabled: !!id,
    staleTime: 60_000,
  });
}

// ─── GET /clinical/prescriptions/:patientUhid ────────────────────────────────
export function usePrescriptions(patientUhid: string) {
  return useQuery({
    queryKey: clinicalKeys.prescriptions(patientUhid),
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: Prescription[] }>(
        `/clinical/prescriptions/${patientUhid}`
      );
      return data.data;
    },
    enabled: !!patientUhid,
    staleTime: 30_000,
  });
}

// ─── GET /clinical/prescriptions/single/:id ──────────────────────────────────
export function useSinglePrescription(id: string) {
  return useQuery({
    queryKey: clinicalKeys.prescription(id),
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: Prescription }>(
        `/clinical/prescriptions/single/${id}`
      );
      return data.data;
    },
    enabled: !!id,
    staleTime: 60_000,
  });
}

// ─── POST /clinical/notes ─────────────────────────────────────────────────────
export function useCreateClinicalNote(patientUhid: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateClinicalNoteFormValues) => {
      const { data } = await api.post<{ success: boolean; data: ClinicalNote }>(
        '/clinical/notes',
        payload
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clinicalKeys.notes(patientUhid) });
    },
  });
}

// ─── POST /clinical/prescriptions ────────────────────────────────────────────
export function useCreatePrescription(patientUhid: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreatePrescriptionFormValues) => {
      const { data } = await api.post<{
        success: boolean;
        data: { prescription: Prescription; pharmaCheck: PharmaCheckResult };
      }>('/clinical/prescriptions', payload);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clinicalKeys.prescriptions(patientUhid) });
    },
  });
}

// ─── POST /clinical/pharma-check ─────────────────────────────────────────────
export function usePharmaCheck() {
  return useMutation({
    mutationFn: async (payload: {
      patientUhid: string;
      drugs: Array<{ name: string; dosage: string }>;
    }) => {
      const { data } = await api.post<{ success: boolean; data: PharmaCheckResult }>(
        '/clinical/pharma-check',
        payload
      );
      return data.data;
    },
  });
}
