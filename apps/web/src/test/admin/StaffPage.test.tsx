import { describe, it, expect } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { createWrapper, setMockUser, ADMIN_USER } from '@/test/utils';
import StaffPage from '@/pages/admin/StaffPage';

function renderPage() {
  setMockUser(ADMIN_USER);
  const { Wrapper } = createWrapper('/admin/staff');
  return render(<StaffPage />, { wrapper: Wrapper });
}

describe('StaffPage — Pending tab', () => {
  it('renders pending and active tabs', async () => {
    renderPage();
    expect(screen.getByTestId('tab-pending')).toBeInTheDocument();
    expect(screen.getByTestId('tab-active')).toBeInTheDocument();
  });

  it('shows pending member card with name', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('pending-card')).toBeInTheDocument();
      expect(screen.getByText('Dr. Pending Doctor')).toBeInTheDocument();
    });
  });

  it('renders verify and reject buttons on pending card', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('verify-btn')).toBeInTheDocument();
      expect(screen.getByTestId('reject-btn')).toBeInTheDocument();
    });
  });

  it('opens verify modal on verify button click', async () => {
    renderPage();
    await waitFor(() => screen.getByTestId('verify-btn'));
    fireEvent.click(screen.getByTestId('verify-btn'));
    expect(screen.getByTestId('verify-modal')).toBeInTheDocument();
  });

  it('opens reject modal on reject button click', async () => {
    renderPage();
    await waitFor(() => screen.getByTestId('reject-btn'));
    fireEvent.click(screen.getByTestId('reject-btn'));
    expect(screen.getByTestId('verify-modal')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/reason for rejection/i)).toBeInTheDocument();
  });

  it('shows empty state when no pending members', async () => {
    server.use(
      http.get('/api/v1/admin/pending-verifications', () =>
        HttpResponse.json({ success: true, data: [] })
      )
    );
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/no pending verifications/i)).toBeInTheDocument();
    });
  });
});

describe('StaffPage — Active tab', () => {
  it('shows active staff rows after switching to active tab', async () => {
    renderPage();
    fireEvent.click(screen.getByTestId('tab-active'));
    await waitFor(() => {
      expect(screen.getAllByTestId('active-staff-row').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders search input on active tab', () => {
    renderPage();
    fireEvent.click(screen.getByTestId('tab-active'));
    expect(screen.getByTestId('staff-search')).toBeInTheDocument();
  });

  it('opens deactivate modal on deactivate button click', async () => {
    renderPage();
    fireEvent.click(screen.getByTestId('tab-active'));
    await waitFor(() => screen.getAllByTestId('deactivate-btn'));
    fireEvent.click(screen.getAllByTestId('deactivate-btn')[0]);
    expect(screen.getByTestId('deactivate-modal')).toBeInTheDocument();
  });

  it('confirm deactivate button is disabled with short reason', async () => {
    renderPage();
    fireEvent.click(screen.getByTestId('tab-active'));
    await waitFor(() => screen.getAllByTestId('deactivate-btn'));
    fireEvent.click(screen.getAllByTestId('deactivate-btn')[0]);
    const confirmBtn = screen.getByTestId('confirm-deactivate-btn');
    expect(confirmBtn).toBeDisabled();
  });
});
