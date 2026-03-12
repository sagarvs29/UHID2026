const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Verify the staff member
  const staffUser = await p.user.findUnique({
    where: { email: 'teststaff2@gmail.com' },
    select: { id: true }
  });
  if (!staffUser) { console.log('User not found'); return; }

  await p.user.update({
    where: { id: staffUser.id },
    data: { isEmailVerified: true }
  });

  const staff = await p.hospitalStaff.updateMany({
    where: { userId: staffUser.id },
    data: { isVerified: true }
  });

  console.log('Staff verified. Updated:', staff.count, 'record(s)');

  // Get patient credentials
  const patient = await p.patient.findFirst({
    select: { uhid: true, firstName: true, user: { select: { email: true } } }
  });
  console.log('Test patient UHID:', patient?.uhid, '| Email:', patient?.user.email);
}

main().catch(console.error).finally(() => p.$disconnect());
