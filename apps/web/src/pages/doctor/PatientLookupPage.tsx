import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatientProfile } from '@/hooks/useClinical';

// Simple local storage for recent patients
const RECENT_PATIENTS_KEY = 'uhid_recent_patients';

interface RecentPatient {
  uhid: string;
  name: string;
  visitedAt: string;
}

function getRecentPatients(): RecentPatient[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_PATIENTS_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function addRecentPatient(p: RecentPatient) {
  const existing = getRecentPatients().filter((r) => r.uhid !== p.uhid);
  localStorage.setItem(
    RECENT_PATIENTS_KEY,
    JSON.stringify([p, ...existing].slice(0, 5))
  );
}

// ─── UHID Search Card ─────────────────────────────────────────────────────────
function SearchBox({ onSearch }: { onSearch: (uhid: string) => void }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim().toUpperCase();
    const valid = /^UHID-[A-Z0-9]{4}-[A-Z0-9]{4}-[0-9]{4}$/.test(trimmed);
    if (!valid) {
      setError('Enter a valid UHID (e.g. UHID-AB12-CD34-5678)');
      return;
    }
    setError('');
    onSearch(trimmed);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="flex-1">
        <input
          data-testid="uhid-input"
          type="text"
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(''); }}
          placeholder="UHID-XXXX-XXXX-0000"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>
      <button
        type="submit"
        data-testid="lookup-btn"
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Look up
      </button>
    </form>
  );
}

// ─── Patient Result Card ──────────────────────────────────────────────────────
function PatientCard({ uhid }: { uhid: string }) {
  const navigate = useNavigate();
  const { data: patient, isLoading, isError, error } = usePatientProfile(uhid);

  if (isLoading) {
    return (
      <div data-testid="patient-loading" className="mt-4 animate-pulse rounded-lg border border-border p-4">
        <div className="h-4 w-1/3 rounded bg-muted" />
        <div className="mt-2 h-3 w-1/2 rounded bg-muted" />
      </div>
    );
  }

  if (isError) {
    const msg = (error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Patient not found';
    return (
      <div data-testid="patient-error" className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        {msg}
      </div>
    );
  }

  if (!patient) return null;

  const hasConsent = patient.activeScopes.length > 0;

  const handleOpen = () => {
    addRecentPatient({
      uhid: patient.uhid,
      name: `${patient.firstName} ${patient.lastName}`,
      visitedAt: new Date().toISOString(),
    });
    navigate(`/doctor/patient/${patient.uhid}`);
  };

  return (
    <div
      data-testid="patient-card"
      className="mt-4 rounded-lg border border-border bg-card p-4"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-base font-semibold text-foreground">
            {patient.firstName} {patient.lastName}
          </p>
          <p className="text-sm text-muted-foreground">{patient.uhid}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {patient.gender} · {patient.bloodGroup ?? 'Blood group unknown'}
          </p>
        </div>
        <span
          data-testid="consent-badge"
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            hasConsent
              ? 'bg-green-100 text-green-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          {hasConsent ? 'Consent active' : 'No active consent'}
        </span>
      </div>

      {patient.allergies.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-muted-foreground">Allergies</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {patient.allergies.map((a) => (
              <span key={a} className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                {a}
              </span>
            ))}
          </div>
        </div>
      )}

      {hasConsent && (
        <div className="mt-3">
          <p className="text-xs font-medium text-muted-foreground">Active scopes</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {patient.activeScopes.map((s) => (
              <span key={s} className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                {s.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={handleOpen}
        data-testid="open-patient-btn"
        disabled={!hasConsent}
        className="mt-4 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Open patient portal
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PatientLookupPage() {
  const [searchUhid, setSearchUhid] = useState('');
  const [recentPatients] = useState<RecentPatient[]>(getRecentPatients);
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-2xl font-bold text-foreground">Patient Lookup</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter a patient's UHID to access their portal (requires active consent).
      </p>

      <div className="mt-6">
        <SearchBox onSearch={(uhid) => setSearchUhid(uhid)} />
      </div>

      {searchUhid && <PatientCard uhid={searchUhid} />}

      {recentPatients.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Recent patients
          </h2>
          <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
            {recentPatients.map((rp) => (
              <li key={rp.uhid}>
                <button
                  onClick={() => navigate(`/doctor/patient/${rp.uhid}`)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50"
                >
                  <span className="text-sm font-medium text-foreground">{rp.name}</span>
                  <span className="text-xs text-muted-foreground">{rp.uhid}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
