/**
 * smart-pharma-check.test.ts
 * Unit tests for the pharma-check logic in clinical.service (runPharmaCheck).
 * Prisma is mocked so we can control patient allergies and ICD-10 codes.
 */

import { runPharmaCheck } from '@/services/clinical.service';
import prisma from '@/lib/prisma';

// ─── Mock prisma ─────────────────────────────────────────────────────────────
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    patient:      { findUnique: jest.fn() },
    prescription: { findMany:   jest.fn() },
    clinicalNote: { findMany:   jest.fn() },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

function setupPatient(opts: {
  uhid?: string;
  allergies?: string[];
  icd10Codes?: string[];
  existingDrugs?: string[];
} = {}) {
  const patient = {
    id: 'pat_001',
    uhid: opts.uhid ?? 'UHID-TEST-0001-0001',
    allergies: opts.allergies ?? [],
  };

  (mockPrisma.patient.findUnique as jest.Mock).mockResolvedValue(patient);

  // Existing active prescriptions
  const prescriptions = (opts.existingDrugs ?? []).map((drugName, i) => ({
    id: `rx_${i}`,
    patientId: patient.id,
    items: [{ drugName }],
    createdAt: new Date(),
  }));
  (mockPrisma.prescription.findMany as jest.Mock).mockResolvedValue(prescriptions);

  // Clinical notes with ICD-10 codes
  const notes = (opts.icd10Codes ?? []).map((icd10Code, i) => ({
    id: `note_${i}`, icd10Code, createdAt: new Date(),
  }));
  (mockPrisma.clinicalNote.findMany as jest.Mock).mockResolvedValue(notes);

  return patient;
}

describe('runPharmaCheck — drug-drug interactions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('detects HIGH severity Warfarin + Aspirin interaction', async () => {
    setupPatient();
    const result = await runPharmaCheck(
      'UHID-TEST-0001-0001',
      [
        { name: 'warfarin', dosage: '5mg' },
        { name: 'aspirin',  dosage: '75mg' },
      ],
      'doc_001',
    );

    expect(result.passed).toBe(false);
    const issue = result.issues.find((i) => i.type === 'DRUG_INTERACTION');
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe('HIGH');
    expect(issue!.requiresOverride).toBe(true);
  });

  it('detects CRITICAL SSRI + MAOI interaction', async () => {
    setupPatient();
    const result = await runPharmaCheck(
      'UHID-TEST-0001-0001',
      [
        { name: 'sertraline', dosage: '50mg' },  // ssri
        { name: 'phenelzine',  dosage: '15mg' }, // maoi
      ],
      'doc_001',
    );

    const issue = result.issues.find(
      (i) => i.type === 'DRUG_INTERACTION' && i.severity === 'CRITICAL',
    );
    expect(issue).toBeDefined();
  });

  it('returns passed:true and no issues for 3 unrelated drugs', async () => {
    setupPatient();
    const result = await runPharmaCheck(
      'UHID-TEST-0001-0001',
      [
        { name: 'amoxicillin', dosage: '500mg' },
        { name: 'metformin',   dosage: '500mg' },
        { name: 'lisinopril',  dosage: '10mg'  },
      ],
      'doc_001',
    );

    // No drug-drug interaction among these three in our dataset
    const ddiIssues = result.issues.filter((i) => i.type === 'DRUG_INTERACTION');
    expect(ddiIssues).toHaveLength(0);
  });
});

describe('runPharmaCheck — drug-allergy checks', () => {
  beforeEach(() => jest.clearAllMocks());

  it('flags CRITICAL when prescribing a drug the patient is allergic to', async () => {
    setupPatient({ allergies: ['aspirin'] });
    const result = await runPharmaCheck(
      'UHID-TEST-0001-0001',
      [{ name: 'aspirin', dosage: '75mg' }],
      'doc_001',
    );

    const allergyIssue = result.issues.find((i) => i.type === 'DRUG_ALLERGY');
    expect(allergyIssue).toBeDefined();
    expect(allergyIssue!.severity).toBe('CRITICAL');
    expect(allergyIssue!.requiresOverride).toBe(true);
  });

  it('flags HIGH for cross-class allergy (penicillin allergy → amoxicillin)', async () => {
    setupPatient({ allergies: ['penicillin'] });
    const result = await runPharmaCheck(
      'UHID-TEST-0001-0001',
      [{ name: 'amoxicillin', dosage: '500mg' }],
      'doc_001',
    );

    const allergyIssue = result.issues.find((i) => i.type === 'DRUG_ALLERGY');
    expect(allergyIssue).toBeDefined();
    expect(allergyIssue!.severity).toBe('HIGH');
  });

  it('returns no allergy issues when patient has no allergies', async () => {
    setupPatient({ allergies: [] });
    const result = await runPharmaCheck(
      'UHID-TEST-0001-0001',
      [{ name: 'amoxicillin', dosage: '500mg' }],
      'doc_001',
    );

    const allergyIssues = result.issues.filter((i) => i.type === 'DRUG_ALLERGY');
    expect(allergyIssues).toHaveLength(0);
  });
});

describe('runPharmaCheck — drug-condition contraindications', () => {
  beforeEach(() => jest.clearAllMocks());

  it('flags MODERATE metformin + CKD (N18) contraindication', async () => {
    setupPatient({ icd10Codes: ['N18.3'] }); // CKD stage 3
    const result = await runPharmaCheck(
      'UHID-TEST-0001-0001',
      [{ name: 'metformin', dosage: '500mg' }],
      'doc_001',
    );

    const conditionIssue = result.issues.find((i) => i.type === 'DRUG_CONDITION');
    expect(conditionIssue).toBeDefined();
  });

  it('flags aspirin contraindicated in asthma (J45)', async () => {
    setupPatient({ icd10Codes: ['J45.0'] });
    const result = await runPharmaCheck(
      'UHID-TEST-0001-0001',
      [{ name: 'aspirin', dosage: '75mg' }],
      'doc_001',
    );

    const conditionIssue = result.issues.find((i) => i.type === 'DRUG_CONDITION');
    expect(conditionIssue).toBeDefined();
    expect(conditionIssue!.severity).toBe('HIGH');
  });
});

describe('runPharmaCheck — patient not found', () => {
  it('throws 404 when patient UHID does not exist', async () => {
    (mockPrisma.patient.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      runPharmaCheck('UHID-NONE-0000-0000', [{ name: 'aspirin', dosage: '75mg' }], 'doc_001')
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});
