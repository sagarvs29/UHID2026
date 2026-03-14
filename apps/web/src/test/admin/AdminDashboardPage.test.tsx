import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { createWrapper, setMockUser, ADMIN_USER } from '@/test/utils';
import AdminDashboardPage from '@/pages/admin/DashboardPage';

function renderPage() {
  setMockUser(ADMIN_USER);
  const { Wrapper } = createWrapper('/admin/dashboard');
  return render(<AdminDashboardPage />, { wrapper: Wrapper });
}

describe('AdminDashboardPage', () => {
  it('shows loading spinner while data is fetching', () => {
    renderPage();
    expect(screen.getByTestId('admin-loading')).toBeInTheDocument();
  });

  it('renders KPI stat cards after load', async () => {
    renderPage();
    await waitFor(() => {
      const cards = screen.getAllByTestId('stat-card');
      expect(cards.length).toBeGreaterThanOrEqual(6);
    });
  });

  it('displays total patients value from analytics', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('4,820')).toBeInTheDocument();
    });
  });

  it('shows pending-alert when pending verifications exist', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('pending-alert')).toBeInTheDocument();
    });
  });

  it('renders recent audit table with rows', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('recent-audit-table')).toBeInTheDocument();
      expect(screen.getAllByTestId('audit-row').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows EMERGENCY_OVERRIDE action in recent audit row', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('EMERGENCY_OVERRIDE')).toBeInTheDocument();
    });
  });

  it('shows HIGH severity badge in recent logs', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('HIGH')).toBeInTheDocument();
    });
  });

  it('shows the welcome banner with admin role label', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Hospital Admin')).toBeInTheDocument();
    });
  });
});
