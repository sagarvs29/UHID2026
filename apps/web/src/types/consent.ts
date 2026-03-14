// ─── Enums (mirror backend Prisma schema exactly) ────────────────────────────

export const CONSENT_SCOPES = [
  'ALL',
  'LAB_REPORT',
  'IMAGING',
  'PRESCRIPTION',
  'DISCHARGE_SUMMARY',
  'VACCINATION',
  'ECG',
  'CLINICAL_NOTES',
  'EMERGENCY_ONLY',
] as const;
export type ConsentScope = typeof CONSENT_SCOPES[number];

export const CONSENT_SCOPE_LABELS: Record<ConsentScope, string> = {
  ALL:               'Complete Medical History',
  LAB_REPORT:        'Lab Reports',
  IMAGING:           'Imaging (X-Ray, MRI, CT)',
  PRESCRIPTION:      'Prescriptions',
  DISCHARGE_SUMMARY: 'Discharge Summaries',
  VACCINATION:       'Vaccination Records',
  ECG:               'ECG Reports',
  CLINICAL_NOTES:    'Clinical Notes',
  EMERGENCY_ONLY:    'Emergency Profile Only',
};

export type ConsentStatus = 'PENDING' | 'ACTIVE' | 'DENIED' | 'REVOKED' | 'EXPIRED';
export type ConsentGrantedToType = 'DOCTOR' | 'INSURANCE_PROVIDER';

// ─── Duration options ─────────────────────────────────────────────────────────

export const DURATION_OPTIONS = [
  { label: '2 hours',    hours: 2 },
  { label: '24 hours',   hours: 24 },
  { label: '7 days',     hours: 168 },
  { label: '30 days',    hours: 720 },
  { label: 'Permanent',  hours: null },
] as const;

// ─── Response shapes from API ─────────────────────────────────────────────────

export interface ConsentParty {
  name: string;
  hospital?: string;
  specialty?: string;
}

/** Returned by GET /consents/active */
export interface ActiveConsent {
  id: string;
  grantedToType: ConsentGrantedToType;
  grantedTo: ConsentParty;
  scope: ConsentScope[];
  purpose: string;
  isTemporary: boolean;
  expiresAt: string | null;
  grantedAt: string | null;
}

/** Returned by GET /consents/pending */
export interface PendingConsent {
  id: string;
  grantedToType: ConsentGrantedToType;
  requestedBy: ConsentParty;
  scope: ConsentScope[];
  purpose: string;
  isTemporary: boolean;
  durationHours: number | null;
  requestedAt: string;
}

/** Returned by GET /consents/history */
export interface ConsentHistoryEntry {
  id: string;
  grantedToType: ConsentGrantedToType;
  party: string;
  scope: ConsentScope[];
  purpose: string;
  status: ConsentStatus;
  requestedAt: string;
  grantedAt: string | null;
  revokedAt: string | null;
  expiresAt: string | null;
}

export interface ConsentHistoryResponse {
  consents: ConsentHistoryEntry[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/** Returned by GET /consents/check/:uhid */
export interface ConsentCheckResult {
  hasAccess: boolean;
  consentId?: string;
  scope?: ConsentScope[];
  expiresAt?: string | null;
  expiresIn?: string;
}

/** Returned by POST /consents/request (201) */
export interface RequestConsentResult {
  consentId: string;
  status: 'PENDING';
  requestedAt: string;
}

/** Returned by POST /consents/approve (200) */
export interface ApproveConsentResult {
  consentId: string;
  status: 'ACTIVE';
  expiresAt: string | null;
  grantedTo: string;
}

/** Returned by DELETE /consents/:id (200) */
export interface RevokeConsentResult {
  revokedAt: string;
}

// ─── Form value shapes ────────────────────────────────────────────────────────

export interface RequestConsentFormValues {
  patientUhid: string;
  scope: ConsentScope[];
  purpose: string;
  isTemporary: boolean;
  durationHours: number | null;
}

export interface ApproveConsentFormValues {
  consentId: string;
  otp: string;
}
