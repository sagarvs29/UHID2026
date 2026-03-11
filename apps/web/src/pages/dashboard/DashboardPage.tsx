import { useAuthStore } from '@/stores/auth.store';
import { Activity, ShieldCheck, FileText, Calendar, QrCode } from 'lucide-react';

const quickActions = [
  { icon: QrCode, label: 'My QR Code', description: 'Show your UHID QR' },
  { icon: FileText, label: 'Medical Records', description: 'View all records' },
  { icon: Calendar, label: 'Appointments', description: 'Book or manage' },
  { icon: ShieldCheck, label: 'Consent', description: 'Manage access' },
];

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          Welcome back, {user?.name?.split(' ')[0]} 👋
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          {user?.uhid ? (
            <>
              Your UniHealth ID:{' '}
              <span className="font-mono font-semibold text-primary">
                {user.uhid}
              </span>
            </>
          ) : (
            'Here\'s your UHID dashboard'
          )}
        </p>
      </div>

      {/* Status banners */}
      {!user?.isEmailVerified && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          ⚠️ Please verify your email address to enable all features.
        </div>
      )}

      {/* Quick actions */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map(({ icon: Icon, label, description }) => (
            <button
              key={label}
              className="flex flex-col items-start gap-3 p-4 bg-card border rounded-xl hover:border-primary/40 hover:shadow-sm transition-all text-left"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Activity placeholder — Phase 2+ */}
      <div className="bg-card border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Recent Activity</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground text-sm">
            No activity yet. Your medical records and appointments will appear here.
          </p>
        </div>
      </div>
    </div>
  );
}
