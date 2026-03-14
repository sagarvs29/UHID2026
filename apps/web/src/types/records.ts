// ─── Enums (mirror backend validators exactly) ────────────────────────────────

export const RECORD_TYPES = [
  'LAB_REPORT',
  'IMAGING',
  'PRESCRIPTION',
  'DISCHARGE_SUMMARY',
  'VACCINATION',
  'ECG',
  'OTHER',
] as const;
export type RecordType = typeof RECORD_TYPES[number];

export const RECORD_SUB_TYPES = [
  'BLOOD_TEST', 'URINE_TEST', 'LIVER_FUNCTION', 'KIDNEY_FUNCTION',
  'LIPID_PROFILE', 'THYROID', 'HBA1C', 'BLOOD_SUGAR', 'COMPLETE_BLOOD_COUNT',
  'XRAY', 'MRI', 'CT_SCAN', 'ULTRASOUND', 'PET_SCAN', 'MAMMOGRAPHY',
  'ECG_RECORDING', 'COVID_VACCINE',
] as const;
export type RecordSubType = typeof RECORD_SUB_TYPES[number];

// Sub-types available per record type (for UI filtering)
export const SUB_TYPES_FOR: Partial<Record<RecordType, RecordSubType[]>> = {
  LAB_REPORT: ['BLOOD_TEST','URINE_TEST','LIVER_FUNCTION','KIDNEY_FUNCTION',
                'LIPID_PROFILE','THYROID','HBA1C','BLOOD_SUGAR','COMPLETE_BLOOD_COUNT'],
  IMAGING:    ['XRAY','MRI','CT_SCAN','ULTRASOUND','PET_SCAN','MAMMOGRAPHY'],
  ECG:        ['ECG_RECORDING'],
  VACCINATION:['COVID_VACCINE'],
};

// Human-readable labels
export const RECORD_TYPE_LABELS: Record<RecordType, string> = {
  LAB_REPORT:       'Lab Report',
  IMAGING:          'Imaging',
  PRESCRIPTION:     'Prescription',
  DISCHARGE_SUMMARY:'Discharge Summary',
  VACCINATION:      'Vaccination',
  ECG:              'ECG',
  OTHER:            'Other',
};

export const RECORD_SUBTYPE_LABELS: Record<RecordSubType, string> = {
  BLOOD_TEST:          'Blood Test',
  URINE_TEST:          'Urine Test',
  LIVER_FUNCTION:      'Liver Function (LFT)',
  KIDNEY_FUNCTION:     'Kidney Function (KFT)',
  LIPID_PROFILE:       'Lipid Profile',
  THYROID:             'Thyroid Profile',
  HBA1C:               'HbA1c',
  BLOOD_SUGAR:         'Blood Sugar',
  COMPLETE_BLOOD_COUNT:'CBC',
  XRAY:                'X-Ray',
  MRI:                 'MRI',
  CT_SCAN:             'CT Scan',
  ULTRASOUND:          'Ultrasound',
  PET_SCAN:            'PET Scan',
  MAMMOGRAPHY:         'Mammography',
  ECG_RECORDING:       'ECG Recording',
  COVID_VACCINE:       'COVID Vaccine',
};

// ─── API response shapes ──────────────────────────────────────────────────────

export interface RecordHospital {
  id: string;
  name: string;
}

export interface RecordUploader {
  firstName: string;
  staffType: string;
}

/** Summary shape returned in list view */
export interface MedicalRecordSummary {
  id: string;
  recordType: RecordType;
  subType?: RecordSubType;
  title: string;
  testDate?: string;
  labName?: string;
  fileMimeType: string;
  fileSizeBytes?: number;
  hasAiSummary: boolean;
  hospital?: RecordHospital;
  uploadedByStaff?: RecordUploader;
  createdAt: string;
}

export interface AiSummary {
  summaryText: string;
  riskLevel: 'NORMAL' | 'BORDERLINE' | 'ABNORMAL' | 'CRITICAL';
  generatedAt: string;
}

/** Full shape returned in detail view */
export interface MedicalRecord extends MedicalRecordSummary {
  description?: string;
  fileUrl: string;               // signed Cloudinary URL (5-min TTL)
  extractedData?: Record<string, string>;
  aiSummary?: AiSummary;
  isVerified: boolean;
  tags?: string[];
}

export interface RecordsPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RecordsListResponse {
  records: MedicalRecordSummary[];
  pagination: RecordsPagination;
}

export interface DownloadUrlResponse {
  downloadUrl: string;
  expiresAt: string;
  fileName: string;
}

// ─── Request shapes ───────────────────────────────────────────────────────────

export interface UploadRecordPayload {
  file: File;
  patientUhid: string;
  recordType: RecordType;
  subType?: RecordSubType;
  title: string;
  description?: string;
  recordDate?: string;
  tags?: string;
}

export interface GetRecordsParams {
  type?: RecordType;
  subType?: RecordSubType;
  hospitalId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  sort?: 'createdAt_asc' | 'createdAt_desc' | 'recordDate_asc' | 'recordDate_desc';
}

// ─── Upload form shape (react-hook-form) ─────────────────────────────────────

export interface UploadFormValues {
  patientUhid: string;
  recordType: RecordType;
  subType?: RecordSubType;
  title: string;
  description?: string;
  recordDate?: string;
  tags?: string;
  file: FileList;
}
