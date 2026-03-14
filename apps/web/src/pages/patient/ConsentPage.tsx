/**
 * /patient/consent — Full consent management page
 *
 * Sections:
 *  1. Active Permissions — revoke individual consents
 *  2. Pending Requests   — approve (OTP modal) or deny
 *  3. Access History     — paginated timeline
 */
import { useState, useRef, useEffect } from 'react';
import { formatDistanceToNow, format, isPast } from 'date-fns';
import {
  useActiveConsents,
  usePendingConsents,
  useConsentHistory,
  useSendConsentOtp,
  useApproveConsent,
  useDenyConsent,
  useRevokeConsent,
  getConsentErrorMessage,
} from '@/hooks/useConsent';
import type { ActiveConsent, PendingConsent, ConsentHistoryEntry } from '@/types/consent';
import { CONSENT_SCOPE_LABELS } from '@/types/consent';

// ─── Scope badge ──────────────────────────────────────────────────────────────
function ScopeBadge({ scope }: { scope: string }) {
  const label = CONSENT_SCOPE_LABELS[scope as keyof typeof CONSENT_SCOPE_LABELS] ?? scope;
  return (
    <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
      {label}
    </span>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE:  'bg-green-100 text-green-800',
    PENDING: 'bg-yellow-100 text-yellow-800',
    DENIED:  'bg-red-100 text-red-800',
    REVOKED: 'bg-gray-100 text-gray-700',
    EXPIRED: 'bg-orange-100 text-orange-700',
  };
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${map[status] ?? 'bg-muted text-muted-foreground'}`}>
      {status}
    </span>
  );
}

// ─── Expiry countdown ─────────────────────────────────────────────────────────
function ExpiryBadge({ expiresAt }: { expiresAt: string | null }) {
  if (!expiresAt) {
    return <span className="text-xs text-muted-foreground">Permanent</span>;
  }
  const expired = isPast(new Date(expiresAt));
  const label = expired
    ? 'Expired'
    : `Expires ${formatDistanceToNow(new Date(expiresAt), { addSuffix: true })}`;
  return (
    <span className={`text-xs font-medium ${expired ? 'text-red-600' : 'text-amber-600'}`}>
      ⏱ {label}
    </span>
  );
}

// ─── Confirm revoke modal ─────────────────────────────────────────────────────
function RevokeModal({
  consent,
  onConfirm,
  onCancel,
  isPending,
}: {
  consent: ActiveConsent;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-xl bg-background p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-foreground">Revoke Access?</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          You are about to revoke access for{' '}
          <span className="font-semibold text-foreground">{consent.grantedTo.name}</span>.
          They will no longer be able to view your medical records.
        </p>
        <div className="mt-4 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isPending ? 'Revoking…' : 'Yes, Revoke'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── OTP Modal ────────────────────────────────────────────────────────────────
const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60; // seconds

function OtpModal({
  consent,
  onSuccess,
  onCancel,
}: {
  consent: PendingConsent;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [attemptsMsg, setAttemptsMsg] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const sendOtp   = useSendConsentOtp();
  const approveM  = useApproveConsent();

  // Auto-send OTP when modal opens
  useEffect(() => {
    handleSendOtp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resend countdown
  useEffect(() => {
    if (countdown <= 0) return;
    const id = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [countdown]);

  function handleSendOtp() {
    sendOtp.mutate(consent.id, {
      onSuccess: () => {
        setOtpSent(true);
        setCountdown(RESEND_COOLDOWN);
        setAttemptsMsg('');
      },
    });
  }

  function handleOtpChange(index: number, value: string) {
    const char = value.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[index] = char;
    setOtp(next);
    if (char && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handleSubmit() {
    const code = otp.join('');
    if (code.length < OTP_LENGTH) return;
    approveM.mutate({ consentId: consent.id, otp: code }, {
      onSuccess: () => onSuccess(),
      onError: (err) => {
        const msg = getConsentErrorMessage(err);
        setAttemptsMsg(msg);
        setOtp(Array(OTP_LENGTH).fill(''));
        inputRefs.current[0]?.focus();
      },
    });
  }

  const otpComplete = otp.every(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-xl bg-background p-6 shadow-xl">
        {/* Header */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-foreground">Approve Access Request</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Approving access for{' '}
            <span className="font-semibold text-foreground">{consent.requestedBy.name}</span>
          </p>
        </div>

        {/* Scope summary */}
        <div className="mb-4 rounded-lg bg-muted p-3">
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Requested access to</p>
          <div className="flex flex-wrap gap-1.5">
            {consent.scope.map((s) => <ScopeBadge key={s} scope={s} />)}
          </div>
          {consent.durationHours && (
            <p className="mt-2 text-xs text-muted-foreground">
              Duration: {consent.durationHours >= 720
                ? `${consent.durationHours / 720} month(s)`
                : consent.durationHours >= 24
                  ? `${consent.durationHours / 24} day(s)`
                  : `${consent.durationHours} hour(s)`}
            </p>
          )}
        </div>

        {/* OTP section */}
        {!otpSent && sendOtp.isPending && (
          <p className="mb-4 text-center text-sm text-muted-foreground">Sending OTP…</p>
        )}
        {!otpSent && sendOtp.isError && (
          <p className="mb-4 text-center text-sm text-red-600">{getConsentErrorMessage(sendOtp.error)}</p>
        )}
        {otpSent && (
          <>
            <p className="mb-3 text-center text-sm text-muted-foreground">
              OTP sent to your registered email. Valid for 10 minutes.
            </p>

            {/* 6-box OTP input */}
            <div className="mb-3 flex justify-center gap-2" aria-label="OTP input">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  aria-label={`OTP digit ${i + 1}`}
                  className="h-12 w-10 rounded-lg border border-border bg-background text-center text-lg font-bold focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              ))}
            </div>

            {attemptsMsg && (
              <p className="mb-2 text-center text-sm text-red-600" role="alert">{attemptsMsg}</p>
            )}

            {/* Resend */}
            <div className="mb-4 text-center">
              {countdown > 0 ? (
                <span className="text-xs text-muted-foreground">Resend in {countdown}s</span>
              ) : (
                <button
                  onClick={handleSendOtp}
                  disabled={sendOtp.isPending}
                  className="text-xs text-primary underline-offset-2 hover:underline disabled:opacity-50"
                >
                  Resend OTP
                </button>
              )}
            </div>

            <button
              onClick={handleSubmit}
              disabled={!otpComplete || approveM.isPending}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {approveM.isPending ? 'Verifying…' : 'Confirm Approval'}
            </button>
          </>
        )}

        <button
          onClick={onCancel}
          className="mt-3 w-full rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Active consent card ──────────────────────────────────────────────────────
function ActiveConsentCard({ consent, onRevoke }: { consent: ActiveConsent; onRevoke: () => void }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">{consent.grantedToType === 'DOCTOR' ? '👨‍⚕️' : '🏢'}</span>
            <h3 className="font-semibold text-foreground truncate">{consent.grantedTo.name}</h3>
          </div>
          {consent.grantedTo.hospital && (
            <p className="mt-0.5 text-sm text-muted-foreground">{consent.grantedTo.hospital}</p>
          )}
          {consent.grantedTo.specialty && (
            <p className="text-xs text-muted-foreground">{consent.grantedTo.specialty}</p>
          )}
        </div>
        <ExpiryBadge expiresAt={consent.expiresAt} />
      </div>

      <div className="mt-3">
        <p className="mb-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Access to</p>
        <div className="flex flex-wrap gap-1.5">
          {consent.scope.map((s) => <ScopeBadge key={s} scope={s} />)}
        </div>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        <span className="font-medium">Purpose:</span> {consent.purpose}
      </p>

      {consent.grantedAt && (
        <p className="mt-1 text-xs text-muted-foreground">
          Granted {formatDistanceToNow(new Date(consent.grantedAt), { addSuffix: true })}
        </p>
      )}

      <div className="mt-4">
        <button
          onClick={onRevoke}
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors"
        >
          Revoke Access
        </button>
      </div>
    </div>
  );
}

// ─── Pending consent card ─────────────────────────────────────────────────────
function PendingConsentCard({
  consent,
  onApprove,
  onDeny,
  isDenyPending,
}: {
  consent: PendingConsent;
  onApprove: () => void;
  onDeny: () => void;
  isDenyPending: boolean;
}) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-2xl">{consent.grantedToType === 'DOCTOR' ? '👨‍⚕️' : '🏢'}</span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-foreground">{consent.requestedBy.name}</h3>
          {consent.requestedBy.hospital && (
            <p className="text-sm text-muted-foreground">{consent.requestedBy.hospital}</p>
          )}
          {consent.requestedBy.specialty && (
            <p className="text-xs text-muted-foreground">{consent.requestedBy.specialty}</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            Requested {formatDistanceToNow(new Date(consent.requestedAt), { addSuffix: true })}
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-lg bg-background p-3 border border-amber-100">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Purpose</p>
        <p className="text-sm text-foreground">{consent.purpose}</p>
      </div>

      <div className="mt-3">
        <p className="mb-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Requesting access to</p>
        <div className="flex flex-wrap gap-1.5">
          {consent.scope.map((s) => <ScopeBadge key={s} scope={s} />)}
        </div>
      </div>

      {consent.durationHours && (
        <p className="mt-2 text-xs text-muted-foreground">
          ⏱ For {consent.durationHours >= 720
            ? `${consent.durationHours / 720} month(s)`
            : consent.durationHours >= 24
              ? `${consent.durationHours / 24} day(s)`
              : `${consent.durationHours} hour(s)`}
        </p>
      )}
      {!consent.isTemporary && (
        <p className="mt-2 text-xs text-amber-600 font-medium">⚠ Requesting permanent access</p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          onClick={onApprove}
          className="flex-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
        >
          ✅ Approve
        </button>
        <button
          onClick={onDeny}
          disabled={isDenyPending}
          className="flex-1 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          {isDenyPending ? 'Denying…' : '❌ Deny'}
        </button>
      </div>
    </div>
  );
}

// ─── History row ──────────────────────────────────────────────────────────────
function HistoryRow({ entry }: { entry: ConsentHistoryEntry }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-muted text-sm">
        {entry.grantedToType === 'DOCTOR' ? '👨‍⚕️' : '🏢'}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm text-foreground truncate">{entry.party}</span>
          <StatusBadge status={entry.status} />
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground truncate">{entry.purpose}</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {entry.scope.slice(0, 3).map((s) => (
            <span key={s} className="text-xs text-muted-foreground">
              {CONSENT_SCOPE_LABELS[s as keyof typeof CONSENT_SCOPE_LABELS] ?? s}
            </span>
          ))}
          {entry.scope.length > 3 && (
            <span className="text-xs text-muted-foreground">+{entry.scope.length - 3} more</span>
          )}
        </div>
      </div>
      <div className="flex-shrink-0 text-right">
        <p className="text-xs text-muted-foreground">
          {format(new Date(entry.requestedAt), 'MMM d, yyyy')}
        </p>
        {entry.revokedAt && (
          <p className="text-xs text-red-500">Revoked {format(new Date(entry.revokedAt), 'MMM d')}</p>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PatientConsentPage() {
  const [revokeTarget, setRevokeTarget] = useState<ActiveConsent | null>(null);
  const [approveTarget, setApproveTarget] = useState<PendingConsent | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [successMsg, setSuccessMsg] = useState('');

  const activeQ  = useActiveConsents();
  const pendingQ = usePendingConsents();
  const historyQ = useConsentHistory(historyPage);
  const revokeM  = useRevokeConsent();
  const denyM    = useDenyConsent();

  function handleRevoke() {
    if (!revokeTarget) return;
    revokeM.mutate(revokeTarget.id, {
      onSuccess: () => {
        setRevokeTarget(null);
        setSuccessMsg(`Access revoked for ${revokeTarget.grantedTo.name}`);
        setTimeout(() => setSuccessMsg(''), 4000);
      },
    });
  }

  function handleDeny(consentId: string, name: string) {
    denyM.mutate(consentId, {
      onSuccess: () => {
        setSuccessMsg(`Access request from ${name} denied`);
        setTimeout(() => setSuccessMsg(''), 4000);
      },
    });
  }

  function handleApproveSuccess() {
    setApproveTarget(null);
    setSuccessMsg('Access approved successfully!');
    setTimeout(() => setSuccessMsg(''), 4000);
  }

  const pendingCount = pendingQ.data?.length ?? 0;

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Consent Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Control who can access your medical records.
        </p>
      </div>

      {/* Success toast */}
      {successMsg && (
        <div
          role="status"
          className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800 font-medium"
        >
          ✅ {successMsg}
        </div>
      )}

      {/* ── Pending Requests ─────────────────────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-lg font-semibold text-foreground">Pending Requests</h2>
          {pendingCount > 0 && (
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
              {pendingCount}
            </span>
          )}
        </div>

        {pendingQ.isLoading && (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-52 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        )}

        {pendingQ.isError && (
          <p className="text-sm text-red-600">{getConsentErrorMessage(pendingQ.error)}</p>
        )}

        {pendingQ.isSuccess && pendingQ.data.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-3xl">✅</p>
            <p className="mt-2 font-medium text-foreground">No pending requests</p>
            <p className="text-sm text-muted-foreground">You're all caught up.</p>
          </div>
        )}

        {pendingQ.isSuccess && pendingQ.data.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {pendingQ.data.map((c) => (
              <PendingConsentCard
                key={c.id}
                consent={c}
                onApprove={() => setApproveTarget(c)}
                onDeny={() => handleDeny(c.id, c.requestedBy.name)}
                isDenyPending={denyM.isPending && denyM.variables === c.id}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Active Permissions ────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Active Permissions</h2>

        {activeQ.isLoading && (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-44 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        )}

        {activeQ.isError && (
          <p className="text-sm text-red-600">{getConsentErrorMessage(activeQ.error)}</p>
        )}

        {activeQ.isSuccess && activeQ.data.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-3xl">🔒</p>
            <p className="mt-2 font-medium text-foreground">No active access</p>
            <p className="text-sm text-muted-foreground">No one currently has access to your records.</p>
          </div>
        )}

        {activeQ.isSuccess && activeQ.data.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {activeQ.data.map((c) => (
              <ActiveConsentCard
                key={c.id}
                consent={c}
                onRevoke={() => setRevokeTarget(c)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Access History ────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Access History</h2>

        {historyQ.isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        )}

        {historyQ.isError && (
          <p className="text-sm text-red-600">{getConsentErrorMessage(historyQ.error)}</p>
        )}

        {historyQ.isSuccess && historyQ.data.consents.length === 0 && (
          <p className="text-sm text-muted-foreground">No consent history yet.</p>
        )}

        {historyQ.isSuccess && historyQ.data.consents.length > 0 && (
          <>
            <div className="rounded-xl border border-border bg-card px-4">
              {historyQ.data.consents.map((entry) => (
                <HistoryRow key={entry.id} entry={entry} />
              ))}
            </div>

            {/* Pagination */}
            {historyQ.data.pagination.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Page {historyPage} of {historyQ.data.pagination.totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setHistoryPage((p) => p - 1)}
                    disabled={historyPage === 1}
                    className="rounded-lg border border-border px-3 py-1.5 hover:bg-muted disabled:opacity-40"
                  >
                    ← Prev
                  </button>
                  <button
                    onClick={() => setHistoryPage((p) => p + 1)}
                    disabled={historyPage === historyQ.data.pagination.totalPages}
                    className="rounded-lg border border-border px-3 py-1.5 hover:bg-muted disabled:opacity-40"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      {revokeTarget && (
        <RevokeModal
          consent={revokeTarget}
          onConfirm={handleRevoke}
          onCancel={() => setRevokeTarget(null)}
          isPending={revokeM.isPending}
        />
      )}

      {approveTarget && (
        <OtpModal
          consent={approveTarget}
          onSuccess={handleApproveSuccess}
          onCancel={() => setApproveTarget(null)}
        />
      )}
    </div>
  );
}
