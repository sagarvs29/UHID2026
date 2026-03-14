import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Plus,
  Download,
  Filter,
} from 'lucide-react';
import { useInsuranceClaims } from '@/hooks/useInsurance';
import type { ClaimStatus, RiskLevel } from '@/types/insurance';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBadge(status: ClaimStatus) {
  const map: Record<ClaimStatus, { label: string; className: string }> = {
    SUBMITTED:    { label: 'Submitted',    className: 'bg-blue-100 text-blue-700' },
    UNDER_REVIEW: { label: 'Under Review', className: 'bg-yellow-100 text-yellow-700' },
    APPROVED:     { label: 'Approved',     className: 'bg-green-100 text-green-700' },
    REJECTED:     { label: 'Rejected',     className: 'bg-red-100 text-red-700' },
    HOLD:         { label: 'On Hold',      className: 'bg-orange-100 text-orange-700' },
    PAID:         { label: 'Paid',         className: 'bg-emerald-100 text-emerald-700' },
  };
  const { label, className } = map[status] ?? { label: status, className: 'bg-gray-100 text-gray-700' };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

function fraudBadge(riskLevel: RiskLevel | null, score: number | null) {
  if (riskLevel === null || score === null) return null;
  const map: Record<RiskLevel, string> = {
    LOW:      'bg-green-100 text-green-700',
    MODERATE: 'bg-yellow-100 text-yellow-700',
    HIGH:     'bg-red-100 text-red-700',
    CRITICAL: 'bg-red-200 text-red-900',
  };
  return (
    <span
      data-testid="fraud-badge"
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${map[riskLevel]}`}
    >
      {(riskLevel === 'HIGH' || riskLevel === 'CRITICAL') && (
        <AlertTriangle className="w-3 h-3" />
      )}
      {riskLevel} ({score})
    </span>
  );
}

function exportCsv(rows: { claims: import('@/types/insurance').ClaimSummary[] } | undefined) {
  if (!rows?.claims.length) return;
  const header = 'Claim#,Patient,Type,Status,Claimed,Approved,Risk,Date';
  const lines = rows.claims.map((c) =>
    [
      c.claimNumber,
      c.patientName,
      c.claimType,
      c.status,
      c.claimedAmount,
      c.approvedAmount ?? '',
      c.riskLevel ?? '',
      new Date(c.createdAt).toLocaleDateString(),
    ].join(','),
  );
  const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'claims-export.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function InsuranceDashboardPage() {
  const navigate = useNavigate();

  const [statusFilter,  setStatusFilter]  = useState<string>('');
  const [typeFilter,    setTypeFilter]    = useState<string>('');
  const [riskFilter,    setRiskFilter]    = useState<string>('');
  const [fromFilter,    setFromFilter]    = useState<string>('');
  const [toFilter,      setToFilter]      = useState<string>('');
  const [page,          setPage]          = useState(1);
  const [showFilters,   setShowFilters]   = useState(false);

  const { data, isLoading, isError } = useInsuranceClaims({
    status:    statusFilter    || undefined,
    claimType: typeFilter      || undefined,
    riskLevel: riskFilter      || undefined,
    from:      fromFilter      || undefined,
    to:        toFilter        || undefined,
    page,
    limit: 20,
  });

  const stats = {
    total:         data?.pagination.total        ?? 0,
    underReview:   data?.claims.filter((c) => c.status === 'UNDER_REVIEW').length ?? 0,
    approvedMonth: data?.claims.filter((c) => c.status === 'APPROVED').length ?? 0,
    totalSettled:  data?.claims
      .filter((c) => c.status === 'PAID')
      .reduce((sum, c) => sum + (c.approvedAmount ?? 0), 0) ?? 0,
  };

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Claims Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage and track all insurance claims
          </p>
        </div>
        <button
          data-testid="new-claim-btn"
          onClick={() => navigate('/insurance/claims/new')}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Claim
        </button>
      </div>

      {/* ── Stats ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Claims',       value: stats.total,                              icon: FileText,     color: 'text-blue-500' },
          { label: 'Under Review',       value: stats.underReview,                        icon: Clock,        color: 'text-yellow-500' },
          { label: 'Approved (shown)',   value: stats.approvedMonth,                      icon: CheckCircle2, color: 'text-green-500' },
          { label: 'Total Settled (₹)', value: `₹${stats.totalSettled.toLocaleString()}`, icon: XCircle,      color: 'text-emerald-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border bg-card px-4 py-4" data-testid="stat-card">
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {/* ── Claims table ────────────────────────────────────────────────────── */}
      <div className="rounded-xl border bg-card px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Claims</h2>
          <div className="flex items-center gap-2">
            <button
              data-testid="toggle-filters"
              onClick={() => setShowFilters((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
            >
              <Filter className="w-3 h-3" />
              Filters
            </button>
            <button
              data-testid="export-csv"
              onClick={() => exportCsv(data)}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
            >
              <Download className="w-3 h-3" />
              CSV
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4 p-3 rounded-lg bg-muted/30" data-testid="filter-panel">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="rounded-md border bg-background px-2 py-1.5 text-xs"
              aria-label="Status filter"
            >
              <option value="">All Statuses</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="HOLD">On Hold</option>
              <option value="PAID">Paid</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              className="rounded-md border bg-background px-2 py-1.5 text-xs"
              aria-label="Type filter"
            >
              <option value="">All Types</option>
              <option value="HOSPITALIZATION">Hospitalization</option>
              <option value="OUTPATIENT">Outpatient</option>
              <option value="SURGERY">Surgery</option>
              <option value="MATERNITY">Maternity</option>
              <option value="DENTAL">Dental</option>
              <option value="VISION">Vision</option>
              <option value="CRITICAL_ILLNESS">Critical Illness</option>
            </select>
            <select
              value={riskFilter}
              onChange={(e) => { setRiskFilter(e.target.value); setPage(1); }}
              className="rounded-md border bg-background px-2 py-1.5 text-xs"
              aria-label="Risk filter"
            >
              <option value="">All Risk Levels</option>
              <option value="LOW">Low Risk</option>
              <option value="MODERATE">Moderate Risk</option>
              <option value="HIGH">High Risk</option>
              <option value="CRITICAL">Critical Risk</option>
            </select>
            <input
              type="date"
              value={fromFilter}
              onChange={(e) => { setFromFilter(e.target.value); setPage(1); }}
              className="rounded-md border bg-background px-2 py-1.5 text-xs"
              aria-label="From date"
            />
            <input
              type="date"
              value={toFilter}
              onChange={(e) => { setToFilter(e.target.value); setPage(1); }}
              className="rounded-md border bg-background px-2 py-1.5 text-xs"
              aria-label="To date"
            />
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12" data-testid="claims-loading">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : isError ? (
          <div className="py-8 text-center text-sm text-destructive" data-testid="claims-error">
            Failed to load claims. Please try again.
          </div>
        ) : !data?.claims.length ? (
          <div className="flex flex-col items-center justify-center py-12 text-center" data-testid="no-claims">
            <FileText className="w-8 h-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No claims found</p>
            <p className="text-xs text-muted-foreground/70 mt-0.5">
              Submit a new claim to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="pb-2 text-left font-medium">Claim #</th>
                  <th className="pb-2 text-left font-medium">Patient</th>
                  <th className="pb-2 text-left font-medium">Type</th>
                  <th className="pb-2 text-right font-medium">Amount</th>
                  <th className="pb-2 text-left font-medium">Status</th>
                  <th className="pb-2 text-left font-medium">Fraud Risk</th>
                  <th className="pb-2 text-left font-medium">Date</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.claims.map((claim) => (
                  <tr
                    key={claim.id}
                    className="hover:bg-muted/30 transition-colors"
                    data-testid="claim-row"
                  >
                    <td className="py-3 pr-4 font-mono text-xs text-primary">{claim.claimNumber}</td>
                    <td className="py-3 pr-4">
                      <div className="font-medium text-foreground">{claim.patientName}</div>
                      <div className="text-xs text-muted-foreground">{claim.patientUhid}</div>
                    </td>
                    <td className="py-3 pr-4 text-xs capitalize">
                      {claim.claimType.replace(/_/g, ' ').toLowerCase()}
                    </td>
                    <td className="py-3 pr-4 text-right font-medium">
                      ₹{claim.claimedAmount.toLocaleString()}
                    </td>
                    <td className="py-3 pr-4">{statusBadge(claim.status)}</td>
                    <td className="py-3 pr-4">{fraudBadge(claim.riskLevel, claim.fraudScore)}</td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground">
                      {new Date(claim.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3">
                      <button
                        data-testid="view-claim-btn"
                        onClick={() => navigate(`/insurance/claims/${claim.id}`)}
                        className="rounded-md px-3 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t text-xs text-muted-foreground">
                <span>
                  Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} claims)
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="rounded border px-2 py-1 disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <button
                    disabled={page >= data.pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded border px-2 py-1 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
