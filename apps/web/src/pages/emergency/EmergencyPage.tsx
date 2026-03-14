import { useParams } from 'react-router-dom';
import { Heart, AlertTriangle, Phone, User, ShieldAlert, Clock } from 'lucide-react';
import { usePublicEmergency } from '@/hooks/useQr';

const BLOOD_GROUP_DISPLAY: Record<string, string> = {
  A_POSITIVE:  'A+',
  A_NEGATIVE:  'A−',
  B_POSITIVE:  'B+',
  B_NEGATIVE:  'B−',
  AB_POSITIVE: 'AB+',
  AB_NEGATIVE: 'AB−',
  O_POSITIVE:  'O+',
  O_NEGATIVE:  'O−',
  UNKNOWN:     '?',
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

export default function EmergencyPage() {
  const { uhid } = useParams<{ uhid: string }>();
  const { data, isLoading, isError, error } = usePublicEmergency(uhid ?? '');

  const errMsg = (error as Error & { code?: string } | null)?.message ?? 'Unknown error';
  const errCode = (error as Error & { code?: string } | null)?.code;

  if (isLoading) {
    return (
      <div data-testid="emergency-loading" className="flex min-h-screen items-center justify-center bg-red-50">
        <div className="text-center space-y-3">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-red-400 border-t-transparent" />
          <p className="text-red-600 font-semibold">Loading emergency data…</p>
        </div>
      </div>
    );
  }

  if (isError) {
    const isRateLimited = errCode === 'QR_RATE_LIMITED';
    const isRevoked     = errCode === 'QR_REVOKED';
    const isExpired     = errCode === 'QR_EXPIRED';

    return (
      <div data-testid="emergency-error" className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-sm w-full rounded-2xl border border-border bg-white p-8 text-center shadow-lg">
          <AlertTriangle className="mx-auto h-12 w-12 text-amber-500 mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-2">
            {isRateLimited ? 'QR Temporarily Locked'
              : isRevoked   ? 'QR Revoked'
              : isExpired   ? 'QR Expired'
              : 'Invalid QR Code'}
          </h1>
          <p data-testid="error-message" className="text-sm text-muted-foreground">
            {isRateLimited
              ? 'This QR code has been scanned too many times recently. The patient has been notified.'
              : isRevoked
              ? 'This QR has been invalidated by the patient (e.g. phone lost/stolen).'
              : isExpired
              ? 'This QR code has expired. The patient needs to regenerate it.'
              : errMsg}
          </p>
          <div className="mt-6 rounded-lg bg-amber-50 border border-amber-200 p-4 text-left">
            <p className="text-xs font-semibold text-amber-800 mb-1">🏥 In a medical emergency:</p>
            <p className="text-xs text-amber-700">Call 108 (Ambulance) or 112 (Emergency) immediately.</p>
          </div>
        </div>
      </div>
    );
  }

  const bg = data?.bloodGroup ?? 'UNKNOWN';
  const displayBg = BLOOD_GROUP_DISPLAY[bg] ?? bg;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 px-4 py-8">
      <div className="mx-auto max-w-md space-y-6">

        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 border-2 border-red-300">
            <ShieldAlert className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-red-700">Emergency Health Card</h1>
          <p className="text-sm text-muted-foreground mt-1">UniHealth ID · Tier 1 Emergency Data</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Scanned at {data?.scannedAt ? formatTime(data.scannedAt) : '–'}
          </p>
        </div>

        {/* Blood Group */}
        <div data-testid="blood-group-card" className="rounded-2xl border-2 border-red-200 bg-white p-6 text-center shadow-sm">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Heart className="h-5 w-5 text-red-500" />
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Blood Group</p>
          </div>
          <p data-testid="blood-group" className="text-5xl font-black text-red-600 tracking-tight">
            {displayBg}
          </p>
        </div>

        {/* Critical Allergy Warning */}
        <div
          data-testid="allergy-card"
          className={`rounded-2xl border-2 p-5 ${
            data?.hasCriticalAllergy
              ? 'border-amber-400 bg-amber-50'
              : 'border-green-300 bg-green-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className={`h-8 w-8 shrink-0 ${data?.hasCriticalAllergy ? 'text-amber-500' : 'text-green-500'}`} />
            <div>
              <p className={`font-bold text-lg ${data?.hasCriticalAllergy ? 'text-amber-800' : 'text-green-800'}`}>
                {data?.hasCriticalAllergy ? 'Has Critical Allergy' : 'No Known Critical Allergy'}
              </p>
              {data?.hasCriticalAllergy && (
                <p data-testid="allergy-warning-note" className="text-xs text-amber-700 mt-0.5">
                  ⚠️ Allergy type not shown here for security. Call emergency contact for specifics.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        {data?.emergencyContact ? (
          <div data-testid="emergency-contact-card" className="rounded-2xl border-2 border-blue-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <User className="h-5 w-5 text-blue-500" />
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Emergency Contact</p>
            </div>
            <p className="font-bold text-xl text-foreground">{data.emergencyContact.name}</p>
            <p className="text-sm text-muted-foreground">{data.emergencyContact.relation}</p>
            <a
              data-testid="emergency-phone-link"
              href={`tel:${data.emergencyContact.phone}`}
              className="mt-3 flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-white font-semibold text-sm hover:bg-blue-700 transition-colors justify-center"
            >
              <Phone className="h-4 w-4" />
              Call {data.emergencyContact.phone}
            </a>
          </div>
        ) : (
          <div data-testid="no-contact" className="rounded-2xl border border-border bg-muted p-5 text-center text-sm text-muted-foreground">
            No emergency contact on file
          </div>
        )}

        {/* Doctor CTA */}
        <div data-testid="doctor-cta" className="rounded-2xl border border-border bg-white p-5 text-center shadow-sm">
          <p className="text-sm font-semibold text-foreground mb-1">Are you a UHID-registered doctor?</p>
          <p className="text-xs text-muted-foreground mb-3">
            Log in to your UHID doctor account to access full clinical data including allergies, medications, and conditions.
          </p>
          <a
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
          >
            Doctor Login → Full Clinical Access
          </a>
        </div>

        {/* Footer */}
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>This scan has been logged. Patient has been notified.</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Powered by UniHealth ID · Secure Digital Health Records
          </p>
        </div>
      </div>
    </div>
  );
}
