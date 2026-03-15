import { describe, it, expect } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { createWrapper, setMockUser, PATIENT_USER, DOCTOR_USER } from '@/test/utils';
import ProfilePage from '@/pages/shared/ProfilePage';

function renderAsPatient() {
  setMockUser(PATIENT_USER);
  const { Wrapper } = createWrapper('/patient/profile');
  return render(<ProfilePage />, { wrapper: Wrapper });
}

function renderAsDoctor() {
  setMockUser(DOCTOR_USER);
  // Override /auth/me to return a doctor profile
  server.use(
    http.get('/api/v1/auth/me', () => {
      return HttpResponse.json({
        success: true,
        data: {
          user: {
            id: 'user_doctor_001',
            email: 'doctor@test.internal',
            role: 'DOCTOR',
            isEmailVerified: true,
            isActive: true,
            createdAt: '2026-01-01T00:00:00.000Z',
          },
          profile: {
            firstName: 'Test',
            lastName: 'Doctor',
            specialty: 'Cardiology',
            licenseNumber: 'LIC123',
            qualifications: ['MBBS', 'MD'],
            experienceYears: 10,
            consultationFee: 500,
            availableForVideo: true,
            availableForInPerson: false,
            languages: ['English', 'Hindi'],
            isVerified: true,
            rating: 4.5,
            totalReviews: 20,
            photoUrl: null,
            hospital: { id: 'hosp_001', name: 'Apollo', city: 'Hyderabad' },
          },
        },
      });
    }),
  );
  const { Wrapper } = createWrapper('/doctor/profile');
  return render(<ProfilePage />, { wrapper: Wrapper });
}

describe('ProfilePage', () => {
  describe('Patient view', () => {
    it('renders My Profile heading', async () => {
      renderAsPatient();
      expect(screen.getByText(/my profile/i)).toBeInTheDocument();
    });

    it('shows patient name and role after loading', async () => {
      renderAsPatient();
      await waitFor(() => {
        expect(screen.getByText('Test Patient')).toBeInTheDocument();
      });
      // "Patient" appears in both the badge and the Account Information row
      const matches = screen.getAllByText('Patient');
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });

    it('shows Edit Profile button for patient', async () => {
      renderAsPatient();
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
      });
    });

    it('displays allergies and chronic conditions', async () => {
      renderAsPatient();
      await waitFor(() => {
        expect(screen.getByText('Peanuts')).toBeInTheDocument();
        expect(screen.getByText('Asthma')).toBeInTheDocument();
      });
    });

    it('displays blood group, phone, address', async () => {
      renderAsPatient();
      await waitFor(() => {
        expect(screen.getByDisplayValue('O+')).toBeInTheDocument();
        expect(screen.getByDisplayValue('9876543210')).toBeInTheDocument();
        expect(screen.getByDisplayValue('123 Test Lane')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Hyderabad')).toBeInTheDocument();
      });
    });

    it('enters edit mode and shows Save / Cancel buttons', async () => {
      renderAsPatient();
      await waitFor(() => screen.getByRole('button', { name: /edit profile/i }));
      fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('shows error state when /auth/me fails', async () => {
      server.use(
        http.get('/api/v1/auth/me', () => HttpResponse.json({ success: false }, { status: 500 })),
      );
      renderAsPatient();
      await waitFor(() => {
        expect(screen.getByText(/failed to load profile/i)).toBeInTheDocument();
      });
    });
  });

  describe('Doctor view', () => {
    it('displays doctor specialty and qualifications', async () => {
      renderAsDoctor();
      await waitFor(() => {
        expect(screen.getByDisplayValue('Cardiology')).toBeInTheDocument();
        expect(screen.getByText('MBBS')).toBeInTheDocument();
        expect(screen.getByText('MD')).toBeInTheDocument();
      });
    });

    it('shows languages', async () => {
      renderAsDoctor();
      await waitFor(() => {
        expect(screen.getByText('English')).toBeInTheDocument();
        expect(screen.getByText('Hindi')).toBeInTheDocument();
      });
    });

    it('shows consultation fee and experience', async () => {
      renderAsDoctor();
      await waitFor(() => {
        expect(screen.getByDisplayValue('500')).toBeInTheDocument();
        expect(screen.getByDisplayValue('10')).toBeInTheDocument();
      });
    });
  });
});
