import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { createWrapper, setMockUser, clearMockUser, INSURANCE_USER } from '../utils';
import { MOCK_CLAIM_ID, mockClaimDetail } from '../mocks/handlers';
import ClaimDetailPage from '@/pages/insurance/ClaimDetailPage';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ id: MOCK_CLAIM_ID }),
  };
});

describe('ClaimDetailPage', () => {
  beforeEach(() => {
    setMockUser(INSURANCE_USER);
  });

  afterEach(() => {
    clearMockUser();
  });

  it('shows loading state initially', async () => {
    const { Wrapper } = createWrapper(`/insurance/claims/${MOCK_CLAIM_ID}`);
    render(<ClaimDetailPage />, { wrapper: Wrapper });
    expect(screen.getByTestId('detail-loading')).toBeInTheDocument();
  });

  it('renders claim detail with 5 tabs after loading', async () => {
    const { Wrapper } = createWrapper(`/insurance/claims/${MOCK_CLAIM_ID}`);
    render(<ClaimDetailPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByTestId('tab-overview')).toBeInTheDocument();
    });

    expect(screen.getByTestId('tab-fraud')).toBeInTheDocument();
    expect(screen.getByTestId('tab-records')).toBeInTheDocument();
    expect(screen.getByTestId('tab-documents')).toBeInTheDocument();
    expect(screen.getByTestId('tab-audit')).toBeInTheDocument();
  });

  it('overview tab shows claim fields', async () => {
    const { Wrapper } = createWrapper(`/insurance/claims/${MOCK_CLAIM_ID}`);
    render(<ClaimDetailPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByTestId('tab-overview-content')).toBeInTheDocument();
    });

    expect(screen.getByText(mockClaimDetail.claimNumber)).toBeInTheDocument();
    expect(screen.getByText(/Apollo Hospital/i)).toBeInTheDocument();
  });

  it('fraud tab shows fraud score and risk level badge', async () => {
    const { Wrapper } = createWrapper(`/insurance/claims/${MOCK_CLAIM_ID}`);
    render(<ClaimDetailPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByTestId('tab-fraud')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('tab-fraud'));

    await waitFor(() => {
      expect(screen.getByTestId('tab-fraud-content')).toBeInTheDocument();
    });

    expect(screen.getByTestId('fraud-score')).toBeInTheDocument();
    expect(screen.getByTestId('risk-level-badge')).toBeInTheDocument();
  });

  it('clicking "Update Decision" opens DecisionDialog', async () => {
    const { Wrapper } = createWrapper(`/insurance/claims/${MOCK_CLAIM_ID}`);
    render(<ClaimDetailPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByTestId('update-decision-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('update-decision-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('decision-dialog')).toBeInTheDocument();
    });
  });

  it('approvedAmount field appears when APPROVED is selected in DecisionDialog', async () => {
    // Use a claim in UNDER_REVIEW state so APPROVED is a valid next status
    server.use(
      http.get('/api/v1/insurance/claims/:id', () =>
        HttpResponse.json({
          success: true,
          data: { ...mockClaimDetail, status: 'UNDER_REVIEW' },
        })
      )
    );

    const { Wrapper } = createWrapper(`/insurance/claims/${MOCK_CLAIM_ID}`);
    render(<ClaimDetailPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByTestId('update-decision-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('update-decision-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('decision-dialog')).toBeInTheDocument();
    });

    await userEvent.selectOptions(screen.getByTestId('decision-status-select'), 'APPROVED');

    await waitFor(() => {
      expect(screen.getByTestId('decision-approved-amount')).toBeInTheDocument();
    });
  });

  it('shows notes required error when submitting REJECTED without notes', async () => {
    // Use a claim in UNDER_REVIEW state so REJECTED is a valid next status
    server.use(
      http.get('/api/v1/insurance/claims/:id', () =>
        HttpResponse.json({
          success: true,
          data: { ...mockClaimDetail, status: 'UNDER_REVIEW' },
        })
      )
    );

    const { Wrapper } = createWrapper(`/insurance/claims/${MOCK_CLAIM_ID}`);
    render(<ClaimDetailPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByTestId('update-decision-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('update-decision-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('decision-dialog')).toBeInTheDocument();
    });

    await userEvent.selectOptions(screen.getByTestId('decision-status-select'), 'REJECTED');
    fireEvent.click(screen.getByTestId('confirm-decision-btn'));

    await waitFor(() => {
      expect(screen.getByText(/notes must be at least 20 characters/i)).toBeInTheDocument();
    });
  });

  it('records tab shows no-consent state with Request Access button', async () => {
    const { Wrapper } = createWrapper(`/insurance/claims/${MOCK_CLAIM_ID}`);
    render(<ClaimDetailPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByTestId('tab-records')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('tab-records'));

    await waitFor(() => {
      expect(screen.getByTestId('tab-records-content')).toBeInTheDocument();
    });

    expect(screen.getByTestId('request-access-btn')).toBeInTheDocument();
  });

  it('audit tab shows empty state when no audit logs', async () => {
    const { Wrapper } = createWrapper(`/insurance/claims/${MOCK_CLAIM_ID}`);
    render(<ClaimDetailPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByTestId('tab-audit')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('tab-audit'));

    await waitFor(() => {
      expect(screen.getByTestId('tab-audit-content')).toBeInTheDocument();
    });

    // With empty auditLogs: [], should show empty message
    expect(screen.queryAllByTestId('audit-entry')).toHaveLength(0);
  });

  it('shows 404 error state when claim not found', async () => {
    server.use(
      http.get('/api/v1/insurance/claims/:id', () =>
        HttpResponse.json({ success: false, error: 'Not found' }, { status: 404 })
      )
    );

    const { Wrapper } = createWrapper('/insurance/claims/nonexistent');
    render(<ClaimDetailPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByTestId('detail-error')).toBeInTheDocument();
    });
  });
});
