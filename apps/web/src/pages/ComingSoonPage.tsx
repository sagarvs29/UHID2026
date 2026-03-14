import { useLocation, useNavigate } from 'react-router-dom';
import { Clock, ArrowLeft, CheckCircle2, Circle } from 'lucide-react';

interface PhaseInfo {
  phase: string;
  title: string;
  description: string;
  features: string[];
  status: 'planned' | 'in-progress' | 'next';
}

const ROUTE_PHASE_MAP: Record<string, PhaseInfo> = {
  // ── Medical Records (Phase 2) ──────────────────────────────────────
  '/patient/records': {
    phase: 'Phase 2',
    title: 'Medical Records',
    description: 'View and manage your complete health records history.',
    features: ['View all uploaded records', 'Filter by type & date', 'Download / share records', 'Record timeline view'],
    status: 'next',
  },
  '/records': {
    phase: 'Phase 2',
    title: 'Medical Records',
    description: 'View and manage your complete health records history.',
    features: ['View all uploaded records', 'Filter by type & date', 'Download / share records', 'Record timeline view'],
    status: 'next',
  },
  '/staff/upload': {
    phase: 'Phase 2',
    title: 'Upload Medical Record',
    description: 'Upload patient health records into the UHID system.',
    features: ['Upload PDF / image records', 'Tag record type & date', 'Link to patient UHID', 'Attach clinical notes'],
    status: 'next',
  },
  '/staff/search': {
    phase: 'Phase 2',
    title: 'Search Patient',
    description: 'Search patients by UHID, name, or phone number.',
    features: ['Search by UHID / name', 'View patient record summary', 'Access permitted records', 'Recent searches history'],
    status: 'next',
  },
  '/staff/records': {
    phase: 'Phase 2',
    title: 'All Records',
    description: 'Browse all records uploaded by your hospital.',
    features: ['Filter by date & type', 'Bulk record management', 'Record status tracking', 'Export reports'],
    status: 'next',
  },
  '/doctor/records': {
    phase: 'Phase 2',
    title: 'Patient Records',
    description: 'Access medical records of your consented patients.',
    features: ['View consented records', 'Filter by patient', 'Download records', 'Annotate records'],
    status: 'next',
  },

  // ── Consent Management (Phase 3) ──────────────────────────────────
  '/patient/consent': {
    phase: 'Phase 3',
    title: 'Consent Management',
    description: 'Control who can access your health records and when.',
    features: ['View all consent requests', 'Approve / revoke access', 'Time-limited consent grants', 'Consent audit history'],
    status: 'planned',
  },
  '/consent': {
    phase: 'Phase 3',
    title: 'Consent Management',
    description: 'Control who can access your health records and when.',
    features: ['View all consent requests', 'Approve / revoke access', 'Time-limited consent grants', 'Consent audit history'],
    status: 'planned',
  },
  '/doctor/consents': {
    phase: 'Phase 3',
    title: 'Patient Consents',
    description: 'Manage consent requests sent to your patients.',
    features: ['Send consent requests', 'View granted permissions', 'Auto-expiry management', 'Consent history log'],
    status: 'planned',
  },
  '/insurance/access': {
    phase: 'Phase 3',
    title: 'Access Requests',
    description: 'Request and manage patient data access for claims.',
    features: ['Send data access requests', 'Track request status', 'View granted records', 'Revoke stale access'],
    status: 'planned',
  },

  // ── Clinical / AI (Phase 4 & 5) ────────────────────────────────────
  '/doctor/patients': {
    phase: 'Phase 4',
    title: 'My Patients',
    description: 'Manage your patient list and clinical interactions.',
    features: ['Patient roster management', 'Add clinical notes', 'Prescription management', 'Appointment scheduling'],
    status: 'planned',
  },

  // ── QR Code & Emergency (Phase 6) ─────────────────────────────────
  '/patient/qr': {
    phase: 'Phase 6',
    title: 'My QR Code',
    description: 'Your personal emergency health QR code for first responders.',
    features: ['Generate emergency QR', 'Control visible data', 'Download / print QR card', 'SOS emergency activation'],
    status: 'planned',
  },
  '/qr': {
    phase: 'Phase 6',
    title: 'My QR Code',
    description: 'Your personal emergency health QR code for first responders.',
    features: ['Generate emergency QR', 'Control visible data', 'Download / print QR card', 'SOS emergency activation'],
    status: 'planned',
  },

  // ── Insurance Claims (Phase 7) ─────────────────────────────────────
  '/insurance/claims/pending': {
    phase: 'Phase 7',
    title: 'Pending Claims',
    description: 'Review and process pending insurance claim requests.',
    features: ['View pending claim queue', 'Request patient records', 'Approve / reject claims', 'Add reviewer notes'],
    status: 'planned',
  },
  '/insurance/claims/approved': {
    phase: 'Phase 7',
    title: 'Approved Claims',
    description: 'Browse all approved insurance claims and settlements.',
    features: ['Approved claims history', 'Filter by date & policy', 'Export settlement reports', 'Audit trail view'],
    status: 'planned',
  },

  // ── Admin — Hospital Management (Phase 8) ─────────────────────────
  '/admin/staff': {
    phase: 'Phase 8',
    title: 'Staff Management',
    description: 'Manage hospital staff accounts, pending verifications, and permissions.',
    features: ['Pending verification queue', 'Verify / reject credentials', 'Deactivate accounts', 'View staff activity log'],
    status: 'planned',
  },
  '/admin/doctors': {
    phase: 'Phase 8',
    title: 'Doctor Management',
    description: 'Manage affiliated doctors and their access levels.',
    features: ['Doctor onboarding', 'Verify credentials', 'Manage specializations', 'Department assignment'],
    status: 'planned',
  },
  '/admin/audit': {
    phase: 'Phase 8',
    title: 'Audit Logs',
    description: 'Full audit trail of all system events and data access within your hospital.',
    features: ['Real-time event log', 'Filter by user / action / severity', 'Export CSV reports', 'Emergency override review'],
    status: 'planned',
  },
  '/admin/analytics': {
    phase: 'Phase 8',
    title: 'Hospital Analytics',
    description: 'Hospital-level operational and clinical analytics.',
    features: ['Record upload trends', 'Consent activity charts', 'Staff performance metrics', 'Department reports'],
    status: 'planned',
  },
  '/admin/hospital': {
    phase: 'Phase 8',
    title: 'Hospital Profile',
    description: 'Update your hospital information, NABH status, and settings.',
    features: ['Hospital info & address', 'NABH verification status', 'Departments & specializations', 'Contact management'],
    status: 'planned',
  },
  '/admin/settings': {
    phase: 'Phase 8',
    title: 'Security Settings',
    description: 'Manage access policies and permissions for your hospital.',
    features: ['Access control policies', 'Session management', 'IP allowlist', 'Two-factor enforcement'],
    status: 'planned',
  },

  // ── Super Admin — Platform Management (Phase 8) ────────────────────
  '/superadmin/hospitals': {
    phase: 'Phase 8',
    title: 'Hospital Management',
    description: 'Verify, suspend, or view all registered hospitals on the platform.',
    features: ['Hospital verification queue', 'Suspend / reactivate hospitals', 'View per-hospital analytics', 'Add hospital manually'],
    status: 'planned',
  },
  '/superadmin/users': {
    phase: 'Phase 8',
    title: 'All Users',
    description: 'Browse and manage all platform users across every role.',
    features: ['Search by role / hospital', 'View user activity', 'Force deactivate accounts', 'Impersonate (read-only)'],
    status: 'planned',
  },
  '/superadmin/insurance': {
    phase: 'Phase 8',
    title: 'Insurance Providers',
    description: 'Approve or reject insurance provider registrations.',
    features: ['Pending approval queue', 'Approve / reject providers', 'View claim activity', 'Suspend providers'],
    status: 'planned',
  },
  '/superadmin/audit': {
    phase: 'Phase 8',
    title: 'Platform Audit Logs',
    description: 'Full audit trail across all hospitals, all users, all actions.',
    features: ['Cross-hospital log viewer', 'Filter by hospital / role', 'Severity-coded events', 'Compliance CSV export'],
    status: 'planned',
  },
  '/superadmin/analytics': {
    phase: 'Phase 8',
    title: 'Platform Analytics',
    description: 'Total users, records, AI cost, SOS events, claims across the platform.',
    features: ['Total user breakdown by role', 'AI API cost per hospital', 'SOS & emergency trends', 'Claims processed stats'],
    status: 'planned',
  },
  '/superadmin/settings': {
    phase: 'Phase 8',
    title: 'Platform Settings',
    description: 'System configuration, feature flags, and global security policies.',
    features: ['Feature flag management', 'Global rate limits', 'TOTP enforcement for admins', 'System maintenance mode'],
    status: 'planned',
  },

  // ── Profile pages ──────────────────────────────────────────────────
  '/patient/profile': {
    phase: 'Phase 4',
    title: 'Patient Profile',
    description: 'Manage your personal and health profile information.',
    features: ['Update personal details', 'Emergency contacts', 'Manage linked devices', 'Account security settings'],
    status: 'planned',
  },
  '/profile': {
    phase: 'Phase 4',
    title: 'Patient Profile',
    description: 'Manage your personal and health profile information.',
    features: ['Update personal details', 'Emergency contacts', 'Manage linked devices', 'Account security settings'],
    status: 'planned',
  },
  '/doctor/profile': {
    phase: 'Phase 4',
    title: 'Doctor Profile',
    description: 'Manage your professional profile and credentials.',
    features: ['Update qualifications', 'Manage specializations', 'Clinic / hospital info', 'Availability settings'],
    status: 'planned',
  },
  '/staff/profile': {
    phase: 'Phase 8',
    title: 'Staff Profile',
    description: 'Update your staff profile and department information.',
    features: ['Update contact info', 'Department assignment', 'Work schedule', 'Security settings'],
    status: 'planned',
  },
  '/insurance/profile': {
    phase: 'Phase 7',
    title: 'Company Profile',
    description: 'Manage your insurance company profile and settings.',
    features: ['Company information', 'Policy management', 'Integration settings', 'Billing details'],
    status: 'planned',
  },
};

