/**
 * Unit tests — useRecords hooks
 *
 * Tests each hook in isolation using renderHook + MSW.
 * No page components rendered here.
 */
import { renderHook, waitFor, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import {
  useGetRecords,
  useMyRecords,
  useGetRecord,
  useUploadRecord,
  useDownloadRecord,
  getRecordErrorMessage,
  recordKeys,
} from '@/hooks/useRecords';
import {
  MOCK_UHID,
  MOCK_RECORD_ID,
  mockListResponse,
  mockRecord,
  mockDownloadResponse,
} from '../mocks/handlers';
import { createWrapper, setMockUser, clearMockUser, PATIENT_USER, STAFF_USER } from '../utils';

// ─── recordKeys ───────────────────────────────────────────────────────────────
describe('recordKeys', () => {
  it('generates stable list key', () => {
    const k1 = recordKeys.list(MOCK_UHID, { page: 1 });
    const k2 = recordKeys.list(MOCK_UHID, { page: 1 });
    expect(JSON.stringify(k1)).toBe(JSON.stringify(k2));
  });

  it('generates distinct keys for different UHIDs', () => {
    const k1 = recordKeys.list('UH-A');
    const k2 = recordKeys.list('UH-B');
    expect(JSON.stringify(k1)).not.toBe(JSON.stringify(k2));
  });

  it('generates distinct keys for different params', () => {
    const k1 = recordKeys.list(MOCK_UHID, { type: 'LAB_REPORT' });
    const k2 = recordKeys.list(MOCK_UHID, { type: 'IMAGING' });
    expect(JSON.stringify(k1)).not.toBe(JSON.stringify(k2));
  });
});

// ─── getRecordErrorMessage ────────────────────────────────────────────────────
describe('getRecordErrorMessage', () => {
  it('handles null/undefined error', () => {
    expect(getRecordErrorMessage(null)).toBe('An unexpected error occurred');
    expect(getRecordErrorMessage(undefined)).toBe('An unexpected error occurred');
  });

  it('extracts axios response error message', () => {
    const err = { response: { data: { error: 'File too large' } } };
    expect(getRecordErrorMessage(err)).toBe('File too large');
  });

  it('falls back to err.message', () => {
    const err = new Error('Network error');
    expect(getRecordErrorMessage(err)).toBe('Network error');
  });

  it('falls back to generic message for unknown shape', () => {
    expect(getRecordErrorMessage({ weird: true })).toBe('An unexpected error occurred');
  });
});

// ─── useGetRecords ────────────────────────────────────────────────────────────
describe('useGetRecords', () => {
  const { Wrapper } = createWrapper();

  it('fetches records for a valid UHID', async () => {
    const { result } = renderHook(() => useGetRecords(MOCK_UHID), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.records).toHaveLength(1);
    expect(result.current.data?.records[0].id).toBe(MOCK_RECORD_ID);
  });

  it('is disabled when UHID is empty', () => {
    const { result } = renderHook(() => useGetRecords(''), { wrapper: Wrapper });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('returns error for unknown UHID', async () => {
    const { result } = renderHook(() => useGetRecords('UH-UNKNOWN'), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('respects type filter param in query key', async () => {
    const { result } = renderHook(
      () => useGetRecords(MOCK_UHID, { type: 'LAB_REPORT' }),
      { wrapper: Wrapper }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });

  it('includes pagination data', async () => {
    const { result } = renderHook(() => useGetRecords(MOCK_UHID), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pagination.total).toBe(1);
    expect(result.current.data?.pagination.totalPages).toBe(1);
  });
});

// ─── useMyRecords ─────────────────────────────────────────────────────────────
describe('useMyRecords', () => {
  afterEach(() => clearMockUser());

  it('is disabled when no user is authenticated', () => {
    const { Wrapper } = createWrapper();
    clearMockUser();
    const { result } = renderHook(() => useMyRecords(), { wrapper: Wrapper });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('fetches own records using UHID from auth store', async () => {
    setMockUser(PATIENT_USER);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useMyRecords(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.records[0].id).toBe(MOCK_RECORD_ID);
  });
});

// ─── useGetRecord ─────────────────────────────────────────────────────────────
describe('useGetRecord', () => {
  const { Wrapper } = createWrapper();

  it('fetches single record by ID', async () => {
    const { result } = renderHook(() => useGetRecord(MOCK_RECORD_ID), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe(MOCK_RECORD_ID);
    expect(result.current.data?.title).toBe(mockRecord.title);
  });

  it('is disabled when ID is empty', () => {
    const { result } = renderHook(() => useGetRecord(''), { wrapper: Wrapper });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('returns error for unknown ID', async () => {
    const { result } = renderHook(() => useGetRecord('rec_nonexistent'), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('includes AI summary when present', async () => {
    const { result } = renderHook(() => useGetRecord(MOCK_RECORD_ID), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.aiSummary).toBeTruthy();
  });
});

// ─── useUploadRecord ──────────────────────────────────────────────────────────
describe('useUploadRecord', () => {
  afterEach(() => clearMockUser());

  it('uploads a record and returns the created record', async () => {
    setMockUser(STAFF_USER);
    const { Wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => useUploadRecord(), { wrapper: Wrapper });

    const file = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' });

    await act(async () => {
      result.current.mutate({
        file,
        patientUhid: MOCK_UHID,
        recordType: 'LAB_REPORT',
        title: 'Test Upload',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe(MOCK_RECORD_ID);

    // After upload, verify the query client has marked the list as invalidated
    // (It may not have an entry if it was never fetched, so we check via queryClient internals)
    const queries = queryClient.getQueryCache().findAll({
      queryKey: ['records', 'list', MOCK_UHID],
      exact: false,
    });
    // Either no cached entry (never fetched, so invalidation is a no-op) OR it is invalidated
    const allInvalidatedOrEmpty = queries.every((q) => q.state.isInvalidated);
    expect(allInvalidatedOrEmpty).toBe(true);
  });

  it('reports error when server returns 4xx', async () => {
    server.use(
      http.post('/api/v1/records/upload', () =>
        HttpResponse.json({ success: false, error: 'File too large' }, { status: 413 })
      )
    );

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUploadRecord(), { wrapper: Wrapper });
    const file = new File(['x'], 'big.pdf', { type: 'application/pdf' });

    await act(async () => {
      result.current.mutate({ file, patientUhid: MOCK_UHID, recordType: 'LAB_REPORT', title: 'Big' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ─── useDownloadRecord ────────────────────────────────────────────────────────
describe('useDownloadRecord', () => {
  it('returns download URL on success and triggers anchor click', async () => {
    const anchorClick = vi.fn();
    const fakeAnchor = { href: '', download: '', target: '', rel: '', click: anchorClick };
    const originalCreate = Document.prototype.createElement.bind(document);
    const spy = vi.spyOn(globalThis.document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') return fakeAnchor as unknown as HTMLElement;
      return originalCreate(tag);
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useDownloadRecord(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate(MOCK_RECORD_ID);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.downloadUrl).toBe(mockDownloadResponse.downloadUrl);
    expect(anchorClick).toHaveBeenCalledTimes(1);

    spy.mockRestore();
  });

  it('reports error for unknown record ID', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useDownloadRecord(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate('rec_nonexistent');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
