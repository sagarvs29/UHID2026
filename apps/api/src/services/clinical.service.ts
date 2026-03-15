import prisma from '@/lib/prisma';
import {
  InteractionSeverity,
  PharmaCheckType,
  Role,
  NoteVisibility,
  ConsentScope,
  Prisma,
} from '@prisma/client';
import {
  CreateClinicalNoteInput,
  CreatePrescriptionInput,
  PharmaCheckInput,
} from '@/validators/clinical.validator';
import {
  DRUG_INTERACTIONS,
  DRUG_CLASS_MAP,
  DRUG_CONDITION_CONTRAINDICATIONS,
  findInteraction,
} from '@/data/drug-interactions';

// ─── Local error helper ───────────────────────────────────────────────────────
function httpError(message: string, statusCode: number): never {
  const err = new Error(message) as Error & { statusCode: number };
  err.statusCode = statusCode;
  throw err;
}

// ─── Pharma-check issue shape ─────────────────────────────────────────────────
export interface PharmaIssue {
  type: PharmaCheckType;
  severity: InteractionSeverity;
  drugs: string[];
  mechanism: string;
  clinicalEffect: string;
  alternatives?: Record<string, string[]>;
  requiresOverride: boolean;
  interactionKey: string; // stable key for override reference
}

// ─── CONSENT GUARD ─────────────────────────────────────────────────────────────
/** Returns the active consent record or throws 403. Optionally checks for a specific scope. */
async function requireActiveConsent(
  doctorId: string,
  patientId: string,
  scope?: ConsentScope
) {
  const where: Prisma.ConsentWhereInput = {
    doctorId,
    patientId,
    status: 'ACTIVE',
    OR: [{ isTemporary: false }, { expiresAt: { gt: new Date() } }],
  };

  if (scope) {
    where.scope = { hasSome: [scope, 'ALL'] };
  }

  const consent = await prisma.consent.findFirst({ where });
  if (!consent) {
    const scopeMsg = scope ? ` with ${scope} scope` : '';
    httpError(`No active consent${scopeMsg} found for this patient`, 403);
  }
  return consent!;
}

// ─── GET PATIENT PROFILE ──────────────────────────────────────────────────────
export async function getPatientProfile(uhid: string, doctorUserId: string) {
  const doctor = await prisma.doctor.findUnique({
    where: { userId: doctorUserId },
    select: { id: true, isVerified: true },
  });
  if (!doctor) httpError('Doctor profile not found', 404);
  if (!doctor!.isVerified) httpError('Only verified doctors can access patient profiles', 403);

  const patient = await prisma.patient.findUnique({
    where: { uhid },
    select: {
      id: true,
      uhid: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      gender: true,
      bloodGroup: true,
      allergies: true,
      emergencyContacts: true,
      createdAt: true,
    },
  });
  if (!patient) httpError('Patient not found', 404);

  // Consent check — any scope is acceptable for profile view
  await requireActiveConsent(doctor!.id, patient!.id);

  // Active consents granted to this doctor
  const consents = await prisma.consent.findMany({
    where: {
      doctorId: doctor!.id,
      patientId: patient!.id,
      status: 'ACTIVE',
    },
    select: { scope: true, expiresAt: true },
  });

  const allScopes = new Set<string>();
  consents.forEach((c) => c.scope.forEach((s) => allScopes.add(s)));

  return {
    ...patient,
    activeScopes: Array.from(allScopes),
  };
}

