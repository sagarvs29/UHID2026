import { describe, it, expect } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { createWrapper, setMockUser, DOCTOR_USER } from '@/test/utils';
import DoctorAppointmentsPage from '@/pages/doctor/AppointmentsPage';

function renderPage() {
  setMockUser(DOCTOR_USER);
  const { Wrapper } = createWrapper('/doctor/appointments');
  return render(<DoctorAppointmentsPage />, { wrapper: Wrapper });
}

describe('DoctorAppointmentsPage', () => {
  it('renders heading and tabs', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /appointments/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upcoming/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /past/i })).toBeInTheDocument();
  });

  it('shows patient name on appointment card', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Rohan Mehta')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('shows patient UHID', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('UHID-AB12-CD34-5678')).toBeInTheDocument();
    });
  });

  it('shows hospital name', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/apollo hospital/i)).toBeInTheDocument();
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

  it('shows empty state when no upcoming appointments', async () => {
    server.use(
      http.get('/api/v1/hospital/appointments', () =>
        HttpResponse.json({ success: true, data: { total: 0, page: 1, limit: 10, totalPages: 0, appointments: [] } })
      )
    );
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/no upcoming appointments/i)).toBeInTheDocument();
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

  it('opens cancel modal for doctor', async () => {
    renderPage();
    await waitFor(() => screen.getByRole('button', { name: /cancel/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    await waitFor(() => {
      expect(screen.getByText(/cancel appointment/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/reason for cancellation/i)).toBeInTheDocument();
    });
  });

  it('switches to past tab on click', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /past/i }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /past/i })).toBeInTheDocument();
    });
  });

  it('shows confirmation number', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/#APT-2026-98765/)).toBeInTheDocument();
    });
  });
});
