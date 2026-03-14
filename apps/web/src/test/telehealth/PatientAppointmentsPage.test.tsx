import { describe, it, expect } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { createWrapper, setMockUser, PATIENT_USER } from '@/test/utils';
import PatientAppointmentsPage from '@/pages/patient/AppointmentsPage';

function renderPage() {
  setMockUser(PATIENT_USER);
  const { Wrapper } = createWrapper('/patient/appointments');
  return render(<PatientAppointmentsPage />, { wrapper: Wrapper });
}

describe('PatientAppointmentsPage', () => {
  it('renders heading and tabs', () => {
    renderPage();
    expect(screen.getByText(/my appointments/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upcoming/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /past/i })).toBeInTheDocument();
  });

  it('shows appointment card with doctor name', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Dr. Priya Sharma')).toBeInTheDocument();
    });
  });

  it('shows confirmation number', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/#APT-2026-98765/i)).toBeInTheDocument();
    });
  });

  it('shows chief complaint on card', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/persistent dry cough/i)).toBeInTheDocument();
    });
  });

  it('shows Join Call button for VIDEO CONFIRMED appointment', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /join call/i })).toBeInTheDocument();
    });
  });

  it('shows Cancel button for CONFIRMED appointment', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });

  it('shows empty state for upcoming tab when no data', async () => {
    server.use(
      http.get('/api/v1/hospital/appointments', () =>
        HttpResponse.json({ total: 0, page: 1, limit: 10, totalPages: 0, appointments: [] })
      )
    );
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/no upcoming appointments/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /find a doctor/i })).toBeInTheDocument();
    });
  });

  it('shows error state when fetch fails', async () => {
    server.use(
      http.get('/api/v1/hospital/appointments', () =>
        HttpResponse.json({ message: 'error' }, { status: 500 })
      )
    );
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/failed to load appointments/i)).toBeInTheDocument();
    });
  });

  it('opens cancel modal when Cancel is clicked', async () => {
    renderPage();
    await waitFor(() => screen.getByRole('button', { name: /cancel/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    await waitFor(() => {
      expect(screen.getByText(/cancel appointment/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/reason for cancellation/i)).toBeInTheDocument();
    });
  });

  it('disables confirm cancellation button when reason is too short', async () => {
    renderPage();
    await waitFor(() => screen.getByRole('button', { name: /cancel/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    await waitFor(() => screen.getByPlaceholderText(/reason for cancellation/i));
    fireEvent.change(
      screen.getByPlaceholderText(/reason for cancellation/i),
      { target: { value: 'hi' } }
    );
    expect(screen.getByRole('button', { name: /confirm cancellation/i })).toBeDisabled();
  });

  it('switches to past tab on click', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /past/i }));
    // After switch, data is re-fetched — page should still render
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /past/i })).toBeInTheDocument();
    });
  });

  it('shows Leave Review button for COMPLETED appointment', async () => {
    server.use(
      http.get('/api/v1/hospital/appointments', () =>
        HttpResponse.json({
          total: 1, page: 1, limit: 10, totalPages: 1,
          appointments: [{ ...{
            id: 'appt_completed',
            status: 'COMPLETED',
            type: 'IN_PERSON',
            scheduledAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            confirmationNumber: 'APT-2026-00001',
            chiefComplaint: null,
            doctor: { name: 'Dr. Priya Sharma', specialty: 'Internal Medicine' },
            patient: { name: 'Rohan Mehta', uhid: 'UHID-AB12-CD34-5678' },
            hospital: { name: 'Apollo Hospital' },
            videoRoomName: null,
            completedAt: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
            cancelReason: null,
          }}],
        })
      )
    );
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /leave review/i })).toBeInTheDocument();
    });
  });
});
