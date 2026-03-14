import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { createWrapper, setMockUser, clearMockUser, INSURANCE_USER } from '../utils';
import { MOCK_CLAIM_ID, MOCK_CLAIM_NUMBER } from '../mocks/handlers';
import NewClaimPage from '@/pages/insurance/NewClaimPage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

async function fillValidForm() {
  await userEvent.type(screen.getByTestId('input-patientUhid'), 'UHID-AB12-CD34-5678');
  await userEvent.selectOptions(screen.getByTestId('select-claimType'), 'HOSPITALIZATION');
  await userEvent.type(screen.getByTestId('input-policyNumber'), 'POL-12345');
  await userEvent.type(screen.getByTestId('input-diagnosis'), 'Pneumonia');
  await userEvent.type(screen.getByTestId('input-icd10Code'), 'J18.9');
  await userEvent.type(screen.getByTestId('input-admissionDate'), '2026-01-10');
  await userEvent.type(screen.getByTestId('input-dischargeDate'), '2026-01-15');
  await userEvent.type(screen.getByTestId('input-hospitalName'), 'Apollo Hospital');
  await userEvent.type(screen.getByTestId('input-claimedAmount'), '250000');
}

describe('NewClaimPage', () => {
  beforeEach(() => {
    setMockUser(INSURANCE_USER);
    mockNavigate.mockClear();
  });

  afterEach(() => {
    clearMockUser();
  });

  it('renders form with all required fields', () => {
    const { Wrapper } = createWrapper('/insurance/claims/new');
    render(<NewClaimPage />, { wrapper: Wrapper });

    expect(screen.getByTestId('input-patientUhid')).toBeInTheDocument();
    expect(screen.getByTestId('select-claimType')).toBeInTheDocument();
    expect(screen.getByTestId('input-diagnosis')).toBeInTheDocument();
    expect(screen.getByTestId('input-icd10Code')).toBeInTheDocument();
    expect(screen.getByTestId('input-hospitalName')).toBeInTheDocument();
    expect(screen.getByTestId('input-claimedAmount')).toBeInTheDocument();
    expect(screen.getByTestId('submit-claim-btn')).toBeInTheDocument();
  });

  it('shows validation errors on empty submit', async () => {
    const { Wrapper } = createWrapper('/insurance/claims/new');
    render(<NewClaimPage />, { wrapper: Wrapper });

    fireEvent.click(screen.getByTestId('submit-claim-btn'));

    await waitFor(() => {
      // expect at least one destructive error paragraph to appear
      const errors = document.querySelectorAll('.text-destructive');
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  it('validates ICD-10 code format', async () => {
    const { Wrapper } = createWrapper('/insurance/claims/new');
    render(<NewClaimPage />, { wrapper: Wrapper });

    await userEvent.type(screen.getByTestId('input-icd10Code'), 'invalid-code');
    fireEvent.click(screen.getByTestId('submit-claim-btn'));

    await waitFor(() => {
      expect(screen.getByText('Invalid ICD-10 code (e.g. J18.9)')).toBeInTheDocument();
    });
  });

  it('shows fraud result card on successful submission', async () => {
    const { Wrapper } = createWrapper('/insurance/claims/new');
    render(<NewClaimPage />, { wrapper: Wrapper });

    await fillValidForm();
    fireEvent.click(screen.getByTestId('submit-claim-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('submit-result')).toBeInTheDocument();
    });

    expect(screen.getByText(MOCK_CLAIM_NUMBER)).toBeInTheDocument();
    expect(screen.getByTestId('risk-level')).toBeInTheDocument();
  });

  it('shows submit error on API failure', async () => {
    server.use(
      http.post('/api/v1/insurance/claims', async () =>
        HttpResponse.json(
          { success: false, error: 'Patient not found' },
          { status: 404 }
        )
      )
    );

    const { Wrapper } = createWrapper('/insurance/claims/new');
    render(<NewClaimPage />, { wrapper: Wrapper });

    await fillValidForm();
    fireEvent.click(screen.getByTestId('submit-claim-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('submit-error')).toBeInTheDocument();
    });
  });

  it('"Submit Another" button resets form after success', async () => {
    const { Wrapper } = createWrapper('/insurance/claims/new');
    render(<NewClaimPage />, { wrapper: Wrapper });

    await fillValidForm();
    fireEvent.click(screen.getByTestId('submit-claim-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('submit-result')).toBeInTheDocument();
    });

    // Find and click "Submit Another"
    const submitAnotherBtn = screen.getByRole('button', { name: /submit another/i });
    fireEvent.click(submitAnotherBtn);

    await waitFor(() => {
      expect(screen.getByTestId('input-patientUhid')).toBeInTheDocument();
      expect(screen.queryByTestId('submit-result')).not.toBeInTheDocument();
    });
  });

  it('"View Claim Detail" button navigates to detail page after success', async () => {
    const { Wrapper } = createWrapper('/insurance/claims/new');
    render(<NewClaimPage />, { wrapper: Wrapper });

    await fillValidForm();
    fireEvent.click(screen.getByTestId('submit-claim-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('submit-result')).toBeInTheDocument();
    });

    const viewBtn = screen.getByRole('button', { name: /view claim detail/i });
    fireEvent.click(viewBtn);
    expect(mockNavigate).toHaveBeenCalledWith(`/insurance/claims/${MOCK_CLAIM_ID}`);
  });
});
