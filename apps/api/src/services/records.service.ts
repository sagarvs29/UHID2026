import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { uploadMedicalRecord, getSignedUrl } from '@/lib/cloudinary';
import logger from '@/lib/logger';
import type { RecordType, RecordSubType } from '@prisma/client';

/** Throw an HTTP-status-aware error (caught by errorHandler middleware) */
function httpError(message: string, statusCode: number): never {
  const err = new Error(message) as Error & { statusCode: number };
  err.statusCode = statusCode;
  throw err;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UploadRecordInput {
  patientUhid: string;
  recordType: RecordType;
  subType?: RecordSubType;
  title: string;
  description?: string;
  recordDate?: string;
  tags?: string[];
  fileBuffer: Buffer;
  mimeType: string;
  fileSize: number;
  uploadedByStaffId: string;
  hospitalId: string;
}

export interface GetRecordsQuery {
  type?: RecordType;
  subType?: RecordSubType;
  hospitalId?: string;
  from?: string;
  to?: string;
  page: number;
  limit: number;
  sort?: string;
}

// ─── Upload Medical Record ─────────────────────────────────────────────────────
export async function uploadRecord(input: UploadRecordInput) {
  const {
    patientUhid, recordType, subType, title, description,
    recordDate, tags, fileBuffer, mimeType, fileSize,
    uploadedByStaffId, hospitalId,
  } = input;

  // 1. Resolve patient by UHID
  const patient = await prisma.patient.findUnique({
    where: { uhid: patientUhid },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!patient) {
    httpError(`No patient found with UHID: ${patientUhid}`, 404);
  }

  // 2. Verify staff belongs to this hospital (security check)
  const staff = await prisma.hospitalStaff.findUnique({
    where: { id: uploadedByStaffId },
    select: { id: true, hospitalId: true, isVerified: true },
  });
  if (!staff) {
    httpError('Staff profile not found', 404);
  }
  if (!staff!.isVerified) {
    httpError('Your account is pending admin approval. You cannot upload records yet.', 403);
  }
  if (staff!.hospitalId !== hospitalId) {
    httpError('You can only upload records for your own hospital', 403);
  }

  // 3. Compute SHA-256 hash of file for integrity / dedup
  const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

  // 4. Upload to Cloudinary (private/authenticated)
  let cloudinaryUrl: string;
  let cloudinaryPublicId: string;
  try {
    const result = await uploadMedicalRecord(fileBuffer, mimeType, patientUhid, recordType);
    cloudinaryUrl = result.url;
    cloudinaryPublicId = result.publicId;
  } catch (err) {
    logger.error('[Records] Cloudinary upload failed:', err);
    httpError('File upload failed. Please try again.', 502);
    throw err; // unreachable, keeps TS happy
  }

  // 5. Save record to DB
  const record = await prisma.medicalRecord.create({
    data: {
      patientId: patient!.id,
      uploadedByStaffId,
      hospitalId,
      recordType,
      subType: subType ?? null,
      title,
      description: description ?? null,
      fileUrl: cloudinaryUrl,
      filePublicId: cloudinaryPublicId,
      fileHash,
      mimeType,
      fileSize,
      recordDate: recordDate ? new Date(recordDate) : null,
      tags: tags ?? [],
    },
    select: {
      id: true,
      recordType: true,
      subType: true,
      title: true,
      mimeType: true,
      fileSize: true,
      recordDate: true,
      tags: true,
      createdAt: true,
      patient: { select: { uhid: true, firstName: true, lastName: true } },
      hospital: { select: { name: true } },
    },
  });

  // 6. Audit log (non-blocking)
  prisma.auditLog.create({
    data: {
      actorId: uploadedByStaffId,
      actorRole: 'HOSPITAL_STAFF',
      action: 'RECORD_UPLOADED',
      severity: 'LOW',
      targetId: record.id,
      targetType: 'MedicalRecord',
      hospitalId,
      metadata: { recordType, patientUhid, mimeType, fileSize },
    },
  }).catch((_e: unknown) => logger.warn('[Records] AuditLog write failed on upload'));

  return record;
}

// ─── Get Patient Records (paginated + filtered) ───────────────────────────────
export async function getPatientRecords(
  patientId: string,
  query: GetRecordsQuery
) {
  const { type, subType, hospitalId, from, to, page, limit, sort } = query;

  // Build where clause
  const where: Record<string, unknown> = {
    patientId,
    isDeleted: false,
    ...(type ? { recordType: type } : {}),
    ...(subType ? { subType } : {}),
    ...(hospitalId ? { hospitalId } : {}),
    ...(from || to
      ? {
          recordDate: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {}),
  };

  // Build orderBy
  let orderBy: Record<string, string> = { createdAt: 'desc' };
  if (sort === 'createdAt_asc') orderBy = { createdAt: 'asc' };
  else if (sort === 'recordDate_desc') orderBy = { recordDate: 'desc' };
  else if (sort === 'recordDate_asc') orderBy = { recordDate: 'asc' };

  const [total, records] = await Promise.all([
    prisma.medicalRecord.count({ where }),
    prisma.medicalRecord.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        recordType: true,
        subType: true,
        title: true,
        mimeType: true,
        fileSize: true,
        recordDate: true,
        tags: true,
        createdAt: true,
        hospital: { select: { id: true, name: true, city: true } },
        uploadedByStaff: { select: { firstName: true, lastName: true, staffType: true } },
        aiSummaries: {
          select: { id: true, riskLevel: true, generatedAt: true },
          take: 1,
          orderBy: { generatedAt: 'desc' },
        },
      },
    }),
  ]);

  return {
    records,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ─── Get Single Record with Signed URL ───────────────────────────────────────
export async function getRecordById(recordId: string, requestorPatientId?: string) {
  const record = await prisma.medicalRecord.findFirst({
    where: { id: recordId, isDeleted: false },
    select: {
      id: true,
      patientId: true,
      recordType: true,
      subType: true,
      title: true,
      description: true,
      fileUrl: true,
      filePublicId: true,
      mimeType: true,
      fileSize: true,
      extractedText: true,
      recordDate: true,
      tags: true,
      createdAt: true,
      hospital: { select: { id: true, name: true, city: true } },
      uploadedByStaff: { select: { firstName: true, lastName: true, staffType: true } },
      patient: { select: { uhid: true, firstName: true, lastName: true } },
      aiSummaries: {
        select: {
          id: true,
          summaryText: true,
          riskLevel: true,
          generatedAt: true,
        },
        take: 1,
        orderBy: { generatedAt: 'desc' },
      },
    },
  });

  if (!record) {
    httpError('Record not found', 404);
  }

  // Patient access check — ensure the caller owns this record
  if (requestorPatientId && record!.patientId !== requestorPatientId) {
    httpError('Access denied', 403);
  }

  // Generate a fresh 5-minute signed URL (never expose raw Cloudinary URL)
  const signedUrl = getSignedUrl(record!.filePublicId, record!.mimeType);

  const { aiSummaries, fileUrl: _raw, ...rest } = record!;
  return {
    ...rest,
    fileUrl: signedUrl, // Fresh signed URL replaces stored URL
    aiSummary: aiSummaries[0] ?? null,
  };
}

// ─── Get Fresh Download URL ───────────────────────────────────────────────────
export async function getDownloadUrl(recordId: string, requestorPatientId?: string) {
  const record = await prisma.medicalRecord.findFirst({
    where: { id: recordId, isDeleted: false },
    select: {
      id: true,
      patientId: true,
      filePublicId: true,
      mimeType: true,
      title: true,
      patient: { select: { uhid: true } },
    },
  });

  if (!record) {
    httpError('Record not found', 404);
  }

  if (requestorPatientId && record!.patientId !== requestorPatientId) {
    httpError('Access denied', 403);
  }

  const downloadUrl = getSignedUrl(record!.filePublicId, record!.mimeType);
  const ext = record!.mimeType === 'application/pdf' ? 'pdf'
    : record!.mimeType.split('/')[1] ?? 'bin';
  const fileName = `${record!.title.replace(/\s+/g, '_')}_${record!.patient.uhid}.${ext}`;

  // Audit log (non-blocking)
  prisma.auditLog.create({
    data: {
      actorId: requestorPatientId ?? record!.patientId,
      actorRole: 'PATIENT',
      action: 'RECORD_DOWNLOADED',
      severity: 'LOW',
      targetId: recordId,
      targetType: 'MedicalRecord',
      metadata: { fileName },
    },
  }).catch((_e: unknown) => logger.warn('[Records] AuditLog write failed on download'));

  return {
    downloadUrl,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    fileName,
  };
}
