import { useActiveConsents } from '@/hooks/useConsent';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  ArrowRight,
  ShieldCheck,
  Clock,
  Stethoscope,
} from 'lucide-react';
import { useState } from 'react';

export default function PatientsPage() {
  const navigate = useNavigate();
  const { data: consents = [], isLoading } = useActiveConsents();
  const [search, setSearch] = useState('');

  // Derive unique patients from active consents
  const patientMap = new Map<string, {
    uhid: string;
    name: string;
    scopes: string[];
    expiresAt: string | null;
    grantedAt: string;
  }>();

  consents.forEach((c: any) => {
    const uhid = c.patientUhid ?? c.patient?.uhid ?? '';
    if (uhid && !patientMap.has(uhid)) {
      patientMap.set(uhid, {
        uhid,
        name: c.patientName ?? c.patient?.name ?? 'Unknown',
        scopes: c.scope ?? [],
        expiresAt: c.expiresAt ?? null,
        grantedAt: c.createdAt ?? '',
      });
    }
  });

  const patients = Array.from(patientMap.values()).filter((p) =>
    search
      ? p.uhid.toLowerCase().includes(search.toLowerCase()) ||
        p.name.toLowerCase().includes(search.toLowerCase())
      : true,
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" />
          My Patients
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Patients who have granted you active consent to access their records.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Active Patients</p>
          <p className="text-2xl font-bold text-foreground">{patients.length}</p>
        </div>
        <div className="rounded-xl border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Active Consents</p>
          <p className="text-2xl font-bold text-green-600">{consents.length}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by UHID or name…"
          className="w-full pl-9 pr-4 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {/* Patient cards */}
      {patients.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Stethoscope className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {search ? 'No matching patients found' : 'No patients have granted you consent yet.'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Ask patients to grant you consent via their Consent page, or use Patient Lookup.
          </p>
          <button
            onClick={() => navigate('/doctor/patient-lookup')}
            className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Go to Patient Lookup
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {patients.map((p) => (
            <button
              key={p.uhid}
              onClick={() => navigate(`/doctor/patient/${p.uhid}`)}
              className="rounded-xl border bg-card p-4 text-left hover:border-primary/40 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{p.name}</p>
                  <p className="text-xs font-mono text-muted-foreground mt-0.5">{p.uhid}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex items-center gap-3 mt-3">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-semibold">
                  <ShieldCheck className="w-3 h-3" /> Active Consent
                </span>
                {p.expiresAt && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    Expires: {new Date(p.expiresAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {p.scopes.map((s: string) => (
                  <span key={s} className="px-1.5 py-0.5 rounded bg-muted text-[10px] text-muted-foreground">
                    {s}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