// ─── CREATE CLINICAL NOTE ─────────────────────────────────────────────────────
export async function createClinicalNote(
  doctorUserId: string,
  data: CreateClinicalNoteInput
) {
  const doctor = await prisma.doctor.findUnique({
    where: { userId: doctorUserId },
    select: { id: true, hospitalId: true, isVerified: true },
  });
  if (!doctor) httpError('Doctor profile not found', 404);
  if (!doctor!.isVerified) httpError('Only verified doctors can create clinical notes', 403);

  const patient = await prisma.patient.findUnique({
    where: { uhid: data.patientUhid },
    select: { id: true },
  });
  if (!patient) httpError('Patient not found', 404);

  await requireActiveConsent(doctor!.id, patient!.id, 'CLINICAL_NOTES');

  const note = await prisma.clinicalNote.create({
    data: {
      patientId:           patient!.id,
      doctorId:            doctor!.id,
      chiefComplaint:      data.chiefComplaint,
      symptoms:            data.symptoms ?? [],
      icd10Code:           data.icd10Code,
      icd10Description:    data.icd10Description,
      examinationFindings: data.examinationFindings,
      vitalSigns:          data.vitalSigns !== undefined ? (data.vitalSigns as Prisma.InputJsonValue) : Prisma.JsonNull,
      diagnosis:           data.diagnosis,
      treatmentPlan:       data.treatmentPlan,
      visibility:          data.visibility as NoteVisibility,
    },
    include: { doctor: { select: { firstName: true, lastName: true, specialty: true } } },
  });

  // Non-blocking audit log
  prisma.auditLog.create({
    data: {
      action: 'CLINICAL_NOTE_CREATED',
      severity: 'LOW',
      actorId: doctorUserId,
      actorRole: 'DOCTOR',
      targetId: note.id,
      targetType: 'ClinicalNote',
      metadata: { patientId: patient!.id, icd10Code: data.icd10Code },
    },
  }).catch(() => {});

  return note;
}