const STATUS_CONFIG = {
  next: {
    label: 'Up Next',
    className: 'bg-blue-50 text-blue-700 border border-blue-200',
    dot: 'bg-blue-500',
  },
  'in-progress': {
    label: 'In Progress',
    className: 'bg-amber-50 text-amber-700 border border-amber-200',
    dot: 'bg-amber-500',
  },
  planned: {
    label: 'Planned',
    className: 'bg-slate-100 text-slate-600 border border-slate-200',
    dot: 'bg-slate-400',
  },
};

const ALL_PHASES = [
  { id: 'Phase 1', label: 'Authentication & Accounts', done: true },
  { id: 'Phase 2', label: 'Medical Records', done: false },
  { id: 'Phase 3', label: 'Consent Management', done: false },
  { id: 'Phase 4', label: 'Clinical Features', done: false },
  { id: 'Phase 5', label: 'AI Health Insights', done: false },
  { id: 'Phase 6', label: 'QR & Emergency Access', done: false },
  { id: 'Phase 7', label: 'Insurance & Claims', done: false },
  { id: 'Phase 8', label: 'Admin & Hospital Mgmt', done: false },
  { id: 'Phase 9', label: 'Telehealth', done: false },
  { id: 'Phase 10', label: 'Testing & Deployment', done: false },
];

