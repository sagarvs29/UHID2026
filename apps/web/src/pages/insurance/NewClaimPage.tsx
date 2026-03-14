import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useSubmitClaim } from '@/hooks/useInsurance';
import type { ClaimType, SubmitClaimResponse } from '@/types/insurance';

const CLAIM_TYPES: { value: ClaimType; label: string }[] = [
  { value: 'HOSPITALIZATION',  label: 'Hospitalization' },
  { value: 'OUTPATIENT',       label: 'Outpatient' },
  { value: 'SURGERY',          label: 'Surgery' },
  { value: 'MATERNITY',        label: 'Maternity' },
  { value: 'DENTAL',           label: 'Dental' },
  { value: 'VISION',           label: 'Vision' },
  { value: 'CRITICAL_ILLNESS', label: 'Critical Illness' },
];

function riskColor(level: string) {
  if (level === 'LOW')      return 'text-green-600 bg-green-50 border-green-200';
  if (level === 'MODERATE') return 'text-yellow-700 bg-yellow-50 border-yellow-200';
  if (level === 'HIGH')     return 'text-red-600 bg-red-50 border-red-200';
  return 'text-red-900 bg-red-100 border-red-300';
}

export default function NewClaimPage() {
  const navigate = useNavigate();
  const { mutateAsync: submit, isPending } = useSubmitClaim();

  const [form, setForm] = useState({
    patientUhid:   '',
    policyNumber:  '',
    claimType:     '' as ClaimType | '',
    diagnosis:     '',
    icd10Code:     '',
    admissionDate: '',
    dischargeDate: '',
    hospitalName:  '',
    claimedAmount: '',
    currency:      'INR',
    notes:         '',
  });

  const [errors, setErrors]   = useState<Record<string, string>>({});
  const [result, setResult]   = useState<SubmitClaimResponse | null>(null);
  const [submitError, setSubmitError] = useState('');

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: '' }));
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    const uhidRe = /^UHID-[A-Z0-9]{4}-[A-Z0-9]{4}-[0-9]{4}$/;
    if (!form.patientUhid.match(uhidRe))      newErrors.patientUhid   = 'Invalid UHID format (e.g. UHID-AB12-CD34-5678)';
    if (!form.claimType)                       newErrors.claimType     = 'Claim type is required';
    if (!form.diagnosis.trim())                newErrors.diagnosis     = 'Diagnosis is required';
    const icd10Re = /^[A-Z][0-9]{2}(\.[0-9A-Z]{1,4})?$/;
    if (!form.icd10Code.match(icd10Re))        newErrors.icd10Code     = 'Invalid ICD-10 code (e.g. J18.9)';
    if (!form.admissionDate)                   newErrors.admissionDate = 'Admission date is required';
    else if (new Date(form.admissionDate) > new Date()) newErrors.admissionDate = 'Admission date must be in the past';
    if (form.dischargeDate && form.admissionDate &&
        new Date(form.dischargeDate) < new Date(form.admissionDate))
      newErrors.dischargeDate = 'Discharge date must be on or after admission date';
    if (!form.hospitalName.trim())             newErrors.hospitalName  = 'Hospital name is required';
    const amt = parseFloat(form.claimedAmount);
    if (isNaN(amt) || amt <= 0)                newErrors.claimedAmount = 'Enter a positive amount';
    else if (amt > 10_000_000)                 newErrors.claimedAmount = 'Amount cannot exceed ₹1 crore';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError('');
    if (!validate()) return;
    try {
      const res = await submit({
        patientUhid:   form.patientUhid,
        policyNumber:  form.policyNumber || undefined,
        claimType:     form.claimType as ClaimType,
        diagnosis:     form.diagnosis,
        icd10Code:     form.icd10Code,
        admissionDate: form.admissionDate,
        dischargeDate: form.dischargeDate || undefined,
        hospitalName:  form.hospitalName,
        claimedAmount: parseFloat(form.claimedAmount),
        currency:      form.currency,
        notes:         form.notes || undefined,
      });
      setResult(res);
    } catch (err) {
      const e = err as Error & { response?: { data?: { error?: string } } };
      setSubmitError(
        e.response?.data?.error ?? e.message ?? 'Failed to submit claim',
      );
    }
  }

  // ── Success state ─────────────────────────────────────────────────────────
  if (result) {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <button
          onClick={() => navigate('/insurance/dashboard')}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        <div data-testid="submit-result" className={`rounded-xl border p-6 ${riskColor(result.riskLevel)}`}>
          <div className="flex items-start gap-3">
            {result.riskLevel === 'LOW' ? (
              <CheckCircle2 className="w-6 h-6 mt-0.5 text-green-600" />
            ) : (
              <AlertTriangle className="w-6 h-6 mt-0.5" />
            )}
            <div className="flex-1">
              <h2 className="text-lg font-bold">Claim Submitted</h2>
              <p className="text-sm mt-1">
                Claim <span className="font-mono font-semibold">{result.claimNumber}</span> has been
                submitted successfully.
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-xs font-medium opacity-70">Claim ID</span>
              <p className="font-mono text-xs mt-0.5">{result.claimId}</p>
            </div>
            <div>
              <span className="text-xs font-medium opacity-70">Status</span>
              <p className="font-semibold mt-0.5">{result.status}</p>
            </div>
            <div>
              <span className="text-xs font-medium opacity-70">Fraud Score</span>
              <p className="font-bold mt-0.5 text-2xl">{result.fraudScore}</p>
            </div>
            <div>
              <span className="text-xs font-medium opacity-70">Risk Level</span>
              <p className="font-bold mt-0.5 text-2xl" data-testid="risk-level">{result.riskLevel}</p>
            </div>
          </div>
          {result.riskLevel === 'HIGH' || result.riskLevel === 'CRITICAL' ? (
            <p className="mt-3 text-xs font-medium">
              ⚠ This claim has been flagged for manual review due to elevated fraud indicators.
            </p>
          ) : null}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => navigate(`/insurance/claims/${result.claimId}`)}
            className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            View Claim Detail
          </button>
          <button
            onClick={() => { setResult(null); setForm({ patientUhid: '', policyNumber: '', claimType: '', diagnosis: '', icd10Code: '', admissionDate: '', dischargeDate: '', hospitalName: '', claimedAmount: '', currency: 'INR', notes: '' }); }}
            className="flex-1 rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-muted"
          >
            Submit Another
          </button>
        </div>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/insurance/dashboard')}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div>
          <h1 className="text-xl font-bold text-foreground">New Insurance Claim</h1>
          <p className="text-sm text-muted-foreground">Submit a new claim for a patient</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-6 space-y-5" noValidate>

        {/* Patient UHID */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Patient UHID <span className="text-destructive">*</span>
          </label>
          <input
            data-testid="input-patientUhid"
            type="text"
            value={form.patientUhid}
            onChange={(e) => set('patientUhid', e.target.value.toUpperCase())}
            placeholder="UHID-AB12-CD34-5678"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {errors.patientUhid && <p className="mt-1 text-xs text-destructive">{errors.patientUhid}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Claim Type */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Claim Type <span className="text-destructive">*</span>
            </label>
            <select
              data-testid="select-claimType"
              value={form.claimType}
              onChange={(e) => set('claimType', e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Select type…</option>
              {CLAIM_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            {errors.claimType && <p className="mt-1 text-xs text-destructive">{errors.claimType}</p>}
          </div>

          {/* Policy Number */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Policy Number
            </label>
            <input
              data-testid="input-policyNumber"
              type="text"
              value={form.policyNumber}
              onChange={(e) => set('policyNumber', e.target.value)}
              placeholder="POL-12345"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        {/* Diagnosis */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Diagnosis <span className="text-destructive">*</span>
          </label>
          <input
            data-testid="input-diagnosis"
            type="text"
            value={form.diagnosis}
            onChange={(e) => set('diagnosis', e.target.value)}
            placeholder="Primary diagnosis"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {errors.diagnosis && <p className="mt-1 text-xs text-destructive">{errors.diagnosis}</p>}
        </div>

        {/* ICD-10 Code */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            ICD-10 Code <span className="text-destructive">*</span>
          </label>
          <input
            data-testid="input-icd10Code"
            type="text"
            value={form.icd10Code}
            onChange={(e) => set('icd10Code', e.target.value.toUpperCase())}
            placeholder="J18.9"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {errors.icd10Code && <p className="mt-1 text-xs text-destructive">{errors.icd10Code}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Admission Date */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Admission Date <span className="text-destructive">*</span>
            </label>
            <input
              data-testid="input-admissionDate"
              type="date"
              value={form.admissionDate}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => set('admissionDate', e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {errors.admissionDate && <p className="mt-1 text-xs text-destructive">{errors.admissionDate}</p>}
          </div>

          {/* Discharge Date */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Discharge Date
            </label>
            <input
              data-testid="input-dischargeDate"
              type="date"
              value={form.dischargeDate}
              min={form.admissionDate || undefined}
              onChange={(e) => set('dischargeDate', e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {errors.dischargeDate && <p className="mt-1 text-xs text-destructive">{errors.dischargeDate}</p>}
          </div>
        </div>

        {/* Hospital Name */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Hospital Name <span className="text-destructive">*</span>
          </label>
          <input
            data-testid="input-hospitalName"
            type="text"
            value={form.hospitalName}
            onChange={(e) => set('hospitalName', e.target.value)}
            placeholder="Hospital or clinic name"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {errors.hospitalName && <p className="mt-1 text-xs text-destructive">{errors.hospitalName}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Claimed Amount */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Claimed Amount (₹) <span className="text-destructive">*</span>
            </label>
            <input
              data-testid="input-claimedAmount"
              type="number"
              min="1"
              max="10000000"
              step="0.01"
              value={form.claimedAmount}
              onChange={(e) => set('claimedAmount', e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {errors.claimedAmount && <p className="mt-1 text-xs text-destructive">{errors.claimedAmount}</p>}
          </div>

          {/* Currency */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Currency</label>
            <select
              value={form.currency}
              onChange={(e) => set('currency', e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="INR">INR</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Notes</label>
          <textarea
            data-testid="input-notes"
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            rows={3}
            placeholder="Additional notes or context for this claim…"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          />
        </div>

        {submitError && (
          <div
            data-testid="submit-error"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {submitError}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/insurance/dashboard')}
            className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-semibold hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            data-testid="submit-claim-btn"
            type="submit"
            disabled={isPending}
            className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            {isPending ? 'Submitting…' : 'Submit Claim'}
          </button>
        </div>
      </form>
    </div>
  );
}
