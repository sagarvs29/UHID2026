import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
try {
  const deleted = await p.user.delete({ where: { email: 'testpatient@example.com' } });
  console.log('Deleted user:', deleted.id);
} catch (e) {
  console.log('Not found or already deleted:', e.message);
}
await p.$disconnect();
