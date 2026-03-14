// ─── Enums (mirror Prisma) ────────────────────────────────────────────────────

export const DRUG_FORMS = [
  'TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'CREAM',
  'DROPS', 'INHALER', 'PATCH', 'SUPPOSITORY', 'OTHER',
] as const;
export type DrugForm = typeof DRUG_FORMS[number];

export const DRUG_ROUTES = [
  'ORAL', 'IV', 'IM', 'TOPICAL', 'INHALATION',
  'SUBLINGUAL', 'RECTAL', 'NASAL', 'OTHER',
] as const;
export type DrugRoute = typeof DRUG_ROUTES[number];

export const NOTE_VISIBILITIES = ['PRIVATE', 'HOSPITAL', 'PATIENT_VISIBLE'] as const;
export type NoteVisibility = typeof NOTE_VISIBILITIES[number];

export const PHARMA_CHECK_TYPES = [
  'DRUG_INTERACTION', 'DRUG_ALLERGY', 'DRUG_CONDITION', 'DUPLICATE_DRUG',
] as const;
export type PharmaCheckType = typeof PHARMA_CHECK_TYPES[number];

export const INTERACTION_SEVERITIES = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'] as const;
export type InteractionSeverity = typeof INTERACTION_SEVERITIES[number];

// ─── Label maps ───────────────────────────────────────────────────────────────

export const DRUG_FORM_LABELS: Record<DrugForm, string> = {
  TABLET:       'Tablet',
  CAPSULE:      'Capsule',
  SYRUP:        'Syrup',
  INJECTION:    'Injection',
  CREAM:        'Cream',
  DROPS:        'Drops',
  INHALER:      'Inhaler',
  PATCH:        'Patch',
  SUPPOSITORY:  'Suppository',
  OTHER:        'Other',
};

export const DRUG_ROUTE_LABELS: Record<DrugRoute, string> = {
  ORAL:         'Oral',
  IV:           'Intravenous (IV)',
  IM:           'Intramuscular (IM)',
  TOPICAL:      'Topical',
  INHALATION:   'Inhalation',
  SUBLINGUAL:   'Sublingual',
  RECTAL:       'Rectal',
  NASAL:        'Nasal',
  OTHER:        'Other',
};

export const NOTE_VISIBILITY_LABELS: Record<NoteVisibility, string> = {
  PRIVATE:         'Private (Doctor only)',
  HOSPITAL:        'Hospital staff visible',
  PATIENT_VISIBLE: 'Visible to patient',
};

export const SEVERITY_COLORS: Record<InteractionSeverity, string> = {
  LOW:      'text-blue-600 bg-blue-50 border-blue-200',
  MODERATE: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  HIGH:     'text-orange-700 bg-orange-50 border-orange-200',
  CRITICAL: 'text-red-700 bg-red-50 border-red-200',
};

export const SEVERITY_BADGE: Record<InteractionSeverity, string> = {
  LOW:      'bg-blue-100 text-blue-800',
  MODERATE: 'bg-yellow-100 text-yellow-800',
  HIGH:     'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800',
};

export const CHECK_TYPE_LABELS: Record<PharmaCheckType, string> = {
  DRUG_INTERACTION: 'Drug–Drug Interaction',
  DRUG_ALLERGY:     'Drug Allergy',
  DRUG_CONDITION:   'Drug–Condition Contraindication',
  DUPLICATE_DRUG:   'Duplicate Drug',
};

// ─── API response shapes ──────────────────────────────────────────────────────

export interface PatientProfile {
  id: string;
  uhid: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string | null;
  allergies: string[];
  emergencyContact: unknown | null;
  createdAt: string;
  activeScopes: string[];
}

export interface PrescriptionItem {
  id: string;
  prescriptionId: string;
  drugName: string;
  dosage: string;
  form: DrugForm;
  frequency: string;
  duration: string;
  route: DrugRoute;
  instructions: string | null;
  quantity: number;
}

export interface Prescription {
  id: string;
  patientId: string;
  doctorId: string;
  hospitalId: string;
  diagnosis: string;
  notes: string | null;
  followUpDate: string | null;
  validUntil: string | null;
  createdAt: string;
  items: PrescriptionItem[];
  doctor: { firstName: string; lastName: string; specialization: string };
}

export interface VitalSigns {
  bp?: string;
  pulse?: number;
  temperature?: number;
  spo2?: number;
  weight?: number;
  height?: number;
}

export interface ClinicalNote {
  id: string;
  patientId: string;
  doctorId: string;
  chiefComplaint: string;
  symptoms: string[];
  icd10Code: string;
  icd10Description: string;
  examinationFindings: string | null;
  vitalSigns: VitalSigns | null;
  diagnosis: string;
  treatmentPlan: string | null;
  visibility: NoteVisibility;
  createdAt: string;
  updatedAt: string;
  doctor: { firstName: string; lastName: string; specialization: string };
}

// ─── Pharma-check ─────────────────────────────────────────────────────────────

export interface PharmaIssue {
  type: PharmaCheckType;
  severity: InteractionSeverity;
  drugs: string[];
  mechanism: string;
  clinicalEffect: string;
  alternatives?: Record<string, string[]>;
  requiresOverride: boolean;
  interactionKey: string;
}

export interface PharmaCheckResult {
  passed: boolean;
  issues: PharmaIssue[];
}

// ─── Form input shapes ────────────────────────────────────────────────────────

export interface PrescriptionItemFormValues {
  drugName: string;
  dosage: string;
  form: DrugForm;
  frequency: string;
  duration: string;
  route: DrugRoute;
  instructions?: string;
  quantity: number;
}

export interface CreatePrescriptionFormValues {
  patientUhid: string;
  diagnosis: string;
  notes?: string;
  followUpDate?: string;
  validUntil?: string;
  items: PrescriptionItemFormValues[];
  overrides?: Array<{ interactionKey: string; reason: string }>;
}

export interface CreateClinicalNoteFormValues {
  patientUhid: string;
  chiefComplaint: string;
  symptoms: string[];
  icd10Code: string;
  icd10Description: string;
  examinationFindings?: string;
  vitalSigns?: VitalSigns;
  diagnosis: string;
  treatmentPlan?: string;
  visibility: NoteVisibility;
}
