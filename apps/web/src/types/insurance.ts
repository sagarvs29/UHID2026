// ─── Enums ────────────────────────────────────────────────────────────────────

export type ClaimType =
  | 'HOSPITALIZATION'
  | 'OUTPATIENT'
  | 'SURGERY'
  | 'MATERNITY'
  | 'DENTAL'
  | 'VISION'
  | 'CRITICAL_ILLNESS';

export type ClaimStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'HOLD'
  | 'PAID';

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export type FraudFlag =
  | 'DUPLICATE_CLAIM'
  | 'RECORD_TAMPER'
  | 'DIAGNOSIS_MISMATCH'
  | 'DATE_ANOMALY'
  | 'HIGH_FREQUENCY'
  | 'FACILITY_UNREGISTERED'
  | 'PRESCRIPTION_DISCREPANCY';

// ─── API Request / Response shapes ───────────────────────────────────────────

export interface SubmitClaimInput {
  patientUhid:   string;
  policyNumber?: string;
  claimType:     ClaimType;
  diagnosis:     string;
  icd10Code:     string;
  admissionDate: string;
  dischargeDate?: string;
  hospitalName:  string;
  claimedAmount: number;
  currency?:     string;
  notes?:        string;
}

export interface SubmitClaimResponse {
  claimId:     string;
  claimNumber: string;
  status:      ClaimStatus;
  fraudScore:  number;
  riskLevel:   RiskLevel;
}

export interface ClaimSummary {
  id:             string;
  claimNumber:    string;
  patientUhid:    string;
  patientName:    string;
  claimType:      ClaimType;
  status:         ClaimStatus;
  claimedAmount:  number;
  approvedAmount: number | null;
  fraudScore:     number | null;
  riskLevel:      RiskLevel | null;
  createdAt:      string;
}

export interface ClaimDocument {
  id:               string;
  claimId:          string;
  documentType:     string;
  fileUrl:          string;
  fileHash:         string;
  originalRecordId: string | null;
  isVerified:       boolean;
  verifiedAt:       string | null;
  uploadedAt:       string;
}

export interface AuditLogEntry {
  id:        string;
  action:    string;
  severity:  string;
  actorId:   string;
  actorRole: string;
  metadata:  Record<string, unknown> | null;
  createdAt: string;
}

export interface ClaimDetail {
  id:                  string;
  claimNumber:         string;
  patientId:           string;
  patientUhid:         string;
  patientName:         string;
  insuranceProviderId: string;
  policyNumber:        string | null;
  claimType:           ClaimType;
  status:              ClaimStatus;
  diagnosis:           string;
  icd10Code:           string;
  admissionDate:       string | null;
  dischargeDate:       string | null;
  hospitalName:        string;
  claimedAmount:       number;
  approvedAmount:      number | null;
  currency:            string;
  fraudScore:          number | null;
  fraudFlags:          FraudFlag[];
  riskLevel:           RiskLevel | null;
  notes:               string | null;
  settlementDate:      string | null;
  createdAt:           string;
  updatedAt:           string;
  documents:           ClaimDocument[];
  auditLogs:           AuditLogEntry[];
}

export interface PatientRecord {
  id:          string;
  type:        string;
  title:       string;
  description: string | null;
  signedUrl:   string;
  fileHash:    string;
  uploadedAt:  string;
  hospital:    string | null;
}

export interface ConsentedRecordsResponse {
  records:          PatientRecord[];
  consentScope:     string[];
  consentExpiresAt: string;
}

export interface RequestAccessInput {
  scope:        string[];
  purpose:      string;
  durationDays: number;
}

export interface ClaimDecisionInput {
  status:          ClaimStatus;
  approvedAmount?: number;
  notes?:          string;
  settlementDate?: string;
}

export interface VerifyRecordResponse {
  recordId:      string;
  originalHash:  string;
  submittedHash: string;
  isAuthentic:   boolean;
  verifiedAt:    string;
  recordType:    string;
  uploadedAt:    string;
  uploadedBy:    string;
}

export interface ClaimsListResponse {
  claims:     ClaimSummary[];
  pagination: {
    page:       number;
    limit:      number;
    total:      number;
    totalPages: number;
  };
}

export interface InsuranceStats {
  total:           number;
  underReview:     number;
  approvedMonth:   number;
  totalSettled:    number;
}
