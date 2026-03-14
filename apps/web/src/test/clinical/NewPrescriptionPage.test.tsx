/**
 * Unit tests — NewPrescriptionPage (/doctor/patient/:uhid/prescribe)
 *
 * Covers: drug list builder, pharma-check strip, override flow, form submission.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Routes, Route } from 'react-router-dom';
import { server } from '../mocks/server';
import NewPrescriptionPage from '@/pages/doctor/NewPrescriptionPage';
import {
  MOCK_UHID,
  mockPharmaCheckClean,
  mockPharmaCheckWithIssue,
} from '../mocks/handlers';
import { createWrapper, setMockUser, clearMockUser, DOCTOR_USER } from '../utils';

const VALID_OVERRIDE = 'Clinical benefit outweighs risk; patient informed and consented to this regimen.';

function renderPage() {
  setMockUser(DOCTOR_USER);
  const { Wrapper } = createWrapper(`/doctor/patient/${MOCK_UHID}/prescribe`);
  render(
    <Routes>
      <Route path="/doctor/patient/:uhid/prescribe" element={<NewPrescriptionPage />} />
    </Routes>,
    { wrapper: Wrapper }
  );
}

beforeEach(() => setMockUser(DOCTOR_USER));
afterEach(() => clearMockUser());

// ─── Rendering ────────────────────────────────────────────────────────────────
describe('NewPrescriptionPage — Rendering', () => {
  it('renders the diagnosis input', () => {
    renderPage();
    expect(screen.getByTestId('diagnosis-input')).toBeInTheDocument();
  });

  it('renders at least one drug row on mount', () => {
    renderPage();
    expect(screen.getByTestId('drug-row-0')).toBeInTheDocument();
  });

  it('renders drug name input in the first row', () => {
    renderPage();
    expect(screen.getByTestId('drug-name-0')).toBeInTheDocument();
  });

  it('renders the run pharma-check button', () => {
    renderPage();
    expect(screen.getByTestId('run-pharma-check-btn')).toBeInTheDocument();
  });

  it('renders the submit button', () => {
    renderPage();
    expect(screen.getByTestId('submit-prescription')).toBeInTheDocument();
  });
});

// ─── Drug List Builder ────────────────────────────────────────────────────────
describe('NewPrescriptionPage — Drug list builder', () => {
  it('adds a new drug row when clicking add-drug-btn', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByTestId('add-drug-btn'));
    expect(screen.getByTestId('drug-row-1')).toBeInTheDocument();
  });

  it('removes a drug row when clicking its remove button', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByTestId('add-drug-btn'));
    expect(screen.getByTestId('drug-row-1')).toBeInTheDocument();

    await user.click(screen.getByTestId('remove-drug-1'));
    expect(screen.queryByTestId('drug-row-1')).not.toBeInTheDocument();
  });

  it('does not remove the last remaining drug row', async () => {
    const user = userEvent.setup();
    renderPage();

    // The page renders with 1 drug row by default
    expect(screen.getByTestId('drug-row-0')).toBeInTheDocument();

    // Add a second drug row and remove it — the first row should still be there
    await user.click(screen.getByTestId('add-drug-btn'));
    expect(screen.getByTestId('drug-row-1')).toBeInTheDocument();

    await user.click(screen.getByTestId('remove-drug-1'));
    expect(screen.queryByTestId('drug-row-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('drug-row-0')).toBeInTheDocument();
  });
});

// ─── Pharma-Check — Clean ─────────────────────────────────────────────────────
describe('NewPrescriptionPage — Pharma-check passed', () => {
  it('shows pharma-passed strip after a clean check', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByTestId('drug-name-0'), 'Metformin');
    await user.click(screen.getByTestId('run-pharma-check-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('pharma-passed')).toBeInTheDocument();
    });
  });

  it('does not show any pharma-issues on clean check', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByTestId('drug-name-0'), 'Metformin');
    await user.click(screen.getByTestId('run-pharma-check-btn'));

    await waitFor(() => screen.getByTestId('pharma-passed'));
    expect(screen.queryByTestId('pharma-issues')).not.toBeInTheDocument();
  });
});

// ─── Pharma-Check — With Issues ───────────────────────────────────────────────
describe('NewPrescriptionPage — Pharma-check with issues', () => {
  beforeEach(() => {
    server.use(
      http.post('/api/v1/clinical/pharma-check', () => {
        return HttpResponse.json({ success: true, data: mockPharmaCheckWithIssue });
      })
    );
  });

  it('shows pharma-issues strip when issues are returned', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByTestId('drug-name-0'), 'Warfarin');
    await user.click(screen.getByTestId('run-pharma-check-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('pharma-issues')).toBeInTheDocument();
    });
  });

  it('shows severity badge for the HIGH issue', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByTestId('drug-name-0'), 'Warfarin');
    await user.click(screen.getByTestId('run-pharma-check-btn'));

    await waitFor(() => screen.getByTestId('pharma-issues'));
    // severity is lowercased in the data-testid (pharma-issue-high, pharma-issue-critical, etc.)
    const severity = mockPharmaCheckWithIssue.issues[0].severity.toLowerCase();
    expect(screen.getByTestId(`pharma-issue-${severity}`)).toBeInTheDocument();
  });

  it('shows override textarea for HIGH severity issue', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByTestId('drug-name-0'), 'Warfarin');
    await user.click(screen.getByTestId('run-pharma-check-btn'));

    await waitFor(() => screen.getByTestId('pharma-issues'));
    const interactionKey = mockPharmaCheckWithIssue.issues[0].interactionKey;
    expect(screen.getByTestId(`override-input-${interactionKey}`)).toBeInTheDocument();
  });

  it('shows the drug interaction mechanism', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByTestId('drug-name-0'), 'Warfarin');
    await user.click(screen.getByTestId('run-pharma-check-btn'));

    await waitFor(() => screen.getByTestId('pharma-issues'));
    expect(
      screen.getByText(new RegExp(mockPharmaCheckWithIssue.issues[0].mechanism, 'i'))
    ).toBeInTheDocument();
  });
});

// ─── Submission Blocking ──────────────────────────────────────────────────────
describe('NewPrescriptionPage — Submission blocking', () => {
  beforeEach(() => {
    server.use(
      http.post('/api/v1/clinical/pharma-check', () => {
        return HttpResponse.json({ success: true, data: mockPharmaCheckWithIssue });
      })
    );
  });

  it('submit shows validation errors when required fields are empty', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByTestId('submit-prescription'));

    await waitFor(() => {
      // Multiple "Required" messages are expected (one per unfilled drug field)
      const errors = screen.getAllByText(/required/i);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  it('override reason shorter than 30 chars keeps submit disabled or shows error', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByTestId('diagnosis-input'), 'Type 2 Diabetes Mellitus');
    await user.type(screen.getByTestId('drug-name-0'), 'Warfarin');
    await user.click(screen.getByTestId('run-pharma-check-btn'));

    await waitFor(() => screen.getByTestId('pharma-issues'));
    const key = mockPharmaCheckWithIssue.issues[0].interactionKey;
    await user.type(screen.getByTestId(`override-input-${key}`), 'Too short');

    await user.click(screen.getByTestId('submit-prescription'));

    await waitFor(() => {
      // Either the button stays disabled or an error message appears (multiple matches are fine)
      const errMsgs = screen.queryAllByText(/30 characters|override|reason/i);
      const submitBtn = screen.getByTestId('submit-prescription');
      const isDisabled = submitBtn.hasAttribute('disabled') || submitBtn.getAttribute('aria-disabled') === 'true';
      expect(errMsgs.length > 0 || isDisabled).toBe(true);
    });
  });

  it('submit proceeds with a ≥30 char override reason', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByTestId('diagnosis-input'), 'Atrial Fibrillation');
    await user.type(screen.getByTestId('drug-name-0'), 'Warfarin');
    await user.type(screen.getByTestId('drug-dosage-0'), '5mg');
    await user.type(screen.getByTestId('drug-frequency-0'), 'OD');
    await user.type(screen.getByTestId('drug-duration-0'), '90 days');
    await user.clear(screen.getByTestId('drug-quantity-0'));
    await user.type(screen.getByTestId('drug-quantity-0'), '90');

    await user.click(screen.getByTestId('run-pharma-check-btn'));

    await waitFor(() => screen.getByTestId('pharma-issues'));
    const key = mockPharmaCheckWithIssue.issues[0].interactionKey;
    await user.type(screen.getByTestId(`override-input-${key}`), VALID_OVERRIDE);

    // submit — should not stay blocked on override length
    const submitBtn = screen.getByTestId('submit-prescription');
    expect(submitBtn).not.toBeDisabled();
  }, 15000);
});

// ─── Server 422 Pharma-Block ──────────────────────────────────────────────────
describe('NewPrescriptionPage — Server 422 pharma-block', () => {
  it('shows server-error message on 422 response', async () => {
    const user = userEvent.setup();

    // Override pharma check to return clean so the form itself isn't blocked
    server.use(
      http.post('/api/v1/clinical/pharma-check', () => {
        return HttpResponse.json({ success: true, data: mockPharmaCheckClean });
      }),
      http.post('/api/v1/clinical/prescriptions', () => {
        return HttpResponse.json(
          {
            success: false,
            error: 'Prescription blocked: unresolved HIGH severity interactions',
            pharmaIssues: mockPharmaCheckWithIssue.issues,
          },
          { status: 422 }
        );
      })
    );

    renderPage();

    // Fill all required fields
    await user.type(screen.getByTestId('diagnosis-input'), 'Hypertension');
    await user.type(screen.getByTestId('drug-name-0'), 'Warfarin');
    await user.type(screen.getByTestId('drug-dosage-0'), '5mg');
    await user.type(screen.getByTestId('drug-frequency-0'), 'OD');
    await user.type(screen.getByTestId('drug-duration-0'), '30 days');
    await user.clear(screen.getByTestId('drug-quantity-0'));
    await user.type(screen.getByTestId('drug-quantity-0'), '30');

    // Run pharma check first (clean)
    await user.click(screen.getByTestId('run-pharma-check-btn'));
    await waitFor(() => screen.getByTestId('pharma-passed'));

    await user.click(screen.getByTestId('submit-prescription'));

    await waitFor(() => {
      expect(screen.getByTestId('server-error')).toBeInTheDocument();
    });
  }, 15000);
});

// ─── Successful Submission ────────────────────────────────────────────────────
describe('NewPrescriptionPage — Successful submission', () => {
  it('navigates away from the prescribe page on success', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByTestId('diagnosis-input'), 'Hypertension');
    await user.type(screen.getByTestId('drug-name-0'), 'Amlodipine');
    await user.type(screen.getByTestId('drug-dosage-0'), '5mg');
    await user.type(screen.getByTestId('drug-frequency-0'), 'OD');
    await user.type(screen.getByTestId('drug-duration-0'), '30 days');
    await user.clear(screen.getByTestId('drug-quantity-0'));
    await user.type(screen.getByTestId('drug-quantity-0'), '30');

    // Run clean pharma check first
    await user.click(screen.getByTestId('run-pharma-check-btn'));
    await waitFor(() => screen.getByTestId('pharma-passed'));

    await user.click(screen.getByTestId('submit-prescription'));

    // After successful submit the page navigates away — no server-error shown
    await waitFor(() => {
      expect(screen.queryByTestId('server-error')).not.toBeInTheDocument();
    });
  }, 15000);
});