export default function ComingSoonPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const info = ROUTE_PHASE_MAP[location.pathname];

  const statusCfg = info ? STATUS_CONFIG[info.status] : STATUS_CONFIG['planned'];

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">

        {/* Header card */}
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">

          {/* Top accent bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-primary via-[hsl(193,80%,40%)] to-primary/40" />

          <div className="p-8">
            {/* Icon + badge row */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                <Clock className="h-7 w-7 text-primary" />
              </div>
              {info && (
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${statusCfg.className}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot}`} />
                  {statusCfg.label}
                </span>
              )}
            </div>

            {/* Title */}
            <div className="mt-5">
              {info ? (
                <>
                  <div className="text-xs font-semibold uppercase tracking-widest text-primary/70 mb-1">
                    {info.phase}
                  </div>
                  <h1 className="text-2xl font-bold text-foreground">{info.title}</h1>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {info.description}
                  </p>
                </>
              ) : (
                <>
                  <h1 className="text-2xl font-bold text-foreground">Feature Coming Soon</h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    This section is under active development and will be available in an upcoming phase.
                  </p>
                </>
              )}
            </div>

            {/* Feature list */}
            {info && (
              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  What's included in {info.phase}
                </p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {info.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-sm text-foreground/80">
                      <span className="mt-0.5 h-4 w-4 flex-shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      </span>
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Back button */}
            <button
              onClick={() => navigate(-1)}
              className="mt-8 inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </button>
          </div>
        </div>

        {/* Phase roadmap card */}
        <div className="mt-4 rounded-2xl border border-border bg-card shadow-sm p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Development Roadmap
          </p>
          <div className="space-y-2">
            {ALL_PHASES.map((p) => {
              const isActive = info?.phase === p.id;
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                    isActive
                      ? 'bg-primary/8 border border-primary/20'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  {p.done ? (
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-600" />
                  ) : (
                    <Circle
                      className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground/40'}`}
                    />
                  )}
                  <span className={`text-xs font-medium w-16 flex-shrink-0 ${isActive ? 'text-primary' : p.done ? 'text-green-700' : 'text-muted-foreground'}`}>
                    {p.id}
                  </span>
                  <span className={`text-sm ${isActive ? 'font-semibold text-foreground' : p.done ? 'text-foreground/70' : 'text-muted-foreground'}`}>
                    {p.label}
                  </span>
                  {p.done && (
                    <span className="ml-auto text-xs text-green-600 font-medium">✓ Live</span>
                  )}
                  {isActive && !p.done && (
                    <span className="ml-auto text-xs text-primary font-semibold">← This feature</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
