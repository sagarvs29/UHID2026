import 'dotenv/config';
import { PrismaClient, Role, Gender, BloodGroup } from '@prisma/client';
import argon2 from 'argon2';
import { generateUHID } from '../src/lib/crypto';

const prisma = new PrismaClient();

const hashPassword = (pw: string) =>
  argon2.hash(pw, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1 });

async function main() {
  console.log('Seeding UHID database...');

  const superAdminUser = await prisma.user.upsert({
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
  console.log('Super admin:', superAdminUser.email);

  const hospital = await prisma.hospital.upsert({
    where: { registrationNumber: 'DEMO-HOSP-001' },
    update: {},
    create: {
      name: 'UHID Demo Medical Center',
      registrationNumber: 'DEMO-HOSP-001',
      address: '123 Health Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      phone: '9000000001',
      email: 'hospital@uhid.health',
      isVerified: true,
      specialties: ['General Medicine', 'Cardiology', 'Orthopedics'],
    },
  });
  console.log('Demo hospital:', hospital.name);

  const doctorUser = await prisma.user.upsert({
    where: { email: 'doctor@uhid.health' },
    update: {},
    create: {
      email: 'doctor@uhid.health',
      passwordHash: await hashPassword('Doctor@1234!'),
      role: Role.DOCTOR,
      isEmailVerified: true,
      doctor: {
        create: {
          firstName: 'Priya',
          lastName: 'Sharma',
          hospitalId: hospital.id,
          specialty: 'General Medicine',
          licenseNumber: 'MCI-2024-001',
          qualifications: ['MBBS', 'MD'],
          experienceYears: 8,
          consultationFee: 500,
          isVerified: true,
        },
      },
    },
  });
  console.log('Demo doctor:', doctorUser.email);

  const uhid = generateUHID();
  const patientUser = await prisma.user.upsert({
    where: { email: 'patient@uhid.health' },
    update: {},
    create: {
      email: 'patient@uhid.health',
      passwordHash: await hashPassword('Patient@1234!'),
      role: Role.PATIENT,
      isEmailVerified: true,
      patient: {
        create: {
          uhid,
          firstName: 'Rahul',
          lastName: 'Verma',
          dateOfBirth: new Date('1990-05-15'),
          gender: Gender.MALE,
          bloodGroup: BloodGroup.O_POSITIVE,
          phone: '9000000003',
          address: '456 Patient Lane',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400002',
        },
      },
    },
  });
  console.log('Demo patient:', patientUser.email, '| UHID:', uhid);

  console.log('Seeding complete!');
  console.log('Super Admin : superadmin@uhid.health / Admin@1234!');
  console.log('Doctor      : doctor@uhid.health     / Doctor@1234!');
  console.log('Patient     : patient@uhid.health    / Patient@1234!');
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
