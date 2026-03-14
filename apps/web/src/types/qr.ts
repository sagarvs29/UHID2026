// ─── QR Types ─────────────────────────────────────────────────────────────────

export type QrScanType =
  | 'PUBLIC_SCAN'
  | 'DOCTOR_SCAN'
  | 'INSURANCE_SCAN'
  | 'PATIENT_INITIATED'
  | 'SUSPICIOUS_SCAN';

// Tier 1 — public emergency data (no auth needed)
export interface PublicEmergencyData {
  uhid: string;
  bloodGroup: string;
  hasCriticalAllergy: boolean;
  emergencyContact: {
    name: string;
    relation: string;
    phone: string;
  } | null;
  scannedAt: string;
}

// Tier 2 — doctor scan
export interface DoctorScanData {
  uhid: string;
  name: string;
  age: number;
  bloodGroup: string;
  allergies: { name: string; reaction: string; severity: string }[];
  currentMedications: { name: string; dose: string; frequency: string }[];
  chronicConditions: string[];
  pastSurgeries: string[];
  emergencyContacts: { name: string; relation: string; phone: string }[];
  accessExpiresAt: string;
}

// Tier 3 — patient-generated one-time QR
export interface GeneratedQr {
  qrId: string;
  qrToken: string;
  qrImageUrl: string | null;
  expiresAt: string;
  isOneTime: boolean;
}

// QR Scan log entry (patient dashboard)
export interface QrScanLog {
  id: string;
  tier: number;
  scanType: QrScanType;
  scannerName: string | null;
  scannerUhidId: string | null;
  organization: string | null;
  location: string | null;
  isSuspicious: boolean;
  suspicionReason: string | null;
  reportedByPatient: boolean;
  scannedAt: string;
}

// Invalidate QR result
export interface InvalidateResult {
  invalidatedCount: number;
  newQrGeneratedAt: string;
}

// SOS result
export interface SosResult {
  sosId: string;
  emergencyCode: string;
  emergencyCodeExpiresAt: string;
  notifiedContacts: number;
  notifiedHospitals: number;
}

// Emergency override result
export interface OverrideResult {
  accessGranted: boolean;
  expiresAt: string;
  auditLogId: string;
}
