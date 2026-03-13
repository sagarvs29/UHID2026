import { useAuthStore } from '@/stores/auth.store';
import {
  Users,
  Shield,
  FileText,
  User,
  ClipboardList,
  Stethoscope,
  CalendarDays,
  BookOpen,
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
    label: 'My Patients',
    description: 'View and manage your patient list',
    icon: Users,
    href: '/doctor/patients',
  },
  {
    label: 'Pending Consents',
    description: 'Review consent requests awaiting your action',
    icon: Shield,
    href: '/doctor/consents',
  },
  {
    label: 'Prescriptions',
    description: 'Write and manage prescriptions',
    icon: ClipboardList,
    href: '/doctor/prescriptions',
  },
  {
    label: 'Appointments',
    description: 'View today\'s scheduled appointments',
    icon: CalendarDays,
    href: '/doctor/appointments',
  },
  {
    label: 'Patient Records',
    description: 'Access medical records with patient consent',
    icon: FileText,
    href: '/doctor/records',
  },
  {
    label: 'My Profile',
    description: 'Update your credentials and information',
    icon: User,
    href: '/doctor/profile',
  },
];

export default function DoctorDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="rounded-2xl bg-primary px-6 py-6 text-primary-foreground flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <p className="text-sm font-medium opacity-80">Welcome back, Doctor</p>
          <h1 className="text-2xl font-bold mt-0.5">{user?.name}</h1>
          <span className="inline-block mt-2 rounded-full bg-white/20 px-3 py-0.5 text-xs font-semibold tracking-wide">
            Doctor
          </span>
        </div>
        <div className="rounded-xl bg-white/10 border border-white/20 px-5 py-4 flex items-center gap-3">
          <Stethoscope className="w-8 h-8 opacity-70" />
          <div>
            <p className="text-xs font-medium opacity-70">Status</p>
            <p className="text-sm font-bold">Verified Physician</p>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Patients', value: '—', icon: Users },
          { label: 'Pending Consents', value: '—', icon: Shield },
          { label: "Today's Appointments", value: '—', icon: CalendarDays },
          { label: 'Prescriptions', value: '—', icon: BookOpen },
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

      {/* Recent patients placeholder */}
      <div className="rounded-xl border bg-card px-6 py-5">
        <h2 className="text-base font-semibold text-foreground mb-4">Recent Patients</h2>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Users className="w-8 h-8 text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">No recent patient activity</p>
          <p className="text-xs text-muted-foreground/70 mt-0.5">
            Patient consents and records will appear here.
          </p>
        </div>
      </div>
    </div>
  );
}
