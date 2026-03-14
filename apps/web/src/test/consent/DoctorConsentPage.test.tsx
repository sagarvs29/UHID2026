/**
 * Integration tests — DoctorConsentPage (/doctor/consents)
 *
 * Covers: rendering, UHID check, active/no-access panels,
 *         request access modal (scope, purpose, duration, submit).
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import DoctorConsentPage from '@/pages/doctor/ConsentPage';
import { MOCK_UHID, mockConsentCheckActive } from '../mocks/handlers';
import { createWrapper, setMockUser, clearMockUser, DOCTOR_USER } from '../utils';

function renderPage() {
  setMockUser(DOCTOR_USER);
  const { Wrapper } = createWrapper('/doctor/consents');
  render(<DoctorConsentPage />, { wrapper: Wrapper });
}

beforeEach(() => setMockUser(DOCTOR_USER));
afterEach(() => clearMockUser());

// ─── Rendering ────────────────────────────────────────────────────────────────
describe('DoctorConsentPage — Rendering', () => {
  it('renders page heading', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /patient consent/i })).toBeInTheDocument();
  });

  it('renders the UHID input', () => {
    renderPage();
    expect(screen.getByPlaceholderText(/enter patient uhid/i)).toBeInTheDocument();
  });

  it('renders the Check button', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /check/i })).toBeInTheDocument();
  });

  it('renders how-it-works info banner', () => {
    renderPage();
    expect(screen.getByText(/how it works/i)).toBeInTheDocument();
  });

  it('renders consent lifecycle reference', () => {
    renderPage();
    expect(screen.getByText(/consent lifecycle/i)).toBeInTheDocument();
  });
});

// ─── UHID Check — active consent ─────────────────────────────────────────────
describe('DoctorConsentPage — Check: Active consent', () => {
  it('shows active access panel after searching known UHID', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByPlaceholderText(/enter patient uhid/i), MOCK_UHID);
    await user.click(screen.getByRole('button', { name: /check/i }));

    await waitFor(() => {
      expect(screen.getByText(/active access/i)).toBeInTheDocument();
    });
  });

  it('shows scope in active panel', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByPlaceholderText(/enter patient uhid/i), MOCK_UHID);
    await user.click(screen.getByRole('button', { name: /check/i }));

    await waitFor(() => screen.getByText(/active access/i));
    expect(screen.getByText(/lab reports/i)).toBeInTheDocument();
    expect(screen.getByText(/prescriptions/i)).toBeInTheDocument();
  });

  it('shows expiry info', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByPlaceholderText(/enter patient uhid/i), MOCK_UHID);
    await user.click(screen.getByRole('button', { name: /check/i }));

    await waitFor(() => screen.getByText(/active access/i));
    expect(screen.getByText(/24 hours/i)).toBeInTheDocument();
  });
});

// ─── UHID Check — no access ───────────────────────────────────────────────────
describe('DoctorConsentPage — Check: No access', () => {
  it('shows no-consent panel for unknown UHID', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByPlaceholderText(/enter patient uhid/i), 'UH-UNKNOWN');
    await user.click(screen.getByRole('button', { name: /check/i }));

    await waitFor(() => {
      expect(screen.getByText(/no active consent/i)).toBeInTheDocument();
    });
  });

  it('shows "Request Access" button when no consent', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByPlaceholderText(/enter patient uhid/i), 'UH-UNKNOWN');
    await user.click(screen.getByRole('button', { name: /check/i }));

    await waitFor(() => screen.getByText(/no active consent/i));
    expect(screen.getByRole('button', { name: /request access/i })).toBeInTheDocument();
  });
});

// ─── Request Access modal ─────────────────────────────────────────────────────
describe('DoctorConsentPage — Request Access Modal', () => {
  async function openModal() {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByPlaceholderText(/enter patient uhid/i), 'UH-UNKNOWN');
    await user.click(screen.getByRole('button', { name: /check/i }));
    await waitFor(() => screen.getByText(/no active consent/i));
    await user.click(screen.getByRole('button', { name: /request access/i }));
    await waitFor(() => screen.getByRole('dialog'));
    return user;
  }

  it('opens modal with heading', async () => {
    await openModal();
    expect(screen.getByText(/request record access/i)).toBeInTheDocument();
  });

  it('renders scope checkboxes', async () => {
    await openModal();
    expect(screen.getByLabelText('Complete Medical History')).toBeInTheDocument();
    expect(screen.getByLabelText('Lab Reports')).toBeInTheDocument();
  });

  it('renders duration buttons', async () => {
    await openModal();
    expect(screen.getByRole('button', { name: /24 hours/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /7 days/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /permanent/i })).toBeInTheDocument();
  });

  it('closes modal on Cancel', async () => {
    const user = await openModal();
    await user.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows validation error when no scope selected and submits', async () => {
    const user = await openModal();
    // Form opens with no scope selected — just submit immediately
    await user.click(screen.getByRole('button', { name: /send request/i }));
    await waitFor(() => {
      expect(screen.getByText(/select at least one/i)).toBeInTheDocument();
    });
  });

  it('shows validation error when purpose is too short', async () => {
    const user = await openModal();
    // Select a scope
    await user.click(screen.getByLabelText('Lab Reports'));
    await user.type(screen.getByPlaceholderText(/e\.g\. New patient/i), 'Short');
    await user.click(screen.getByRole('button', { name: /send request/i }));
    await waitFor(() => {
      expect(screen.getByText(/at least 10 characters/i)).toBeInTheDocument();
    });
  });

  it('submits successfully and shows success message', async () => {
    const user = await openModal();
    await user.click(screen.getByLabelText('Lab Reports'));
    await user.type(
      screen.getByPlaceholderText(/e\.g\. New patient/i),
      'Cardiology consultation for new patient referred by GP'
    );
    await user.click(screen.getByRole('button', { name: /send request/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/access request sent/i);
    });
  });

  it('shows API error in modal on 409', async () => {
    server.use(
      http.post('/api/v1/consents/request', () =>
        HttpResponse.json(
          { success: false, error: 'A pending consent request already exists.' },
          { status: 409 }
        )
      )
    );
    const user = await openModal();
    await user.click(screen.getByLabelText('Lab Reports'));
    await user.type(
      screen.getByPlaceholderText(/e\.g\. New patient/i),
      'Test consultation request for existing patient'
    );
    await user.click(screen.getByRole('button', { name: /send request/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/already exists/i);
    });
  });
});
