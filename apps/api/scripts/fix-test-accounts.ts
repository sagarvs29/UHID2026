/**
 * Fix test account emails to real Gmail addresses
 * Run: npx ts-node -r tsconfig-paths/register scripts/fix-test-accounts.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. Update patient email from fake domain → real Gmail
  const patientUpdate = await prisma.user.updateMany({
    where: { email: 'patient@uhid.health' },
    data: {
      email: 'sagarsada04s@gmail.com',
      isEmailVerified: true,
      isActive: true,
    },
  });
  console.log(`✅ Patient email updated: ${patientUpdate.count} row(s)`);

  // 2. Ensure doctor (sagarsada29@gmail.com) is verified
  const doctorUser = await prisma.user.findUnique({
    where: { email: 'sagarsada29@gmail.com' },
    include: { doctor: true },
  });

  if (doctorUser) {
    // Verify the user account
    await prisma.user.update({
      where: { email: 'sagarsada29@gmail.com' },
      data: { isEmailVerified: true, isActive: true },
    });

    // Verify the doctor profile
    if (doctorUser.doctor) {
      await prisma.doctor.update({
        where: { id: doctorUser.doctor.id },
        data: { isVerified: true },
      });
      console.log(`✅ Doctor verified: ${doctorUser.doctor.id}`);
    } else {
      console.log('⚠️  Doctor profile not found for sagarsada29@gmail.com');
    }
  } else {
    console.log('⚠️  Doctor user not found — please register first');
  }

  // 3. Print summary
  const patient = await prisma.user.findUnique({
    where: { email: 'sagarsada04s@gmail.com' },
    include: { patient: { select: { uhid: true, firstName: true } } },
  });
  const doctor = await prisma.user.findUnique({
    where: { email: 'sagarsada29@gmail.com' },
    include: { doctor: { select: { id: true, isVerified: true, firstName: true } } },
  });

  console.log('\n── Account Summary ──────────────────────────────');
  console.log(`Patient : ${patient?.email} | UHID: ${patient?.patient?.uhid} | verified: ${patient?.isEmailVerified}`);
  console.log(`Doctor  : ${doctor?.email} | id: ${doctor?.doctor?.id} | verified: ${doctor?.isEmailVerified} | isVerified: ${doctor?.doctor?.isVerified}`);
  console.log('──────────────────────────────────────────────────');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
