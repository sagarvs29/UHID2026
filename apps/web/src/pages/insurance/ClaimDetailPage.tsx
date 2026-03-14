import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Shield,
  ClipboardList,
  History,
  Upload,
  Loader2,
} from 'lucide-react';
import {
  useClaimDetail,
  useClaimDecision,
  useClaimRecords,
  useVerifyRecord,
  useRequestAccess,
} from '@/hooks/useInsurance';
import type { ClaimStatus, FraudFlag, RiskLevel } from '@/types/insurance';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<ClaimStatus, string> = {
  SUBMITTED:    'Submitted',
  UNDER_REVIEW: 'Under Review',
  APPROVED:     'Approved',
  REJECTED:     'Rejected',
  HOLD:         'On Hold',
  PAID:         'Paid',
};

const STATUS_NEXT: Record<ClaimStatus, ClaimStatus[]> = {
  SUBMITTED:    ['UNDER_REVIEW'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED', 'HOLD'],
  HOLD:         ['UNDER_REVIEW', 'APPROVED', 'REJECTED'],
  APPROVED:     ['PAID'],
  REJECTED:     [],
  PAID:         [],
};

const FRAUD_FLAG_LABELS: Record<FraudFlag, string> = {
  DUPLICATE_CLAIM:           'Duplicate Claim',
  RECORD_TAMPER:             'Record Tampering',
  DIAGNOSIS_MISMATCH:        'Diagnosis Mismatch',
  DATE_ANOMALY:              'Date Anomaly',
  HIGH_FREQUENCY:            'High Frequency Submissions',
  FACILITY_UNREGISTERED:     'Unregistered Facility',
  PRESCRIPTION_DISCREPANCY:  'Prescription Discrepancy',
};

const FLAG_SEVERITY: Record<FraudFlag, string> = {
  DUPLICATE_CLAIM:          'bg-red-100 text-red-700',
  RECORD_TAMPER:            'bg-red-200 text-red-900',
  DIAGNOSIS_MISMATCH:       'bg-orange-100 text-orange-700',
  DATE_ANOMALY:             'bg-yellow-100 text-yellow-700',
  HIGH_FREQUENCY:           'bg-orange-100 text-orange-700',
  FACILITY_UNREGISTERED:    'bg-yellow-100 text-yellow-700',
  PRESCRIPTION_DISCREPANCY: 'bg-orange-100 text-orange-700',
};

function riskGaugeColor(level: RiskLevel | null) {
  if (!level) return 'bg-gray-200';
  return { LOW: 'bg-green-500', MODERATE: 'bg-yellow-500', HIGH: 'bg-red-500', CRITICAL: 'bg-red-700' }[level] ?? 'bg-gray-200';
}

type Tab = 'overview' | 'fraud' | 'records' | 'documents' | 'audit';

// ─── Decision Dialog ──────────────────────────────────────────────────────────

function DecisionDialog({
  claimId,
  claimedAmount,
  nextStatuses,
  onClose,
  onDone,
}: {
  claimId: string;
  claimedAmount: number;
  nextStatuses: ClaimStatus[];
  onClose: () => void;
  onDone: () => void;
}) {
  const { mutateAsync, isPending } = useClaimDecision(claimId);
  const [status,         setStatus]         = useState<ClaimStatus>(nextStatuses[0]);
  const [approvedAmount, setApprovedAmount] = useState('');
  const [notes,          setNotes]          = useState('');
  const [settlementDate, setSettlementDate] = useState('');
  const [error,          setError]          = useState('');

  async function handleDecision() {
    setError('');
    if (status === 'APPROVED' && (!approvedAmount || parseFloat(approvedAmount) <= 0)) {
      setError('Approved amount is required'); return;
    }
    if (status === 'REJECTED' && notes.length < 20) {
      setError('Notes must be at least 20 characters when rejecting'); return;
    }
    try {
      await mutateAsync({
        status,
        approvedAmount: approvedAmount ? parseFloat(approvedAmount) : undefined,
        notes:          notes || undefined,
        settlementDate: settlementDate || undefined,
      });
      onDone();
    } catch (e) {
      const err = e as Error & { response?: { data?: { error?: string } } };
      setError(err.response?.data?.error ?? err.message);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-card border shadow-xl p-6 space-y-4" data-testid="decision-dialog">
        <h3 className="text-lg font-bold text-foreground">Update Claim Decision</h3>

        <div>
          <label className="block text-sm font-medium mb-1">New Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ClaimStatus)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            data-testid="decision-status-select"
          >
            {nextStatuses.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>

        {status === 'APPROVED' && (
          <div>
            <label className="block text-sm font-medium mb-1">
              Approved Amount (max ₹{claimedAmount.toLocaleString()})
            </label>
            <input
              data-testid="decision-approved-amount"
              type="number"
              min="1"
              max={claimedAmount}
              value={approvedAmount}
              onChange={(e) => setApprovedAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>
        )}

        {(status === 'APPROVED' || status === 'PAID') && (
          <div>
            <label className="block text-sm font-medium mb-1">Settlement Date</label>
            <input
              type="date"
              value={settlementDate}
              onChange={(e) => setSettlementDate(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">
            Notes {status === 'REJECTED' ? <span className="text-destructive">* (min 20 chars)</span> : ''}
          </label>
          <textarea
            data-testid="decision-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder={status === 'REJECTED' ? 'Rejection reason (required)…' : 'Optional notes…'}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm resize-none"
          />
        </div>

        {error && (
          <p className="text-sm text-destructive" data-testid="decision-error">{error}</p>
        )}

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-muted">
            Cancel
          </button>
          <button
            data-testid="confirm-decision-btn"
            onClick={handleDecision}
            disabled={isPending}
            className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {isPending ? 'Saving…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Verify Record Dialog ─────────────────────────────────────────────────────

function VerifyDialog({
  recordId,
  title,
  onClose,
}: {
  recordId: string;
  title: string;
  onClose: () => void;
}) {
  const { mutateAsync, isPending } = useVerifyRecord();
  const fileRef  = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<import('@/types/insurance').VerifyRecordResponse | null>(null);
  const [error,  setError]  = useState('');

  async function handleVerify() {
    const file = fileRef.current?.files?.[0];
    if (!file) { setError('Please select a file'); return; }
    setError('');
    try {
      const res = await mutateAsync({ file, recordId });
      setResult(res);
    } catch (e) {
      const err = e as Error & { response?: { data?: { error?: string } } };
      setError(err.response?.data?.error ?? err.message);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-card border shadow-xl p-6 space-y-4" data-testid="verify-dialog">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-bold text-foreground">Verify Document</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{title}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {result ? (
          <div
            data-testid="verify-result"
            className={`rounded-xl border p-4 ${result.isAuthentic ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
          >
            <div className="flex items-center gap-2 mb-3">
              {result.isAuthentic ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600" />
              )}
              <span className="font-bold text-sm">
                {result.isAuthentic ? '✅ AUTHENTIC' : '❌ TAMPERED'}
              </span>
            </div>
            <div className="space-y-1 text-xs font-mono text-muted-foreground">
              <div><span className="font-semibold text-foreground">Original:</span> {result.originalHash.slice(0, 20)}…</div>
              <div><span className="font-semibold text-foreground">Submitted:</span> {result.submittedHash.slice(0, 20)}…</div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Verified at {new Date(result.verifiedAt).toLocaleString()}
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Upload the document file to verify its SHA-256 hash against the original on record.
            </p>
            <input
              data-testid="verify-file-input"
              ref={fileRef}
              type="file"
              accept=".pdf,image/*"
              className="w-full text-sm"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-muted">
                Cancel
              </button>
              <button
                data-testid="run-verify-btn"
                onClick={handleVerify}
                disabled={isPending}
                className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Verify Hash'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ClaimDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [activeTab,      setActiveTab]      = useState<Tab>('overview');
  const [showDecision,   setShowDecision]   = useState(false);
  const [verifyRecord,   setVerifyRecord]   = useState<{ id: string; title: string } | null>(null);
  const [showAccessForm, setShowAccessForm] = useState(false);

  const { data: claim, isLoading, isError, refetch } = useClaimDetail(id!);
  const { data: records, isLoading: recordsLoading }  = useClaimRecords(id!);
  const { mutateAsync: requestAccess, isPending: requestPending } = useRequestAccess(id!);

  const [accessForm, setAccessForm] = useState({ scope: 'LAB_REPORT,PRESCRIPTION', purpose: '', durationDays: '30' });
  const [accessError, setAccessError] = useState('');
  const [accessSuccess, setAccessSuccess] = useState('');

  async function handleRequestAccess() {
    setAccessError('');
    if (!accessForm.purpose || accessForm.purpose.length < 10) {
      setAccessError('Purpose must be at least 10 characters'); return;
    }
    try {
      await requestAccess({
        scope:        accessForm.scope.split(',').map((s) => s.trim()),
        purpose:      accessForm.purpose,
        durationDays: parseInt(accessForm.durationDays),
      });
      setAccessSuccess('Access request sent to patient for approval.');
      setShowAccessForm(false);
    } catch (e) {
      const err = e as Error & { response?: { data?: { error?: string } } };
      setAccessError(err.response?.data?.error ?? err.message);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24" data-testid="detail-loading">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !claim) {
    return (
      <div className="py-12 text-center" data-testid="detail-error">
        <p className="text-sm text-destructive mb-3">Failed to load claim detail.</p>
        <button onClick={() => navigate(-1)} className="text-sm text-primary underline">Go back</button>
      </div>
    );
  }

  const nextStatuses = STATUS_NEXT[claim.status];

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/insurance/dashboard')}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground font-mono">{claim.claimNumber}</h1>
            <p className="text-xs text-muted-foreground">{claim.patientName} · {claim.patientUhid}</p>
          </div>
        </div>
        {nextStatuses.length > 0 && (
          <button
            data-testid="update-decision-btn"
            onClick={() => setShowDecision(true)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Update Decision
          </button>
        )}
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {(['overview', 'fraud', 'records', 'documents', 'audit'] as Tab[]).map((tab) => {
          const labels: Record<Tab, string> = {
            overview:  'Overview',
            fraud:     'Fraud Analysis',
            records:   'Patient Records',
            documents: 'Documents',
            audit:     'Audit Trail',
          };
          return (
            <button
              key={tab}
              data-testid={`tab-${tab}`}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {labels[tab]}
            </button>
          );
        })}
      </div>

      {/* ── Tab content ─────────────────────────────────────────────────────── */}

      {/* OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" data-testid="tab-overview-content">
          {[
            { label: 'Claim Type',      value: claim.claimType.replace(/_/g, ' ') },
            { label: 'Status',          value: STATUS_LABELS[claim.status] },
            { label: 'Diagnosis',       value: claim.diagnosis },
            { label: 'ICD-10',          value: claim.icd10Code },
            { label: 'Admission',       value: claim.admissionDate ? new Date(claim.admissionDate).toLocaleDateString() : '—' },
            { label: 'Discharge',       value: claim.dischargeDate ? new Date(claim.dischargeDate).toLocaleDateString() : '—' },
            { label: 'Hospital',        value: claim.hospitalName },
            { label: 'Policy Number',   value: claim.policyNumber ?? '—' },
            { label: 'Claimed Amount',  value: `₹${claim.claimedAmount.toLocaleString()} ${claim.currency}` },
            { label: 'Approved Amount', value: claim.approvedAmount ? `₹${claim.approvedAmount.toLocaleString()}` : '—' },
            { label: 'Settlement Date', value: claim.settlementDate ? new Date(claim.settlementDate).toLocaleDateString() : '—' },
            { label: 'Notes',           value: claim.notes ?? '—' },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg border bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-sm font-medium text-foreground mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* FRAUD ANALYSIS */}
      {activeTab === 'fraud' && (
        <div className="space-y-4" data-testid="tab-fraud-content">
          {/* Score gauge */}
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Fraud Score</h3>
            <div className="flex items-end gap-4">
              <span className="text-5xl font-black text-foreground" data-testid="fraud-score">
                {claim.fraudScore ?? 0}
              </span>
              <span className="text-lg text-muted-foreground mb-1">/ 100</span>
              {claim.riskLevel && (
                <span
                  data-testid="risk-level-badge"
                  className={`mb-1 rounded-full px-3 py-1 text-sm font-bold ${
                    { LOW: 'bg-green-100 text-green-700', MODERATE: 'bg-yellow-100 text-yellow-700', HIGH: 'bg-red-100 text-red-700', CRITICAL: 'bg-red-200 text-red-900' }[claim.riskLevel]
                  }`}
                >
                  {claim.riskLevel}
                </span>
              )}
            </div>
            <div className="mt-3 h-3 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${riskGaugeColor(claim.riskLevel)}`}
                style={{ width: `${claim.fraudScore ?? 0}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {!claim.riskLevel || claim.riskLevel === 'LOW'
                ? 'No significant fraud indicators detected.'
                : claim.riskLevel === 'MODERATE'
                ? 'Moderate risk — supervisor review recommended.'
                : claim.riskLevel === 'HIGH'
                ? 'High risk — detailed manual review required.'
                : 'Critical risk — claim placed on hold pending investigation.'}
            </p>
          </div>

          {/* Flags */}
          {claim.fraudFlags.length > 0 ? (
            <div className="rounded-xl border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Detected Flags</h3>
              <div className="space-y-2">
                {claim.fraudFlags.map((flag) => (
                  <div
                    key={flag}
                    data-testid="fraud-flag"
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${FLAG_SEVERITY[flag as FraudFlag] ?? 'bg-gray-100 text-gray-700'}`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                    {FRAUD_FLAG_LABELS[flag as FraudFlag] ?? flag}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border bg-card p-5 text-center">
              <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No fraud flags detected</p>
            </div>
          )}
        </div>
      )}

      {/* PATIENT RECORDS */}
      {activeTab === 'records' && (
        <div className="space-y-4" data-testid="tab-records-content">
          {accessSuccess && (
            <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700" data-testid="access-success">
              {accessSuccess}
            </div>
          )}

          {recordsLoading ? (
            <div className="flex items-center justify-center py-12" data-testid="records-loading">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : records ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Consent expires: {new Date(records.consentExpiresAt).toLocaleString()}
                </p>
              </div>
              {records.records.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground" data-testid="no-records">
                  No records available in the consented scope.
                </div>
              ) : (
                <div className="grid gap-3">
                  {records.records.map((rec) => (
                    <div key={rec.id} className="rounded-xl border bg-card px-4 py-4 flex items-start justify-between gap-4" data-testid="record-card">
                      <div className="flex items-start gap-3">
                        <FileText className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{rec.title}</p>
                          <p className="text-xs text-muted-foreground">{rec.type} · {new Date(rec.uploadedAt).toLocaleDateString()}</p>
                          {rec.hospital && <p className="text-xs text-muted-foreground">{rec.hospital}</p>}
                        </div>
                      </div>
                      <button
                        data-testid="verify-doc-btn"
                        onClick={() => setVerifyRecord({ id: rec.id, title: rec.title })}
                        className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                      >
                        <Shield className="w-3.5 h-3.5" />
                        Verify
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl border bg-card p-6 text-center space-y-3">
              <Shield className="w-8 h-8 text-muted-foreground/40 mx-auto" />
              <p className="text-sm text-muted-foreground">No active consent for this claim.</p>
              <button
                data-testid="request-access-btn"
                onClick={() => setShowAccessForm(true)}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Request Patient Access
              </button>

              {showAccessForm && (
                <div className="mt-4 text-left space-y-3 rounded-lg border p-4">
                  <div>
                    <label className="block text-xs font-medium mb-1">Scope (comma-separated)</label>
                    <input
                      value={accessForm.scope}
                      onChange={(e) => setAccessForm((f) => ({ ...f, scope: e.target.value }))}
                      className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                      data-testid="access-scope-input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Purpose <span className="text-destructive">*</span></label>
                    <input
                      value={accessForm.purpose}
                      onChange={(e) => setAccessForm((f) => ({ ...f, purpose: e.target.value }))}
                      placeholder="Reason for access (min 10 chars)"
                      className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                      data-testid="access-purpose-input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Duration (days)</label>
                    <input
                      type="number"
                      min="1"
                      max="90"
                      value={accessForm.durationDays}
                      onChange={(e) => setAccessForm((f) => ({ ...f, durationDays: e.target.value }))}
                      className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                    />
                  </div>
                  {accessError && <p className="text-xs text-destructive">{accessError}</p>}
                  <button
                    onClick={handleRequestAccess}
                    disabled={requestPending}
                    data-testid="submit-access-btn"
                    className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                  >
                    {requestPending ? 'Sending…' : 'Send Request'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* DOCUMENTS */}
      {activeTab === 'documents' && (
        <div className="space-y-3" data-testid="tab-documents-content">
          {claim.documents.length === 0 ? (
            <div className="rounded-xl border bg-card p-8 text-center">
              <Upload className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No documents attached to this claim.</p>
            </div>
          ) : (
            claim.documents.map((doc) => (
              <div key={doc.id} className="rounded-xl border bg-card px-4 py-4 flex items-start justify-between gap-4" data-testid="doc-item">
                <div>
                  <p className="text-sm font-medium text-foreground">{doc.documentType}</p>
                  <p className="text-xs text-muted-foreground font-mono">{doc.fileHash.slice(0, 20)}…</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                    {doc.isVerified && <span className="ml-2 text-green-600 font-medium">✓ Verified</span>}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="space-y-2" data-testid="tab-audit-content">
          {claim.auditLogs.length === 0 ? (
            <div className="rounded-xl border bg-card p-8 text-center">
              <History className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No audit events yet.</p>
            </div>
          ) : (
            claim.auditLogs.map((log) => (
              <div key={log.id} className="rounded-lg border bg-card px-4 py-3 flex items-center gap-4" data-testid="audit-entry">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{log.action.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-muted-foreground">{log.actorRole} · {new Date(log.createdAt).toLocaleString()}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${{
                  LOW: 'bg-green-100 text-green-700',
                  MEDIUM: 'bg-yellow-100 text-yellow-700',
                  HIGH: 'bg-red-100 text-red-700',
                  CRITICAL: 'bg-red-200 text-red-900',
                }[log.severity] ?? 'bg-gray-100'}`}>
                  {log.severity}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Dialogs ──────────────────────────────────────────────────────────── */}
      {showDecision && (
        <DecisionDialog
          claimId={claim.id}
          claimedAmount={claim.claimedAmount}
          nextStatuses={nextStatuses}
          onClose={() => setShowDecision(false)}
          onDone={() => { setShowDecision(false); refetch(); }}
        />
      )}

      {verifyRecord && (
        <VerifyDialog
          recordId={verifyRecord.id}
          title={verifyRecord.title}
          onClose={() => setVerifyRecord(null)}
        />
      )}

      {/* Unused imports placeholders */}
      <span className="hidden"><ClipboardList /></span>
    </div>
  );
}
