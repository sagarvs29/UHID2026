import { http, HttpResponse } from 'msw';
import type { MedicalRecord, MedicalRecordSummary, RecordsListResponse, DownloadUrlResponse } from '@/types/records';

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
  uploadedByStaff: { id: 'staff_01', name: 'Staff User' },
  createdAt:     '2026-01-16T10:00:00.000Z',
};

export const mockRecord: MedicalRecord = {
  ...mockRecordSummary,
  description:   'Routine annual blood test',
  fileUrl:       'https://res.cloudinary.com/test/image/upload/v1/test.pdf',
  extractedData: null,
  aiSummary:     'All values within normal range. Haemoglobin: 13.5 g/dL.',
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

// ─── Handlers ─────────────────────────────────────────────────────────────────
export const handlers = [
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
];
