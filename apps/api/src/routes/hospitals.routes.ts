/**
 * hospitals.routes.ts
 * Public hospitals endpoint — used by Doctor and Staff registration forms
 * to populate the hospital dropdown.
 * Returns only VERIFIED hospitals (isVerified=true).
 */
import { Router, Request, Response, NextFunction } from 'express';
import prisma from '@/lib/prisma';

const router = Router();

// GET /api/v1/hospitals?search=&city=&state=
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, city, state } = req.query as Record<string, string | undefined>;

    const hospitals = await prisma.hospital.findMany({
      where: {
        isVerified: true,
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { city: { contains: search, mode: 'insensitive' } },
          ],
        }),
        ...(city && { city: { equals: city, mode: 'insensitive' } }),
        ...(state && { state: { equals: state, mode: 'insensitive' } }),
      },
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
        specialties: true,
        isNABH: true,
      },
      orderBy: { name: 'asc' },
      take: 100,
    });

    res.status(200).json({ success: true, data: hospitals });
  } catch (err) {
    next(err);
  }
});

export default router;
