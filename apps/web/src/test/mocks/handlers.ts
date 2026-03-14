import { http, HttpResponse } from 'msw';
import type { MedicalRecord, MedicalRecordSummary, RecordsListResponse, DownloadUrlResponse } from '@/types/records';
import type { ActiveConsent, PendingConsent, ConsentHistoryResponse } from '@/types/consent';
import type { PatientProfile, ClinicalNote, Prescription, PharmaCheckResult } from '@/types/clinical';
import type { DecodeResponse, ClinicalSummaryResponse } from '@/types/ai';
import type { PublicEmergencyData, QrScanLog, GeneratedQr, InvalidateResult, SosResult } from '@/types/qr';
import type { ClaimSummary, ClaimDetail, SubmitClaimResponse } from '@/types/insurance';
import type { AuditLogEntry, HospitalAnalytics, PlatformAnalytics, HospitalRow, PendingMember, ActiveStaffResponse } from '@/types/admin';

// ─── Fixtures ─────────────────────────────────────────────────────────────────
export const MOCK_UHID = 'UHID-AB12-CD34-5678';
export const MOCK_RECORD_ID = 'rec_test_001';
export const MOCK_HOSPITAL_ID = 'hosp_test_001';

export const mockRecordSummary: MedicalRecordSummary = {
  id:            MOCK_RECORD_ID,
  recordType:    'LAB_REPORT',
  subType:       'BLOOD_TEST',
  title:         'Complete Blood Count — Jan 2026',
  testDate:      '2026-01-15T00:00:00.000Z',
  labName:       'Apollo Diagnostics',
  fileMimeType:  'application/pdf',
  fileSizeBytes: 204800,
  hasAiSummary:  true,
  hospital:      { id: 'hosp_01', name: 'Apollo Hospital' },
  uploadedByStaff: { firstName: 'Staff', staffType: 'NURSE' },
  createdAt:     '2026-01-16T10:00:00.000Z',
};

export const mockRecord: MedicalRecord = {
  ...mockRecordSummary,
  description:   'Routine annual blood test',
  fileUrl:       'https://res.cloudinary.com/test/image/upload/v1/test.pdf',
  extractedData: undefined,
  aiSummary:     { summaryText: 'All values within normal range. Haemoglobin: 13.5 g/dL.', riskLevel: 'NORMAL', generatedAt: '2026-01-16T10:05:00.000Z' },
  isVerified:    true,
  tags:          ['annual', 'routine'],
};

export const mockListResponse: RecordsListResponse = {
  records: [mockRecordSummary],
  pagination: {
    page:       1,
    limit:      10,
    total:      1,
    totalPages: 1,
  },
};

export const mockDownloadResponse: DownloadUrlResponse = {
  downloadUrl: 'https://res.cloudinary.com/test/raw/upload/v1/signed.pdf?token=abc',
  expiresAt:   new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  fileName:    'complete-blood-count-jan-2026.pdf',
};

// ─── Consent fixtures ─────────────────────────────────────────────────────────
export const MOCK_CONSENT_ID   = 'con_test_001';
export const MOCK_CONSENT_ID_2 = 'con_test_002';

