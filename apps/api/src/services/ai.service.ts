import prisma from '@/lib/prisma';
import { SummaryType, ConsentScope, Role } from '@prisma/client';
import axios from 'axios';
import logger from '@/lib/logger';

const AI_SERVICE_URL    = process.env.AI_SERVICE_URL    ?? 'http://localhost:8000';
const INTERNAL_SECRET   = process.env.INTERNAL_SERVICE_SECRET ?? '';
const REPORT_TTL_MS     = 7 * 24 * 60 * 60 * 1000;   // 7 days
const SUMMARY_TTL_MS    = 24 * 60 * 60 * 1000;         // 24 hours

function httpError(message: string, statusCode: number): never {
  const err = new Error(message) as Error & { statusCode: number };
  err.statusCode = statusCode;
  throw err;
}

const aiHeaders = () => ({ 'x-internal-secret': INTERNAL_SECRET });

// ─── Helper: call AI service ────────────────────────────────────────────────
async function callAiService<T>(path: string, body: unknown): Promise<T> {
  try {
    const { data } = await axios.post<T>(`${AI_SERVICE_URL}${path}`, body, {
      headers: { ...aiHeaders(), 'Content-Type': 'application/json' },
      timeout: 60_000,
    });
    return data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const detail = (err.response?.data as { detail?: string })?.detail ?? err.message;
      const status = err.response?.status ?? 502;
      httpError(`AI service error: ${detail}`, status);
    }
    throw err;
  }
}

// ─── Decode Report ───────────────────────────────────────────────────────────

export async function decodeReport(userId: string, recordId: string) {
  // 1. Verify patient ownership
  const patient = await prisma.patient.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!patient) httpError('Patient profile not found', 404);

  const record = await prisma.medicalRecord.findUnique({
    where: { id: recordId },
    select: { id: true, patientId: true, fileUrl: true, mimeType: true, extractedText: true },
  });
  if (!record)                         httpError('Record not found', 404);
  if (record!.patientId !== patient!.id) httpError('Access denied', 403);

  // 2. Cache check
  const cached = await prisma.aiReportSummary.findFirst({
    where: {
      recordId,
      summaryType: SummaryType.REPORT_DECODER,
      updatedAt: { gte: new Date(Date.now() - REPORT_TTL_MS) },
    },
    orderBy: { updatedAt: 'desc' },
  });
  if (cached) {
    return { ...JSON.parse(JSON.stringify(cached.structuredData)), cached: true };
  }

  // 3. Ensure we have text — run OCR if needed
  let extractedText = record!.extractedText ?? '';
  if (!extractedText && record!.fileUrl) {
    logger.info(`Running OCR for record ${recordId}`);
    const ocrResult = await callAiService<{ text: string; confidence: number; engine: string }>(
      '/ai/ocr',
      { fileUrl: record!.fileUrl, mimeType: record!.mimeType ?? 'application/octet-stream' },
    );
    extractedText = ocrResult.text;
    await prisma.medicalRecord.update({ where: { id: recordId }, data: { extractedText } });
  }

  if (!extractedText || extractedText.length < 20) {
    httpError('Insufficient text in this record to generate an AI analysis', 422);
  }

  // 4. Call AI service
  const aiResult = await callAiService<{
    recordId: string;
    summaryText: string;
    simplifiedValues: unknown[];
    overallRiskLevel: string;
    actionItems: string[];
    disclaimer: string;
    modelUsed: string;
    tokensUsed: number;
  }>('/ai/report/decode', { recordId, extractedText });

  // 5. Persist
  await prisma.aiReportSummary.create({
    data: {
      recordId,
      patientId:     patient!.id,
      summaryType:   SummaryType.REPORT_DECODER,
      summaryText:   aiResult.summaryText,
      structuredData: aiResult as unknown as Record<string, unknown>,
      riskLevel:     aiResult.overallRiskLevel,
      modelUsed:     aiResult.modelUsed,
      tokensUsed:    aiResult.tokensUsed,
      generatedAt:   new Date(),
    },
  });

  return { ...aiResult, cached: false };
}

// ─── Clinical Summary ────────────────────────────────────────────────────────

