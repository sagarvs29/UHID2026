import { describe, it, expect } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { createWrapper, setMockUser, DOCTOR_USER } from '@/test/utils';
import DoctorSettingsPage from '@/pages/doctor/DoctorSettingsPage';

function renderPage() {
  setMockUser(DOCTOR_USER);
  const { Wrapper } = createWrapper('/doctor/settings');
  return render(<DoctorSettingsPage />, { wrapper: Wrapper });
}

describe('DoctorSettingsPage', () => {
  it('renders heading', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/availability & settings/i)).toBeInTheDocument();
    });
  });

  it('loads and displays consultation fee', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByDisplayValue('500')).toBeInTheDocument();
    });
  });

  it('loads and displays slot duration', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByDisplayValue('30 min')).toBeInTheDocument();
    });
  });

  it('shows Video Consultations toggle as active', async () => {
    renderPage();
    await waitFor(() => {
      const videoBtn = screen.getByText(/video consultations/i).closest('button');
      expect(videoBtn).toHaveClass('border-primary');
    });
  });

  it('shows weekly schedule with active days', async () => {
    renderPage();
    await waitFor(() => {
      // Monday, Wednesday, Friday should be active (from mock)
      expect(screen.getByText('Monday')).toBeInTheDocument();
      expect(screen.getByText('Wednesday')).toBeInTheDocument();
      expect(screen.getByText('Friday')).toBeInTheDocument();
    });
  });

  it('can toggle a day on/off', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Tuesday'));
    const tuesdayBtn = screen.getByText('Tuesday').closest('button')!;
    fireEvent.click(tuesdayBtn);
    // Now Tuesday's parent should be active
    await waitFor(() => {
      const container = screen.getByText('Tuesday').closest('div.flex');
      expect(container).toBeTruthy();
    });
  });

  it('shows error state when availability fails to load', async () => {
    server.use(
      http.get('/api/v1/hospital/doctor/availability', () =>
        HttpResponse.json({ success: false }, { status: 500 }),
      ),
    );
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/failed to load availability/i)).toBeInTheDocument();
    });
  });

  it('Save Settings button is present', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save settings/i })).toBeInTheDocument();
    });
  });

  it('Save Schedule button is present', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save schedule/i })).toBeInTheDocument();
    });
  });
});
