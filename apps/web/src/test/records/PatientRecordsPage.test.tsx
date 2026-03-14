/**
 * Integration tests — PatientRecordsPage
 *
 * Tests the patient-facing records page: list rendering, type filter chips,
 * record detail modal, download flow.
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import PatientRecordsPage from '@/pages/patient/RecordsPage';
import { createWrapper, setMockUser, clearMockUser, PATIENT_USER } from '../utils';
import { mockListResponse, MOCK_RECORD_ID, mockDownloadResponse } from '../mocks/handlers';

function renderPage() {
  const { Wrapper } = createWrapper('/patient/records');
  setMockUser(PATIENT_USER);
  return render(<PatientRecordsPage />, { wrapper: Wrapper });
}

afterEach(() => clearMockUser());

// ─── Rendering ─────────────────────────────────────────────────────────────────
describe('PatientRecordsPage — Rendering', () => {
  it('renders the page heading', async () => {
    renderPage();
    expect(screen.getByText('My Medical Records')).toBeInTheDocument();
  });

  it('shows a loading spinner initially', () => {
    renderPage();
    // Records are loading — spinner should be present briefly
    // (MSW resolves fast but we check before waitFor)
    expect(document.querySelector('.animate-spin')).not.toBeNull();
  });

  it('renders the record list after load', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Complete Blood Count — Jan 2026')).toBeInTheDocument();
    });
  });

  it('shows the record count', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/1 record/i)).toBeInTheDocument();
    });
  });

  it('renders type filter chips for all record types', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Lab Report')).toBeInTheDocument();
    });
    expect(screen.getByText('Imaging')).toBeInTheDocument();
    expect(screen.getByText('Prescription')).toBeInTheDocument();
  });

  it('shows AI badge when record has AI summary', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('AI')).toBeInTheDocument();
    });
  });
});

// ─── Empty state ───────────────────────────────────────────────────────────────
describe('PatientRecordsPage — Empty state', () => {
  it('shows empty state message when no records exist', async () => {
    server.use(
      http.get(`/api/v1/records/:uhid`, () =>
        HttpResponse.json({
          success: true,
          data: {
            records: [],
            pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
          },
        })
      )
    );

    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/No records found/i)).toBeInTheDocument();
    });
  });
});

// ─── Type filter ───────────────────────────────────────────────────────────────
describe('PatientRecordsPage — Type filter', () => {
  it('"All" chip is active by default', () => {
    renderPage();
    const allChip = screen.getByRole('button', { name: 'All' });
    expect(allChip.className).toContain('bg-primary');
  });

  it('clicking a type chip makes it active', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => screen.getByText('Lab Report'));
    await user.click(screen.getByRole('button', { name: 'Lab Report' }));

    expect(screen.getByRole('button', { name: 'Lab Report' }).className).toContain('bg-primary');
    expect(screen.getByRole('button', { name: 'All' }).className).not.toContain('bg-primary');
  });

  it('returns to "All" filter when All chip is clicked', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => screen.getByText('Lab Report'));
    await user.click(screen.getByRole('button', { name: 'Lab Report' }));
    await user.click(screen.getByRole('button', { name: 'All' }));

    expect(screen.getByRole('button', { name: 'All' }).className).toContain('bg-primary');
  });
});

// ─── Detail modal ──────────────────────────────────────────────────────────────
describe('PatientRecordsPage — Detail modal', () => {
  it('opens the detail modal when a record card is clicked', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Complete Blood Count — Jan 2026')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Complete Blood Count — Jan 2026'));

    await waitFor(() => {
      expect(screen.getByText('Record Details')).toBeInTheDocument();
    });
  });

  it('shows AI summary in the modal', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => screen.getByText('Complete Blood Count — Jan 2026'));
    await user.click(screen.getByText('Complete Blood Count — Jan 2026'));

    await waitFor(() => {
      expect(screen.getByText('AI Summary')).toBeInTheDocument();
    });
    expect(screen.getByText(/All values within normal range/i)).toBeInTheDocument();
  });

  it('closes the modal when backdrop is clicked', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => screen.getByText('Complete Blood Count — Jan 2026'));
    await user.click(screen.getByText('Complete Blood Count — Jan 2026'));
    await waitFor(() => screen.getByText('Record Details'));

    // Click the modal backdrop (fixed overlay div)
    const backdrop = document.querySelector('.fixed.inset-0') as HTMLElement;
    await user.click(backdrop);

    await waitFor(() => {
      expect(screen.queryByText('Record Details')).not.toBeInTheDocument();
    });
  });

  it('shows download button in modal', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => screen.getByText('Complete Blood Count — Jan 2026'));
    await user.click(screen.getByText('Complete Blood Count — Jan 2026'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /download file/i })).toBeInTheDocument();
    });
  });
});

// ─── Download ──────────────────────────────────────────────────────────────────
describe('PatientRecordsPage — Download', () => {
  it('triggers download on button click', async () => {
    const anchorClick = vi.fn();
    const fakeAnchor = { href: '', download: '', target: '', rel: '', click: anchorClick };
    // Use Document.prototype to avoid recursive call back into the spy itself
    const originalCreate = Document.prototype.createElement.bind(document);
    const spy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') return fakeAnchor as unknown as HTMLElement;
      return originalCreate(tag);
    });

    const user = userEvent.setup();
    renderPage();

    await waitFor(() => screen.getByText('Complete Blood Count — Jan 2026'));
    await user.click(screen.getByText('Complete Blood Count — Jan 2026'));
    await waitFor(() => screen.getByRole('button', { name: /download file/i }));
    await user.click(screen.getByRole('button', { name: /download file/i }));

    await waitFor(() => expect(anchorClick).toHaveBeenCalledTimes(1));
    spy.mockRestore();
  });
});

// ─── Error state ───────────────────────────────────────────────────────────────
describe('PatientRecordsPage — Error state', () => {
  it('shows error message when API fails', async () => {
    server.use(
      http.get('/api/v1/records/:uhid', () =>
        HttpResponse.json({ success: false, error: 'Server error' }, { status: 500 })
      )
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/could not load records|server error/i)).toBeInTheDocument();
    });
  });
});
