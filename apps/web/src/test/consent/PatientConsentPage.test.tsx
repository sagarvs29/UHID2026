/**
 * Integration tests — PatientConsentPage (/patient/consent)
 *
 * Covers: rendering, pending requests, active consents, history,
 *         OTP modal flow, approve, deny, revoke.
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import PatientConsentPage from '@/pages/patient/ConsentPage';
import {
  MOCK_CONSENT_ID,
  MOCK_CONSENT_ID_2,
} from '../mocks/handlers';
import { createWrapper, setMockUser, clearMockUser, PATIENT_USER } from '../utils';

// ─── Helper ───────────────────────────────────────────────────────────────────
function renderPage() {
  setMockUser(PATIENT_USER);
  const { Wrapper } = createWrapper('/patient/consent');
  render(<PatientConsentPage />, { wrapper: Wrapper });
}

beforeEach(() => setMockUser(PATIENT_USER));
afterEach(() => clearMockUser());

// ─── Rendering ────────────────────────────────────────────────────────────────
describe('PatientConsentPage — Rendering', () => {
  it('renders page heading', async () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /consent management/i })).toBeInTheDocument();
  });

  it('renders all three section headings', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/pending requests/i)).toBeInTheDocument();
      expect(screen.getByText(/active permissions/i)).toBeInTheDocument();
      expect(screen.getByText(/access history/i)).toBeInTheDocument();
    });
  });

  it('shows loading skeletons initially', () => {
    renderPage();
    // Skeletons are animate-pulse divs rendered before data arrives
    const pulsingEls = document.querySelectorAll('.animate-pulse');
    expect(pulsingEls.length).toBeGreaterThan(0);
  });

  it('shows the pending request card for Dr. Suresh Menon', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Dr. Suresh Menon')).toBeInTheDocument();
    });
  });

  it('shows pending badge count', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument(); // badge
    });
  });

  it('shows active consent card for Dr. Anita Desai', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Dr. Anita Desai')).toBeInTheDocument();
    });
  });

  it('shows history entries', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Dr. Anita Desai \(Cardiology\)/i)).toBeInTheDocument();
      expect(screen.getByText('Star Health Insurance')).toBeInTheDocument();
    });
  });
});

// ─── Active consent card ──────────────────────────────────────────────────────
describe('PatientConsentPage — Active Consents', () => {
  it('shows "Revoke Access" button on active consent card', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Dr. Anita Desai'));
    expect(screen.getByRole('button', { name: /revoke access/i })).toBeInTheDocument();
  });

  it('shows scope badges on active consent', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Dr. Anita Desai'));
    // Multiple "Lab Reports" appear (active card + history row) — use getAllBy
    expect(screen.getAllByText('Lab Reports').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Prescriptions').length).toBeGreaterThanOrEqual(1);
  });

  it('shows expiry badge', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Dr. Anita Desai'));
    expect(screen.getByText(/expires/i)).toBeInTheDocument();
  });

  it('opens revoke confirmation modal on Revoke Access click', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByText('Dr. Anita Desai'));
    await user.click(screen.getByRole('button', { name: /revoke access/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/revoke access\?/i)).toBeInTheDocument();
  });

  it('closes revoke modal on Cancel', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByText('Dr. Anita Desai'));
    await user.click(screen.getByRole('button', { name: /revoke access/i }));
    await user.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows success message after confirmed revoke', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByText('Dr. Anita Desai'));
    await user.click(screen.getByRole('button', { name: /revoke access/i }));
    const modal = screen.getByRole('dialog');
    await user.click(within(modal).getByRole('button', { name: /yes, revoke/i }));
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/revoked/i);
    });
  });

  it('shows empty state when no active consents', async () => {
    server.use(
      http.get('/api/v1/consents/active', () =>
        HttpResponse.json({ success: true, data: [] })
      )
    );
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/no one currently has access/i)).toBeInTheDocument();
    });
  });
});

// ─── Pending consent card ─────────────────────────────────────────────────────
describe('PatientConsentPage — Pending Requests', () => {
  it('shows Approve and Deny buttons', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Dr. Suresh Menon'));
    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /deny/i })).toBeInTheDocument();
  });

  it('shows purpose text', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('New patient registration and complete health review')).toBeInTheDocument();
    });
  });

  it('shows empty state when no pending requests', async () => {
    server.use(
      http.get('/api/v1/consents/pending', () =>
        HttpResponse.json({ success: true, data: [] })
      )
    );
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/no pending requests/i)).toBeInTheDocument();
    });
  });

  it('shows success toast after deny', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByText('Dr. Suresh Menon'));
    await user.click(screen.getByRole('button', { name: /deny/i }));
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/denied/i);
    });
  });
});

// ─── OTP Modal ────────────────────────────────────────────────────────────────
describe('PatientConsentPage — OTP Modal', () => {
  it('opens OTP modal when Approve is clicked', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByText('Dr. Suresh Menon'));
    await user.click(screen.getByRole('button', { name: /approve/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    expect(screen.getByText(/approve access request/i)).toBeInTheDocument();
  });

  it('shows scope summary in OTP modal', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByText('Dr. Suresh Menon'));
    await user.click(screen.getByRole('button', { name: /approve/i }));
    await waitFor(() => screen.getByRole('dialog'));
    // scope badge appears inside the modal specifically
    const modal = screen.getByRole('dialog');
    expect(within(modal).getByText('Complete Medical History')).toBeInTheDocument();
  });

  it('shows OTP sent message after auto-send', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByText('Dr. Suresh Menon'));
    await user.click(screen.getByRole('button', { name: /approve/i }));
    await waitFor(() => {
      expect(screen.getByText(/OTP sent to your registered email/i)).toBeInTheDocument();
    });
  });

  it('allows entering OTP digits', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByText('Dr. Suresh Menon'));
    await user.click(screen.getByRole('button', { name: /approve/i }));
    await waitFor(() => screen.getByLabelText('OTP digit 1'));

    // Enter digits in each box
    for (let i = 1; i <= 6; i++) {
      await user.click(screen.getByLabelText(`OTP digit ${i}`));
      await user.keyboard(`${i}`);
    }
    expect(screen.getByRole('button', { name: /confirm approval/i })).not.toBeDisabled();
  });

  it('shows success toast and closes modal after valid OTP', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByText('Dr. Suresh Menon'));
    await user.click(screen.getByRole('button', { name: /approve/i }));
    await waitFor(() => screen.getByLabelText('OTP digit 1'));

    for (let i = 1; i <= 6; i++) {
      await user.click(screen.getByLabelText(`OTP digit ${i}`));
      await user.keyboard('1');
    }
    await user.click(screen.getByRole('button', { name: /confirm approval/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/approved/i);
    });
  });

  it('shows error message on wrong OTP', async () => {
    server.use(
      http.post('/api/v1/consents/approve', () =>
        HttpResponse.json(
          { success: false, error: 'Incorrect OTP. 2 attempt(s) remaining.' },
          { status: 400 }
        )
      )
    );
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByText('Dr. Suresh Menon'));
    await user.click(screen.getByRole('button', { name: /approve/i }));
    await waitFor(() => screen.getByLabelText('OTP digit 1'));

    for (let i = 1; i <= 6; i++) {
      await user.click(screen.getByLabelText(`OTP digit ${i}`));
      await user.keyboard('0');
    }
    await user.click(screen.getByRole('button', { name: /confirm approval/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/incorrect otp/i);
    });
  });

  it('closes OTP modal on Cancel', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByText('Dr. Suresh Menon'));
    await user.click(screen.getByRole('button', { name: /approve/i }));
    await waitFor(() => screen.getByRole('dialog'));
    await user.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

// ─── Error states ─────────────────────────────────────────────────────────────
describe('PatientConsentPage — Error states', () => {
  it('shows error when active consents API fails', async () => {
    server.use(
      http.get('/api/v1/consents/active', () =>
        HttpResponse.json({ success: false, error: 'Server error' }, { status: 500 })
      )
    );
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/server error/i)).toBeInTheDocument();
    });
  });

  it('shows error when pending consents API fails', async () => {
    server.use(
      http.get('/api/v1/consents/pending', () =>
        HttpResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
      )
    );
    renderPage();
    // component renders getConsentErrorMessage output in red text
    await waitFor(() => {
      expect(screen.getByText(/internal server error|server error|network error/i)).toBeInTheDocument();
    });
    // Reset handlers before component unmount to avoid dangling refetch from polling interval
    server.resetHandlers();
  });
});
