import { useState } from 'react';
import { QrCode, Shield, AlertTriangle, Clock, MapPin, User, Phone, RefreshCw, Siren } from 'lucide-react';
import { useScanLogs, useGenerateQr, useInvalidateQr, useSos } from '@/hooks/useQr';
import type { QrScanLog } from '@/types/qr';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SCAN_TYPE_LABEL: Record<string, string> = {
  PUBLIC_SCAN:       'Public Scan',
  DOCTOR_SCAN:       'Doctor Scan',
  INSURANCE_SCAN:    'Insurance Scan',
  PATIENT_INITIATED: 'Patient Share',
  SUSPICIOUS_SCAN:   'Suspicious',
};

const SCAN_TYPE_COLOR: Record<string, string> = {
  PUBLIC_SCAN:       'bg-green-100 text-green-800',
  DOCTOR_SCAN:       'bg-blue-100 text-blue-800',
  INSURANCE_SCAN:    'bg-yellow-100 text-yellow-800',
  PATIENT_INITIATED: 'bg-purple-100 text-purple-800',
  SUSPICIOUS_SCAN:   'bg-red-100 text-red-800',
};

const SCOPE_OPTIONS = [
  { value: 'LAB_REPORT',        label: 'Lab Reports' },
  { value: 'PRESCRIPTION',      label: 'Prescriptions' },
  { value: 'CLINICAL_NOTES',    label: 'Clinical Notes' },
  { value: 'DISCHARGE_SUMMARY', label: 'Discharge Summaries' },
  { value: 'IMAGING',           label: 'Imaging (X-Ray, MRI)' },
  { value: 'VACCINATION',       label: 'Vaccination Records' },
];

