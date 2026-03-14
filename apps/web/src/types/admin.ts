// ─── Enums ────────────────────────────────────────────────────────────────────

export type AuditSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AuditAction =
  | 'LOGIN' | 'LOGOUT' | 'FAILED_LOGIN' | 'PASSWORD_RESET' | 'EMAIL_VERIFIED' | 'TOKEN_REFRESHED'
  | 'RECORD_UPLOADED' | 'RECORD_VIEWED' | 'RECORD_DOWNLOADED' | 'RECORD_DELETED'
  | 'CONSENT_REQUESTED' | 'CONSENT_APPROVED' | 'CONSENT_DENIED' | 'CONSENT_REVOKED' | 'CONSENT_EXPIRED'
  | 'PRESCRIPTION_CREATED' | 'PRESCRIPTION_VIEWED' | 'CLINICAL_NOTE_CREATED' | 'CLINICAL_NOTE_VIEWED' | 'PHARMA_CHECK_OVERRIDE'
  | 'EMERGENCY_OVERRIDE' | 'QR_GENERATED' | 'QR_USED' | 'QR_REVOKED' | 'SOS_ACTIVATED' | 'EMERGENCY_CODE_USED'
  | 'STAFF_VERIFIED' | 'STAFF_REJECTED' | 'STAFF_DEACTIVATED' | 'HOSPITAL_VERIFIED' | 'HOSPITAL_SUSPENDED' | 'OVERRIDE_REVIEWED'
  | 'CLAIM_SUBMITTED' | 'CLAIM_DECISION' | 'RECORD_VERIFIED'
  | 'AI_REPORT_GENERATED' | 'AI_SUMMARY_GENERATED'
  | 'APPOINTMENT_BOOKED' | 'APPOINTMENT_CANCELLED' | 'APPOINTMENT_COMPLETED' | 'VIDEO_ROOM_JOINED';

// ─── Audit Log ────────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id:         string;
  action:     AuditAction;
  severity:   AuditSeverity;
  actorId:    string;
  actorRole:  string;
  targetId:   string | null;
  targetType: string | null;
  hospitalId: string | null;
  metadata:   Record<string, unknown> | null;
  ipAddress:  string | null;
  userAgent:  string | null;
  createdAt:  string;
}

export interface AuditLogsResponse {
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
  logs:       AuditLogEntry[];
}

export interface AuditLogFilters {
  action?:     AuditAction;
  actorRole?:  string;
  severity?:   AuditSeverity;
  hospitalId?: string;
  search?:     string;
  dateFrom?:   string;
  dateTo?:     string;
  page?:       number;
  limit?:      number;
}

// ─── Staff / People ───────────────────────────────────────────────────────────

export interface PendingMember {
  id:           string;
  profileId:    string;
  name:         string;
  role:         'DOCTOR' | 'HOSPITAL_STAFF';
  specialty?:   string;
  staffType?:   string;
  licenseNumber?: string;
  employeeId?:  string | null;
  registeredAt: string;
}

export interface ActiveDoctor {
  userId:        string;
  name:          string;
  role:          'DOCTOR';
  specialty:     string;
  licenseNumber: string;
  email:         string;
  verifiedAt:    string | null;
}

export interface ActiveStaffMember {
  userId:     string;
  name:       string;
  role:       'HOSPITAL_STAFF';
  staffType:  string;
  email:      string;
  employeeId: string | null;
}

export interface ActiveStaffResponse {
  doctors: ActiveDoctor[];
  staff:   ActiveStaffMember[];
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export interface RecordTrendPoint {
  date:  string;
  count: number;
}

export interface HospitalAnalytics {
  totalPatients:                 number;
  recordsUploadedThisMonth:      number;
  prescriptionsIssuedThisMonth:  number;
  pendingConsents:               number;
  emergencyOverridesThisMonth:   number;
  aiReportsThisMonth:            number;
  trends: {
    recordsPerDay: RecordTrendPoint[];
  };
}

export interface PlatformAnalytics {
  users: {
    total:  number;
    byRole: Record<string, number>;
  };
  totalRecords:          number;
  activeConsents:        number;
  claims: {
    total:    number;
    byStatus: Record<string, number>;
  };
  sosEventsThisMonth:  number;
  aiUsageThisMonth:    number;
}

// ─── Hospitals (super admin) ─────────────────────────────────────────────────

export interface HospitalRow {
  id:                 string;
  name:               string;
  city:               string;
  state:              string;
  isVerified:         boolean;
  verifiedAt:         string | null;
  isNABH:             boolean;
  registrationNumber: string;
  createdAt:          string;
  adminName:          string | null;
  adminEmail:         string | null;
  doctorCount:        number;
  staffCount:         number;
}

// ─── Verify staff input ───────────────────────────────────────────────────────

export interface VerifyStaffInput {
  action: 'VERIFY' | 'REJECT' | 'REQUEST_MORE_INFO';
  notes?: string;
}
