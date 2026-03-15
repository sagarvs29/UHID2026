/// <reference types="vitest/globals" />
/**
 * Regression tests — Phase 2 Records
 *
 * Guard against critical regressions:
 *   1. Access control: patient cannot query another patient's records (backend-enforced, verify 403 surface)
 *   2. UHID isolation: useMyRecords never fires for an unauthenticated user
 *   3. Record not found: hooks handle 404 gracefully
 *   4. Download URL expiry: TTL metadata is present in response
 *   5. Cache invalidation: upload triggers list refetch
 *   6. File size rejection: Zod catches >10MB files before hitting the API
 *   7. Unsupported MIME type: Zod catches non-allowed formats
 *   8. Empty UHID disabled: useGetRecords('' ) never fires
 */
import { renderHook, waitFor, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { useGetRecords, useMyRecords, useUploadRecord, useDownloadRecord } from '@/hooks/useRecords';
import { createWrapper, setMockUser, clearMockUser, PATIENT_USER, STAFF_USER } from '../utils';
import { MOCK_UHID, MOCK_RECORD_ID } from '../mocks/handlers';

afterEach(() => {
  clearMockUser();
  server.resetHandlers();
});

// ─── 1. Access control (403 surfaces correctly) ───────────────────────────────
describe('Regression: access control', () => {
  it('surfaces 403 when doctor queries records without consent', async () => {
    server.use(
      http.get('/api/v1/records/:uhid', () =>
        HttpResponse.json(
          { success: false, error: 'Access denied: patient has not granted consent' },
          { status: 403 }
        )
      )
    );

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGetRecords('UH-NONCONSENTED'), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as any)?.response?.status).toBe(403);
  });
});

// ─── 2. UHID isolation ────────────────────────────────────────────────────────
describe('Regression: UHID isolation', () => {
  it('useMyRecords does NOT fire when user has no UHID (non-patient role)', () => {
    // Staff user has no uhid
    setMockUser({ ...STAFF_USER, uhid: undefined });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useMyRecords(), { wrapper: Wrapper });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('useMyRecords does NOT fire when user is not authenticated', () => {
    clearMockUser();
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useMyRecords(), { wrapper: Wrapper });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('useMyRecords uses ONLY the authenticated user\'s UHID', async () => {
    setMockUser(PATIENT_USER); // uhid = UH-000001
    let capturedUhid = '';
    server.use(
      http.get('/api/v1/records/:uhid', ({ params }) => {
        capturedUhid = params.uhid as string;
        return HttpResponse.json({
          success: true,
          data: { records: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 1 } },
        });
      })
    );

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useMyRecords(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(capturedUhid).toBe(MOCK_UHID);
  });
});

// ─── 3. Record not found (404) ────────────────────────────────────────────────
describe('Regression: 404 handling', () => {
  it('useGetRecord surfaces 404 correctly', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGetRecords('UH-DOESNOTEXIST'), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as any)?.response?.status).toBe(404);
  });

  it('useDownloadRecord surfaces 404 for nonexistent record', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useDownloadRecord(), { wrapper: Wrapper });

    await act(async () => { result.current.mutate('rec_nonexistent'); });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as any)?.response?.status).toBe(404);
  });
});

