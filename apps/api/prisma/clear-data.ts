import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearData() {
  console.log('🗑️  Clearing all data (preserving super admin)...\n');

  // ── 1. Leaf tables (no children pointing to them) ────────────────────────
  const r1 = await prisma.qrScanLog.deleteMany({});
  console.log(`✅ qr_scan_logs        — ${r1.count} deleted`);

  const r2 = await prisma.emergencyAccess.deleteMany({});
  console.log(`✅ emergency_accesses  — ${r2.count} deleted`);

  const r3 = await prisma.emergencyContact.deleteMany({});
  console.log(`✅ emergency_contacts  — ${r3.count} deleted`);

  const r4 = await prisma.familyLink.deleteMany({});
  console.log(`✅ family_links        — ${r4.count} deleted`);

  const r5 = await prisma.aiReportSummary.deleteMany({});
  console.log(`✅ ai_report_summaries — ${r5.count} deleted`);

  const r6 = await prisma.pharmaCheckLog.deleteMany({});
  console.log(`✅ pharma_check_logs   — ${r6.count} deleted`);

  const r7 = await prisma.claimDocument.deleteMany({});
  console.log(`✅ claim_documents     — ${r7.count} deleted`);

  const r8 = await prisma.insuranceClaim.deleteMany({});
  console.log(`✅ insurance_claims    — ${r8.count} deleted`);

  const r9 = await prisma.doctorReview.deleteMany({});
  console.log(`✅ doctor_reviews      — ${r9.count} deleted`);

  const r10 = await prisma.prescriptionItem.deleteMany({});
  console.log(`✅ prescription_items  — ${r10.count} deleted`);

  // ── 2. Clinical / appointment-linked tables ───────────────────────────────
  const r11 = await prisma.clinicalNote.deleteMany({});
  console.log(`✅ clinical_notes      — ${r11.count} deleted`);

  const r12 = await prisma.prescription.deleteMany({});
  console.log(`✅ prescriptions       — ${r12.count} deleted`);

  const r13 = await prisma.appointment.deleteMany({});
  console.log(`✅ appointments        — ${r13.count} deleted`);

  // ── 3. Access control tables ──────────────────────────────────────────────
  const r14 = await prisma.consent.deleteMany({});
  console.log(`✅ consents            — ${r14.count} deleted`);

  const r15 = await prisma.qrCode.deleteMany({});
  console.log(`✅ qr_codes            — ${r15.count} deleted`);

  // ── 4. Medical records ────────────────────────────────────────────────────
  const r16 = await prisma.medicalRecord.deleteMany({});
  console.log(`✅ medical_records     — ${r16.count} deleted`);

  // ── 5. Audit & notifications ──────────────────────────────────────────────
  const r17 = await prisma.auditLog.deleteMany({});
  console.log(`✅ audit_logs          — ${r17.count} deleted`);

  const r18 = await prisma.notification.deleteMany({});
  console.log(`✅ notifications       — ${r18.count} deleted`);

  // ── 6. Doctor availability ────────────────────────────────────────────────
  const r19 = await prisma.doctorAvailability.deleteMany({});
  console.log(`✅ doctor_availability — ${r19.count} deleted`);

  // ── 7. Role profiles ──────────────────────────────────────────────────────
  const r20 = await prisma.doctor.deleteMany({});
  console.log(`✅ doctors             — ${r20.count} deleted`);

  const r21 = await prisma.hospitalStaff.deleteMany({});
  console.log(`✅ hospital_staff      — ${r21.count} deleted`);

  const r22 = await prisma.hospitalAdmin.deleteMany({});
  console.log(`✅ hospital_admins     — ${r22.count} deleted`);

  const r23 = await prisma.insuranceProvider.deleteMany({});
  console.log(`✅ insurance_providers — ${r23.count} deleted`);

  const r24 = await prisma.patient.deleteMany({});
  console.log(`✅ patients            — ${r24.count} deleted`);

  // ── 8. Hospitals (after all role profiles) ────────────────────────────────
  const r25 = await prisma.hospital.deleteMany({});
  console.log(`✅ hospitals           — ${r25.count} deleted`);

  // ── 9. Users — keep super admin only ─────────────────────────────────────
  const r26 = await prisma.user.deleteMany({
    where: { email: { not: 'superadmin@uhid.health' } },
  });
  console.log(`✅ users               — ${r26.count} deleted`);

  console.log('\n✅ All done! Super admin preserved: superadmin@uhid.health / Admin@1234!');
}

clearData()
  .catch((e) => { console.error('\n❌ Error:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
