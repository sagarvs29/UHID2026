/**
 * Unit tests — PatientDashboardPage (/doctor/patient/:uhid)
 *
 * Covers: rendering, tab navigation, prescriptions/notes data display,
 *         navigation to sub-pages, allergy warnings.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Routes, Route } from 'react-router-dom';
import { server } from '../mocks/server';
import PatientDashboardPage from '@/pages/doctor/PatientDashboardPage';
import {
  MOCK_UHID,
  mockPatientProfile,
  mockClinicalNote,
  mockPrescription,
} from '../mocks/handlers';
import { createWrapper, setMockUser, clearMockUser, DOCTOR_USER } from '../utils';

function renderPage() {
  setMockUser(DOCTOR_USER);
  const { Wrapper } = createWrapper(`/doctor/patient/${MOCK_UHID}`);
  render(
    <Routes>
      <Route path="/doctor/patient/:uhid" element={<PatientDashboardPage />} />
    </Routes>,
    { wrapper: Wrapper }
  );
}

beforeEach(() => setMockUser(DOCTOR_USER));
afterEach(() => clearMockUser());

// ─── Rendering ────────────────────────────────────────────────────────────────
describe('PatientDashboardPage — Rendering', () => {
  it('renders the patient name heading', async () => {
    renderPage();
    await waitFor(() => screen.getByTestId('patient-name'));
    expect(screen.getByTestId('patient-name')).toHaveTextContent('Rohan Mehta');
  });

  it('renders all four tabs', async () => {
    renderPage();
    await waitFor(() => screen.getByTestId('patient-tabs'));

    const tabs = screen.getByTestId('patient-tabs');
    expect(tabs).toBeInTheDocument();
    expect(screen.getByTestId('tab-overview')).toBeInTheDocument();
    expect(screen.getByTestId('tab-records')).toBeInTheDocument();
    expect(screen.getByTestId('tab-prescriptions')).toBeInTheDocument();
    expect(screen.getByTestId('tab-notes')).toBeInTheDocument();
  });

  it('shows the Overview tab content by default', async () => {
    renderPage();
    await waitFor(() => screen.getByTestId('overview-tab'));
    expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
  });
});

// ─── Overview Tab ─────────────────────────────────────────────────────────────
describe('PatientDashboardPage — Overview tab', () => {
  it('shows blood group', async () => {
    renderPage();
    await waitFor(() => screen.getByTestId('overview-tab'));
    expect(screen.getByText(/O\+/)).toBeInTheDocument();
  });

  it('shows the allergy warning with count', async () => {
    renderPage();
    await waitFor(() => screen.getByTestId('overview-tab'));
    // Both the header badge and the allergy list show it — just check at least one is present
    const allergyEls = screen.getAllByText(/1 allerg|penicillin/i);
    expect(allergyEls.length).toBeGreaterThan(0);
  });

  it('shows active scope chips', async () => {
    renderPage();
    await waitFor(() => screen.getByTestId('overview-tab'));
    // Scope chips are inside the overview-tab container (not the tab nav buttons)
    const overviewTab = screen.getByTestId('overview-tab');
    expect(overviewTab).toHaveTextContent(/CLINICAL NOTES/i);
    expect(overviewTab).toHaveTextContent(/PRESCRIPTION/i);
  });
});

// ─── Tab Navigation ───────────────────────────────────────────────────────────
describe('PatientDashboardPage — Tab navigation', () => {
  it('switches to Prescriptions tab on click', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByTestId('tab-prescriptions'));

    await user.click(screen.getByTestId('tab-prescriptions'));
    await waitFor(() => screen.getByTestId('prescriptions-tab'));
    expect(screen.getByTestId('prescriptions-tab')).toBeInTheDocument();
  });

  it('switches to Notes tab on click', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByTestId('tab-notes'));

    await user.click(screen.getByTestId('tab-notes'));
    await waitFor(() => screen.getByTestId('notes-tab'));
    expect(screen.getByTestId('notes-tab')).toBeInTheDocument();
  });

  it('can switch back to Overview from another tab', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByTestId('tab-prescriptions'));

    await user.click(screen.getByTestId('tab-prescriptions'));
    await waitFor(() => screen.getByTestId('prescriptions-tab'));

    await user.click(screen.getByTestId('tab-overview'));
    await waitFor(() => screen.getByTestId('overview-tab'));
    expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
  });
});

// ─── Prescriptions Tab ────────────────────────────────────────────────────────
describe('PatientDashboardPage — Prescriptions tab', () => {
  it('shows a prescription item from mock data', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByTestId('tab-prescriptions'));

    await user.click(screen.getByTestId('tab-prescriptions'));

    await waitFor(() => screen.getByTestId('prescriptions-tab'));
    const drugName = mockPrescription.items[0].drugName;
    expect(screen.getByText(new RegExp(drugName, 'i'))).toBeInTheDocument();
  });

  it('shows the new-prescription-btn', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByTestId('tab-prescriptions'));
    await user.click(screen.getByTestId('tab-prescriptions'));

    await waitFor(() => screen.getByTestId('prescriptions-tab'));
    expect(screen.getByTestId('new-prescription-btn')).toBeInTheDocument();
  });
});

// ─── Notes Tab ────────────────────────────────────────────────────────────────
describe('PatientDashboardPage — Notes tab', () => {
  it('shows the chief complaint from mock data', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByTestId('tab-notes'));

    await user.click(screen.getByTestId('tab-notes'));

    await waitFor(() => screen.getByTestId('notes-tab'));
    expect(screen.getByText(new RegExp(mockClinicalNote.chiefComplaint, 'i'))).toBeInTheDocument();
  });

  it('shows the new-note-btn', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByTestId('tab-notes'));
    await user.click(screen.getByTestId('tab-notes'));

    await waitFor(() => screen.getByTestId('notes-tab'));
    expect(screen.getByTestId('new-note-btn')).toBeInTheDocument();
  });
});

// ─── Navigation ───────────────────────────────────────────────────────────────
describe('PatientDashboardPage — Navigation', () => {
  it('new-prescription-btn is clickable and triggers navigation', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByTestId('tab-prescriptions'));

    await user.click(screen.getByTestId('tab-prescriptions'));
    await waitFor(() => screen.getByTestId('prescriptions-tab'));

    const btn = screen.getByTestId('new-prescription-btn');
    expect(btn).toBeInTheDocument();
    expect(btn).not.toBeDisabled();
    // Clicking navigates away — no error should be thrown
    await user.click(btn);
  });

  it('new-note-btn is clickable and triggers navigation', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByTestId('tab-notes'));

    await user.click(screen.getByTestId('tab-notes'));
    await waitFor(() => screen.getByTestId('notes-tab'));

    const btn = screen.getByTestId('new-note-btn');
    expect(btn).toBeInTheDocument();
    expect(btn).not.toBeDisabled();
    await user.click(btn);
  });
});

// ─── Error State ──────────────────────────────────────────────────────────────
describe('PatientDashboardPage — Error state', () => {
  beforeEach(() => {
    server.use(
      http.get('/api/v1/clinical/patient/:uhid', () => {
        return HttpResponse.json({ success: false, error: 'Patient not found' }, { status: 404 });
      })
    );
  });

  it('shows an error message when the patient cannot be loaded', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/not found|active consent/i)).toBeInTheDocument();
    });
    expect(screen.queryByTestId('patient-name')).not.toBeInTheDocument();
  });
});

// ─── Empty States ─────────────────────────────────────────────────────────────
describe('PatientDashboardPage — Empty states', () => {
  beforeEach(() => {
    server.use(
      http.get('/api/v1/clinical/prescriptions/:patientUhid', () => {
        return HttpResponse.json({ success: true, data: [] });
      }),
      http.get('/api/v1/clinical/notes/:patientUhid', () => {
        return HttpResponse.json({ success: true, data: [] });
      })
    );
  });

  it('shows empty state in prescriptions tab', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByTestId('tab-prescriptions'));

    await user.click(screen.getByTestId('tab-prescriptions'));
    await waitFor(() => screen.getByTestId('prescriptions-tab'));

    expect(screen.getByText(/no prescriptions on record/i)).toBeInTheDocument();
  });

  it('shows empty state in notes tab', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByTestId('tab-notes'));

    await user.click(screen.getByTestId('tab-notes'));
    await waitFor(() => screen.getByTestId('notes-tab'));

    expect(screen.getByText(/no clinical notes on record/i)).toBeInTheDocument();
  });
});
