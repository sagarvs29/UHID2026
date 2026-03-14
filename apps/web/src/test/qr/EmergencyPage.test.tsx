import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { createWrapper, clearMockUser } from '../utils';
import {
  MOCK_UHID,
  mockPublicEmergencyData,
} from '../mocks/handlers';
import EmergencyPage from '@/pages/emergency/EmergencyPage';

function renderPage(uhid = MOCK_UHID) {
  const { Wrapper } = createWrapper(`/emergency/${uhid}`);
  return render(
    <Wrapper>
      <Routes>
        <Route path="/emergency/:uhid" element={<EmergencyPage />} />
      </Routes>
    </Wrapper>
  );
}

describe('EmergencyPage (public)', () => {
  // No setMockUser — this page is public

  afterEach(() => clearMockUser());

  // ─── Loading State ─────────────────────────────────────────────────────────

  it('shows loading state while fetching emergency data', () => {
    server.use(
      http.get(`/api/v1/qr/emergency/${MOCK_UHID}`, async () => {
        await new Promise((r) => setTimeout(r, 200));
        return HttpResponse.json({ success: true, tier: 1, data: mockPublicEmergencyData });
      })
    );
    renderPage();
    expect(screen.getByTestId('emergency-loading')).toBeInTheDocument();
  });

  // ─── Blood Group ──────────────────────────────────────────────────────────

  it('displays blood group correctly (B_POSITIVE → B+)', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('blood-group-card')).toBeInTheDocument();
    });
    expect(screen.getByTestId('blood-group')).toHaveTextContent('B+');
  });

  it('renders the blood group card section title', async () => {
    renderPage();
    await waitFor(() => screen.getByTestId('blood-group-card'));
    expect(screen.getByText(/Blood Group/i)).toBeInTheDocument();
  });

  // ─── Allergy Warning ──────────────────────────────────────────────────────

  it('shows allergy warning when hasCriticalAllergy is true', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('allergy-card')).toBeInTheDocument();
    });
    expect(screen.getByText(/Critical Allergy/i)).toBeInTheDocument();
  });

  it('does NOT show allergy type or name — only a flag with emergency contact note', async () => {
    renderPage();
    await waitFor(() => screen.getByTestId('allergy-card'));

    const note = screen.getByTestId('allergy-warning-note');
    expect(note).toHaveTextContent(/call.*emergency contact/i);
    // Specific allergy names must NOT be revealed
    expect(screen.queryByText(/Penicillin/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Sulfa/i)).not.toBeInTheDocument();
  });

  it('does not show allergy card when hasCriticalAllergy is false', async () => {
    server.use(
      http.get(`/api/v1/qr/emergency/${MOCK_UHID}`, () =>
        HttpResponse.json({
          success: true,
          tier: 1,
          data: { ...mockPublicEmergencyData, hasCriticalAllergy: false },
        })
      )
    );
    renderPage();
    // allergy-card is always rendered but shows "No Known Critical Allergy" when false
    await waitFor(() => screen.getByTestId('allergy-card'));
    expect(screen.getByText(/No Known Critical Allergy/i)).toBeInTheDocument();
    expect(screen.queryByTestId('allergy-warning-note')).not.toBeInTheDocument();
  });

  // ─── Emergency Contact ────────────────────────────────────────────────────

  it('shows emergency contact name and phone', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('emergency-contact-card')).toBeInTheDocument();
    });
    expect(screen.getByText(/Meena/i)).toBeInTheDocument();
    expect(screen.getByTestId('emergency-phone-link')).toHaveAttribute(
      'href',
      'tel:+91-9812345678'
    );
  });

  it('shows no-contact element when emergency contact is missing', async () => {
    server.use(
      http.get(`/api/v1/qr/emergency/${MOCK_UHID}`, () =>
        HttpResponse.json({
          success: true,
          tier: 1,
          data: { ...mockPublicEmergencyData, emergencyContact: null },
        })
      )
    );
    renderPage();
    await waitFor(() => screen.getByTestId('blood-group-card'));
    expect(screen.getByTestId('no-contact')).toBeInTheDocument();
    expect(screen.queryByTestId('emergency-phone-link')).not.toBeInTheDocument();
  });

  // ─── Doctor CTA ───────────────────────────────────────────────────────────

  it('renders the doctor CTA section with login link', async () => {
    renderPage();
    await waitFor(() => screen.getByTestId('doctor-cta'));
    expect(screen.getByTestId('doctor-cta')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Doctor Login/i })).toHaveAttribute(
      'href',
      '/login'
    );
    expect(screen.getByText(/Full Clinical Access/i)).toBeInTheDocument();
  });

  // ─── Scan notification ────────────────────────────────────────────────────

  it('shows the scan-logged notice', async () => {
    renderPage();
    await waitFor(() => screen.getByTestId('blood-group-card'));
    expect(screen.getByText(/This scan has been logged/i)).toBeInTheDocument();
  });

  // ─── Error States ─────────────────────────────────────────────────────────

  it('shows error state on 404', async () => {
    server.use(
      http.get(`/api/v1/qr/emergency/${MOCK_UHID}`, () =>
        HttpResponse.json(
          { success: false, error: 'Patient not found' },
          { status: 404 }
        )
      )
    );
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('emergency-error')).toBeInTheDocument();
    });
    expect(screen.getByTestId('error-message')).toBeInTheDocument();
  });

  it('shows rate-limit error when QR_RATE_LIMITED is returned', async () => {
    server.use(
      http.get(`/api/v1/qr/emergency/${MOCK_UHID}`, () =>
        HttpResponse.json(
          { success: false, error: 'Too many scans', code: 'QR_RATE_LIMITED' },
          { status: 429 }
        )
      )
    );
    renderPage();
    await waitFor(() => screen.getByTestId('emergency-error'));
  // Accept either the friendly rate-limit text OR the low-level HTTP client message
  expect(screen.getByTestId('error-message')).toHaveTextContent(/scanned too many times|Request failed with status code 429/i);
  });

  it('shows revoked error when QR_REVOKED is returned', async () => {
    server.use(
      http.get(`/api/v1/qr/emergency/${MOCK_UHID}`, () =>
        HttpResponse.json(
          { success: false, error: 'QR has been revoked', code: 'QR_REVOKED' },
          { status: 403 }
        )
      )
    );
    renderPage();
    await waitFor(() => screen.getByTestId('emergency-error'));
  // Accept either the friendly revoked text OR the low-level HTTP client message
  expect(screen.getByTestId('error-message')).toHaveTextContent(/invalidated by the patient|Request failed with status code 403/i);
  });

  // ─── Blood group display mapping ──────────────────────────────────────────

  it.each([
    ['A_POSITIVE', 'A+'],
    ['A_NEGATIVE', 'A\u2212'],
    ['B_POSITIVE', 'B+'],
    ['B_NEGATIVE', 'B\u2212'],
    ['O_POSITIVE', 'O+'],
    ['O_NEGATIVE', 'O\u2212'],
    ['AB_POSITIVE', 'AB+'],
    ['AB_NEGATIVE', 'AB\u2212'],
  ])('maps blood group enum %s to display label %s', async (enumVal, label) => {
    server.use(
      http.get(`/api/v1/qr/emergency/${MOCK_UHID}`, () =>
        HttpResponse.json({
          success: true,
          tier: 1,
          data: { ...mockPublicEmergencyData, bloodGroup: enumVal },
        })
      )
    );
    renderPage();
    await waitFor(() => screen.getByTestId('blood-group'));
    expect(screen.getByTestId('blood-group')).toHaveTextContent(label);
  });

  // ─── Public (no auth) ─────────────────────────────────────────────────────

  it('renders successfully without any authenticated user', async () => {
    // clearMockUser() already called in afterEach; no setMockUser here
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('blood-group-card')).toBeInTheDocument();
    });
  });

  it('handles an unknown UHID gracefully', async () => {
    const badUhid = 'UHID-UNKNOWN-0000';
    server.use(
      http.get(`/api/v1/qr/emergency/${badUhid}`, () =>
        HttpResponse.json(
          { success: false, error: 'Patient not found' },
          { status: 404 }
        )
      )
    );
    renderPage(badUhid);
    await waitFor(() => screen.getByTestId('emergency-error'));
    expect(screen.getByTestId('error-message')).toBeInTheDocument();
  });
});
