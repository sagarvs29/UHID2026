import { describe, it, expect } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { createWrapper, setMockUser, PATIENT_USER } from '@/test/utils';
import FindDoctorPage from '@/pages/patient/FindDoctorPage';
import { mockDoctorsResponse, mockSlotsResponse } from '@/test/mocks/handlers';

function renderPage() {
  setMockUser(PATIENT_USER);
  const { Wrapper } = createWrapper('/patient/find-doctor');
  return render(<FindDoctorPage />, { wrapper: Wrapper });
}

describe('FindDoctorPage', () => {
  it('renders heading and search inputs', () => {
    renderPage();
    expect(screen.getByText(/find a doctor/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search by doctor name/i)).toBeInTheDocument();
  });

  it('displays doctor card after data loads', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Dr. Priya Sharma')).toBeInTheDocument();
    });
  });

  it('shows specialty and hospital info on doctor card', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Internal Medicine')).toBeInTheDocument();
      expect(screen.getByText(/Apollo Hospital/)).toBeInTheDocument();
    });
  });

  it('shows result count', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/1 doctor found/i)).toBeInTheDocument();
    });
  });

  it('shows empty state when no doctors returned', async () => {
    server.use(
      http.get('/api/v1/hospital/doctors', () =>
        HttpResponse.json({ total: 0, page: 1, limit: 12, totalPages: 0, doctors: [] })
      )
    );
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/no doctors found/i)).toBeInTheDocument();
    });
  });

  it('opens slot picker modal when Book Appointment is clicked', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Dr. Priya Sharma'));
    const bookBtns = screen.getAllByRole('button', { name: /book appointment/i });
    fireEvent.click(bookBtns[0]);
    await waitFor(() => {
      expect(screen.getByText(/appointment type/i)).toBeInTheDocument();
    });
  });

  it('shows available slots in the modal', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Dr. Priya Sharma'));
    const bookBtns = screen.getAllByRole('button', { name: /book appointment/i });
    fireEvent.click(bookBtns[0]);
    await waitFor(() => {
      expect(screen.getAllByText(/09:00/).length).toBeGreaterThan(0);
    });
  });

  it('shows error message when doctor fetch fails', async () => {
    server.use(
      http.get('/api/v1/hospital/doctors', () =>
        HttpResponse.json({ message: 'Server error' }, { status: 500 })
      )
    );
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/failed to load doctors/i)).toBeInTheDocument();
    });
  });

  it('shows no slots message when no availability', async () => {
    server.use(
      http.get('/api/v1/hospital/doctors/:id/slots', () =>
        HttpResponse.json({ ...mockSlotsResponse, slots: [] })
      )
    );
    renderPage();
    await waitFor(() => screen.getByText('Dr. Priya Sharma'));
    const bookBtns = screen.getAllByRole('button', { name: /book appointment/i });
    fireEvent.click(bookBtns[0]);
    await waitFor(() => {
      expect(screen.getByText(/no available slots/i)).toBeInTheDocument();
    });
  });

  it('disables confirm button when no slot selected', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Dr. Priya Sharma'));
    const bookBtns = screen.getAllByRole('button', { name: /book appointment/i });
    fireEvent.click(bookBtns[0]);
    await waitFor(() => screen.getByText(/appointment type/i));
    const confirmBtn = screen.getByRole('button', { name: /confirm appointment/i });
    expect(confirmBtn).toBeDisabled();
  });

  it('search filters trigger a re-fetch via the Search button', async () => {
    renderPage();
    const input = screen.getByPlaceholderText(/search by doctor name/i);
    fireEvent.change(input, { target: { value: 'Sharma' } });
    fireEvent.click(screen.getByRole('button', { name: /^search$/i }));
    // Page still renders without crash — result count appears
    await waitFor(() => {
      expect(screen.getByText(/doctor found/i)).toBeInTheDocument();
    });
  });
});
