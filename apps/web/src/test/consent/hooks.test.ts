/**
 * Unit tests — useConsent hooks
 *
 * Tests each hook in isolation using renderHook + MSW.
 */
import { renderHook, waitFor, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import {
  useActiveConsents,
  usePendingConsents,
  useConsentHistory,
  useConsentCheck,
  useRequestConsent,
  useSendConsentOtp,
  useApproveConsent,
  useDenyConsent,
  useRevokeConsent,
  getConsentErrorMessage,
  consentKeys,
} from '@/hooks/useConsent';
import {
  MOCK_UHID,
  MOCK_CONSENT_ID,
  MOCK_CONSENT_ID_2,
  mockActiveConsents,
  mockPendingConsents,
  mockConsentHistory,
  mockConsentCheckActive,
  mockRequestResult,
  mockApproveResult,
} from '../mocks/handlers';
import { createWrapper, setMockUser, clearMockUser, PATIENT_USER, DOCTOR_USER } from '../utils';

// ─── consentKeys ──────────────────────────────────────────────────────────────
describe('consentKeys', () => {
  it('generates stable active key', () => {
    expect(consentKeys.active()).toEqual(['consents', 'active']);
  });

  it('generates stable pending key', () => {
    expect(consentKeys.pending()).toEqual(['consents', 'pending']);
  });

  it('generates stable history key with page', () => {
    expect(consentKeys.history(2)).toEqual(['consents', 'history', 2]);
  });

  it('generates stable check key', () => {
    expect(consentKeys.check('UH-001')).toEqual(['consents', 'check', 'UH-001']);
  });
});

// ─── getConsentErrorMessage ───────────────────────────────────────────────────
describe('getConsentErrorMessage', () => {
  it('returns server error field', () => {
    const err = { response: { data: { error: 'Patient not found' } } };
    expect(getConsentErrorMessage(err)).toBe('Patient not found');
  });

  it('returns server message field when no error field', () => {
    const err = { response: { data: { message: 'Access denied' } } };
    expect(getConsentErrorMessage(err)).toBe('Access denied');
  });

  it('falls back to err.message', () => {
    const err = { message: 'Network Error' };
    expect(getConsentErrorMessage(err)).toBe('Network Error');
  });

  it('returns default message for null/undefined', () => {
    expect(getConsentErrorMessage(null)).toBe('An unexpected error occurred');
    expect(getConsentErrorMessage(undefined)).toBe('An unexpected error occurred');
  });
});

// ─── useActiveConsents ────────────────────────────────────────────────────────
describe('useActiveConsents', () => {
  beforeEach(() => setMockUser(PATIENT_USER));
  afterEach(() => clearMockUser());

  it('returns active consents on success', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useActiveConsents(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].id).toBe(MOCK_CONSENT_ID);
    expect(result.current.data![0].grantedTo.name).toBe('Dr. Anita Desai');
  });

  it('returns empty array from server override', async () => {
    server.use(
      http.get('/api/v1/consents/active', () =>
        HttpResponse.json({ success: true, data: [] })
      )
    );
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useActiveConsents(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(0);
  });

  it('reports error on 500', async () => {
    server.use(
      http.get('/api/v1/consents/active', () =>
        HttpResponse.json({ success: false, error: 'Server error' }, { status: 500 })
      )
    );
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useActiveConsents(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ─── usePendingConsents ───────────────────────────────────────────────────────
describe('usePendingConsents', () => {
  beforeEach(() => setMockUser(PATIENT_USER));
  afterEach(() => clearMockUser());

  it('returns pending consents', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => usePendingConsents(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].id).toBe(MOCK_CONSENT_ID_2);
    expect(result.current.data![0].requestedBy.name).toBe('Dr. Suresh Menon');
  });
});

// ─── useConsentHistory ────────────────────────────────────────────────────────
describe('useConsentHistory', () => {
  beforeEach(() => setMockUser(PATIENT_USER));
  afterEach(() => clearMockUser());

  it('returns paginated history', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useConsentHistory(1), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data!.consents).toHaveLength(2);
    expect(result.current.data!.pagination.total).toBe(2);
    expect(result.current.data!.consents[0].status).toBe('ACTIVE');
    expect(result.current.data!.consents[1].status).toBe('EXPIRED');
  });
});

// ─── useConsentCheck ─────────────────────────────────────────────────────────
describe('useConsentCheck', () => {
  beforeEach(() => setMockUser(DOCTOR_USER));
  afterEach(() => clearMockUser());

  it('returns hasAccess:true for MOCK_UHID', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useConsentCheck(MOCK_UHID), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data!.hasAccess).toBe(true);
    expect(result.current.data!.consentId).toBe(MOCK_CONSENT_ID);
    expect(result.current.data!.expiresIn).toBe('24 hours');
  });

  it('returns hasAccess:false for unknown UHID', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useConsentCheck('UH-UNKNOWN'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data!.hasAccess).toBe(false);
  });

  it('does not fire when uhid is empty', () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useConsentCheck(''), { wrapper: Wrapper });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

