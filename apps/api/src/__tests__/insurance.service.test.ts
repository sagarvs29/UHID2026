/**
 * insurance.service.test.ts
 * Unit tests for insurance.service functions.
 * Prisma is fully mocked.
 */

import { submitClaim, verifyRecord, updateClaimDecision } from '@/services/insurance.service';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { ClaimStatus, ClaimType } from '@prisma/client';

// ─── Mock prisma ─────────────────────────────────────────────────────────────
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    insuranceProvider: { findUnique: jest.fn() },
    patient:           { findUnique: jest.fn() },
    insuranceClaim:    {
      findUnique:    jest.fn(),
      findFirst:     jest.fn(),
      count:         jest.fn(),
      create:        jest.fn(),
      update:        jest.fn(),
      findMany:      jest.fn(),
    },
    hospital:      { findFirst: jest.fn() },
    medicalRecord: { findUnique: jest.fn() },
    auditLog:      { create: jest.fn().mockResolvedValue({}) },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const PROVIDER_USER_ID = 'ins_user_001';
const PATIENT_UHID     = 'UHID-TEST-0001-0001';

function mockProviderAndPatient() {
  (mockPrisma.insuranceProvider.findUnique as jest.Mock).mockResolvedValue({
    id: 'prov_001', userId: PROVIDER_USER_ID, companyName: 'Max Bupa',
    licenseNumber: 'IRDAI-001', isVerified: true,
  });
  (mockPrisma.patient.findUnique as jest.Mock).mockResolvedValue({
    id: 'pat_001', uhid: PATIENT_UHID, firstName: 'Test', lastName: 'Patient',
  });
}