export async function getClinicalSummary(doctorUserId: string, patientUhid: string) {
  // 1. Verify doctor + consent
  const doctor = await prisma.doctor.findUnique({
    where: { userId: doctorUserId },
    select: { id: true, isVerified: true },
  });
  if (!doctor)           httpError('Doctor profile not found', 404);
  if (!doctor!.isVerified) httpError('Only verified doctors can access AI summaries', 403);

  const patient = await prisma.patient.findUnique({
    where: { uhid: patientUhid },
    select: { id: true, dateOfBirth: true, gender: true, bloodGroup: true, allergies: true, chronicConditions: true },
  });
  if (!patient) httpError('Patient not found', 404);

  // Consent: CLINICAL_NOTES or ALL scope
  const consent = await prisma.consent.findFirst({
    where: {
      doctorId:  doctor!.id,
      patientId: patient!.id,
      status:    'ACTIVE',
      scope:     { hasSome: [ConsentScope.CLINICAL_NOTES, ConsentScope.ALL] },
      OR: [{ isTemporary: false }, { expiresAt: { gt: new Date() } }],
    },
  });
  if (!consent) httpError('No active consent with clinical notes access for this patient', 403);

  // 2. Cache check
  const cached = await prisma.aiReportSummary.findFirst({
    where: {
      patientId:   patient!.id,
      summaryType: SummaryType.CLINICAL_SUMMARY,
      updatedAt:   { gte: new Date(Date.now() - SUMMARY_TTL_MS) },
    },
    orderBy: { updatedAt: 'desc' },
  });
  if (cached) {
    return { ...JSON.parse(JSON.stringify(cached.structuredData)), cached: true, lastUpdated: cached.updatedAt };
  }

  // 3. Aggregate patient data
  const [clinicalNotes, prescriptions, medicalRecords] = await Promise.all([
    prisma.clinicalNote.findMany({
      where: { patientId: patient!.id },
      select: {
        icd10Code: true, diagnosis: true, chiefComplaint: true,
        vitalSigns: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
    prisma.prescription.findMany({
      where:   { patientId: patient!.id },
      include: { items: { select: { drugName: true, dosage: true, frequency: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.medicalRecord.findMany({
      where:   { patientId: patient!.id },
      select:  { title: true, recordType: true, subType: true, recordDate: true },
      orderBy: { recordDate: 'desc' },
      take: 20,
    }),
  ]);

  // 4. Compute age
  const ageYears = patient!.dateOfBirth
    ? Math.floor((Date.now() - new Date(patient!.dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  // 5. Call AI service
  const aiResult = await callAiService<{
    patientUhid: string;
    summaryForDoctor: string;
    activeConditions: unknown[];
    currentMedications: unknown[];
    vitalTrends: unknown;
    riskScore: { overall: string; cardiovascular: string; renal: string; diabetic: string };
    attentionItems: string[];
    modelUsed: string;
    tokensUsed: number;
  }>('/ai/summary/clinical', {
    patientUhid,
    patientContext: {
      age:               ageYears,
      gender:            patient!.gender,
      bloodGroup:        patient!.bloodGroup,
      allergies:         patient!.allergies,
      chronicConditions: patient!.chronicConditions,
    },
    clinicalNotes,
    prescriptions,
    medicalRecords,
  });

  // 6. Persist
  await prisma.aiReportSummary.create({
    data: {
      patientId:     patient!.id,
      summaryType:   SummaryType.CLINICAL_SUMMARY,
      summaryText:   aiResult.summaryForDoctor,
      structuredData: aiResult as unknown as Record<string, unknown>,
      riskLevel:     aiResult.riskScore.overall,
      modelUsed:     aiResult.modelUsed,
      tokensUsed:    aiResult.tokensUsed,
      generatedAt:   new Date(),
    },
  });

  return { ...aiResult, cached: false, lastUpdated: new Date() };
}

// ─── Get Cached Summary (patient or doctor) ──────────────────────────────────

export async function getCachedSummary(userId: string, role: Role, recordId: string) {
  let patientId: string;

  if (role === Role.PATIENT) {
    const patient = await prisma.patient.findUnique({ where: { userId }, select: { id: true } });
    if (!patient) httpError('Patient profile not found', 404);
    patientId = patient!.id;

    // Verify ownership
    const record = await prisma.medicalRecord.findUnique({ where: { id: recordId }, select: { patientId: true } });
    if (!record || record.patientId !== patientId) httpError('Access denied', 403);
  } else if (role === Role.DOCTOR) {
    const record = await prisma.medicalRecord.findUnique({
      where: { id: recordId },
      select: { patientId: true, patient: { select: { uhid: true } } },
    });
    if (!record) httpError('Record not found', 404);

    const doctor = await prisma.doctor.findUnique({ where: { userId }, select: { id: true } });
    if (!doctor) httpError('Doctor profile not found', 404);

    const consent = await prisma.consent.findFirst({
      where: {
        doctorId:  doctor!.id,
        patientId: record!.patientId,
        status:    'ACTIVE',
        OR: [{ isTemporary: false }, { expiresAt: { gt: new Date() } }],
      },
    });
    if (!consent) httpError('No active consent for this patient', 403);
    patientId = record!.patientId;
  } else {
    httpError('Forbidden', 403);
  }

  const summary = await prisma.aiReportSummary.findFirst({
    where: { recordId, patientId, summaryType: SummaryType.REPORT_DECODER },
    orderBy: { updatedAt: 'desc' },
  });

  if (!summary) httpError('No AI summary found for this record', 404);
  return { ...JSON.parse(JSON.stringify(summary!.structuredData)), cached: true, lastUpdated: summary!.updatedAt };
}

// ─── Cache Invalidation ──────────────────────────────────────────────────────

export async function invalidateClinicalSummaryCache(patientId: string) {
  try {
    await prisma.aiReportSummary.deleteMany({
      where: { patientId, summaryType: SummaryType.CLINICAL_SUMMARY },
    });
    logger.info(`Invalidated clinical summary cache for patient ${patientId}`);
  } catch (err) {
    logger.warn('Failed to invalidate AI summary cache:', err);
  }
}
