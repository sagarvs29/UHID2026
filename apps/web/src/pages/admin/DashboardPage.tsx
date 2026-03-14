import { useAuthStore } from '@/stores/auth.store';
import {
  Users,
  UserCog,
  ScrollText,
  Settings,
  ShieldCheck,
  BarChart2,
  Hospital,
  AlertTriangle,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ActionCard {
  label: string;
  description: string;
  icon: React.ElementType;
  href: string;
  badge?: string;
  badgeVariant?: 'warning' | 'success' | 'default';
}

const ACTIONS: ActionCard[] = [
  {
    label: 'Pending Verifications',
    description: 'Review new doctors & staff awaiting approval',
    icon: Clock,
    href: '/admin/staff',
    badge: 'Action needed',
    badgeVariant: 'warning',
  },
  {
    label: 'Active Staff',
    description: "Manage your hospital's verified doctors & staff",
    icon: UserCog,
    href: '/admin/staff',
  },
  {
    label: 'Manage Doctors',
    description: 'Review credentials and specializations',
    icon: Users,
    href: '/admin/doctors',
  },
  {
    label: 'Audit Logs',
    description: 'Review all access and changes within your hospital',
    icon: ScrollText,
    href: '/admin/audit',
  },
  {
    label: 'Analytics',
    description: 'Record uploads, consent activity, staff performance',
    icon: BarChart2,
    href: '/admin/analytics',
  },
  {
    label: 'Hospital Profile',
    description: 'Update hospital information and NABH status',
    icon: Hospital,
    href: '/admin/hospital',
  },
  {
    label: 'Security Settings',
    description: 'Manage access policies and permissions',
    icon: Settings,
    href: '/admin/settings',
  },
];

const BADGE_STYLES = {
  warning: 'bg-amber-50 text-amber-700 border border-amber-200',
  success: 'bg-green-50 text-green-700 border border-green-200',
  default: 'bg-primary/10 text-primary border border-primary/20',
};

export default function AdminDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  return (
    <div className="space-y-6">

      {/* ── Welcome banner ── */}
      <div className="rounded-2xl bg-primary px-6 py-6 text-primary-foreground flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <p className="text-sm font-medium opacity-70">Hospital Administrator Portal</p>
          <h1 className="text-2xl font-bold mt-0.5">{user?.name}</h1>
          <p className="text-sm opacity-60 mt-1">{user?.email}</p>
          <span className="inline-block mt-2 rounded-full bg-white/20 px-3 py-0.5 text-xs font-semibold tracking-wide">
            Hospital Admin
          </span>
        </div>
        <div className="rounded-xl bg-white/10 border border-white/20 px-5 py-4 flex items-center gap-3 shrink-0">
          <ShieldCheck className="w-8 h-8 opacity-70" />
          <div>
            <p className="text-xs font-medium opacity-60">Scope</p>
            <p className="text-sm font-bold">Your Hospital Only</p>
          </div>
        </div>
      </div>

      {/* ── Alert: pending verifications ── */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-amber-800">
            Staff verifications require your attention
          </p>
          <p className="text-xs text-amber-600 mt-0.5">
            New doctors or staff who registered under your hospital are waiting for credential review. Go to{' '}
            <strong>Staff Management → Pending</strong> tab.
          </p>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Doctors',        value: '—', icon: Users,         desc: 'Verified & active' },
          { label: 'Active Staff',          value: '—', icon: UserCog,       desc: 'In your hospital' },
          { label: 'Audit Events (24h)',    value: '—', icon: ScrollText,    desc: 'Logins, access, changes' },
          { label: 'Pending Verifications', value: '—', icon: AlertTriangle, desc: 'Awaiting review' },
        ].map(({ label, value, icon: Icon, desc }) => (
          <div key={label} className="rounded-xl border bg-card px-4 py-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-[11px] text-muted-foreground/70 mt-0.5">{desc}</p>
          </div>
        ))}
      </div>

      {/* ── Emergency override review notice ── */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
        <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-blue-800">
            Emergency override logs must be reviewed within 48 hours
          </p>
          <p className="text-xs text-blue-600 mt-0.5">
            When a doctor in your hospital uses an emergency override, you must review and acknowledge it. Check{' '}
            <strong>Audit Logs → EMERGENCY_OVERRIDE</strong>.
          </p>
        </div>
      </div>

      {/* ── Quick actions ── */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-3">Administration</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ACTIONS.map(({ label, description, icon: Icon, href, badge, badgeVariant = 'default' }) => (
            <button
              key={label}
              onClick={() => navigate(href)}
              className="text-left rounded-xl border border-border bg-card p-5 transition-all hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 active:translate-y-0 group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                {badge && (
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${BADGE_STYLES[badgeVariant]}`}>
                    {badge}
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Scope note ── */}
      <p className="text-xs text-muted-foreground/60 text-center pb-2">
        You manage <strong>your hospital only</strong>. Platform-level administration is handled by the UHID Super Admin.
      </p>

    </div>
  );
}
