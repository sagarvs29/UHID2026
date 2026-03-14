import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Routes, Route } from 'react-router-dom';
import { server } from '../mocks/server';
import { createWrapper, setMockUser, clearMockUser, PATIENT_USER } from '../utils';
import { MOCK_RECORD_ID, mockDecodeResponse } from '../mocks/handlers';
import AiReportPage from '@/pages/patient/AiReportPage';

function renderAtRoute(recordId = MOCK_RECORD_ID) {
  const { Wrapper } = createWrapper(`/patient/records/${recordId}/ai`);
  return render(
    <Wrapper>
      <Routes>
        <Route path="/patient/records/:id/ai" element={<AiReportPage />} />
      </Routes>
    </Wrapper>
  );
}

describe('AiReportPage', () => {
  beforeEach(() => {
    setMockUser(PATIENT_USER);
  });

  afterEach(() => {
    clearMockUser();
  });

  it('renders the initial prompt state with an Analyse button', async () => {
    // The default handler returns 404 for the cached summary, so the page
    // should show the "no result yet" CTA.
    renderAtRoute();

    await waitFor(() => {
      expect(screen.getByText(/Explain This Report/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Analyse Report/i)).toBeInTheDocument();
  });

  it('shows a loading spinner while decoding', async () => {
    // Delay the decode response so we can observe the loading state
    server.use(
      http.post('/api/v1/ai/decode', async () => {
        await new Promise((r) => setTimeout(r, 200));
        return HttpResponse.json({ success: true, data: mockDecodeResponse });
      })
    );

    renderAtRoute();

    await waitFor(() => screen.getByText(/Analyse Report/i));
    const user = userEvent.setup();
    await user.click(screen.getByText(/Analyse Report/i));

    expect(screen.getByTestId('ai-loading')).toBeInTheDocument();
  });

  it('displays the AI result after a successful decode', async () => {
    renderAtRoute();

    await waitFor(() => screen.getByText(/Analyse Report/i));
    const user = userEvent.setup();
    await user.click(screen.getByText(/Analyse Report/i));

    await waitFor(() => {
      expect(screen.getByTestId('ai-result')).toBeInTheDocument();
    });

    expect(screen.getByTestId('risk-badge')).toHaveTextContent(/Moderate Risk/i);
    expect(screen.getByTestId('summary-text')).toHaveTextContent(/mostly normal/i);
    expect(screen.getByTestId('simplified-values')).toBeInTheDocument();
    expect(screen.getByTestId('action-items')).toBeInTheDocument();
    expect(screen.getByTestId('disclaimer')).toBeInTheDocument();
    expect(screen.getByTestId('regenerate-btn')).toBeInTheDocument();
  });

  it('shows a cached notice when result.cached is true', async () => {
    server.use(
      http.post('/api/v1/ai/decode', () =>
        HttpResponse.json({ success: true, data: { ...mockDecodeResponse, cached: true } })
      )
    );

    renderAtRoute();
    await waitFor(() => screen.getByText(/Analyse Report/i));
    await userEvent.setup().click(screen.getByText(/Analyse Report/i));

    await waitFor(() => {
      expect(screen.getByTestId('cached-notice')).toBeInTheDocument();
    });
  });

  it('renders a cached result directly from GET /summary/:recordId', async () => {
    // Override: GET returns a cached summary immediately
    server.use(
      http.get(`/api/v1/ai/summary/${MOCK_RECORD_ID}`, () =>
        HttpResponse.json({
          success: true,
          data: { ...mockDecodeResponse, cached: true, lastUpdated: new Date().toISOString() },
        })
      )
    );

    renderAtRoute();

    await waitFor(() => {
      expect(screen.getByTestId('ai-result')).toBeInTheDocument();
    });
    expect(screen.getByTestId('cached-notice')).toBeInTheDocument();
  });

  it('shows an error message on decode failure', async () => {
    server.use(
      http.post('/api/v1/ai/decode', () =>
        HttpResponse.json({ success: false, error: 'Insufficient text in this record' }, { status: 422 })
      )
    );

    renderAtRoute();
    await waitFor(() => screen.getByText(/Analyse Report/i));
    await userEvent.setup().click(screen.getByText(/Analyse Report/i));

    await waitFor(() => {
      expect(screen.getByTestId('ai-error')).toBeInTheDocument();
    });
  });

  it('shows the regenerate button and re-triggers decode when clicked', async () => {
    renderAtRoute();
    await waitFor(() => screen.getByText(/Analyse Report/i));
    const user = userEvent.setup();
    await user.click(screen.getByText(/Analyse Report/i));

    await waitFor(() => screen.getByTestId('regenerate-btn'));
    // Click regenerate — should call decode again (no error, no loading shown
    // because MSW responds instantly in tests)
    await user.click(screen.getByTestId('regenerate-btn'));
    // Result should still be shown
    await waitFor(() => {
      expect(screen.getByTestId('ai-result')).toBeInTheDocument();
    });
  });
});