const DURATION_OPTIONS = [
  { value: 5,  label: '5 minutes' },
  { value: 10, label: '10 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '60 minutes' },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScanLogItem({ log }: { log: QrScanLog }) {
  return (
    <div
      data-testid="scan-log-item"
      className={`rounded-lg border p-4 ${log.isSuspicious ? 'border-red-300 bg-red-50' : 'border-border bg-card'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {log.isSuspicious && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700">
                <AlertTriangle className="h-3 w-3" /> SUSPICIOUS
              </span>
            )}
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SCAN_TYPE_COLOR[log.scanType] ?? 'bg-muted text-muted-foreground'}`}>
              {SCAN_TYPE_LABEL[log.scanType] ?? log.scanType}
            </span>
            <span className="text-xs text-muted-foreground">Tier {log.tier}</span>
          </div>

          <p className="mt-1 font-medium text-foreground truncate">
            {log.scannerName ?? 'Anonymous'}
          </p>
          {log.scannerUhidId && (
            <p className="text-xs text-muted-foreground">UHID: {log.scannerUhidId}</p>
          )}
          {log.organization && (
            <p className="text-xs text-muted-foreground">{log.organization}</p>
          )}
        </div>

        <div className="text-right shrink-0">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatDate(log.scannedAt)}
          </div>
          {log.location && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <MapPin className="h-3 w-3" />
              {log.location}
            </div>
          )}
        </div>
      </div>

      {log.isSuspicious && log.suspicionReason && (
        <p className="mt-2 text-xs text-red-600 font-medium">
          Reason: {log.suspicionReason.replace(/_/g, ' ')}
        </p>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function QrPage() {
  // Scan logs
  const { data: scanLogs, isLoading: logsLoading } = useScanLogs();

  // One-time QR generation
  const generateQr = useGenerateQr();
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['LAB_REPORT', 'PRESCRIPTION']);
  const [duration, setDuration] = useState<number>(10);
  const [label, setLabel] = useState('');
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [tokenExpiry, setTokenExpiry] = useState<string | null>(null);

  // Invalidate
  const invalidateQr = useInvalidateQr();
  const [showInvalidateConfirm, setShowInvalidateConfirm] = useState(false);

  // SOS
  const sos = useSos();
  const [sosResult, setSosResult] = useState<null | { code: string; expiresAt: string }>(null);

  // Filter
  const [filterType, setFilterType] = useState<string>('ALL');

  const filteredLogs = (scanLogs ?? []).filter(
    (l) => filterType === 'ALL' || l.scanType === filterType
  );

  const suspiciousCount = (scanLogs ?? []).filter((l) => l.isSuspicious).length;

  function toggleScope(scope: string) {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  }

  async function handleGenerate() {
    if (selectedScopes.length === 0) return;
    const result = await generateQr.mutateAsync({
      scope: selectedScopes,
      durationMinutes: duration,
      label: label || undefined,
    });
    setGeneratedToken(result.qrToken);
    setTokenExpiry(result.expiresAt);
  }

  async function handleInvalidate() {
    await invalidateQr.mutateAsync('Manual invalidation by patient');
    // keep confirm panel open so the success message is visible
  }

  async function handleSos() {
    if (!navigator.geolocation) {
      const result = await sos.mutateAsync({ latitude: 0, longitude: 0, message: 'SOS activated' });
      setSosResult({ code: result.emergencyCode, expiresAt: result.emergencyCodeExpiresAt });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const result = await sos.mutateAsync({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          message: 'SOS activated',
        });
        setSosResult({ code: result.emergencyCode, expiresAt: result.emergencyCodeExpiresAt });
      },
      async () => {
        const result = await sos.mutateAsync({ latitude: 0, longitude: 0, message: 'SOS activated' });
        setSosResult({ code: result.emergencyCode, expiresAt: result.emergencyCodeExpiresAt });
      },
    );
  }

  return (
    <div className="space-y-8 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <QrCode className="h-6 w-6 text-primary" />
            My QR Health Card
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your secure digital health card — 3-tier access control
          </p>
        </div>
        {suspiciousCount > 0 && (
          <div data-testid="suspicious-badge" className="flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700">
            <AlertTriangle className="h-4 w-4" />
            {suspiciousCount} suspicious scan{suspiciousCount > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Section A — Emergency QR Info */}
      <section className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            My Emergency QR
          </h2>
          <button
            data-testid="invalidate-btn"
            onClick={() => setShowInvalidateConfirm(true)}
            className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Invalidate & Regenerate
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="rounded-lg bg-muted p-4">
            <p className="font-medium text-foreground mb-1">🟢 Tier 1 — Public</p>
            <p className="text-muted-foreground">Anyone can scan. Shows blood group + emergency contact only.</p>
          </div>
          <div className="rounded-lg bg-muted p-4">
            <p className="font-medium text-foreground mb-1">🔵 Tier 2 — UHID Doctors</p>
            <p className="text-muted-foreground">Verified doctors see allergies, medicines, conditions. 2-hour window.</p>
          </div>
          <div className="rounded-lg bg-muted p-4">
            <p className="font-medium text-foreground mb-1">🟣 Tier 3 — You Share</p>
            <p className="text-muted-foreground">Generate a one-time QR below. Full history. Expires in your chosen time.</p>
          </div>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          ⚡ Auto-rotates every 24 hours. You will be notified of every scan by SMS and push notification.
        </p>
      </section>

      {/* Invalidate confirmation */}
      {showInvalidateConfirm && (
        <div data-testid="invalidate-confirm" className="rounded-xl border border-red-300 bg-red-50 p-6">
          <h3 className="font-semibold text-red-800 mb-2">⚠️ Invalidate All Active QR Tokens?</h3>
          <p className="text-sm text-red-700 mb-4">
            This will immediately invalidate your current emergency QR (e.g. if your phone was stolen).
            A new QR will be generated instantly.
          </p>
          <div className="flex gap-3">
            <button
              data-testid="confirm-invalidate-btn"
              onClick={handleInvalidate}
              disabled={invalidateQr.isPending}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {invalidateQr.isPending ? 'Invalidating…' : 'Yes, Invalidate Now'}
            </button>
            <button
              onClick={() => setShowInvalidateConfirm(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Cancel
            </button>
          </div>
          {invalidateQr.isSuccess && (
            <p data-testid="invalidate-success" className="mt-3 text-sm text-green-700 font-medium">
              ✅ QR invalidated. New emergency QR generated.
            </p>
          )}
        </div>
      )}

      {/* Section C — Generate One-Time Share */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <QrCode className="h-5 w-5 text-primary" />
          Generate One-Time Share QR
        </h2>

        <div className="space-y-4">
          {/* Scope selector */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Select data to share
            </label>
            <div data-testid="scope-selector" className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {SCOPE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer text-sm transition-colors ${
                    selectedScopes.includes(opt.value)
                      ? 'border-primary bg-primary/5 text-primary font-medium'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={selectedScopes.includes(opt.value)}
                    onChange={() => toggleScope(opt.value)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Valid for
            </label>
            <div data-testid="duration-selector" className="flex gap-2 flex-wrap">
              {DURATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDuration(opt.value)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    duration === opt.value
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Optional label */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Label <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. For Dr. Priya — March visit"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <button
            data-testid="generate-qr-btn"
            onClick={handleGenerate}
            disabled={generateQr.isPending || selectedScopes.length === 0}
            className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {generateQr.isPending ? 'Generating…' : 'Generate QR Code'}
          </button>

          {/* Generated QR display */}
          {generatedToken && tokenExpiry && (
            <div data-testid="generated-qr" className="rounded-xl border-2 border-primary bg-primary/5 p-6 text-center">
              <p className="text-sm font-semibold text-primary mb-3">
                ✅ One-time QR generated — show this to the doctor
              </p>
              <div className="mx-auto mb-4 flex h-40 w-40 items-center justify-center rounded-xl bg-white border-2 border-primary shadow-inner">
                <div className="text-center">
                  <QrCode className="h-16 w-16 text-primary mx-auto" />
                  <p className="text-xs text-muted-foreground mt-1 break-all px-2">{generatedToken.slice(0, 20)}…</p>
                </div>
              </div>
              <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Expires: {formatDate(tokenExpiry)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Single use — invalidated after first scan</p>
            </div>
          )}
        </div>
      </section>

      {/* Section B — QR Scan History */}
      <section className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            🔍 My QR Scan History
          </h2>
          <div className="flex gap-2 flex-wrap">
            {['ALL', 'PUBLIC_SCAN', 'DOCTOR_SCAN', 'SUSPICIOUS_SCAN'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                  filterType === type
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border hover:bg-muted'
                }`}
              >
                {type === 'ALL' ? 'All' : SCAN_TYPE_LABEL[type]}
              </button>
            ))}
          </div>
        </div>

        {logsLoading ? (
          <div data-testid="logs-loading" className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <p data-testid="no-logs" className="py-8 text-center text-muted-foreground text-sm">
            {filterType === 'ALL'
              ? 'No QR scans yet. When someone scans your emergency QR, it will appear here.'
              : 'No scans matching this filter.'}
          </p>
        ) : (
          <div data-testid="scan-logs-list" className="space-y-3">
            {filteredLogs.map((log) => (
              <ScanLogItem key={log.id} log={log} />
            ))}
          </div>
        )}
      </section>

      {/* Section D — SOS */}
      <section className="rounded-xl border border-red-200 bg-red-50 p-6">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-red-800 mb-3">
          <Siren className="h-5 w-5" />
          SOS Emergency
        </h2>
        <p className="text-sm text-red-700 mb-4">
          Press SOS to instantly alert your emergency contacts and notify nearby UHID hospitals.
          An emergency code will be generated for on-duty doctors.
        </p>

        {!sosResult ? (
          <button
            data-testid="sos-btn"
            onClick={handleSos}
            disabled={sos.isPending}
            className="flex items-center gap-2 rounded-xl bg-red-600 px-8 py-4 text-base font-bold text-white hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-red-200"
          >
            <Siren className="h-5 w-5" />
            {sos.isPending ? 'Activating SOS…' : 'ACTIVATE SOS'}
          </button>
        ) : (
          <div data-testid="sos-result" className="rounded-xl border border-red-300 bg-white p-5 space-y-3">
            <p className="text-red-700 font-bold text-lg">🚨 SOS Activated</p>
            <p className="text-sm text-foreground">
              Emergency contacts and nearby hospitals have been notified.
            </p>
            <div className="rounded-lg bg-red-50 border border-red-200 p-4">
              <p className="text-xs text-muted-foreground mb-1">Emergency Code</p>
              <p data-testid="emergency-code" className="text-2xl font-bold tracking-widest text-red-700">
                {sosResult.code}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Valid until {formatDate(sosResult.expiresAt)} — any verified UHID doctor can use this
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>Contacts notified via SMS and push</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>3 nearest UHID hospitals alerted</span>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
