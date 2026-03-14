/**
 * Regression tests — Consent system
 *
 * Tests critical security invariants and edge cases that must never break:
 *  1.  Doctor cannot access without consent (403 guard)
 *  2.  Patient cannot approve someone else's consent (403 ownership)
 *  3.  Cannot create duplicate PENDING request (409)
 *  4.  OTP invalid after 3 failed attempts (lockout)
 *  5.  OTP expiry — expired OTP returns error
 *  6.  Permanent consent shows "Permanent" not a date
 *  7.  Empty UHID guard — check query does not fire
 *  8.  Revoke only works on ACTIVE consents
 *  9.  Scope labels render correctly for all scope values
 *  10. consentKeys generate unique keys (no collisions)
 */
import { renderHook, waitFor, act } from '@testing-library/react';
import { render, screen, waitFor as waitForDOM } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import {
  useConsentCheck,
  useApproveConsent,
  useRequestConsent,
  useRevokeConsent,
  useSendConsentOtp,
  consentKeys,
  getConsentErrorMessage,
} from '@/hooks/useConsent';
import { CONSENT_SCOPE_LABELS, CONSENT_SCOPES } from '@/types/consent';
import { MOCK_UHID, MOCK_CONSENT_ID } from '../mocks/handlers';
import {
  createWrapper,
  setMockUser,
  clearMockUser,
  PATIENT_USER,
  DOCTOR_USER,
} from '../utils';

beforeEach(() => clearMockUser());
afterEach(() => clearMockUser());

// ─── 1. Doctor access without consent returns no-access ──────────────────────
describe('Regression: no access without consent', () => {
  it('check returns hasAccess:false for a patient the doctor has no consent for', async () => {
    setMockUser(DOCTOR_USER);
    server.use(
      http.get('/api/v1/consents/check/:uhid', () =>
        HttpResponse.json({ success: true, data: { hasAccess: false } })
      )
    );
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useConsentCheck('UH-NO-ACCESS'), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data!.hasAccess).toBe(false);
    expect(result.current.data!.consentId).toBeUndefined();
  });
});

// ─── 2. Patient cannot approve another patient's consent ─────────────────────
describe('Regression: ownership enforcement', () => {
  it('approve returns 403 when consent belongs to another patient', async () => {
    setMockUser(PATIENT_USER);
    server.use(
      http.post('/api/v1/consents/approve', () =>
        HttpResponse.json(
          { success: false, error: 'This consent does not belong to you' },
          { status: 403 }
        )
      )
    );
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useApproveConsent(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ consentId: 'con_other_patient', otp: '123456' });
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(getConsentErrorMessage(result.current.error)).toBe('This consent does not belong to you');
  });
});

// ─── 3. Duplicate pending request returns 409 ────────────────────────────────
describe('Regression: duplicate consent request', () => {
  it('requestConsent returns 409 when PENDING already exists', async () => {
    setMockUser(DOCTOR_USER);
    server.use(
      http.post('/api/v1/consents/request', () =>
        HttpResponse.json(
          { success: false, error: 'A pending consent request already exists for this patient.' },
          { status: 409 }
        )
      )
    );
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRequestConsent(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({
        patientUhid: MOCK_UHID,
        scope: ['LAB_REPORT'],
        purpose: 'Second duplicate request attempt',
        isTemporary: true,
        durationHours: 24,
      });
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(getConsentErrorMessage(result.current.error)).toMatch(/already exists/i);
  });
});

// ─── 4. OTP lockout after 3 failed attempts ───────────────────────────────────
describe('Regression: OTP lockout', () => {
  it('returns 429 after exceeding max OTP attempts', async () => {
    setMockUser(PATIENT_USER);
    server.use(
      http.post('/api/v1/consents/approve', () =>
        HttpResponse.json(
          { success: false, error: 'Too many wrong attempts. Locked for 5 minutes.' },
          { status: 429 }
        )
      )
    );
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useApproveConsent(), { wrapper: Wrapper });

    await act(async () => { result.current.mutate({ consentId: MOCK_CONSENT_ID, otp: '999999' }); });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(getConsentErrorMessage(result.current.error)).toMatch(/locked/i);
  });
});

