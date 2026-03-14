import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

const hashPassword = (pw: string) =>
  argon2.hash(pw, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1 });

async function main() {
  console.log('Seeding UHID database...');

  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@uhid.health' },
    update: {},
    create: {
      email: 'superadmin@uhid.health',
      passwordHash: await hashPassword('Admin@1234!'),
      role: Role.SUPER_ADMIN,
      isEmailVerified: true,
      superAdmin: { create: { firstName: 'Super', lastName: 'Admin' } },
    },
  });

  console.log('✅ Super Admin seeded:', superAdmin.email);
  console.log('   Email    : superadmin@uhid.health');
  console.log('   Password : Admin@1234!');
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
