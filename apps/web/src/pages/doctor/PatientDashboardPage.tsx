import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { usePatientProfile, useClinicalNotes, usePrescriptions } from '@/hooks/useClinical';
import {
  SEVERITY_BADGE,
  DRUG_FORM_LABELS,
  NOTE_VISIBILITY_LABELS,
} from '@/types/clinical';

type Tab = 'overview' | 'records' | 'prescriptions' | 'notes';

// ─── Age helper ───────────────────────────────────────────────────────────────
function calcAge(dob: string): number {
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({ patient }: { patient: NonNullable<ReturnType<typeof usePatientProfile>['data']> }) {
  return (
    <div className="space-y-6" data-testid="overview-tab">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Age', value: `${calcAge(patient.dateOfBirth)} years` },
          { label: 'Gender', value: patient.gender },
          { label: 'Blood Group', value: patient.bloodGroup ?? 'Unknown' },
          { label: 'UHID', value: patient.uhid },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="mt-1 font-semibold text-foreground">{item.value}</p>
          </div>
        ))}
      </div>

      {patient.allergies.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-700">⚠ Recorded Allergies</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {patient.allergies.map((a) => (
              <span key={a} className="rounded-full bg-red-100 px-2.5 py-1 text-sm font-medium text-red-700">
                {a}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm font-semibold text-foreground">Active Access Scopes</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {patient.activeScopes.length > 0
            ? patient.activeScopes.map((s) => (
                <span key={s} className="rounded-full bg-blue-100 px-2.5 py-1 text-sm text-blue-700">
                  {s.replace(/_/g, ' ')}
                </span>
              ))
            : <p className="text-sm text-muted-foreground">No active consent scopes</p>
          }
        </div>
      </div>
    </div>
  );
}

// ─── Prescriptions Tab ────────────────────────────────────────────────────────
function PrescriptionsTab({ uhid }: { uhid: string }) {
  const { data: prescriptions, isLoading } = usePrescriptions(uhid);
  const navigate = useNavigate();

  if (isLoading) return <div data-testid="prescriptions-loading" className="py-8 text-center text-sm text-muted-foreground">Loading prescriptions…</div>;

  return (
    <div data-testid="prescriptions-tab">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Prescriptions</h3>
        <button
          onClick={() => navigate(`/doctor/patient/${uhid}/prescribe`)}
          data-testid="new-prescription-btn"
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          + New prescription
        </button>
      </div>

      {!prescriptions?.length
        ? <p className="text-sm text-muted-foreground">No prescriptions on record.</p>
        : (
          <ul className="space-y-3">
            {prescriptions.map((rx) => (
              <li key={rx.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{rx.diagnosis}</p>
                    <p className="text-xs text-muted-foreground">
                      Dr {rx.doctor.firstName} {rx.doctor.lastName} · {rx.doctor.specialization}
                    </p>
                    <p className="text-xs text-muted-foreground">{new Date(rx.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{rx.items.length} item{rx.items.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {rx.items.map((item) => (
                    <span key={item.id} className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-foreground">
                      {item.drugName} {item.dosage} · {DRUG_FORM_LABELS[item.form]}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )
      }
    </div>
  );
}

// ─── Notes Tab ────────────────────────────────────────────────────────────────
function NotesTab({ uhid }: { uhid: string }) {
  const { data: notes, isLoading } = useClinicalNotes(uhid);
  const navigate = useNavigate();

  if (isLoading) return <div data-testid="notes-loading" className="py-8 text-center text-sm text-muted-foreground">Loading notes…</div>;

  return (
    <div data-testid="notes-tab">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Clinical Notes</h3>
        <button
          onClick={() => navigate(`/doctor/patient/${uhid}/notes`)}
          data-testid="new-note-btn"
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          + New note
        </button>
      </div>

      {!notes?.length
        ? <p className="text-sm text-muted-foreground">No clinical notes on record.</p>
        : (
          <ul className="space-y-3">
            {notes.map((note) => (
              <li key={note.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{note.chiefComplaint}</p>
                    <p className="text-xs text-muted-foreground">
                      {note.icd10Code} · {note.icd10Description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Dr {note.doctor.firstName} {note.doctor.lastName} · {new Date(note.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${
                    note.visibility === 'PATIENT_VISIBLE' ? 'bg-green-100 text-green-700' :
                    note.visibility === 'HOSPITAL' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {NOTE_VISIBILITY_LABELS[note.visibility]}
                  </span>
                </div>
                {note.diagnosis && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    <span className="font-medium">Diagnosis:</span> {note.diagnosis}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )
      }
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PatientDashboardPage() {
  const { uhid } = useParams<{ uhid: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const { data: patient, isLoading, isError } = usePatientProfile(uhid ?? '');
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-1/3 rounded bg-muted" />
          <div className="h-4 w-1/4 rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (isError || !patient) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 text-center">
        <p className="text-sm text-muted-foreground">
          Patient not found or you don't have active consent.
        </p>
        <button
          onClick={() => navigate('/doctor/patient-lookup')}
          className="mt-4 text-sm text-primary underline"
        >
          Back to lookup
        </button>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview',      label: 'Overview' },
    { id: 'records',       label: 'Records' },
    { id: 'prescriptions', label: 'Prescriptions' },
    { id: 'notes',         label: 'Clinical Notes' },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <Link
            to="/doctor/patient-lookup"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ← Patient lookup
          </Link>
          <h1 data-testid="patient-name" className="mt-1 text-2xl font-bold text-foreground">
            {patient.firstName} {patient.lastName}
          </h1>
          <p className="text-sm text-muted-foreground">{patient.uhid} · {patient.gender} · Age {calcAge(patient.dateOfBirth)}</p>
        </div>
        {patient.allergies.length > 0 && (
          <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700">
            ⚠ {patient.allergies.length} allerg{patient.allergies.length === 1 ? 'y' : 'ies'}
          </span>
        )}
      </div>

      {/* Tabs */}
      <nav data-testid="patient-tabs" className="flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            data-testid={`tab-${t.id}`}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === t.id
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* Tab content */}
      <div className="mt-6">
        {activeTab === 'overview'      && <OverviewTab patient={patient} />}
        {activeTab === 'records'       && (
          <div data-testid="records-tab" className="text-sm text-muted-foreground">
            Records functionality coming soon.
          </div>
        )}
        {activeTab === 'prescriptions' && <PrescriptionsTab uhid={uhid!} />}
        {activeTab === 'notes'         && <NotesTab uhid={uhid!} />}
      </div>
    </div>
  );
}
