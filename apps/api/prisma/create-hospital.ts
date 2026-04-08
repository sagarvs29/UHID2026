import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import argon2 from 'argon2';
import crypto from 'crypto';
import { sendHospitalAdminCredentialsEmail } from '../src/lib/email';

const prisma = new PrismaClient();

function generateTempPassword(): string {
  // 12-char password that satisfies: uppercase, lowercase, digit, special
  const upper   = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower   = 'abcdefghjkmnpqrstuvwxyz';
  const digits  = '23456789';
  const special = '@$!%*?&';
  const all     = upper + lower + digits + special;
  const rand    = (set: string) => set[crypto.randomInt(set.length)];
  const rest    = Array.from({ length: 8 }, () => rand(all)).join('');
  return rand(upper) + rand(lower) + rand(digits) + rand(special) + rest;
}

async function main() {
  console.log('🏥 Creating hospital...\n');

  const adminEmail = 'sagarvs614@gmail.com';

  // ── Guard: email already used? ────────────────────────────────
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing) {
    console.error(`❌ Email ${adminEmail} is already registered on the platform.`);
    process.exit(1);
  }

  // ── Hospital data ─────────────────────────────────────────────
  const hospitalData = {
    name:               'City General Hospital',
    registrationNumber: 'MH-HOS-2024-001',
    address:            '42, MG Road, Andheri West',
    city:               'Mumbai',
    state:              'Maharashtra',
    pincode:            '400053',
    phone:              '02240001234',
    email:              adminEmail,
    isNABH:             false,
    specialties:        ['General Medicine', 'Cardiology', 'Orthopedics', 'Pediatrics'],
    adminFirstName:     'Sagar',
    adminLastName:      'VS',
    adminEmail,
    adminPhone:         '9876543210',
  };

  const tempPassword = generateTempPassword();
  const passwordHash = await argon2.hash(tempPassword, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });

  // ── Get super admin userId for audit ──────────────────────────
  const superAdmin = await prisma.user.findUnique({
    where: { email: 'superadmin@uhid.health' },
  });

  // ── DB transaction: hospital + admin user + admin profile ─────
  const { hospital, adminUser } = await prisma.$transaction(async (tx) => {
    const hospital = await tx.hospital.create({
      data: {
        name:               hospitalData.name,
        registrationNumber: hospitalData.registrationNumber,
        address:            hospitalData.address,
        city:               hospitalData.city,
        state:              hospitalData.state,
        pincode:            hospitalData.pincode,
        phone:              hospitalData.phone,
        email:              hospitalData.email,
        isNABH:             hospitalData.isNABH,
        specialties:        hospitalData.specialties,
        isVerified:         true,
        verifiedAt:         new Date(),
      },
    });

    const adminUser = await tx.user.create({
      data: {
        email:           hospitalData.adminEmail,
        passwordHash,
        role:            Role.HOSPITAL_ADMIN,
        isEmailVerified: true,
        isActive:        true,
      },
    });

    await tx.hospitalAdmin.create({
      data: {
        userId:     adminUser.id,
        hospitalId: hospital.id,
        firstName:  hospitalData.adminFirstName,
        lastName:   hospitalData.adminLastName,
      },
    });

    return { hospital, adminUser };
  });

  console.log('✅ Hospital created:');
  console.log(`   Name        : ${hospital.name}`);
  console.log(`   Reg No      : ${hospital.registrationNumber}`);
  console.log(`   City        : ${hospital.city}, ${hospital.state}`);
  console.log(`   Hospital ID : ${hospital.id}`);
  console.log(`\n✅ Admin user created:`);
  console.log(`   Name        : ${hospitalData.adminFirstName} ${hospitalData.adminLastName}`);
  console.log(`   Email       : ${adminUser.email}`);
  console.log(`   Temp Pass   : ${tempPassword}`);
  console.log(`   User ID     : ${adminUser.id}`);

  // ── Send credentials email ────────────────────────────────────
  console.log(`\n📧 Sending credentials email to ${adminEmail}...`);
  try {
    await sendHospitalAdminCredentialsEmail(
      adminEmail,
      `${hospitalData.adminFirstName} ${hospitalData.adminLastName}`,
      hospital.name,
      tempPassword,
    );
    console.log('✅ Email delivered successfully!');
  } catch (e) {
    console.error('❌ Email failed:', (e as Error).message);
  }

  console.log('\n🎉 Done!');
  if (superAdmin) {
    console.log(`   Super admin (${superAdmin.email}) can log in to manage this hospital.`);
  }
}

main()
  .catch((e) => { console.error('❌ Script error:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