// ─── 5. Expired OTP returns 400 ──────────────────────────────────────────────
describe('Regression: expired OTP', () => {
  it('approve returns 400 when OTP has expired', async () => {
    setMockUser(PATIENT_USER);
    server.use(
      http.post('/api/v1/consents/approve', () =>
        HttpResponse.json(
          { success: false, error: 'OTP has expired. Please request a new OTP.' },
          { status: 400 }
        )
      )
    );
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useApproveConsent(), { wrapper: Wrapper });

    await act(async () => { result.current.mutate({ consentId: MOCK_CONSENT_ID, otp: '123456' }); });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(getConsentErrorMessage(result.current.error)).toMatch(/expired/i);
  });
});

// ─── 6. Permanent consent has null expiresAt ─────────────────────────────────
describe('Regression: permanent consent', () => {
  it('check result with null expiresAt has expiresIn="Permanent"', async () => {
    setMockUser(DOCTOR_USER);
    server.use(
      http.get('/api/v1/consents/check/:uhid', () =>
        HttpResponse.json({
          success: true,
          data: {
            hasAccess:  true,
            consentId:  'con_permanent',
            scope:      ['ALL'],
            expiresAt:  null,
            expiresIn:  'Permanent',
          },
        })
      )
    );
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useConsentCheck(MOCK_UHID), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data!.expiresAt).toBeNull();
    expect(result.current.data!.expiresIn).toBe('Permanent');
  });
});

// ─── 7. Empty UHID guard ─────────────────────────────────────────────────────
describe('Regression: empty UHID guard', () => {
  it('useConsentCheck does not fire when uhid is empty string', () => {
    setMockUser(DOCTOR_USER);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useConsentCheck(''), { wrapper: Wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.status).toBe('pending');
  });
});

// ─── 8. Revoke only works on ACTIVE consent ───────────────────────────────────
describe('Regression: revoke non-active consent', () => {
  it('revokeConsent returns 400 when consent is not ACTIVE', async () => {
    setMockUser(PATIENT_USER);
    server.use(
      http.delete('/api/v1/consents/:id', () =>
        HttpResponse.json(
          { success: false, error: 'Only ACTIVE consents can be revoked. Current: EXPIRED' },
          { status: 400 }
        )
      )
    );
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRevokeConsent(), { wrapper: Wrapper });

    await act(async () => { result.current.mutate('con_expired'); });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(getConsentErrorMessage(result.current.error)).toMatch(/ACTIVE/);
  });
});

// ─── 9. All scope labels are defined ─────────────────────────────────────────
describe('Regression: scope labels complete', () => {
  it('every CONSENT_SCOPE has a label in CONSENT_SCOPE_LABELS', () => {
    CONSENT_SCOPES.forEach((scope) => {
      expect(CONSENT_SCOPE_LABELS[scope]).toBeDefined();
      expect(typeof CONSENT_SCOPE_LABELS[scope]).toBe('string');
      expect(CONSENT_SCOPE_LABELS[scope].length).toBeGreaterThan(0);
    });
  });
});

// ─── 10. consentKeys uniqueness ──────────────────────────────────────────────
describe('Regression: consentKeys uniqueness', () => {
  it('active, pending, history, check keys are all unique', () => {
    const keys = [
      JSON.stringify(consentKeys.active()),
      JSON.stringify(consentKeys.pending()),
      JSON.stringify(consentKeys.history(1)),
      JSON.stringify(consentKeys.check('UH-001')),
      JSON.stringify(consentKeys.check('UH-002')),
      JSON.stringify(consentKeys.history(2)),
    ];
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });

  it('same UHID generates same check key (stable)', () => {
    const k1 = consentKeys.check('UH-847291');
    const k2 = consentKeys.check('UH-847291');
    expect(k1).toEqual(k2);
  });
});

// ─── 11. OTP send lockout (429) ───────────────────────────────────────────────
describe('Regression: OTP send lockout', () => {
  it('sendOtp returns 429 when locked', async () => {
    setMockUser(PATIENT_USER);
    server.use(
      http.post('/api/v1/consents/otp/send', () =>
        HttpResponse.json(
          { success: false, error: 'Too many wrong attempts. Try again in 4 minute(s).' },
          { status: 429 }
        )
      )
    );
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSendConsentOtp(), { wrapper: Wrapper });

    await act(async () => { result.current.mutate(MOCK_CONSENT_ID); });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(getConsentErrorMessage(result.current.error)).toMatch(/try again/i);
  });
});