export const mockActiveConsents: ActiveConsent[] = [
  {
    id:            MOCK_CONSENT_ID,
    grantedToType: 'DOCTOR',
    grantedTo:     { name: 'Dr. Anita Desai', hospital: 'Fortis Hospital, Mumbai', specialty: 'Cardiology' },
    scope:         ['LAB_REPORT', 'PRESCRIPTION'],
    purpose:       'Cardiac consultation',
    isTemporary:   true,
    expiresAt:     new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    grantedAt:     new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
];

export const mockPendingConsents: PendingConsent[] = [
  {
    id:            MOCK_CONSENT_ID_2,
    grantedToType: 'DOCTOR',
    requestedBy:   { name: 'Dr. Suresh Menon', hospital: 'Apollo Hospital, Chennai', specialty: 'General Medicine' },
    scope:         ['ALL'],
    purpose:       'New patient registration and complete health review',
    isTemporary:   true,
    durationHours: 168,
    requestedAt:   new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
];

export const mockConsentHistory: ConsentHistoryResponse = {
  consents: [
    {
      id:            MOCK_CONSENT_ID,
      grantedToType: 'DOCTOR',
      party:         'Dr. Anita Desai (Cardiology)',
      scope:         ['LAB_REPORT', 'PRESCRIPTION'],
      purpose:       'Cardiac consultation',
      status:        'ACTIVE',
      requestedAt:   new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      grantedAt:     new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      revokedAt:     null,
      expiresAt:     new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id:            'con_test_old',
      grantedToType: 'INSURANCE_PROVIDER',
      party:         'Star Health Insurance',
      scope:         ['DISCHARGE_SUMMARY'],
      purpose:       'Insurance claim processing',
      status:        'EXPIRED',
      requestedAt:   new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      grantedAt:     new Date(Date.now() - 44 * 24 * 60 * 60 * 1000).toISOString(),
      revokedAt:     null,
      expiresAt:     new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
  pagination: { total: 2, page: 1, limit: 10, totalPages: 1 },
};

export const mockConsentCheckActive = {
  hasAccess:  true,
  consentId:  MOCK_CONSENT_ID,
  scope:      ['LAB_REPORT', 'PRESCRIPTION'] as const,
  expiresAt:  new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  expiresIn:  '24 hours',
};

export const mockRequestResult = {
  consentId:   MOCK_CONSENT_ID_2,
  status:      'PENDING' as const,
  requestedAt: new Date().toISOString(),
};

export const mockApproveResult = {
  consentId: MOCK_CONSENT_ID_2,
  status:    'ACTIVE' as const,
  expiresAt: new Date(Date.now() + 168 * 60 * 60 * 1000).toISOString(),
  grantedTo: 'Dr. Suresh Menon',
};

// ─── Clinical fixtures ────────────────────────────────────────────────────────
export const MOCK_PRESCRIPTION_ID = 'rx_test_001';
export const MOCK_NOTE_ID         = 'note_test_001';

export const mockPatientProfile: PatientProfile = {
  id:               'pat_test_001',
  uhid:             MOCK_UHID,
  firstName:        'Rohan',
  lastName:         'Mehta',
  dateOfBirth:      '1990-06-15T00:00:00.000Z',
  gender:           'MALE',
  bloodGroup:       'O+',
  allergies:        ['penicillin'],
  emergencyContact: null,
  createdAt:        '2025-01-01T00:00:00.000Z',
  activeScopes:     ['CLINICAL_NOTES', 'PRESCRIPTION'],
};

export const mockClinicalNote: ClinicalNote = {
  id:                  MOCK_NOTE_ID,
  patientId:           'pat_test_001',
  doctorId:            'doc_test_001',
  chiefComplaint:      'Persistent dry cough for 5 days',
  symptoms:            ['cough', 'mild fever', 'fatigue'],
  icd10Code:           'J18.9',
  icd10Description:    'Pneumonia, unspecified organism',
  examinationFindings: 'Reduced breath sounds at right base',
  vitalSigns:          { bp: '118/76', pulse: 88, temperature: 38.2, spo2: 97 },
  diagnosis:           'Community-acquired pneumonia',
  treatmentPlan:       'Oral antibiotics + rest + follow-up in 5 days',
  visibility:          'PATIENT_VISIBLE',
  createdAt:           '2026-01-20T09:00:00.000Z',
  updatedAt:           '2026-01-20T09:00:00.000Z',
  doctor: { firstName: 'Priya', lastName: 'Sharma', specialization: 'Internal Medicine' },
};

export const mockPrescription: Prescription = {
  id:           MOCK_PRESCRIPTION_ID,
  patientId:    'pat_test_001',
  doctorId:     'doc_test_001',
  hospitalId:   'hosp_01',
  diagnosis:    'Community-acquired pneumonia',
  notes:        null,
  followUpDate: null,
  validUntil:   null,
  createdAt:    '2026-01-20T09:05:00.000Z',
  items: [
    {
      id:             'item_001',
      prescriptionId: MOCK_PRESCRIPTION_ID,
      drugName:       'Amoxicillin',
      dosage:         '500mg',
      form:           'CAPSULE',
      frequency:      'TDS',
      duration:       '7 days',
      route:          'ORAL',
      instructions:   'Take after food',
      quantity:       21,
    },
  ],
  doctor: { firstName: 'Priya', lastName: 'Sharma', specialization: 'Internal Medicine' },
};

export const mockPharmaCheckClean: PharmaCheckResult = {
  passed: true,
  issues: [],
};

export const mockPharmaCheckWithIssue: PharmaCheckResult = {
  passed: false,
  issues: [
    {
      type:             'DRUG_INTERACTION',
      severity:         'HIGH',
      drugs:            ['warfarin', 'aspirin'],
      mechanism:        'Both inhibit platelet function. Aspirin also displaces warfarin from protein binding.',
      clinicalEffect:   'Risk of major bleeding including GI and intracranial haemorrhage.',
      alternatives:     { forDrugB: ['acetaminophen'] },
      requiresOverride: true,
      interactionKey:   'DDI:warfarin-aspirin',
    },
  ],
};

// ─── AI fixtures ──────────────────────────────────────────────────────────────
export const MOCK_AI_RECORD_ID = MOCK_RECORD_ID;

export const mockDecodeResponse: DecodeResponse = {
  recordId:         MOCK_RECORD_ID,
  summaryText:      'Your CBC results are mostly normal. Haemoglobin is slightly low, suggesting mild anaemia.',
  simplifiedValues: [
    {
      parameter:      'Haemoglobin',
      value:          '11.2 g/dL',
      normalRange:    '13.5–17.5 g/dL',
      status:         'LOW',
      explanation:    'Haemoglobin carries oxygen in red blood cells. Your level is slightly below normal.',
      recommendation: 'Consider iron-rich foods or supplements. Discuss with your doctor.',
    },
    {
      parameter:      'WBC Count',
      value:          '6,800 /µL',
      normalRange:    '4,500–11,000 /µL',
      status:         'NORMAL',
      explanation:    'White blood cells are your immune fighters. Your count is healthy.',
      recommendation: '',
    },
  ],
  overallRiskLevel: 'MODERATE',
  actionItems:      ['Schedule follow-up with a physician within 2 weeks', 'Start iron supplementation'],
  disclaimer:       'This AI analysis is for informational purposes only and does not constitute medical advice. Always consult a qualified healthcare professional.',
  modelUsed:        'gpt-4o',
  tokensUsed:       1234,
  cached:           false,
};

export const mockClinicalSummaryResponse: ClinicalSummaryResponse = {
  patientUhid:      MOCK_UHID,
  summaryForDoctor: 'Patient presents with CAP managed with amoxicillin. Mild normocytic anaemia noted on CBC. No major drug-condition conflicts identified.',
  activeConditions: [
    { icd10: 'J18.9', description: 'Community-acquired pneumonia', since: '2026-01' },
    { icd10: 'D50.9', description: 'Iron deficiency anaemia', since: '2025-11' },
  ],
  currentMedications: [
    { drug: 'Amoxicillin 500mg', frequency: 'TDS', since: '2026-01' },
  ],
  vitalTrends: {
    bp:    [{ date: '2026-01', value: '118/76' }],
    pulse: [{ date: '2026-01', value: '88 bpm' }],
  },
  riskScore: {
    overall:        'MODERATE',
    cardiovascular: 'LOW',
    renal:          'LOW',
    diabetic:       'LOW',
  },
  attentionItems:  ['Monitor Hb response to iron supplementation in 4–6 weeks'],
  modelUsed:       'gpt-4o',
  tokensUsed:      2100,
  cached:          false,
  lastUpdated:     '2026-01-20T10:00:00.000Z',
};

// ─── QR fixtures ─────────────────────────────────────────────────────────────
export const MOCK_QR_TOKEN    = 'eyJhbGciOiJIUzI1NiJ9.mock.token';
export const MOCK_SOS_ID      = 'sos_test_001';
export const MOCK_QR_ID       = 'qr_test_001';

export const mockPublicEmergencyData: PublicEmergencyData = {
  uhid:               MOCK_UHID,
  bloodGroup:         'B_POSITIVE',
  hasCriticalAllergy: true,
  emergencyContact: {
    name:     'Meena',
    relation: 'Wife',
    phone:    '+91-9812345678',
  },
  scannedAt: new Date().toISOString(),
};

export const mockDoctorScanData = {
  uhid:          MOCK_UHID,
  name:          'Rohan Mehta',
  age:           35,
  bloodGroup:    'B_POSITIVE',
  allergies: [
    { name: 'Penicillin', reaction: 'Anaphylaxis', severity: 'SEVERE' },
    { name: 'Sulfa drugs', reaction: 'Rash', severity: 'MODERATE' },
  ],
  currentMedications: [
    { name: 'Metformin', dose: '500mg', frequency: 'twice daily' },
  ],
  chronicConditions: ['Type 2 Diabetes (E11.9)', 'Hypertension (I10)'],
  pastSurgeries:     ['Cardiac bypass — Apollo Pune (March 2024)'],
  emergencyContacts: [
    { name: 'Meena', relation: 'Wife', phone: '+91-9812345678' },
  ],
  accessExpiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
};

export const mockGeneratedQr: GeneratedQr = {
  qrId:      MOCK_QR_ID,
  qrToken:   MOCK_QR_TOKEN,
  qrImageUrl: null,
  expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  isOneTime: true,
};

export const mockScanLogs: QrScanLog[] = [
  {
    id:               'log_001',
    tier:             2,
    scanType:         'DOCTOR_SCAN',
    scannerName:      'Dr. Priya Sharma',
    scannerUhidId:    'DR-001234',
    organization:     'Manipal Hospital Bangalore',
    location:         'Bangalore, Karnataka',
    isSuspicious:     false,
    suspicionReason:  null,
    reportedByPatient: false,
    scannedAt:        new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id:               'log_002',
    tier:             1,
    scanType:         'PUBLIC_SCAN',
    scannerName:      null,
    scannerUhidId:    null,
    organization:     null,
    location:         'Bangalore, Karnataka',
    isSuspicious:     false,
    suspicionReason:  null,
    reportedByPatient: false,
    scannedAt:        new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id:               'log_003',
    tier:             1,
    scanType:         'SUSPICIOUS_SCAN',
    scannerName:      null,
    scannerUhidId:    null,
    organization:     null,
    location:         'Mumbai, Maharashtra',
    isSuspicious:     true,
    suspicionReason:  'RATE_LIMIT_EXCEEDED',
    reportedByPatient: false,
    scannedAt:        new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
];

export const mockInvalidateResult: InvalidateResult = {
  invalidatedCount:  2,
  newQrGeneratedAt:  new Date().toISOString(),
};

export const mockSosResult: SosResult = {
  sosId:                  MOCK_SOS_ID,
  emergencyCode:          'EMG-4X9R',
  emergencyCodeExpiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
  notifiedContacts:       2,
  notifiedHospitals:      3,
};

// ─── Insurance fixtures ────────────────────────────────────────────────────────
export const MOCK_CLAIM_ID     = 'claim_test_001';
export const MOCK_CLAIM_NUMBER = 'CLM-2026-00847';

export const mockClaimSummary: ClaimSummary = {
  id:                  MOCK_CLAIM_ID,
  claimNumber:         MOCK_CLAIM_NUMBER,
  patientUhid:         MOCK_UHID,
  patientName:         'Test Patient',
  claimType:           'HOSPITALIZATION',
  status:              'SUBMITTED',
  claimedAmount:       250000,
  approvedAmount:      null,
  fraudScore:          12,
  riskLevel:           'LOW',
  createdAt:           '2026-01-20T10:00:00.000Z',
};

export const mockClaimDetail: ClaimDetail = {
  id:                  MOCK_CLAIM_ID,
  claimNumber:         MOCK_CLAIM_NUMBER,
  patientUhid:         MOCK_UHID,
  patientName:         'Test Patient',
  patientId:           'pat_001',
  insuranceProviderId: 'ins_001',
  policyNumber:        'POL-12345',
  claimType:           'HOSPITALIZATION',
  status:              'SUBMITTED',
  diagnosis:           'Pneumonia',
  icd10Code:           'J18.9',
  admissionDate:       '2026-01-10T00:00:00.000Z',
  dischargeDate:       '2026-01-15T00:00:00.000Z',
  hospitalName:        'Apollo Hospital',
  claimedAmount:       250000,
  approvedAmount:      null,
  currency:            'INR',
  fraudScore:          12,
  fraudFlags:          [],
  riskLevel:           'LOW',
  notes:               null,
  settlementDate:      null,
  updatedAt:           '2026-01-20T10:00:00.000Z',
  createdAt:           '2026-01-20T10:00:00.000Z',
  documents:           [],
  auditLogs:           [],
};

export const mockSubmitResult: SubmitClaimResponse = {
  claimId:     MOCK_CLAIM_ID,
  claimNumber: MOCK_CLAIM_NUMBER,
  status:      'SUBMITTED',
  fraudScore:  12,
  riskLevel:   'LOW',
};

// ─── Admin fixtures ────────────────────────────────────────────────────────────

export const mockPendingMember: PendingMember = {
  id:              'user_doc_pending_001',
  profileId:       'doc_pending_001',
  name:            'Dr. Pending Doctor',
  role:            'DOCTOR',
  specialty:       'Cardiology',
  licenseNumber:   'MCI-2020-001',
  registeredAt:    '2026-03-01T10:00:00.000Z',
};

export const mockActiveStaffResponse: ActiveStaffResponse = {
  doctors: [
    {
      id:              'user_doc_001',
      profileId:       'doc_001',
      name:            'Dr. Active Doctor',
      specialty:       'General Medicine',
      licenseNumber:   'MCI-2019-999',
      isVerified:      true,
      isActive:        true,
    },
  ],
  staff: [
    {
      id:              'user_staff_001',
      profileId:       'staff_001',
      name:            'Nurse Active',
      staffType:       'NURSE',
      employeeId:      'EMP-001',
      isVerified:      true,
      isActive:        true,
    },
  ],
};

export const mockAuditLogEntry: AuditLogEntry = {
  id:          'audit_001',
  action:      'EMERGENCY_OVERRIDE',
  severity:    'HIGH',
  actorId:     'user_doc_001',
  actorRole:   'DOCTOR',
  targetId:    'pat_001',
  targetType:  'Patient',
  hospitalId:  MOCK_HOSPITAL_ID,
  metadata:    { reason: 'Emergency' },
  ipAddress:   '192.168.1.1',
  userAgent:   'Mozilla/5.0',
  createdAt:   '2026-03-10T09:15:00.000Z',
};

export const mockHospitalAnalytics: HospitalAnalytics = {
  totalPatients:                 4820,
  recordsUploadedThisMonth:      1243,
  prescriptionsIssuedThisMonth:  892,
  pendingConsents:               14,
  emergencyOverridesThisMonth:   2,
  aiReportsThisMonth:            337,
  trends: {
    recordsPerDay: [
      { date: '2026-03-01', count: 42 },
      { date: '2026-03-02', count: 38 },
    ],
  },
};

export const mockHospitalRow: HospitalRow = {
  id:                 MOCK_HOSPITAL_ID,
  name:               'Apollo Hospital',
  city:               'Mumbai',
  state:              'Maharashtra',
  isVerified:         true,
  verifiedAt:         '2026-01-01T00:00:00.000Z',
  isNABH:             true,
  registrationNumber: 'REG-001',
  createdAt:          '2025-01-01T00:00:00.000Z',
  adminName:          'Test Admin',
  adminEmail:         'admin@test.internal',
  doctorCount:        25,
  staffCount:         40,
};

export const mockPlatformAnalytics: PlatformAnalytics = {
  users: {
    total:  12400,
    byRole: {
      PATIENT:            10000,
      DOCTOR:             1500,
      HOSPITAL_STAFF:     600,
      HOSPITAL_ADMIN:     50,
      INSURANCE_PROVIDER: 200,
      SUPER_ADMIN:        5,
      PHARMACIST:         45,
    },
  },
  totalRecords:          380000,
  activeConsents:        8900,
  claims: {
    total:    14700,
    byStatus: {
      SUBMITTED:  5000,
      APPROVED:   7200,
      REJECTED:   1800,
      PENDING:    700,
    },
  },
  sosEventsThisMonth:    12,
  aiUsageThisMonth:      9800,
};

// ─── Handlers ─────────────────────────────────────────────────────────────────
export const handlers = [
  // POST /api/auth/refresh — needed when any 401 triggers the axios interceptor's token refresh
  http.post('/api/auth/refresh', () =>
    HttpResponse.json({ success: false, error: 'Refresh token invalid' }, { status: 401 })
  ),

  // POST /api/v1/records/upload
  http.post('/api/v1/records/upload', async () => {
    return HttpResponse.json({ success: true, data: mockRecord }, { status: 201 });
  }),

  // GET /api/v1/records/:uhid
  http.get('/api/v1/records/:uhid', ({ params }) => {
    const { uhid } = params as { uhid: string };
    if (uhid === MOCK_UHID) {
      return HttpResponse.json({ success: true, data: mockListResponse });
    }
    return HttpResponse.json(
      { success: false, error: 'Patient not found' },
      { status: 404 }
    );
  }),

  // GET /api/v1/records/record/:id
  http.get('/api/v1/records/record/:id', ({ params }) => {
    const { id } = params as { id: string };
    if (id === MOCK_RECORD_ID) {
      return HttpResponse.json({ success: true, data: mockRecord });
    }
    return HttpResponse.json(
      { success: false, error: 'Record not found' },
      { status: 404 }
    );
  }),

  // GET /api/v1/records/record/:id/download
  http.get('/api/v1/records/record/:id/download', ({ params }) => {
    const { id } = params as { id: string };
    if (id === MOCK_RECORD_ID) {
      return HttpResponse.json({ success: true, data: mockDownloadResponse });
    }
    return HttpResponse.json(
      { success: false, error: 'Record not found' },
      { status: 404 }
    );
  }),

  // ─── Consent handlers ─────────────────────────────────────────────────────

  // GET /api/v1/consents/active
  http.get('/api/v1/consents/active', () => {
    return HttpResponse.json({ success: true, data: mockActiveConsents });
  }),

  // GET /api/v1/consents/pending
  http.get('/api/v1/consents/pending', () => {
    return HttpResponse.json({ success: true, data: mockPendingConsents });
  }),

  // GET /api/v1/consents/history
  http.get('/api/v1/consents/history', () => {
    return HttpResponse.json({ success: true, data: mockConsentHistory });
  }),

  // GET /api/v1/consents/check/:uhid
  http.get('/api/v1/consents/check/:uhid', ({ params }) => {
    const { uhid } = params as { uhid: string };
    if (uhid === MOCK_UHID) {
      return HttpResponse.json({ success: true, data: mockConsentCheckActive });
    }
    return HttpResponse.json({ success: true, data: { hasAccess: false } });
  }),

  // POST /api/v1/consents/request
  http.post('/api/v1/consents/request', async () => {
    return HttpResponse.json(
      { success: true, message: 'Access request sent. Patient has been notified.', data: mockRequestResult },
      { status: 201 }
    );
  }),

  // POST /api/v1/consents/otp/send
  http.post('/api/v1/consents/otp/send', async () => {
    return HttpResponse.json({
      success: true,
      message: 'OTP sent to your registered email address',
      expiresInMinutes: 10,
    });
  }),

  // POST /api/v1/consents/approve
  http.post('/api/v1/consents/approve', async () => {
    return HttpResponse.json({
      success: true,
      message: 'Access approved successfully.',
      data: mockApproveResult,
    });
  }),

  // POST /api/v1/consents/deny
  http.post('/api/v1/consents/deny', async () => {
    return HttpResponse.json({ success: true, message: 'Access request denied.' });
  }),

  // DELETE /api/v1/consents/:id
  http.delete('/api/v1/consents/:id', ({ params }) => {
    const { id } = params as { id: string };
    if (id === MOCK_CONSENT_ID) {
      return HttpResponse.json({
        success: true,
        message: 'Access revoked successfully.',
        data: { revokedAt: new Date().toISOString() },
      });
    }
    return HttpResponse.json({ success: false, error: 'Consent not found' }, { status: 404 });
  }),

  // ─── Clinical handlers ────────────────────────────────────────────────────

  // GET /api/v1/clinical/patient/:uhid
  http.get('/api/v1/clinical/patient/:uhid', ({ params }) => {
    const { uhid } = params as { uhid: string };
    if (uhid === MOCK_UHID) {
      return HttpResponse.json({ success: true, data: mockPatientProfile });
    }
    return HttpResponse.json({ success: false, error: 'Patient not found' }, { status: 404 });
  }),

  // GET /api/v1/clinical/notes/single/:id
  http.get('/api/v1/clinical/notes/single/:id', ({ params }) => {
    const { id } = params as { id: string };
    if (id === MOCK_NOTE_ID) {
      return HttpResponse.json({ success: true, data: mockClinicalNote });
    }
    return HttpResponse.json({ success: false, error: 'Note not found' }, { status: 404 });
  }),

  // GET /api/v1/clinical/notes/:patientUhid
  http.get('/api/v1/clinical/notes/:patientUhid', ({ params }) => {
    const { patientUhid } = params as { patientUhid: string };
    if (patientUhid === MOCK_UHID) {
      return HttpResponse.json({ success: true, data: [mockClinicalNote] });
    }
    return HttpResponse.json({ success: true, data: [] });
  }),

  // POST /api/v1/clinical/notes
  http.post('/api/v1/clinical/notes', async () => {
    return HttpResponse.json(
      { success: true, message: 'Clinical note created successfully', data: mockClinicalNote },
      { status: 201 }
    );
  }),

  // GET /api/v1/clinical/prescriptions/single/:id
  http.get('/api/v1/clinical/prescriptions/single/:id', ({ params }) => {
    const { id } = params as { id: string };
    if (id === MOCK_PRESCRIPTION_ID) {
      return HttpResponse.json({ success: true, data: mockPrescription });
    }
    return HttpResponse.json({ success: false, error: 'Prescription not found' }, { status: 404 });
  }),

  // GET /api/v1/clinical/prescriptions/:patientUhid
  http.get('/api/v1/clinical/prescriptions/:patientUhid', ({ params }) => {
    const { patientUhid } = params as { patientUhid: string };
    if (patientUhid === MOCK_UHID) {
      return HttpResponse.json({ success: true, data: [mockPrescription] });
    }
    return HttpResponse.json({ success: true, data: [] });
  }),

  // POST /api/v1/clinical/prescriptions
  http.post('/api/v1/clinical/prescriptions', async () => {
    return HttpResponse.json(
      {
        success: true,
        message: 'Prescription created successfully',
        data: { prescription: mockPrescription, pharmaCheck: mockPharmaCheckClean },
      },
      { status: 201 }
    );
  }),

  // POST /api/v1/clinical/pharma-check
  http.post('/api/v1/clinical/pharma-check', async () => {
    return HttpResponse.json({ success: true, data: mockPharmaCheckClean });
  }),

  // ─── AI handlers ─────────────────────────────────────────────────────────

  // GET /api/v1/ai/summary/:recordId — return 404 by default (no cached summary)
  http.get('/api/v1/ai/summary/:recordId', ({ params }) => {
    const { recordId } = params as { recordId: string };
    if (recordId === MOCK_RECORD_ID) {
      return HttpResponse.json(
        { success: false, error: 'No AI summary found for this record' },
        { status: 404 }
      );
    }
    return HttpResponse.json({ success: false, error: 'Record not found' }, { status: 404 });
  }),

  // POST /api/v1/ai/decode
  http.post('/api/v1/ai/decode', async () => {
    return HttpResponse.json({ success: true, data: mockDecodeResponse });
  }),

  // POST /api/v1/ai/clinical-summary
  http.post('/api/v1/ai/clinical-summary', async () => {
    return HttpResponse.json({ success: true, data: mockClinicalSummaryResponse });
  }),

  // ─── QR fixtures ─────────────────────────────────────────────────────────

  // GET /api/v1/qr/emergency/:uhid — Tier 1 public data
  http.get('/api/v1/qr/emergency/:uhid', ({ params }) => {
    const { uhid } = params as { uhid: string };
    if (uhid === MOCK_UHID) {
      return HttpResponse.json({
        success: true,
        tier: 1,
        data: mockPublicEmergencyData,
      });
    }
    return HttpResponse.json(
      { success: false, error: 'Patient not found' },
      { status: 404 }
    );
  }),

  // POST /api/v1/qr/scan/doctor — Tier 2 doctor scan
  http.post('/api/v1/qr/scan/doctor', async () => {
    return HttpResponse.json({ success: true, tier: 2, data: mockDoctorScanData });
  }),

  // POST /api/v1/qr/generate — Tier 3 one-time share
  http.post('/api/v1/qr/generate', async () => {
    return HttpResponse.json(
      { success: true, tier: 3, data: mockGeneratedQr },
      { status: 201 }
    );
  }),

  // GET /api/v1/qr/scan-logs
  http.get('/api/v1/qr/scan-logs', () => {
    return HttpResponse.json({ success: true, data: mockScanLogs });
  }),

  // POST /api/v1/qr/invalidate
  http.post('/api/v1/qr/invalidate', async () => {
    return HttpResponse.json({
      success: true,
      message: 'All active QR tokens invalidated. New emergency QR generated.',
      data: mockInvalidateResult,
    });
  }),

  // POST /api/v1/qr/sos
  http.post('/api/v1/qr/sos', async () => {
    return HttpResponse.json(
      {
        success: true,
        message: 'SOS activated. Emergency contacts and nearby hospitals notified.',
        data: mockSosResult,
      },
      { status: 201 }
    );
  }),

  // POST /api/v1/qr/emergency/override
  http.post('/api/v1/qr/emergency/override', async () => {
    return HttpResponse.json({
      success: true,
      data: {
        accessGranted: true,
        expiresAt:     new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        auditLogId:    'audit_override_001',
      },
    });
  }),

  // ─── Insurance handlers ────────────────────────────────────────────────────

  // GET /api/v1/insurance/claims
  http.get('/api/v1/insurance/claims', () => {
    return HttpResponse.json({
      success: true,
      claims: [mockClaimSummary],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
  }),

  // GET /api/v1/insurance/claims/:id
  http.get('/api/v1/insurance/claims/:id', ({ params }) => {
    if (params.id === MOCK_CLAIM_ID) {
      return HttpResponse.json({ success: true, data: mockClaimDetail });
    }
    return HttpResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }),

  // POST /api/v1/insurance/claims
  http.post('/api/v1/insurance/claims', async () => {
    return HttpResponse.json({ success: true, data: mockSubmitResult }, { status: 201 });
  }),

  // POST /api/v1/insurance/claims/:id/request-access
  http.post('/api/v1/insurance/claims/:id/request-access', async () => {
    return HttpResponse.json(
      {
        success: true,
        data: {
          consentId: 'con_ins_001',
          status: 'PENDING',
          message: 'Access request sent to patient for approval',
        },
      },
      { status: 201 }
    );
  }),

  // GET /api/v1/insurance/claims/:id/records
  http.get('/api/v1/insurance/claims/:id/records', () => {
    return HttpResponse.json(
      { success: false, error: 'No active consent', code: 'NO_CONSENT' },
      { status: 403 }
    );
  }),

  // POST /api/v1/insurance/verify-record
  http.post('/api/v1/insurance/verify-record', async () => {
    return HttpResponse.json({
      success: true,
      data: {
        recordId:      MOCK_RECORD_ID,
        originalHash:  'abc123def456abc123def456abc123def456abc123def456abc123def456abc1',
        submittedHash: 'abc123def456abc123def456abc123def456abc123def456abc123def456abc1',
        isAuthentic:   true,
        verifiedAt:    new Date().toISOString(),
        recordType:    'LAB_REPORT',
        uploadedAt:    '2026-01-16T10:00:00.000Z',
        uploadedBy:    'Staff',
      },
    });
  }),

  // PATCH /api/v1/insurance/claims/:id/decision
  http.patch('/api/v1/insurance/claims/:id/decision', async ({ request }) => {
    const body = await request.json() as { status: string };
    return HttpResponse.json({
      success: true,
      data: { ...mockClaimDetail, status: body.status },
    });
  }),

  // ─── Admin handlers ────────────────────────────────────────────────────────

  // GET /api/v1/admin/pending-verifications
  http.get('/api/v1/admin/pending-verifications', () => {
    return HttpResponse.json({ success: true, data: [mockPendingMember] });
  }),

  // PATCH /api/v1/admin/verify-staff/:userId
  http.patch('/api/v1/admin/verify-staff/:userId', async () => {
    return HttpResponse.json({ success: true, message: 'Staff member verified successfully.' });
  }),

  // PATCH /api/v1/admin/deactivate-staff/:userId
  http.patch('/api/v1/admin/deactivate-staff/:userId', async () => {
    return HttpResponse.json({ success: true, message: 'Staff member deactivated.' });
  }),

  // GET /api/v1/admin/staff
  http.get('/api/v1/admin/staff', () => {
    return HttpResponse.json({ success: true, data: mockActiveStaffResponse });
  }),

  // GET /api/v1/admin/analytics
  http.get('/api/v1/admin/analytics', () => {
    return HttpResponse.json({ success: true, data: mockHospitalAnalytics });
  }),

  // GET /api/v1/admin/audit-logs
  http.get('/api/v1/admin/audit-logs', () => {
    return HttpResponse.json({
      success: true,
      data: {
        total: 1, page: 1, limit: 50, totalPages: 1,
        logs: [mockAuditLogEntry],
      },
    });
  }),

  // GET /api/v1/admin/audit-logs/export
  http.get('/api/v1/admin/audit-logs/export', () => {
    return new HttpResponse(
      'action,severity,actorId,actorRole,targetId,targetType,hospitalId,ipAddress,createdAt\nEMERGENCY_OVERRIDE,HIGH,user_doc_001,DOCTOR,pat_001,Patient,hosp_test_001,192.168.1.1,2026-03-10T09:15:00.000Z',
      {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="audit-logs-2026-03-10.csv"',
        },
      }
    );
  }),

  // GET /api/v1/admin/super/hospitals
  http.get('/api/v1/admin/super/hospitals', () => {
    return HttpResponse.json({ success: true, data: [mockHospitalRow] });
  }),

  // PATCH /api/v1/admin/super/hospitals/:id/verify
  http.patch('/api/v1/admin/super/hospitals/:id/verify', async () => {
    return HttpResponse.json({ success: true, message: 'Hospital action applied.' });
  }),

  // GET /api/v1/admin/super/analytics
  http.get('/api/v1/admin/super/analytics', () => {
    return HttpResponse.json({ success: true, data: mockPlatformAnalytics });
  }),
];
