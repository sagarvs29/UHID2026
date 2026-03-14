import { http, HttpResponse } from 'msw';
import type { MedicalRecord, MedicalRecordSummary, RecordsListResponse, DownloadUrlResponse } from '@/types/records';
import type { ActiveConsent, PendingConsent, ConsentHistoryResponse } from '@/types/consent';

// ─── Fixtures ─────────────────────────────────────────────────────────────────
export const MOCK_UHID = 'UH-000001';
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
];
