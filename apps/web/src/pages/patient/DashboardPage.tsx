import { useAuthStore } from '@/stores/auth.store';
import {
  FileText,
  Shield,
  QrCode,
  User,
  Copy,
  CheckCheck,
  ClipboardList,
  Stethoscope,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface ActionCard {
  label: string;
  description: string;
  icon: React.ElementType;
  href: string;
  accent?: boolean;
}

const ACTIONS: ActionCard[] = [
  {
    label: 'My Health Records',
    description: 'View your complete medical history',
    icon: FileText,
    href: '/patient/records',
  },
  {
    label: 'Consent Requests',
    description: 'Manage who can access your records',
    icon: Shield,
    href: '/patient/consent',
  },
  {
    label: 'My QR Code',
    description: 'Share your UHID with doctors quickly',
    icon: QrCode,
    href: '/patient/qr',
  },
  {
    label: 'Find a Doctor',
    description: 'Search and book appointments',
    icon: Stethoscope,
    href: '/patient/find-doctor',
  },
  {
    label: 'My Appointments',
    description: 'View upcoming and past appointments',
    icon: ClipboardList,
    href: '/patient/appointments',
  },
  {
    label: 'My Profile',
    description: 'Update your personal information',
    icon: User,
    href: '/patient/profile',
  },
];

export default function PatientDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const copyUhid = () => {
    if (user?.uhid) {
      navigator.clipboard.writeText(user.uhid);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const firstName = user?.name?.split(' ')[0] ?? 'Patient';

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="rounded-2xl bg-primary px-6 py-6 text-primary-foreground flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <p className="text-sm font-medium opacity-80">Good to see you,</p>
          <h1 className="text-2xl font-bold mt-0.5">{user?.name}</h1>
          <span className="inline-block mt-2 rounded-full bg-white/20 px-3 py-0.5 text-xs font-semibold tracking-wide">
            Patient
          </span>
        </div>
        {/* UHID display */}
        {user?.uhid && (
          <div className="rounded-xl bg-white/10 border border-white/20 px-5 py-4 min-w-[220px]">
            <p className="text-xs font-medium opacity-70 mb-1">Your UHID</p>
            <p className="font-mono text-lg font-bold tracking-wider">{user.uhid}</p>
            <button
              onClick={copyUhid}
              className="mt-2 flex items-center gap-1.5 text-xs opacity-80 hover:opacity-100 transition-opacity"
            >
              {copied ? (
                <><CheckCheck className="w-3.5 h-3.5" /> Copied!</>
              ) : (
                <><Copy className="w-3.5 h-3.5" /> Copy ID</>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Email verification notice */}
      {!user?.isEmailVerified && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800/40 px-5 py-3.5 flex items-start gap-3">
          <ClipboardList className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
              Please verify your email address
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-0.5">
              Check your inbox for a verification link to unlock all features.
            </p>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ACTIONS.map(({ label, description, icon: Icon, href, accent }) => (
            <button
              key={label}
              onClick={() => navigate(href)}
              className={`text-left rounded-xl border p-5 transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 ${
                accent
                  ? 'border-red-200 bg-red-50 hover:border-red-300 dark:bg-red-950/30 dark:border-red-900/40'
                  : 'border-border bg-card hover:border-primary/30'
              }`}
            >
              <div
                className={`inline-flex items-center justify-center w-10 h-10 rounded-lg mb-3 ${
                  accent
                    ? 'bg-red-100 dark:bg-red-900/40'
                    : 'bg-primary/10'
                }`}
              >
                <Icon className={`w-5 h-5 ${accent ? 'text-red-600 dark:text-red-400' : 'text-primary'}`} />
              </div>
              <p className={`text-sm font-semibold ${accent ? 'text-red-800 dark:text-red-300' : 'text-foreground'}`}>
                {label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Recent activity placeholder */}
      <div className="rounded-xl border bg-card px-6 py-5">
        <h2 className="text-base font-semibold text-foreground mb-4">Recent Activity</h2>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <FileText className="w-8 h-8 text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">No recent activity</p>
          <p className="text-xs text-muted-foreground/70 mt-0.5">
            Your health activity will appear here.
          </p>
        </div>
      </div>
    </div>
  );
}
