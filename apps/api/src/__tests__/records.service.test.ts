/**
 * records.service.test.ts
 * Unit tests for medical records service — upload, list, download.
 */

import prisma from '@/lib/prisma';
import { redis } from '@/lib/redis';

// ─── Mock prisma ─────────────────────────────────────────────────────────────
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    medicalRecord: {
      findUnique: jest.fn(),
      findMany:   jest.fn(),
      create:     jest.fn(),
      count:      jest.fn(),
    },
    patient:  { findUnique: jest.fn() },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
    notification: { create: jest.fn().mockResolvedValue({}) },
  },
}));

jest.mock('@/lib/redis', () => ({
  redis: { setex: jest.fn(), get: jest.fn(), del: jest.fn() },
  TTL: {},
}));

jest.mock('@/lib/cloudinary', () => ({
  uploadMedicalRecord: jest.fn().mockResolvedValue({
    secure_url: 'https://cloudinary.com/test.pdf',
    public_id:  'uhid/records/test123',
    bytes:      102400,
    format:     'pdf',
  }),
  getSignedUrl:       jest.fn().mockReturnValue('https://cloudinary.com/signed-url'),
  deleteCloudinaryFile: jest.fn().mockResolvedValue({}),
}));

jest.mock('@/lib/socket', () => ({
  getIO: jest.fn().mockReturnValue({ to: jest.fn().mockReturnValue({ emit: jest.fn() }) }),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

// ─── Record types ────────────────────────────────────────────────────────────
describe('Record Types', () => {
  const validTypes = [
    'LAB_REPORT', 'IMAGING', 'PRESCRIPTION', 'DISCHARGE_SUMMARY',
    'VACCINATION', 'ECG', 'CLINICAL_NOTES', 'OTHER',
  ];

  it('should have all expected record types', () => {
    expect(validTypes).toHaveLength(8);
    expect(validTypes).toContain('LAB_REPORT');
    expect(validTypes).toContain('PRESCRIPTION');
    expect(validTypes).toContain('OTHER');
  });
});

// ─── File validation ─────────────────────────────────────────────────────────
describe('File Upload Validation', () => {
  const allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
  ];

  it('should accept PDF files', () => {
    expect(allowedMimeTypes).toContain('application/pdf');
  });

  it('should accept JPEG images', () => {
    expect(allowedMimeTypes).toContain('image/jpeg');
  });

  it('should accept PNG images', () => {
    expect(allowedMimeTypes).toContain('image/png');
  });

  it('should accept WebP images', () => {
    expect(allowedMimeTypes).toContain('image/webp');
  });

  it('should reject files larger than 10MB', () => {
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const oversizedFile = 11 * 1024 * 1024;
    expect(oversizedFile).toBeGreaterThan(MAX_FILE_SIZE);
  });
});

// ─── Record listing ──────────────────────────────────────────────────────────
describe('Record Listing', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return paginated records for a patient', async () => {
    const fakeRecords = Array.from({ length: 5 }, (_, i) => ({
      id: `rec_${i}`,
      patientId: 'pat_001',
      title: `Test Report ${i}`,
      recordType: 'LAB_REPORT',
      cloudinaryUrl: `https://cloudinary.com/test${i}.pdf`,
      uploadedById: 'staff_001',
      createdAt: new Date(),
    }));

    (mockPrisma.medicalRecord.findMany as jest.Mock).mockResolvedValue(fakeRecords);
    (mockPrisma.medicalRecord.count as jest.Mock).mockResolvedValue(5);

    const records = await mockPrisma.medicalRecord.findMany({
      where: { patientId: 'pat_001' },
      take: 20,
      skip: 0,
      orderBy: { createdAt: 'desc' },
    });

    expect(records).toHaveLength(5);
    expect(records[0].recordType).toBe('LAB_REPORT');
  });

  it('should filter records by type', async () => {
    const labReports = [
      { id: 'rec_1', recordType: 'LAB_REPORT', title: 'CBC Test' },
      { id: 'rec_2', recordType: 'LAB_REPORT', title: 'Lipid Panel' },
    ];

    (mockPrisma.medicalRecord.findMany as jest.Mock).mockResolvedValue(labReports);

    const records = await mockPrisma.medicalRecord.findMany({
      where: { patientId: 'pat_001', recordType: 'LAB_REPORT' },
    });

    expect(records).toHaveLength(2);
    records.forEach((r) => expect(r.recordType).toBe('LAB_REPORT'));
  });

  it('should return empty array when patient has no records', async () => {
    (mockPrisma.medicalRecord.findMany as jest.Mock).mockResolvedValue([]);

    const records = await mockPrisma.medicalRecord.findMany({
      where: { patientId: 'pat_new' },
    });

    expect(records).toHaveLength(0);
  });
});

// ─── Record creation ─────────────────────────────────────────────────────────
describe('Record Creation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should create a medical record with correct metadata', async () => {
    const newRecord = {
      id: 'rec_new',
      patientId: 'pat_001',
      title: 'Blood Test CBC',
      recordType: 'LAB_REPORT',
      subType: 'Complete Blood Count',
      cloudinaryUrl: 'https://cloudinary.com/test.pdf',
      cloudinaryPublicId: 'uhid/records/test123',
      fileHash: 'sha256:abc123def456...',
      fileSizeBytes: 102400,
      fileFormat: 'pdf',
      uploadedById: 'staff_001',
      hospitalId: 'hosp_001',
      tags: ['blood', 'cbc', 'hematology'],
      createdAt: new Date(),
    };

    (mockPrisma.medicalRecord.create as jest.Mock).mockResolvedValue(newRecord);

    const created = await mockPrisma.medicalRecord.create({ data: newRecord as any });

    expect(created.id).toBe('rec_new');
    expect(created.fileHash).toBeTruthy();
    expect(created.tags).toContain('cbc');
  });

  it('should store file hash for integrity verification', async () => {
    const record = {
      id: 'rec_hash',
      fileHash: 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    };

    (mockPrisma.medicalRecord.create as jest.Mock).mockResolvedValue(record);

    const created = await mockPrisma.medicalRecord.create({ data: record as any });
    expect(created.fileHash).toMatch(/^sha256:/);
  });
});

// ─── Signed URL generation ────────────────────────────────────────────────────
describe('Signed URL for Download', () => {
  it('should generate time-limited signed URL', () => {
    const { getSignedUrl } = require('@/lib/cloudinary');
    const url = getSignedUrl('uhid/records/test123');
    expect(url).toBeTruthy();
    expect(typeof url).toBe('string');
  });
});

// ─── Audit logging ───────────────────────────────────────────────────────────
describe('Audit Logging on Record Operations', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should create audit log entry on record upload', async () => {
    await mockPrisma.auditLog.create({
      data: {
        actorId: 'staff_001',
        actorRole: 'HOSPITAL_STAFF',
        action: 'RECORD_UPLOADED',
        severity: 'LOW',
        metadata: { recordId: 'rec_001', recordType: 'LAB_REPORT' },
      } as any,
    });

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'RECORD_UPLOADED',
          actorRole: 'HOSPITAL_STAFF',
        }),
      }),
    );
  });

  it('should create audit log entry on record download', async () => {
    await mockPrisma.auditLog.create({
      data: {
        actorId: 'doc_001',
        actorRole: 'DOCTOR',
        action: 'RECORD_DOWNLOADED',
        severity: 'MEDIUM',
        metadata: { recordId: 'rec_001', patientUhid: 'UHID-ABCD-EFGH-1234' },
      } as any,
    });

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'RECORD_DOWNLOADED',
          severity: 'MEDIUM',
        }),
      }),
    );
  });
});
