import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { createWrapper, setMockUser, clearMockUser, PATIENT_USER } from '../utils';
import {
  mockScanLogs,
  mockGeneratedQr,
  mockInvalidateResult,
  mockSosResult,
} from '../mocks/handlers';
import QrPage from '@/pages/patient/QrPage';

function renderPage() {
  const { Wrapper } = createWrapper('/patient/qr');
  return render(<Wrapper><QrPage /></Wrapper>);
}

describe('QrPage', () => {
  beforeEach(() => setMockUser(PATIENT_USER));
  afterEach(() => clearMockUser());

  // ─── Scan Logs ────────────────────────────────────────────────────────────

  it('renders the page header and QR tier descriptions', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/My QR Health Card/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Tier 1 — Public/i)).toBeInTheDocument();
    expect(screen.getByText(/Tier 2 — UHID Doctors/i)).toBeInTheDocument();
    expect(screen.getByText(/Tier 3 — You Share/i)).toBeInTheDocument();
  });

  it('shows loading spinner while fetching scan logs', () => {
    server.use(
      http.get('/api/v1/qr/scan-logs', async () => {
        await new Promise((r) => setTimeout(r, 200));
        return HttpResponse.json({ success: true, data: [] });
      })
    );
    renderPage();
    expect(screen.getByTestId('logs-loading')).toBeInTheDocument();
  });

  it('displays scan logs with correct types and details', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByTestId('scan-log-item').length).toBe(mockScanLogs.length);
    });
    expect(screen.getByText('Dr. Priya Sharma')).toBeInTheDocument();
    expect(screen.getByText(/Manipal Hospital Bangalore/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Doctor Scan/i).length).toBeGreaterThan(0);
    // isSuspicious: true — the word "SUSPICIOUS" appears in scan log item
    expect(screen.getAllByText(/Suspicious/i).length).toBeGreaterThan(0);
  });

  it('shows suspicious badge when there are suspicious scans', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('suspicious-badge')).toBeInTheDocument();
    });
    expect(screen.getByTestId('suspicious-badge')).toHaveTextContent(/1 suspicious/i);
  });

  it('shows empty state when there are no scan logs', async () => {
    server.use(
      http.get('/api/v1/qr/scan-logs', () =>
        HttpResponse.json({ success: true, data: [] })
      )
    );
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('no-logs')).toBeInTheDocument();
    });
  });

  it('filters scan logs by type', async () => {
    renderPage();
    await waitFor(() => screen.getAllByTestId('scan-log-item'));

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Public Scan/i }));

    await waitFor(() => {
      const items = screen.getAllByTestId('scan-log-item');
      // Should show only PUBLIC_SCAN items
      expect(items.length).toBe(
        mockScanLogs.filter((l) => l.scanType === 'PUBLIC_SCAN').length
      );
    });
  });

  // ─── One-Time QR Generation ───────────────────────────────────────────────

  it('generates a one-time QR when the Generate button is clicked', async () => {
    renderPage();
    await waitFor(() => screen.getByTestId('generate-qr-btn'));

    const user = userEvent.setup();
    await user.click(screen.getByTestId('generate-qr-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('generated-qr')).toBeInTheDocument();
    });
    expect(screen.getByText(/One-time QR generated/i)).toBeInTheDocument();
    expect(screen.getByText(/Expires:/i)).toBeInTheDocument();
  });

  it('shows loading state while generating QR', async () => {
    server.use(
      http.post('/api/v1/qr/generate', async () => {
        await new Promise((r) => setTimeout(r, 500));
        return HttpResponse.json({ success: true, tier: 3, data: mockGeneratedQr }, { status: 201 });
      })
    );
    renderPage();
    await waitFor(() => screen.getByTestId('generate-qr-btn'));

    const user = userEvent.setup();
    // Don't await — we want to catch the pending state
    user.click(screen.getByTestId('generate-qr-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('generate-qr-btn')).toBeDisabled();
    });
  });

  // ─── Invalidate QR ────────────────────────────────────────────────────────

  it('shows invalidate confirmation dialog on button click', async () => {
    renderPage();
    await waitFor(() => screen.getByTestId('invalidate-btn'));

    const user = userEvent.setup();
    await user.click(screen.getByTestId('invalidate-btn'));

    expect(screen.getByTestId('invalidate-confirm')).toBeInTheDocument();
    expect(screen.getByText(/Invalidate All Active QR Tokens/i)).toBeInTheDocument();
  });

  it('invalidates QR and shows success message on confirm', async () => {
    renderPage();
    await waitFor(() => screen.getByTestId('invalidate-btn'));

    const user = userEvent.setup();
    await user.click(screen.getByTestId('invalidate-btn'));
    await user.click(screen.getByTestId('confirm-invalidate-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('invalidate-success')).toBeInTheDocument();
    });
    expect(screen.getByTestId('invalidate-success')).toHaveTextContent(/invalidated/i);
  });

  it('cancels invalidate when cancel button is clicked', async () => {
    renderPage();
    await waitFor(() => screen.getByTestId('invalidate-btn'));

    const user = userEvent.setup();
    await user.click(screen.getByTestId('invalidate-btn'));
    expect(screen.getByTestId('invalidate-confirm')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(screen.queryByTestId('invalidate-confirm')).not.toBeInTheDocument();
  });

  // ─── SOS ─────────────────────────────────────────────────────────────────

  it('renders the SOS section', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('sos-btn')).toBeInTheDocument();
    });
    expect(screen.getByText(/SOS Emergency/i)).toBeInTheDocument();
    expect(screen.getByText(/ACTIVATE SOS/i)).toBeInTheDocument();
  });

  it('shows SOS result with emergency code after activation', async () => {
    // Mock geolocation
    Object.defineProperty(global.navigator, 'geolocation', {
      value: {
        getCurrentPosition: (cb: PositionCallback) => {
          cb({ coords: { latitude: 12.97, longitude: 77.59 } } as GeolocationPosition);
        },
      },
      configurable: true,
    });

    renderPage();
    await waitFor(() => screen.getByTestId('sos-btn'));

    const user = userEvent.setup();
    await user.click(screen.getByTestId('sos-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('sos-result')).toBeInTheDocument();
    });
    expect(screen.getByTestId('emergency-code')).toHaveTextContent(mockSosResult.emergencyCode);
    expect(screen.getByText(/3 nearest UHID hospitals alerted/i)).toBeInTheDocument();
  });

  it('activates SOS even when geolocation is unavailable', async () => {
    Object.defineProperty(global.navigator, 'geolocation', {
      value: undefined,
      configurable: true,
    });

    renderPage();
    await waitFor(() => screen.getByTestId('sos-btn'));

    const user = userEvent.setup();
    await user.click(screen.getByTestId('sos-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('sos-result')).toBeInTheDocument();
    });
    expect(screen.getByTestId('emergency-code')).toHaveTextContent(mockSosResult.emergencyCode);
  });

  // ─── Error handling ───────────────────────────────────────────────────────

  it('still renders the page when scan logs fail to load', async () => {
    server.use(
      http.get('/api/v1/qr/scan-logs', () =>
        HttpResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
      )
    );
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/My QR Health Card/i)).toBeInTheDocument();
    });
  });
});
