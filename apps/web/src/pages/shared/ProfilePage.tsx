import { useAuthStore } from '@/stores/auth.store';
import {
  User,
  Mail,
  Shield,
  Calendar,
  Key,
  Info,
} from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  PATIENT:            'Patient',
  DOCTOR:             'Doctor',
  HOSPITAL_STAFF:     'Hospital Staff',
  HOSPITAL_ADMIN:     'Hospital Admin',
  INSURANCE_PROVIDER: 'Insurance Provider',
  SUPER_ADMIN:        'Super Admin',
};

const ROLE_COLORS: Record<string, string> = {
  PATIENT:            'bg-blue-100 text-blue-700',
  DOCTOR:             'bg-emerald-100 text-emerald-700',
  HOSPITAL_STAFF:     'bg-amber-100 text-amber-700',
  HOSPITAL_ADMIN:     'bg-violet-100 text-violet-700',
  INSURANCE_PROVIDER: 'bg-orange-100 text-orange-700',
  SUPER_ADMIN:        'bg-red-100 text-red-700',
};

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <User className="w-6 h-6 text-primary" />
          My Profile
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          View your account information and settings.
        </p>
      </div>

      {/* Profile card */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-primary via-[hsl(193,80%,40%)] to-primary/40" />
        <div className="px-6 pb-6 -mt-8">
          <div className="w-16 h-16 rounded-full bg-background border-4 border-background flex items-center justify-center text-2xl font-bold text-primary">
            {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
          </div>
          <div className="mt-3">
            <h2 className="text-xl font-bold text-foreground">{user?.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLORS[user?.role ?? ''] ?? 'bg-gray-100 text-gray-700'}`}>
                {ROLE_LABELS[user?.role ?? ''] ?? user?.role}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Account details */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Account Information</h3>
        <div className="space-y-3">
          {[
            { icon: User, label: 'Full Name', value: user?.name ?? '—' },
            { icon: Mail, label: 'Email', value: user?.email ?? '—' },
            { icon: Shield, label: 'Role', value: ROLE_LABELS[user?.role ?? ''] ?? user?.role ?? '—' },
            { icon: Key, label: 'User ID', value: user?.userId ? user.userId.slice(0, 12) + '…' : '—' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center justify-between rounded-lg bg-muted/30 px-4 py-3">
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{label}</span>
              </div>
              <span className="text-sm font-medium text-foreground">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Notice */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
        <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-blue-800">Profile editing coming soon</p>
          <p className="text-xs text-blue-600 mt-0.5">
            The ability to update your personal details, change password, and manage notification preferences
            will be available in an upcoming release.
          </p>
        </div>
      </div>
    </div>
  );
}
