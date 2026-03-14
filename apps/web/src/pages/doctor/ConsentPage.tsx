/**
 * /doctor/consents — Doctor consent management
 *
 * Features:
 *  - Check consent status for a UHID
 *  - Request access modal (scope checkboxes, purpose, duration)
 *  - Pending / Active consent status indicator
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { formatDistanceToNow, isPast } from 'date-fns';
import {
  useConsentCheck,
  useRequestConsent,
  getConsentErrorMessage,
} from '@/hooks/useConsent';
import {
  CONSENT_SCOPES,
  CONSENT_SCOPE_LABELS,
  DURATION_OPTIONS,
} from '@/types/consent';
import type { ConsentCheckResult } from '@/types/consent';

// ─── Zod schema ───────────────────────────────────────────────────────────────
const requestSchema = z.object({
  patientUhid: z.string().min(1, 'UHID is required'),
  scope: z.array(z.string()).min(1, 'Select at least one access scope'),
  purpose: z.string().min(10, 'Purpose must be at least 10 characters').max(500),
  isTemporary: z.boolean(),
  durationHours: z.number().nullable(),
}).refine(
  (d) => !d.isTemporary || d.durationHours !== null,
  { message: 'Select a duration for temporary access', path: ['durationHours'] }
);

type RequestFormValues = z.infer<typeof requestSchema>;

// ─── Consent status panel ─────────────────────────────────────────────────────
function ConsentStatusPanel({
  uhid,
  result,
  onRequest,
}: {
  uhid: string;
  result: ConsentCheckResult;
  onRequest: () => void;
}) {
  if (result.hasAccess) {
    const expired = result.expiresAt ? isPast(new Date(result.expiresAt)) : false;
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-5">
        <div className="flex items-center gap-2">
          <span className="text-2xl">✅</span>
          <div>
            <p className="font-semibold text-green-800">Active Access — {uhid}</p>
            <p className="text-sm text-green-700">
              Scope: {result.scope?.map((s) => CONSENT_SCOPE_LABELS[s as keyof typeof CONSENT_SCOPE_LABELS] ?? s).join(', ')}
            </p>
          </div>
        </div>
        <p className="mt-2 text-sm text-green-700">
          {expired
            ? '⚠ Access appears to have just expired.'
            : `Expires: ${result.expiresIn ?? 'Permanent'}`}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔒</span>
          <div>
            <p className="font-semibold text-amber-800">No Active Consent — {uhid}</p>
            <p className="text-sm text-amber-700">You need patient approval to access their records.</p>
          </div>
        </div>
        <button
          onClick={onRequest}
          className="flex-shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Request Access
        </button>
      </div>
    </div>
  );
}

// ─── Request access modal ─────────────────────────────────────────────────────
function RequestAccessModal({
  defaultUhid,
  onSuccess,
  onClose,
}: {
  defaultUhid: string;
  onSuccess: (msg: string) => void;
  onClose: () => void;
}) {
  const requestM = useRequestConsent();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      patientUhid: defaultUhid,
      scope: [],
      purpose: '',
      isTemporary: true,
      durationHours: 24,
    },
  });

  const isTemporary = watch('isTemporary');
  const selectedScopes = watch('scope');

  function toggleScope(scope: string) {
    const current = selectedScopes ?? [];
    if (current.includes(scope)) {
      setValue('scope', current.filter((s) => s !== scope), { shouldValidate: true });
    } else {
      setValue('scope', [...current, scope], { shouldValidate: true });
    }
  }

  function onSubmit(values: RequestFormValues) {
    requestM.mutate(
      {
        ...values,
        scope: values.scope as typeof CONSENT_SCOPES[number][],
        durationHours: values.isTemporary ? values.durationHours : null,
      },
      {
        onSuccess: (data) => {
          onSuccess(`Access request sent. Awaiting patient approval. (ID: ${data.consentId})`);
        },
      }
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg rounded-xl bg-background p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 className="mb-1 text-lg font-semibold text-foreground">Request Record Access</h2>
        <p className="mb-5 text-sm text-muted-foreground">The patient will be notified and must approve via OTP.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* UHID */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Patient UHID
            </label>
            <input
              {...register('patientUhid')}
              placeholder="e.g. UH-847291"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {errors.patientUhid && (
              <p className="mt-1 text-xs text-red-600">{errors.patientUhid.message}</p>
            )}
          </div>

          {/* Scope checkboxes */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Access Scope <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CONSENT_SCOPES.map((scope) => (
                <label
                  key={scope}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                    selectedScopes?.includes(scope)
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedScopes?.includes(scope) ?? false}
                    onChange={() => toggleScope(scope)}
                    className="sr-only"
                    aria-label={CONSENT_SCOPE_LABELS[scope]}
                  />
                  <span className="truncate">{CONSENT_SCOPE_LABELS[scope]}</span>
                </label>
              ))}
            </div>
            {errors.scope && (
              <p className="mt-1 text-xs text-red-600">{errors.scope.message}</p>
            )}
          </div>

          {/* Purpose */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Purpose <span className="text-red-500">*</span>
            </label>
            <textarea
              {...register('purpose')}
              rows={3}
              placeholder="e.g. New patient consultation for cardiac evaluation"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
            {errors.purpose && (
              <p className="mt-1 text-xs text-red-600">{errors.purpose.message}</p>
            )}
          </div>

          {/* Duration */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Access Duration</label>
            <div className="flex flex-wrap gap-2">
              {DURATION_OPTIONS.map((opt) => {
                const isPermanent = opt.hours === null;
                const isSelected = isPermanent
                  ? !isTemporary
                  : isTemporary && watch('durationHours') === opt.hours;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => {
                      if (isPermanent) {
                        setValue('isTemporary', false);
                        setValue('durationHours', null);
                      } else {
                        setValue('isTemporary', true);
                        setValue('durationHours', opt.hours!);
                      }
                    }}
                    className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {errors.durationHours && (
              <p className="mt-1 text-xs text-red-600">{errors.durationHours.message}</p>
            )}
          </div>

          {/* API error */}
          {requestM.isError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {getConsentErrorMessage(requestM.error)}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={requestM.isPending}
              className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {requestM.isPending ? 'Sending…' : 'Send Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── UHID search + consent check ─────────────────────────────────────────────
function ConsentChecker() {
  const [inputUhid, setInputUhid]   = useState('');
  const [searchedUhid, setSearchedUhid] = useState('');
  const [showModal, setShowModal]   = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const checkQ = useConsentCheck(searchedUhid);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = inputUhid.trim().toUpperCase();
    if (!trimmed) return;
    setSearchedUhid(trimmed);
    setSuccessMsg('');
  }

  function handleRequestSuccess(msg: string) {
    setShowModal(false);
    setSuccessMsg(msg);
    // Refresh check
    setSearchedUhid((u) => u); // trigger re-render; query already invalidated by hook
  }

  return (
    <div className="space-y-5">
      {/* Search form */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <input
          value={inputUhid}
          onChange={(e) => setInputUhid(e.target.value)}
          placeholder="Enter Patient UHID (e.g. UH-847291)"
          className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          aria-label="Patient UHID"
        />
        <button
          type="submit"
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Check
        </button>
      </form>

      {/* Success msg */}
      {successMsg && (
        <div
          role="status"
          className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800 font-medium"
        >
          ✅ {successMsg}
        </div>
      )}

      {/* Loading */}
      {checkQ.isLoading && (
        <div className="h-20 animate-pulse rounded-xl bg-muted" />
      )}

      {/* Error */}
      {checkQ.isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{getConsentErrorMessage(checkQ.error)}</p>
        </div>
      )}

      {/* Result */}
      {checkQ.isSuccess && searchedUhid && (
        <ConsentStatusPanel
          uhid={searchedUhid}
          result={checkQ.data}
          onRequest={() => setShowModal(true)}
        />
      )}

      {/* Modal */}
      {showModal && (
        <RequestAccessModal
          defaultUhid={searchedUhid}
          onSuccess={handleRequestSuccess}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

// ─── My sent requests list ────────────────────────────────────────────────────
// Shows consents the doctor has requested (via the check endpoint returning pending)
// The check endpoint only tells us the current state; the list is derived from check results
// For a full sent-requests view the doctor can re-check each patient they've queried.

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DoctorConsentPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Patient Consent</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Check access status and request consent from patients to view their medical records.
        </p>
      </div>

      {/* Info banner */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-800">
          <span className="font-semibold">How it works:</span> Enter a patient's UHID to check if you
          have active consent. If not, you can request access — the patient will receive a
          notification and must approve via OTP before you can view their records.
        </p>
      </div>

      {/* Consent checker */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Check / Request Access</h2>
        <ConsentChecker />
      </section>

      {/* Lifecycle reference */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-3 font-semibold text-foreground">Consent Lifecycle</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          {[
            { icon: '📤', label: 'PENDING', desc: 'Request sent — waiting for patient approval' },
            { icon: '✅', label: 'ACTIVE',  desc: 'Patient approved — you can view their records' },
            { icon: '❌', label: 'DENIED',  desc: 'Patient denied your request' },
            { icon: '🔒', label: 'REVOKED', desc: 'Patient revoked previously granted access' },
            { icon: '⏱',  label: 'EXPIRED', desc: 'Access period has ended' },
          ].map(({ icon, label, desc }) => (
            <div key={label} className="flex items-start gap-2">
              <span>{icon}</span>
              <span>
                <span className="font-semibold text-foreground">{label}</span> — {desc}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
