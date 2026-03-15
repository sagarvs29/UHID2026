/**
 * auth.middleware.test.ts
 * Unit tests for authenticate() and authorize() middleware.
 * All external dependencies (redis, JWT) are mocked.
 */

import { authenticate, authorize } from '@/middlewares/auth.middleware';
import { signAccessToken } from '@/lib/jwt';
import { redis } from '@/lib/redis';
import { Role } from '@prisma/client';
import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '@/types';

// ─── Mock redis ──────────────────────────────────────────────────────────────
jest.mock('@/lib/redis', () => ({
  redis: { get: jest.fn() },
}));
const mockRedisGet = redis.get as jest.MockedFunction<typeof redis.get>;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function makeReq(token?: string): AuthRequest {
  return {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  } as unknown as AuthRequest;
}

function makeRes() {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
  return res;
}

const next: NextFunction = jest.fn();

function freshToken(role: Role = Role.PATIENT) {
  return signAccessToken({ userId: 'user_001', role, sessionId: 'sess_001' });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('authenticate middleware', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls next() when a valid token is provided', async () => {
    const token = freshToken();
    mockRedisGet.mockResolvedValueOnce(null); // not blacklisted
    const req = makeReq(token);
    const res = makeRes();

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toMatchObject({ userId: 'user_001', role: Role.PATIENT });
  });

  it('returns 401 when no Authorization header is present', async () => {
    const req = makeReq();
    const res = makeRes();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'No token provided' }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token is blacklisted (logged out)', async () => {
    const token = freshToken();
    mockRedisGet.mockResolvedValueOnce('1'); // blacklisted
    const req = makeReq(token);
    const res = makeRes();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Token revoked' }),
    );
  });

  it('returns 401 for an expired/invalid JWT', async () => {
    const req = makeReq('totally.invalid.token');
    mockRedisGet.mockResolvedValueOnce(null);
    const res = makeRes();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('authorize middleware', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls next() when the user has a permitted role', () => {
    const req = {
      user: { userId: 'u1', role: Role.DOCTOR, sessionId: 's1' },
    } as AuthRequest;
    const res = makeRes();
    const guard = authorize(Role.DOCTOR, Role.HOSPITAL_ADMIN);

    guard(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('returns 403 when the user role is not permitted', () => {
    const req = {
      user: { userId: 'u1', role: Role.PATIENT, sessionId: 's1' },
    } as AuthRequest;
    const res = makeRes();
    const guard = authorize(Role.DOCTOR);

    guard(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when req.user is not set', () => {
    const req = {} as AuthRequest;
    const res = makeRes();
    const guard = authorize(Role.DOCTOR);

    guard(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });
});
