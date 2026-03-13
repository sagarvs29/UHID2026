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
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ActionCard {
  label: string;
  description: string;
  icon: React.ElementType;
  href: string;
  alert?: boolean;
}

const ACTIONS: ActionCard[] = [
  {
    label: 'Manage Staff',
    description: 'Add, edit, or deactivate hospital staff',
    icon: UserCog,
    href: '/admin/staff',
  },
  {
    label: 'Manage Doctors',
    description: 'Review and manage doctor credentials',
    icon: Users,
    href: '/admin/doctors',
  },
  {
    label: 'Audit Logs',
    description: 'Review all system access and changes',
    icon: ScrollText,
    href: '/admin/audit',
  },
  {
    label: 'Analytics',
    description: 'Hospital usage stats and reports',
    icon: BarChart2,
    href: '/admin/analytics',
  },
  {
    label: 'Hospital Profile',
    description: 'Update hospital information and settings',
    icon: Hospital,
    href: '/admin/hospital',
  },
  {
    label: 'Security Settings',
    description: 'Manage access policies and permissions',
    icon: Settings,
    href: '/admin/settings',
    alert: true,
  },
];

export default function AdminDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="rounded-2xl bg-primary px-6 py-6 text-primary-foreground flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <p className="text-sm font-medium opacity-80">Administrator Portal</p>
          <h1 className="text-2xl font-bold mt-0.5">{user?.name}</h1>
          <span className="inline-block mt-2 rounded-full bg-white/20 px-3 py-0.5 text-xs font-semibold tracking-wide">
            Hospital Admin
          </span>
        </div>
        <div className="rounded-xl bg-white/10 border border-white/20 px-5 py-4 flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 opacity-70" />
          <div>
            <p className="text-xs font-medium opacity-70">Access Level</p>
            <p className="text-sm font-bold">Full Administration</p>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Doctors', value: '—', icon: Users },
          { label: 'Active Staff', value: '—', icon: UserCog },
          { label: 'Audit Events (24h)', value: '—', icon: ScrollText },
          { label: 'Pending Reviews', value: '—', icon: AlertTriangle },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border bg-card px-4 py-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-3">Administration</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ACTIONS.map(({ label, description, icon: Icon, href }) => (
            <button
              key={label}
              onClick={() => navigate(href)}
              className="text-left rounded-xl border border-border bg-card p-5 transition-all hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 active:translate-y-0"
            >
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 mb-3">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm font-semibold text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Recent audit log */}
      <div className="rounded-xl border bg-card px-6 py-5">
        <h2 className="text-base font-semibold text-foreground mb-4">Recent Audit Events</h2>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <ScrollText className="w-8 h-8 text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">No recent audit events</p>
          <p className="text-xs text-muted-foreground/70 mt-0.5">
            System access events will be tracked here.
          </p>
        </div>
      </div>
    </div>
  );
}