// ─── submitClaim ─────────────────────────────────────────────────────────────
describe('submitClaim', () => {
  const baseBody = {
    patientUhid:   PATIENT_UHID,
    claimType:     ClaimType.HOSPITALIZATION,
    diagnosis:     'Pneumonia',
    icd10Code:     'J18.9',
    admissionDate: '2026-04-01',
    dischargeDate: '2026-04-07',
    hospitalName:  'Apollo Hospital Mumbai',
    claimedAmount: 150000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockProviderAndPatient();
    // No duplicate claim
    (mockPrisma.insuranceClaim.count as jest.Mock).mockResolvedValue(0);
    // Unique claim number (not in DB)
    (mockPrisma.insuranceClaim.findUnique as jest.Mock).mockResolvedValue(null);
    // Verified hospital found
    (mockPrisma.hospital.findFirst as jest.Mock).mockResolvedValue({
      id: 'hosp_001', name: 'Apollo Hospital Mumbai', isVerified: true,
    });
    // Claim creation
    (mockPrisma.insuranceClaim.create as jest.Mock).mockResolvedValue({
      id: 'claim_001',
      claimNumber: 'CLM-2026-12345',
      status: ClaimStatus.SUBMITTED,
      fraudScore: 0,
      fraudFlags: [],
    });
  });

  it('creates a claim and returns claimId + status', async () => {
    const result = await submitClaim(PROVIDER_USER_ID, baseBody);

    expect(result.claimId).toBe('claim_001');
    expect(result.status).toBe(ClaimStatus.SUBMITTED);
    expect(result.claimNumber).toBe('CLM-2026-12345');
  });

  it('detects DUPLICATE_CLAIM fraud flag', async () => {
    // A prior claim exists with same patient+icd10+type
    (mockPrisma.insuranceClaim.count as jest.Mock).mockResolvedValueOnce(1); // duplicate
    (mockPrisma.insuranceClaim.count as jest.Mock).mockResolvedValue(0);     // high frequency

    (mockPrisma.insuranceClaim.create as jest.Mock).mockImplementation(
      async ({ data }) => ({
        id: 'claim_002',
        claimNumber: 'CLM-2026-99999',
        status: ClaimStatus.SUBMITTED,
        fraudScore: data.fraudScore,
        fraudFlags: data.fraudFlags,
      }),
    );

    const result = await submitClaim(PROVIDER_USER_ID, baseBody);
    expect(result.fraudScore).toBeGreaterThan(0);
  });

  it('throws 404 when patient UHID not found', async () => {
    (mockPrisma.patient.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(submitClaim(PROVIDER_USER_ID, baseBody)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('throws 404 when insurance provider not found', async () => {
    (mockPrisma.insuranceProvider.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(submitClaim(PROVIDER_USER_ID, baseBody)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

// ─── verifyRecord ────────────────────────────────────────────────────────────
describe('verifyRecord', () => {
  const recordId = 'rec_001';

  beforeEach(() => jest.clearAllMocks());

  it('returns isAuthentic=true when file hash matches stored hash', async () => {
    const fakeContent = Buffer.from('This is the medical record content');
    const correctHash = crypto.createHash('sha256').update(fakeContent).digest('hex');

    (mockPrisma.insuranceProvider.findUnique as jest.Mock).mockResolvedValue({
      id: 'prov_001', userId: PROVIDER_USER_ID,
    });
    (mockPrisma.medicalRecord.findUnique as jest.Mock).mockResolvedValue({
      id: recordId, fileHash: correctHash, recordType: 'LAB_REPORT',
      createdAt: new Date(), uploadedByStaff: null, patientId: 'pat_001',
    });

    const result = await verifyRecord(PROVIDER_USER_ID, recordId, fakeContent);
    expect(result.isAuthentic).toBe(true);
  });

  it('returns isAuthentic=false when hash does not match', async () => {
    (mockPrisma.insuranceProvider.findUnique as jest.Mock).mockResolvedValue({
      id: 'prov_001', userId: PROVIDER_USER_ID,
    });
    (mockPrisma.medicalRecord.findUnique as jest.Mock).mockResolvedValue({
      id: recordId, fileHash: 'storedCorrectHash', recordType: 'PRESCRIPTION',
      createdAt: new Date(), uploadedByStaff: null, patientId: 'pat_001',
    });

    const result = await verifyRecord(PROVIDER_USER_ID, recordId, Buffer.from('tampered content'));
    expect(result.isAuthentic).toBe(false);
  });
});

// ─── updateClaimDecision ──────────────────────────────────────────────────────
describe('updateClaimDecision', () => {
  const claimId = 'claim_001';

  beforeEach(() => {
    jest.clearAllMocks();
    (mockPrisma.insuranceProvider.findUnique as jest.Mock).mockResolvedValue({
      id: 'prov_001', userId: PROVIDER_USER_ID,
    });
  });

  it('transitions from SUBMITTED to UNDER_REVIEW', async () => {
    (mockPrisma.insuranceClaim.findUnique as jest.Mock).mockResolvedValue({
      id: claimId, status: ClaimStatus.SUBMITTED, insuranceProviderId: 'prov_001',
      claimedAmount: 150000,
    });
    (mockPrisma.insuranceClaim.update as jest.Mock).mockResolvedValue({
      id: claimId, status: ClaimStatus.UNDER_REVIEW,
    });

    const result = await updateClaimDecision(PROVIDER_USER_ID, claimId, { status: ClaimStatus.UNDER_REVIEW });
    expect(result.status).toBe(ClaimStatus.UNDER_REVIEW);
  });

  it('throws 422 for an invalid status transition (SUBMITTED → PAID)', async () => {
    (mockPrisma.insuranceClaim.findUnique as jest.Mock).mockResolvedValue({
      id: claimId, status: ClaimStatus.SUBMITTED, insuranceProviderId: 'prov_001',
      claimedAmount: 150000,
    });

    await expect(
      updateClaimDecision(PROVIDER_USER_ID, claimId, { status: ClaimStatus.PAID })
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it('throws 404 when claim not found', async () => {
    (mockPrisma.insuranceClaim.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      updateClaimDecision(PROVIDER_USER_ID, 'nonexistent', { status: ClaimStatus.UNDER_REVIEW })
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});
