const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const staff = await p.hospitalStaff.findFirst({
    where: { isVerified: true },
    include: { user: { select: { email: true } } }
  });
  const patient = await p.patient.findFirst({
    select: { uhid: true, firstName: true, lastName: true, user: { select: { email: true } } }
  });
  console.log('STAFF:', JSON.stringify(staff
    ? { id: staff.id, email: staff.user.email, hospitalId: staff.hospitalId }
    : null, null, 2));
  console.log('PATIENT:', JSON.stringify(patient, null, 2));
}

main().catch(console.error).finally(() => p.$disconnect());
