import { useAuthStore } from '@/stores/auth.store';
import { usePlatformAnalytics, useHospitalList, useHospitalAction } from '@/hooks/useAdmin';
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
  Brain,
  HeartPulse,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SuperAdminDashboardPage() {
  const user     = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const { data: analytics, isLoading } = usePlatformAnalytics();
  const { data: hospitals = [] }        = useHospitalList();
  const hospitalAction                  = useHospitalAction();

  const pendingHospitals = hospitals.filter((h) => !h.isVerified);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="platform-loading">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const platformStats = [
    { label: 'Total Users',       value: analytics?.users.total.toLocaleString()    ?? '—', icon: Users,       desc: 'All roles combined' },
    { label: 'Total Records',     value: analytics?.totalRecords.toLocaleString()   ?? '—', icon: ScrollText,  desc: 'Across all hospitals' },
    { label: 'Active Consents',   value: analytics?.activeConsents.toLocaleString() ?? '—', icon: ShieldCheck, desc: 'Platform-wide' },
    { label: 'Total Claims',      value: analytics?.claims.total.toLocaleString()   ?? '—', icon: Landmark,    desc: 'All insurance claims' },
    { label: 'SOS This Month',    value: analytics?.sosEventsThisMonth.toLocaleString() ?? '—', icon: HeartPulse, desc: 'Emergency activations' },
    { label: 'AI Reports (30d)',  value: analytics?.aiUsageThisMonth.toLocaleString()   ?? '—', icon: Brain,   desc: 'AI API calls used' },
  ];

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

      {/* ── Warning ── */}
      <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
        <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-red-800">
            You have full platform access — every action is logged and audited
          </p>
          <p className="text-xs text-red-600 mt-0.5">
            Actions taken here affect all hospitals and users on the UHID platform.
          </p>
        </div>
      </div>

      {/* ── Platform KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {platformStats.map(({ label, value, icon: Icon, desc }) => (
          <div key={label} className="rounded-xl border bg-card px-4 py-4" data-testid="platform-stat">
            <div className="flex items-center gap-2 mb-1">
              <Icon className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-[11px] text-muted-foreground/70 mt-0.5">{desc}</p>
          </div>
        ))}
      </div>

      {/* ── Users by role ── */}
      {analytics?.users.byRole && (
        <div className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Users by role
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(analytics.users.byRole).map(([role, count]) => (
              <div key={role} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30 text-xs">
                <span className="text-muted-foreground">{role}</span>
                <span className="font-semibold text-foreground">{(count as number).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Hospitals table ── */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Hospital className="w-4 h-4 text-primary" />
            Hospitals
            {pendingHospitals.length > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold ml-1">
                {pendingHospitals.length}
              </span>
            )}
          </h2>
          <button
            onClick={() => navigate('/superadmin/hospitals')}
            className="text-xs text-primary hover:underline"
          >
            View all →
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs" data-testid="hospitals-table">
            <thead>
              <tr className="text-muted-foreground border-b bg-muted/30">
                <th className="text-left px-4 py-2 font-medium">Name</th>
                <th className="text-left px-4 py-2 font-medium">City</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-left px-4 py-2 font-medium">Doctors</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {hospitals.slice(0, 10).map((hosp) => (
                <tr
                  key={hosp.id}
                  data-testid="hospital-row"
                  className="border-b last:border-0 hover:bg-muted/20 transition-colors"
                >
                  <td className="px-4 py-2.5 font-medium">{hosp.name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{hosp.city}, {hosp.state}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      hosp.isVerified
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {hosp.isVerified ? 'Verified' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{hosp.doctorCount}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1.5 justify-end">
                      {!hosp.isVerified ? (
                        <button
                          data-testid="verify-hospital-btn"
                          onClick={() => hospitalAction.mutate({ hospitalId: hosp.id, action: 'VERIFY' })}
                          disabled={hospitalAction.isPending}
                          className="px-2 py-1 text-[10px] font-medium rounded bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          Verify
                        </button>
                      ) : (
                        <button
                          data-testid="suspend-hospital-btn"
                          onClick={() => hospitalAction.mutate({ hospitalId: hosp.id, action: 'SUSPEND' })}
                          disabled={hospitalAction.isPending}
                          className="px-2 py-1 text-[10px] font-medium rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          Suspend
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Quick nav ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Hospital Mgmt', icon: Hospital,  href: '/superadmin/hospitals' },
          { label: 'All Users',     icon: Globe,      href: '/superadmin/users' },
          { label: 'Insurance',     icon: Landmark,   href: '/superadmin/insurance' },
          { label: 'Audit Logs',    icon: ScrollText, href: '/superadmin/audit' },
          { label: 'Analytics',     icon: BarChart2,  href: '/superadmin/analytics' },
          { label: 'Settings',      icon: Settings,   href: '/superadmin/settings' },
        ].map(({ label, icon: Icon, href }) => (
          <button
            key={label}
            onClick={() => navigate(href)}
            className="flex items-center gap-2 rounded-xl border bg-card px-3 py-3 text-sm font-medium text-foreground hover:bg-muted/40 transition-colors"
          >
            <Icon className="w-4 h-4 text-primary" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Scope note ── */}
      <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Role boundary:</strong> Hospital Admins manage their own hospital's staff and audit logs.
          You manage the entire platform — all hospitals, all users, platform configuration, and cross-hospital analytics.
        </p>
      </div>

    </div>
  );
}
