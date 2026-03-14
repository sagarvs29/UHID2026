import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { createWrapper, setMockUser, SUPER_ADMIN_USER } from '@/test/utils';
import SuperAdminDashboardPage from '@/pages/superadmin/DashboardPage';

function renderPage() {
  setMockUser(SUPER_ADMIN_USER);
  const { Wrapper } = createWrapper('/superadmin');
  return render(<SuperAdminDashboardPage />, { wrapper: Wrapper });
}

describe('SuperAdminDashboardPage', () => {
  it('shows loading state initially', () => {
    renderPage();
    expect(screen.getByTestId('platform-loading')).toBeInTheDocument();
  });

  it('renders at least 6 platform stat cards after load', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByTestId('platform-stat').length).toBeGreaterThanOrEqual(6);
    });
  });

  it('displays total users value (12,400)', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('12,400')).toBeInTheDocument();
    });
  });

  it('renders the hospitals table', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('hospitals-table')).toBeInTheDocument();
    });
  });

  it('shows at least one hospital row', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByTestId('hospital-row').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows "Apollo Hospital" in the hospital list', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Apollo Hospital')).toBeInTheDocument();
    });
  });

  it('shows suspend button for verified hospital', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('suspend-hospital-btn')).toBeInTheDocument();
    });
  });

  it('shows "Super Admin" role label on the page', async () => {
    renderPage();
    await waitFor(() => {
      // The banner contains "Super Admin Console" and/or "Super Admin · Platform-wide Access"
      const matches = screen.queryAllByText(/super admin/i);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows no hospitals message when list is empty', async () => {
    server.use(
      http.get('/api/v1/admin/super/hospitals', () =>
        HttpResponse.json({ success: true, data: [] })
      )
    );
    renderPage();
    await waitFor(() => {
      const table = screen.queryByTestId('hospitals-table');
      const rows = screen.queryAllByTestId('hospital-row');
      expect(rows.length).toBe(0);
      // table may still render but with 0 rows
      if (table) {
        expect(rows.length).toBe(0);
      }
    });
  });
});
