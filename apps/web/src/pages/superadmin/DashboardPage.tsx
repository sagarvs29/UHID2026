import { useAuthStore } from '@/stores/auth.store';
import {
  Hospital,
  Globe,
  ScrollText,
  BarChart2,
  ShieldCheck,
  Users,
  Landmark,
  AlertTriangle,
  BadgeCheck,
  Activity,
  Settings,
  ServerCrash,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ActionCard {
  label: string;
  description: string;
  icon: React.ElementType;
  href: string;
  badge?: string;
  badgeVariant?: 'warning' | 'critical' | 'success' | 'default';
}

const ACTIONS: ActionCard[] = [
  {
    label: 'Hospital Management',
    description: 'Verify, suspend, or view all registered hospitals on the platform',
    icon: Hospital,
    href: '/superadmin/hospitals',
    badge: 'Pending approvals',
    badgeVariant: 'warning',
  },
  {
    label: 'All Users',
    description: 'Browse and manage all platform users across every role',
    icon: Globe,
    href: '/superadmin/users',
  },
  {
    label: 'Insurance Providers',
    description: 'Approve or reject insurance provider registrations',
    icon: Landmark,
    href: '/superadmin/insurance',
    badge: 'Needs review',
    badgeVariant: 'warning',
  },
  {
    label: 'Platform Audit Logs',
    description: 'Full audit trail across all hospitals, all users, all actions',
    icon: ScrollText,
    href: '/superadmin/audit',
  },
  {
    label: 'Platform Analytics',
    description: 'Total users, records, AI cost, SOS events, claims across the platform',
    icon: BarChart2,
    href: '/superadmin/analytics',
  },
  {
    label: 'Platform Settings',
    description: 'System configuration, feature flags, and global security policies',
    icon: Settings,
    href: '/superadmin/settings',
  },
];

const BADGE_STYLES = {
  warning:  'bg-amber-50 text-amber-700 border border-amber-200',
  critical: 'bg-red-50 text-red-700 border border-red-200',
  success:  'bg-green-50 text-green-700 border border-green-200',
  default:  'bg-primary/10 text-primary border border-primary/20',
};

export default function SuperAdminDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  return (
    <div className="space-y-6">

      {/* ── Welcome banner ── */}
      <div className="rounded-2xl bg-gradient-to-r from-[hsl(215,70%,22%)] to-[hsl(215,70%,32%)] px-6 py-6 text-white flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <p className="text-sm font-medium opacity-70">UHID Platform — Super Admin Console</p>
          <h1 className="text-2xl font-bold mt-0.5">{user?.name}</h1>
          <p className="text-sm opacity-60 mt-1">{user?.email}</p>
          <span className="inline-block mt-2 rounded-full bg-white/20 px-3 py-0.5 text-xs font-semibold tracking-wide">
            Super Admin · Platform-wide Access
          </span>
        </div>
        <div className="rounded-xl bg-white/10 border border-white/20 px-5 py-4 flex items-center gap-3 shrink-0">
          <ShieldCheck className="w-8 h-8 opacity-80" />
          <div>
            <p className="text-xs font-medium opacity-60">Access Level</p>
            <p className="text-sm font-bold">Full Platform Control</p>
          </div>
        </div>
      </div>

      {/* ── Warning: Super Admin scope ── */}
      <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
        <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-red-800">
            You have full platform access — every action is logged and audited
          </p>
          <p className="text-xs text-red-600 mt-0.5">
            Actions taken here affect all hospitals and users on the UHID platform. All operations are permanently recorded in the audit system.
          </p>
        </div>
      </div>

      {/* ── Platform stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Hospitals',    value: '—', icon: Hospital,     desc: 'Verified + pending' },
          { label: 'Total Users',         value: '—', icon: Users,        desc: 'All roles combined' },
          { label: 'Platform Events (24h)',value: '—', icon: Activity,    desc: 'Logins, access, changes' },
          { label: 'Pending Approvals',   value: '—', icon: BadgeCheck,   desc: 'Hospitals & insurers' },
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

      {/* ── Second stats row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Records',      value: '—', icon: ScrollText,   desc: 'Across all hospitals' },
          { label: 'Active Consents',    value: '—', icon: ShieldCheck,  desc: 'Platform-wide' },
          { label: 'Insurance Providers',value: '—', icon: Landmark,     desc: 'Approved & active' },
          { label: 'AI Cost (30d)',       value: '—', icon: ServerCrash,  desc: 'API usage estimate' },
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

      {/* ── Quick actions ── */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-3">Platform Administration</h2>
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
      <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Role boundary:</strong> Hospital Admins manage their own hospital's staff and audit logs.
          You manage the entire platform — all hospitals, all users, platform configuration, and cross-hospital analytics.
          Hospital Admins are created by you and scoped to a single institution.
        </p>
      </div>

    </div>
  );
}
