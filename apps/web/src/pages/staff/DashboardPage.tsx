import { useAuthStore } from '@/stores/auth.store';
import {
  Upload,
  Search,
  FileText,
  User,
  ClipboardList,
  LayoutGrid,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ActionCard {
  label: string;
  description: string;
  icon: React.ElementType;
  href: string;
}

const ACTIONS: ActionCard[] = [
  {
    label: 'Upload Record',
    description: 'Add a new medical record for a patient',
    icon: Upload,
    href: '/staff/upload',
  },
  {
    label: 'Search Patient',
    description: 'Find a patient by UHID or name',
    icon: Search,
    href: '/staff/search',
  },
  {
    label: "Today's Uploads",
    description: 'Records uploaded today',
    icon: Clock,
    href: '/staff/today',
  },
  {
    label: 'All Records',
    description: 'Browse all uploaded records',
    icon: FileText,
    href: '/staff/records',
  },
  {
    label: 'Pending Tasks',
    description: 'Records awaiting review',
    icon: ClipboardList,
    href: '/staff/pending',
  },
  {
    label: 'My Profile',
    description: 'View and update your information',
    icon: User,
    href: '/staff/profile',
  },
];

export default function StaffDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="rounded-2xl bg-primary px-6 py-6 text-primary-foreground flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <p className="text-sm font-medium opacity-80">Welcome back,</p>
          <h1 className="text-2xl font-bold mt-0.5">{user?.name}</h1>
          <span className="inline-block mt-2 rounded-full bg-white/20 px-3 py-0.5 text-xs font-semibold tracking-wide">
            Hospital Staff
          </span>
        </div>
        <div className="rounded-xl bg-white/10 border border-white/20 px-5 py-4 flex items-center gap-3">
          <LayoutGrid className="w-8 h-8 opacity-70" />
          <div>
            <p className="text-xs font-medium opacity-70">Portal</p>
            <p className="text-sm font-bold">Staff Operations</p>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Today's Uploads", value: '—', icon: Upload },
          { label: 'Total Records', value: '—', icon: FileText },
          { label: 'Patients Served', value: '—', icon: Search },
          { label: 'Completed', value: '—', icon: CheckCircle2 },
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
        <h2 className="text-base font-semibold text-foreground mb-3">Quick Actions</h2>
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

      {/* Recent uploads */}
      <div className="rounded-xl border bg-card px-6 py-5">
        <h2 className="text-base font-semibold text-foreground mb-4">Recent Uploads</h2>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Upload className="w-8 h-8 text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">No uploads yet</p>
          <p className="text-xs text-muted-foreground/70 mt-0.5">
            Uploaded records will appear here.
          </p>
        </div>
      </div>
    </div>
  );
}
