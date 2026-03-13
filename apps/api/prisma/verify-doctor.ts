/**
 * One-time script: verify email + approve doctor account for testing
 * Usage: npx ts-node -r tsconfig-paths/register prisma/verify-doctor.ts
 */
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  const DOCTOR_USER_ID = 'cmmojqla30007138o513ewph0';

  // 1. Verify email + activate user
  const user = await prisma.user.update({
    where: { id: DOCTOR_USER_ID },
    data: { isEmailVerified: true, isActive: true },
    select: { id: true, email: true, role: true, isEmailVerified: true },
  });
  console.log('✅ User updated:', user);

  // 2. Set doctor isVerified = true
  const doctor = await prisma.doctor.update({
    where: { userId: DOCTOR_USER_ID },
    data: { isVerified: true },
    select: { id: true, firstName: true, lastName: true, isVerified: true },
  });
  console.log('✅ Doctor verified:', doctor);
  console.log('\n🩺 Doctor ID (for consent checks):', doctor.id);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