// ─── GET CLINICAL NOTES ───────────────────────────────────────────────────────
export async function getClinicalNotes(
  patientUhid: string,
  requesterUserId: string,
  requesterRole: Role
) {
  const patient = await prisma.patient.findUnique({
    where: { uhid: patientUhid },
    select: { id: true, userId: true },
  });
  if (!patient) httpError('Patient not found', 404);

  if (requesterRole === 'DOCTOR') {
    const doctor = await prisma.doctor.findUnique({
      where: { userId: requesterUserId },
      select: { id: true },
    });
    if (!doctor) httpError('Doctor profile not found', 404);

    await requireActiveConsent(doctor!.id, patient!.id, 'CLINICAL_NOTES');

    return prisma.clinicalNote.findMany({
      where: { patientId: patient!.id },
      include: { doctor: { select: { firstName: true, lastName: true, specialty: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // PATIENT — only PATIENT_VISIBLE notes
  if (patient!.userId !== requesterUserId) {
    httpError('Access denied', 403);
  }

  return prisma.clinicalNote.findMany({
    where: { patientId: patient!.id, visibility: 'PATIENT_VISIBLE' },
    include: { doctor: { select: { firstName: true, lastName: true, specialty: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

// ─── GET SINGLE CLINICAL NOTE ──────────────────────────────────────────────────
export async function getSingleClinicalNote(
  noteId: string,
  requesterUserId: string,
  requesterRole: Role
) {
  const note = await prisma.clinicalNote.findUnique({
    where: { id: noteId },
    include: {
      doctor:  { select: { firstName: true, lastName: true, specialty: true } },
      patient: { select: { uhid: true, userId: true } },
    },
  });
  if (!note) httpError('Clinical note not found', 404);

  if (requesterRole === 'DOCTOR') {
    const doctor = await prisma.doctor.findUnique({
      where: { userId: requesterUserId },
      select: { id: true },
    });
    if (!doctor) httpError('Doctor profile not found', 404);
    await requireActiveConsent(doctor!.id, note!.patientId, 'CLINICAL_NOTES');
    return note;
  }

  // PATIENT
  if (note!.patient.userId !== requesterUserId) httpError('Access denied', 403);
  if (note!.visibility !== 'PATIENT_VISIBLE') httpError('This note is not accessible to patients', 403);
  return note;
}

// ─── PHARMA-CHECK ENGINE ───────────────────────────────────────────────────────
export async function runPharmaCheck(
  patientUhid: string,
  drugs: Array<{ name: string; dosage: string }>,
  doctorId: string
): Promise<{ passed: boolean; issues: PharmaIssue[] }> {
  const patient = await prisma.patient.findUnique({
    where: { uhid: patientUhid },
    select: { id: true, allergies: true },
  });
  if (!patient) httpError('Patient not found', 404);

  // Active prescriptions from the last 90 days
  const activePrescriptions = await prisma.prescription.findMany({
    where: {
      patientId: patient!.id,
      createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
    },
    include: { items: { select: { drugName: true } } },
  });
  const activeDrugNames = activePrescriptions.flatMap((p) =>
    p.items.map((i) => i.drugName.toLowerCase().trim())
  );

  // Recent ICD-10 codes for condition checks
  const recentNotes = await prisma.clinicalNote.findMany({
    where: { patientId: patient!.id },
    select: { icd10Code: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  const icd10Codes = [...new Set(recentNotes.map((n) => n.icd10Code))];

  const issues: PharmaIssue[] = [];
  const drugNames = drugs.map((d) => d.name);

  // 1. Drug-Drug Interactions (all pairs)
  for (let i = 0; i < drugs.length; i++) {
    for (let j = i + 1; j < drugs.length; j++) {
      const nameA = drugs[i].name.toLowerCase().trim();
      const nameB = drugs[j].name.toLowerCase().trim();
      const classA = DRUG_CLASS_MAP[nameA] ?? nameA;
      const classB = DRUG_CLASS_MAP[nameB] ?? nameB;

      // Try name→name, name→class, class→name, class→class
      const interaction =
        findInteraction(nameA, nameB) ??
        findInteraction(classA, nameB) ??
        findInteraction(nameA, classB) ??
        findInteraction(classA, classB);

      if (interaction) {
        issues.push({
          type:            'DRUG_INTERACTION',
          severity:        interaction.severity,
          drugs:           [drugs[i].name, drugs[j].name],
          mechanism:       interaction.mechanism,
          clinicalEffect:  interaction.clinicalEffect,
          alternatives:    interaction.alternatives,
          requiresOverride: interaction.severity === 'HIGH' || interaction.severity === 'CRITICAL',
          interactionKey:  `DDI:${nameA}-${nameB}`,
        });
      }
    }
  }

  // 2. Drug-Allergy Checks
  const allergies = (patient!.allergies ?? []).map((a) => a.toLowerCase().trim());
  for (const drug of drugs) {
    const drugLower = drug.name.toLowerCase().trim();
    const drugClass = DRUG_CLASS_MAP[drugLower];

    // Direct name match
    if (allergies.some((a) => a.includes(drugLower) || drugLower.includes(a))) {
      issues.push({
        type:            'DRUG_ALLERGY',
        severity:        'CRITICAL',
        drugs:           [drug.name],
        mechanism:       'Patient has a recorded allergy to this drug',
        clinicalEffect:  'Risk of anaphylaxis or severe allergic reaction',
        requiresOverride: true,
        interactionKey:  `ALLERGY:${drugLower}`,
      });
      continue;
    }

    // Drug-class cross-allergy
    if (drugClass && allergies.some((a) => a.includes(drugClass) || drugClass.includes(a))) {
      issues.push({
        type:            'DRUG_ALLERGY',
        severity:        'HIGH',
        drugs:           [drug.name],
        mechanism:       `Patient is allergic to ${drugClass} class drugs`,
        clinicalEffect:  'Potential cross-reactive allergic reaction',
        requiresOverride: true,
        interactionKey:  `CLASS_ALLERGY:${drugClass}:${drugLower}`,
      });
    }
  }

  // 3. Drug-Condition Contraindications
  for (const code of icd10Codes) {
    const prefix = code.split('.')[0]; // e.g. "J18" from "J18.9"
    const contraindications = DRUG_CONDITION_CONTRAINDICATIONS[prefix];
    if (!contraindications) continue;

    for (const drug of drugs) {
      const drugLower = drug.name.toLowerCase().trim();
      const drugClass = DRUG_CLASS_MAP[drugLower];

      for (const contra of contraindications) {
        const contraLower = contra.drug.toLowerCase();
        if (
          drugLower.includes(contraLower) ||
          contraLower.includes(drugLower) ||
          (drugClass && drugClass === contraLower)
        ) {
          issues.push({
            type:            'DRUG_CONDITION',
            severity:        contra.severity,
            drugs:           [drug.name],
            mechanism:       contra.reason,
            clinicalEffect:  `Contraindication: ${code}`,
            requiresOverride: contra.severity === 'HIGH' || contra.severity === 'CRITICAL',
            interactionKey:  `CONDITION:${code}:${drugLower}`,
          });
        }
      }
    }
  }

  // 4. Duplicate Drug Check
  for (const drug of drugs) {
    const drugLower = drug.name.toLowerCase().trim();
    const duplicate = activeDrugNames.find(
      (active) => active.includes(drugLower) || drugLower.includes(active)
    );
    if (duplicate) {
      issues.push({
        type:            'DUPLICATE_DRUG',
        severity:        'MODERATE',
        drugs:           [drug.name],
        mechanism:       `${drug.name} is already in an active prescription from the last 90 days`,
        clinicalEffect:  'Risk of supratherapeutic dosing or drug accumulation',
        requiresOverride: false,
        interactionKey:  `DUPLICATE:${drugLower}`,
      });
    }
  }

  const passed = issues.length === 0;
  return { passed, issues };
}

// ─── CREATE PRESCRIPTION ──────────────────────────────────────────────────────
export async function createPrescription(
  doctorUserId: string,
  data: CreatePrescriptionInput
) {
  const doctor = await prisma.doctor.findUnique({
    where: { userId: doctorUserId },
    select: { id: true, hospitalId: true, isVerified: true },
  });
  if (!doctor) httpError('Doctor profile not found', 404);
  if (!doctor!.isVerified) httpError('Only verified doctors can create prescriptions', 403);

  const patient = await prisma.patient.findUnique({
    where: { uhid: data.patientUhid },
    select: { id: true },
  });
  if (!patient) httpError('Patient not found', 404);

  await requireActiveConsent(doctor!.id, patient!.id, 'PRESCRIPTION');

  // Run pharma-check
  const pharmaResult = await runPharmaCheck(
    data.patientUhid,
    data.items.map((i) => ({ name: i.drugName, dosage: i.dosage })),
    doctor!.id
  );

  // Validate overrides for HIGH/CRITICAL issues
  const hardBlockIssues = pharmaResult.issues.filter((i) => i.requiresOverride);
  if (hardBlockIssues.length > 0) {
    const providedOverrides = new Map((data.overrides ?? []).map((o) => [o.interactionKey, o.reason]));
    const unresolved = hardBlockIssues.filter((i) => !providedOverrides.has(i.interactionKey));
    if (unresolved.length > 0) {
      const err = new Error('Prescription blocked by pharma-check. Override required.') as Error & {
        statusCode: number;
        pharmaIssues: PharmaIssue[];
      };
      err.statusCode = 422;
      err.pharmaIssues = unresolved;
      throw err;
    }
  }

  // Build override map for logging
  const overrideMap = new Map((data.overrides ?? []).map((o) => [o.interactionKey, o.reason]));

  const prescription = await prisma.prescription.create({
    data: {
      patientId:   patient!.id,
      doctorId:    doctor!.id,
      hospitalId:  doctor!.hospitalId!,
      diagnosis:   data.diagnosis,
      notes:       data.notes,
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
      validUntil:  data.validUntil ? new Date(data.validUntil) : null,
      items: {
        create: data.items.map((item) => ({
          drugName:     item.drugName,
          dosage:       item.dosage,
          form:         item.form,
          frequency:    item.frequency,
          duration:     item.duration,
          route:        item.route,
          instructions: item.instructions,
          quantity:     item.quantity,
        })),
      },
    },
    include: { items: true },
  });

  // Log all pharma-check issues (including overridden ones)
  const logPromises = pharmaResult.issues.map((issue) => {
    const overrideReason = overrideMap.get(issue.interactionKey);
    return prisma.pharmaCheckLog.create({
      data: {
        prescriptionId: prescription.id,
        doctorId:       doctor!.id,
        patientId:      patient!.id,
        checkType:      issue.type,
        severity:       issue.severity,
        drugs:          issue.drugs,
        mechanism:      issue.mechanism,
        overridden:     !!overrideReason,
        overrideReason: overrideReason ?? null,
      },
    });
  });
  await Promise.allSettled(logPromises);

  // Audit log for CRITICAL overrides
  const criticalOverrides = pharmaResult.issues.filter(
    (i) => i.severity === 'CRITICAL' && overrideMap.has(i.interactionKey)
  );
  if (criticalOverrides.length > 0) {
    prisma.auditLog.create({
      data: {
        action:    'PHARMA_CHECK_OVERRIDE',
        severity:  'CRITICAL',
        actorId:   doctorUserId,
        actorRole: 'DOCTOR',
        targetId:  prescription.id,
        targetType: 'Prescription',
        metadata: {
          patientId: patient!.id,
          criticalOverrides: criticalOverrides.map((i) => ({
            interactionKey: i.interactionKey,
            drugs: i.drugs,
            reason: overrideMap.get(i.interactionKey),
          })),
        },
      },
    }).catch(() => {});
  }

  return { prescription, pharmaCheck: pharmaResult };
}

// ─── GET PRESCRIPTIONS ────────────────────────────────────────────────────────
export async function getPrescriptions(
  patientUhid: string,
  requesterUserId: string,
  requesterRole: Role
) {
  const patient = await prisma.patient.findUnique({
    where: { uhid: patientUhid },
    select: { id: true, userId: true },
  });
  if (!patient) httpError('Patient not found', 404);

  if (requesterRole === 'DOCTOR') {
    const doctor = await prisma.doctor.findUnique({
      where: { userId: requesterUserId },
      select: { id: true },
    });
    if (!doctor) httpError('Doctor profile not found', 404);
    await requireActiveConsent(doctor!.id, patient!.id, 'PRESCRIPTION');
  } else {
    if (patient!.userId !== requesterUserId) httpError('Access denied', 403);
  }

  return prisma.prescription.findMany({
    where: { patientId: patient!.id },
    include: {
      items:  true,
      doctor: { select: { firstName: true, lastName: true, specialty: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

// ─── GET SINGLE PRESCRIPTION ──────────────────────────────────────────────────
export async function getSinglePrescription(
  prescriptionId: string,
  requesterUserId: string,
  requesterRole: Role
) {
  const prescription = await prisma.prescription.findUnique({
    where: { id: prescriptionId },
    include: {
      items:           true,
      doctor:          { select: { firstName: true, lastName: true, specialty: true } },
      patient:         { select: { uhid: true, userId: true, firstName: true, lastName: true } },
      pharmaCheckLogs: true,
    },
  });
  if (!prescription) httpError('Prescription not found', 404);

  if (requesterRole === 'DOCTOR') {
    const doctor = await prisma.doctor.findUnique({
      where: { userId: requesterUserId },
      select: { id: true },
    });
    if (!doctor) httpError('Doctor profile not found', 404);
    await requireActiveConsent(doctor!.id, prescription!.patientId, 'PRESCRIPTION');
    return prescription;
  }

  if (prescription!.patient.userId !== requesterUserId) httpError('Access denied', 403);
  return prescription;
}
