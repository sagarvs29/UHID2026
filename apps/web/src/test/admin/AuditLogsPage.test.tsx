import { describe, it, expect } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { createWrapper, setMockUser, ADMIN_USER } from '@/test/utils';
import AuditLogsPage from '@/pages/admin/AuditLogsPage';

function renderPage() {
  setMockUser(ADMIN_USER);
  const { Wrapper } = createWrapper('/admin/audit');
  return render(<AuditLogsPage />, { wrapper: Wrapper });
}

describe('AuditLogsPage', () => {
  it('shows loading state initially', () => {
    renderPage();
    expect(screen.getByTestId('audit-loading')).toBeInTheDocument();
  });

  it('renders the audit table after load', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('audit-table')).toBeInTheDocument();
    });
  });

  it('renders at least one audit row', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByTestId('audit-row').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows EMERGENCY_OVERRIDE action in table', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('EMERGENCY_OVERRIDE')).toBeInTheDocument();
    });
  });

  it('shows severity badge with correct label', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('severity-badge')).toBeInTheDocument();
      expect(screen.getByTestId('severity-badge').textContent).toBe('HIGH');
    });
  });

  it('renders filter controls', async () => {
    renderPage();
    expect(screen.getByTestId('filter-action')).toBeInTheDocument();
    expect(screen.getByTestId('filter-severity')).toBeInTheDocument();
    expect(screen.getByTestId('filter-search')).toBeInTheDocument();
    expect(screen.getByTestId('apply-filters')).toBeInTheDocument();
    expect(screen.getByTestId('export-csv')).toBeInTheDocument();
  });

  it('opens detail drawer on row click', async () => {
    renderPage();
    await waitFor(() => screen.getAllByTestId('audit-row'));
    fireEvent.click(screen.getAllByTestId('audit-row')[0]);
    expect(screen.getByTestId('detail-drawer')).toBeInTheDocument();
  });

  it('shows no-logs message when empty', async () => {
    server.use(
      http.get('/api/v1/admin/audit-logs', () =>
        HttpResponse.json({
          success: true,
          data: { total: 0, page: 1, limit: 50, totalPages: 1, logs: [] },
        })
      )
    );
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('no-logs')).toBeInTheDocument();
    });
  });

  it('shows error state on API failure', async () => {
    server.use(
      http.get('/api/v1/admin/audit-logs', () =>
        HttpResponse.json({ success: false, error: 'Server error' }, { status: 500 })
      )
    );
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('audit-error')).toBeInTheDocument();
    });
  });
});