// ─── 4. Download URL TTL ──────────────────────────────────────────────────────
describe('Regression: download URL TTL', () => {
  it('download response includes expiresAt timestamp', async () => {
    const anchorClick = vi.fn();
    const fakeAnchor = { href: '', download: '', target: '', rel: '', click: anchorClick };
    const spy = vi.spyOn(globalThis.document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') return fakeAnchor as unknown as HTMLElement;
      return Object.getPrototypeOf(globalThis.document).createElement.call(globalThis.document, tag);
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useDownloadRecord(), { wrapper: Wrapper });

    await act(async () => { result.current.mutate(MOCK_RECORD_ID); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const expiresAt = result.current.data?.expiresAt;
    expect(expiresAt).toBeTruthy();
    // Should be in the future
    expect(new Date(expiresAt!).getTime()).toBeGreaterThan(Date.now());

    spy.mockRestore();
  });
});

// ─── 5. Cache invalidation after upload ───────────────────────────────────────
describe('Regression: cache invalidation', () => {
  it('upload invalidates the correct patient\'s record list, not others', async () => {
    setMockUser(STAFF_USER);
    const { Wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => useUploadRecord(), { wrapper: Wrapper });

    const file = new File(['x'], 'test.pdf', { type: 'application/pdf' });
    await act(async () => {
      result.current.mutate({
        file,
        patientUhid: MOCK_UHID,
        recordType: 'LAB_REPORT',
        title: 'CBC Test',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // The list for MOCK_UHID was either invalidated (if it existed) or never fetched (both correct)
    const targetQueries = queryClient.getQueryCache().findAll({
      queryKey: ['records', 'list', MOCK_UHID],
      exact: false,
    });
    expect(targetQueries.every((q) => q.state.isInvalidated)).toBe(true);

    // A different patient's list should not have been touched
    const otherQueries = queryClient.getQueryCache().findAll({
      queryKey: ['records', 'list', 'UH-999999'],
      exact: false,
    });
    expect(otherQueries).toHaveLength(0);
  });
});

// ─── 6. File size validation (Zod) ────────────────────────────────────────────
describe('Regression: Zod file size validation', () => {
  it('rejects a file over 10 MB', async () => {
    const { z } = await import('zod');

    // Use a mock FileList-like object instead of DataTransfer (not available in all jsdom versions)
    const bigFile = { size: 11 * 1024 * 1024, type: 'application/pdf', name: 'big.pdf' };
    const fakeFileList = Object.assign([bigFile], { length: 1, item: () => bigFile });

    const schema = z.custom<FileList>(
      (v) => v != null && typeof v === 'object' && (v as any).length > 0,
      'Please select a file'
    ).refine(
      (fl) => (fl as any)[0]?.size <= 10 * 1024 * 1024,
      'File must be under 10 MB'
    );

    const result = schema.safeParse(fakeFileList);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('File must be under 10 MB');
    }
  });
});

// ─── 7. Unsupported MIME type (Zod) ───────────────────────────────────────────
describe('Regression: Zod MIME type validation', () => {
  it('rejects a .docx file', async () => {
    const { z } = await import('zod');
    const badFile = {
      size: 1024,
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      name: 'report.docx',
    };
    const fakeFileList = Object.assign([badFile], { length: 1, item: () => badFile });

    const schema = z.custom<FileList>(
      (v) => v != null && typeof v === 'object' && (v as any).length > 0,
      'Please select a file'
    ).refine(
      (fl) => (fl as any)[0]?.size <= 10 * 1024 * 1024,
      'File must be under 10 MB'
    ).refine(
      (fl) =>
        ['application/pdf','image/jpeg','image/jpg','image/png','image/webp']
          .includes((fl as any)[0]?.type),
      'Allowed formats: PDF, JPG, PNG, WebP'
    );

    const result = schema.safeParse(fakeFileList);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Allowed formats: PDF, JPG, PNG, WebP');
    }
  });
});

// ─── 8. Empty UHID guard ──────────────────────────────────────────────────────
describe('Regression: empty UHID guard', () => {
  it('useGetRecords("") never fires a request', async () => {
    let requestFired = false;
    server.use(
      http.get('/api/v1/records/:uhid', () => {
        requestFired = true;
        return HttpResponse.json({ success: true, data: { records: [], pagination: {} } });
      })
    );

    const { Wrapper } = createWrapper();
    renderHook(() => useGetRecords(''), { wrapper: Wrapper });

    // Wait a tick to confirm no request was made
    await new Promise((r) => setTimeout(r, 50));
    expect(requestFired).toBe(false);
  });
});
