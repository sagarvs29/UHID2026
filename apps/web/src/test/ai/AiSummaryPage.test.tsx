import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Routes, Route } from 'react-router-dom';
import { server } from '../mocks/server';
import { createWrapper, setMockUser, clearMockUser, DOCTOR_USER } from '../utils';
import { MOCK_UHID, mockClinicalSummaryResponse } from '../mocks/handlers';
import AiSummaryPage from '@/pages/doctor/AiSummaryPage';

function renderAtRoute(uhid = MOCK_UHID) {
  const { Wrapper } = createWrapper(`/doctor/patient/${uhid}/ai-summary`);
  return render(
    <Wrapper>
      <Routes>
        <Route path="/doctor/patient/:uhid/ai-summary" element={<AiSummaryPage />} />
      </Routes>
    </Wrapper>
  );
}

describe('AiSummaryPage', () => {
  beforeEach(() => {
    setMockUser(DOCTOR_USER);
  });

  afterEach(() => {
    clearMockUser();
  });

  it('renders the initial CTA state with a Generate Summary button', () => {
    renderAtRoute();
    expect(screen.getByText(/Generate AI Summary/i)).toBeInTheDocument();
    expect(screen.getByText(/Generate Summary/i)).toBeInTheDocument();
  });

  it('shows a loading spinner while generating', async () => {
    server.use(
      http.post('/api/v1/ai/clinical-summary', async () => {
        await new Promise((r) => setTimeout(r, 200));
        return HttpResponse.json({ success: true, data: mockClinicalSummaryResponse });
      })
    );

    renderAtRoute();
    await waitFor(() => screen.getByText(/Generate Summary/i));
    await userEvent.setup().click(screen.getByText(/Generate Summary/i));

    expect(screen.getByTestId('ai-loading')).toBeInTheDocument();
  });

  it('renders the full summary panel on success', async () => {
    renderAtRoute();
    await waitFor(() => screen.getByText(/Generate Summary/i));
    await userEvent.setup().click(screen.getByText(/Generate Summary/i));

    await waitFor(() => {
      expect(screen.getByTestId('summary-panel')).toBeInTheDocument();
    });

    // summaryForDoctor text from the fixture
    expect(screen.getByText(/Patient presents with CAP/i)).toBeInTheDocument();
    expect(screen.getByTestId('risk-scores')).toBeInTheDocument();
    expect(screen.getByTestId('conditions-list')).toBeInTheDocument();
    expect(screen.getByTestId('medications-list')).toBeInTheDocument();
    expect(screen.getByTestId('vital-trends')).toBeInTheDocument();
    expect(screen.getByTestId('attention-items')).toBeInTheDocument();
    expect(screen.getByTestId('regenerate-btn')).toBeInTheDocument();
  });

  it('shows active conditions with ICD-10 codes', async () => {
    renderAtRoute();
    await waitFor(() => screen.getByText(/Generate Summary/i));
    await userEvent.setup().click(screen.getByText(/Generate Summary/i));

    await waitFor(() => screen.getByTestId('conditions-list'));
    expect(screen.getByText('J18.9')).toBeInTheDocument();
    expect(screen.getByText(/Community-acquired pneumonia/i)).toBeInTheDocument();
  });

  it('shows current medications', async () => {
    renderAtRoute();
    await waitFor(() => screen.getByText(/Generate Summary/i));
    await userEvent.setup().click(screen.getByText(/Generate Summary/i));

    await waitFor(() => screen.getByTestId('medications-list'));
    // Use getAllBy since the drug name appears in both the name span and the list item
    const medList = screen.getByTestId('medications-list');
    expect(medList).toHaveTextContent(/Amoxicillin/i);
  });

  it('shows the cached notice and last-updated when result.cached is true', async () => {
    server.use(
      http.post('/api/v1/ai/clinical-summary', () =>
        HttpResponse.json({
          success: true,
          data: { ...mockClinicalSummaryResponse, cached: true },
        })
      )
    );

    renderAtRoute();
    await waitFor(() => screen.getByText(/Generate Summary/i));
    await userEvent.setup().click(screen.getByText(/Generate Summary/i));

    await waitFor(() => {
      expect(screen.getByTestId('last-updated')).toBeInTheDocument();
    });
  });

  it('shows an error when the API returns 403 (no consent)', async () => {
    server.use(
      http.post('/api/v1/ai/clinical-summary', () =>
        HttpResponse.json(
          { success: false, error: 'No active consent with clinical notes access for this patient' },
          { status: 403 }
        )
      )
    );

    renderAtRoute();
    await waitFor(() => screen.getByText(/Generate Summary/i));
    await userEvent.setup().click(screen.getByText(/Generate Summary/i));

    await waitFor(() => {
      expect(screen.getByTestId('ai-error')).toBeInTheDocument();
    });
    // The error panel renders either the API message or the axios status message
    expect(screen.getByTestId('ai-error').textContent).toMatch(/consent|403/i);
  });

  it('shows the risk stratification grid with four domains', async () => {
    renderAtRoute();
    await waitFor(() => screen.getByText(/Generate Summary/i));
    await userEvent.setup().click(screen.getByText(/Generate Summary/i));

    await waitFor(() => screen.getByTestId('risk-scores'));
    const grid = screen.getByTestId('risk-scores');
    expect(grid).toHaveTextContent(/overall/i);
    expect(grid).toHaveTextContent(/cardiovascular/i);
    expect(grid).toHaveTextContent(/renal/i);
    expect(grid).toHaveTextContent(/diabetic/i);
  });
});
