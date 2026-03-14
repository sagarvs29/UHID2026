import { http, HttpResponse } from 'msw';
import type { MedicalRecord, MedicalRecordSummary, RecordsListResponse, DownloadUrlResponse } from '@/types/records';
import type { ActiveConsent, PendingConsent, ConsentHistoryResponse } from '@/types/consent';
import type { PatientProfile, ClinicalNote, Prescription, PharmaCheckResult } from '@/types/clinical';

// ─── Fixtures ─────────────────────────────────────────────────────────────────
export const MOCK_UHID = 'UHID-AB12-CD34-5678';
export const MOCK_RECORD_ID = 'rec_test_001';

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
];
