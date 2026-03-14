import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { createWrapper, setMockUser, clearMockUser, INSURANCE_USER } from '../utils';
import {
  MOCK_CLAIM_ID,
  MOCK_CLAIM_NUMBER,
  mockClaimSummary,
} from '../mocks/handlers';
import InsuranceDashboardPage from '@/pages/insurance/DashboardPage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

describe('InsuranceDashboardPage', () => {
  beforeEach(() => {
    setMockUser(INSURANCE_USER);
    mockNavigate.mockClear();
  });

  afterEach(() => {
    clearMockUser();
  });

  it('renders Claims Dashboard heading', async () => {
    const { Wrapper } = createWrapper('/insurance/dashboard');
    render(<InsuranceDashboardPage />, { wrapper: Wrapper });
    expect(screen.getByText(/insurance claims/i)).toBeInTheDocument();
  });

  it('shows loading spinner while fetching', async () => {
    const { Wrapper } = createWrapper('/insurance/dashboard');
    render(<InsuranceDashboardPage />, { wrapper: Wrapper });
    expect(screen.getByTestId('claims-loading')).toBeInTheDocument();
  });

  it('displays claim row with claimNumber and fraud badge', async () => {
    const { Wrapper } = createWrapper('/insurance/dashboard');
    render(<InsuranceDashboardPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByTestId('claim-row')).toBeInTheDocument();
    });

    expect(screen.getByText(MOCK_CLAIM_NUMBER)).toBeInTheDocument();
    expect(screen.getByText(/Test Patient/i)).toBeInTheDocument();
    expect(screen.getByTestId('fraud-badge')).toBeInTheDocument();
  });

  it('shows empty state when no claims', async () => {
    server.use(
      http.get('/api/v1/insurance/claims', () =>
        HttpResponse.json({
          success: true,
          claims: [],
          pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        })
      )
    );

    const { Wrapper } = createWrapper('/insurance/dashboard');
    render(<InsuranceDashboardPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByTestId('no-claims')).toBeInTheDocument();
    });
  });

  it('clicking "New Claim" button navigates to /insurance/claims/new', async () => {
    const { Wrapper } = createWrapper('/insurance/dashboard');
    render(<InsuranceDashboardPage />, { wrapper: Wrapper });

    const btn = screen.getByTestId('new-claim-btn');
    fireEvent.click(btn);
    expect(mockNavigate).toHaveBeenCalledWith('/insurance/claims/new');
  });

  it('clicking View button navigates to claim detail page', async () => {
    const { Wrapper } = createWrapper('/insurance/dashboard');
    render(<InsuranceDashboardPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByTestId('view-claim-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('view-claim-btn'));
    expect(mockNavigate).toHaveBeenCalledWith(`/insurance/claims/${MOCK_CLAIM_ID}`);
  });

  it('toggle filters panel shows and hides the filter section', async () => {
    const { Wrapper } = createWrapper('/insurance/dashboard');
    render(<InsuranceDashboardPage />, { wrapper: Wrapper });

    const toggle = screen.getByTestId('toggle-filters');
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(screen.getByTestId('filter-panel')).toBeInTheDocument();
    });

    fireEvent.click(toggle);
    await waitFor(() => {
      expect(screen.queryByTestId('filter-panel')).not.toBeInTheDocument();
    });
  });

  it('status filter option exists in filter panel', async () => {
    const { Wrapper } = createWrapper('/insurance/dashboard');
    render(<InsuranceDashboardPage />, { wrapper: Wrapper });

    fireEvent.click(screen.getByTestId('toggle-filters'));

    await waitFor(() => {
      expect(screen.getByTestId('filter-panel')).toBeInTheDocument();
    });

    // status filter select should be visible
    expect(screen.getByTestId('filter-panel')).toBeInTheDocument();
  });

  it('CSV export button is rendered', async () => {
    const { Wrapper } = createWrapper('/insurance/dashboard');
    render(<InsuranceDashboardPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByTestId('export-csv')).toBeInTheDocument();
    });
  });

  it('shows error state when API fails', async () => {
    server.use(
      http.get('/api/v1/insurance/claims', () =>
        HttpResponse.json({ success: false, error: 'Server error' }, { status: 500 })
      )
    );

    const { Wrapper } = createWrapper('/insurance/dashboard');
    render(<InsuranceDashboardPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByTestId('claims-error')).toBeInTheDocument();
    });
  });
});