// ─── useRequestConsent ────────────────────────────────────────────────────────
describe('useRequestConsent', () => {
  beforeEach(() => setMockUser(DOCTOR_USER));
  afterEach(() => clearMockUser());

  it('sends request and returns consentId', async () => {
    const { Wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => useRequestConsent(), { wrapper: Wrapper });

    // Pre-populate check cache so we can verify invalidation
    queryClient.setQueryData(consentKeys.check(MOCK_UHID), mockConsentCheckActive);

    await act(async () => {
      result.current.mutate({
        patientUhid: MOCK_UHID,
        scope:        ['LAB_REPORT'],
        purpose:      'Routine consultation follow-up',
        isTemporary:  true,
        durationHours: 24,
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.consentId).toBe(mockRequestResult.consentId);
    expect(result.current.data?.status).toBe('PENDING');

    // Cache for check key should be invalidated
    const cached = queryClient.getQueryCache().findAll({ queryKey: consentKeys.check(MOCK_UHID), exact: true });
    expect(cached.every((q) => q.isStale())).toBe(true);
  });

  it('reports error on 409 duplicate', async () => {
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
        scope: ['ALL'],
        purpose: 'Duplicate request test',
        isTemporary: true,
        durationHours: 24,
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(getConsentErrorMessage(result.current.error)).toBe(
      'A pending consent request already exists for this patient.'
    );
  });
});

// ─── useSendConsentOtp ────────────────────────────────────────────────────────
describe('useSendConsentOtp', () => {
  beforeEach(() => setMockUser(PATIENT_USER));
  afterEach(() => clearMockUser());

  it('returns success message and expiresInMinutes', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSendConsentOtp(), { wrapper: Wrapper });

    await act(async () => { result.current.mutate(MOCK_CONSENT_ID); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.expiresInMinutes).toBe(10);
    expect(result.current.data?.message).toMatch(/OTP sent/i);
  });
});

// ─── useApproveConsent ────────────────────────────────────────────────────────
describe('useApproveConsent', () => {
  beforeEach(() => setMockUser(PATIENT_USER));
  afterEach(() => clearMockUser());

  it('approves with OTP and returns ACTIVE status', async () => {
    const { Wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => useApproveConsent(), { wrapper: Wrapper });

    // Pre-populate caches to verify invalidation
    queryClient.setQueryData(consentKeys.active(), mockActiveConsents);
    queryClient.setQueryData(consentKeys.pending(), mockPendingConsents);

    await act(async () => {
      result.current.mutate({ consentId: MOCK_CONSENT_ID_2, otp: '123456' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.status).toBe('ACTIVE');
    expect(result.current.data?.grantedTo).toBe('Dr. Suresh Menon');

    // Active and pending caches should be invalidated
    const activeCache = queryClient.getQueryCache().findAll({ queryKey: consentKeys.active(), exact: true });
    const pendingCache = queryClient.getQueryCache().findAll({ queryKey: consentKeys.pending(), exact: true });
    expect(activeCache.every((q) => q.isStale())).toBe(true);
    expect(pendingCache.every((q) => q.isStale())).toBe(true);
  });

  it('reports error on wrong OTP', async () => {
    server.use(
      http.post('/api/v1/consents/approve', () =>
        HttpResponse.json(
          { success: false, error: 'Incorrect OTP. 2 attempt(s) remaining.' },
          { status: 400 }
        )
      )
    );
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useApproveConsent(), { wrapper: Wrapper });

    await act(async () => { result.current.mutate({ consentId: MOCK_CONSENT_ID_2, otp: '000000' }); });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(getConsentErrorMessage(result.current.error)).toMatch(/Incorrect OTP/i);
  });
});

// ─── useDenyConsent ───────────────────────────────────────────────────────────
describe('useDenyConsent', () => {
  beforeEach(() => setMockUser(PATIENT_USER));
  afterEach(() => clearMockUser());

  it('denies consent and returns success message', async () => {
    const { Wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => useDenyConsent(), { wrapper: Wrapper });

    queryClient.setQueryData(consentKeys.pending(), mockPendingConsents);

    await act(async () => { result.current.mutate(MOCK_CONSENT_ID_2); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.message).toMatch(/denied/i);
  });
});

// ─── useRevokeConsent ─────────────────────────────────────────────────────────
describe('useRevokeConsent', () => {
  beforeEach(() => setMockUser(PATIENT_USER));
  afterEach(() => clearMockUser());

  it('revokes active consent and returns revokedAt', async () => {
    const { Wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => useRevokeConsent(), { wrapper: Wrapper });

    queryClient.setQueryData(consentKeys.active(), mockActiveConsents);

    await act(async () => { result.current.mutate(MOCK_CONSENT_ID); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.revokedAt).toBeDefined();

    // Active cache should be invalidated
    const cache = queryClient.getQueryCache().findAll({ queryKey: consentKeys.active(), exact: true });
    expect(cache.every((q) => q.isStale())).toBe(true);
  });

  it('reports error on unknown consent id', async () => {
    server.use(
      http.delete('/api/v1/consents/:id', () =>
        HttpResponse.json({ success: false, error: 'Consent not found' }, { status: 404 })
      )
    );
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRevokeConsent(), { wrapper: Wrapper });

    await act(async () => { result.current.mutate('con_nonexistent'); });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
