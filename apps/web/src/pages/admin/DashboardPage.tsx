import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { useHospitalAnalytics, usePendingVerifications, useAuditLogs } from '@/hooks/useAdmin';
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
  FileText,
  Activity,
  Brain,
  Zap,
} from 'lucide-react';

const SEVERITY_COLORS: Record<string, string> = {
  LOW:      'bg-gray-100 text-gray-700',
  MEDIUM:   'bg-blue-100 text-blue-700',
  HIGH:     'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-700',
};

export default function AdminDashboardPage() {
  const user       = useAuthStore((s) => s.user);
  const navigate   = useNavigate();

  const { data: analytics, isLoading: analyticsLoading } = useHospitalAnalytics();
  const { data: pending }  = usePendingVerifications();
  const { data: auditData } = useAuditLogs({ limit: 5 });

  const pendingCount = pending?.length ?? 0;
  const recentLogs   = auditData?.logs?.slice(0, 5) ?? [];

  if (analyticsLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="admin-loading">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const stats = [
    {
      label: 'Total Patients',
      value: analytics?.totalPatients.toLocaleString() ?? '—',
      icon:  Users,
      desc:  'Treated at your hospital',
    },
    {
      label: 'Records This Month',
      value: analytics?.recordsUploadedThisMonth.toLocaleString() ?? '—',
      icon:  FileText,
      desc:  'Uploads in current month',
    },
    {
      label: 'Prescriptions',
      value: analytics?.prescriptionsIssuedThisMonth.toLocaleString() ?? '—',
      icon:  Activity,
      desc:  'Issued this month',
    },
    {
      label: 'Pending Consents',
      value: analytics?.pendingConsents.toLocaleString() ?? '—',
      icon:  Clock,
      desc:  'Awaiting patient response',
    },
    {
      label: 'Emergency Overrides',
      value: analytics?.emergencyOverridesThisMonth.toLocaleString() ?? '—',
      icon:  Zap,
      desc:  'This month — review required',
    },
    {
      label: 'AI Reports',
      value: analytics?.aiReportsThisMonth.toLocaleString() ?? '—',
      icon:  Brain,
      desc:  'Generated this month',
    },
  ];

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

      {/* ── Pending verifications alert ── */}
      {pendingCount > 0 && (
        <button
          data-testid="pending-alert"
          onClick={() => navigate('/admin/staff')}
          className="w-full flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left hover:bg-amber-100 transition-colors"
        >
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {pendingCount} staff member{pendingCount !== 1 ? 's' : ''} awaiting verification
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Click to review → Staff Management → Pending tab
            </p>
          </div>
        </button>
      )}

      {/* ── KPI stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {stats.map(({ label, value, icon: Icon, desc }) => (
          <div key={label} className="rounded-xl border bg-card px-4 py-4" data-testid="stat-card">
            <div className="flex items-center gap-2 mb-1">
              <Icon className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-[11px] text-muted-foreground/70 mt-0.5">{desc}</p>
          </div>
        ))}
      </div>

      {/* ── Records per day trend ── */}
      {analytics?.trends.recordsPerDay && analytics.trends.recordsPerDay.length > 0 && (
        <div className="rounded-xl border bg-card px-4 py-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">Records uploaded — last 30 days</h2>
          <div className="flex items-end gap-1 h-16">
            {analytics.trends.recordsPerDay.slice(-30).map(({ date, count }) => {
              const max = Math.max(...analytics.trends.recordsPerDay.map((d) => d.count), 1);
              const pct = Math.max((count / max) * 100, 4);
              return (
                <div
                  key={date}
                  title={`${date}: ${count}`}
                  style={{ height: `${pct}%` }}
                  className="flex-1 rounded-sm bg-primary/60 hover:bg-primary transition-colors min-h-[3px]"
                />
              );
            })}
          </div>
        </div>
      )}

      {/* ── Recent audit logs ── */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-sm font-semibold text-foreground">Recent audit activity</h2>
          <button
            onClick={() => navigate('/admin/audit')}
            className="text-xs text-primary hover:underline"
          >
            View all →
          </button>
        </div>
        {recentLogs.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">No recent audit entries</p>
        ) : (
          <table className="w-full text-xs" data-testid="recent-audit-table">
            <thead>
              <tr className="text-muted-foreground border-b bg-muted/30">
                <th className="text-left px-4 py-2 font-medium">Time</th>
                <th className="text-left px-4 py-2 font-medium">Action</th>
                <th className="text-left px-4 py-2 font-medium">Actor</th>
                <th className="text-left px-4 py-2 font-medium">Severity</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.map((log) => (
                <tr
                  key={log.id}
                  data-testid="audit-row"
                  className="border-b last:border-0 hover:bg-muted/20 transition-colors"
                >
                  <td className="px-4 py-2 text-muted-foreground">
                    {new Date(log.createdAt).toLocaleTimeString()}
                  </td>
                  <td className="px-4 py-2 font-mono">{log.action}</td>
                  <td className="px-4 py-2 text-muted-foreground truncate max-w-[120px]">{log.actorId}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${SEVERITY_COLORS[log.severity] ?? ''}`}>
                      {log.severity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Quick nav ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Staff',     icon: UserCog,    href: '/admin/staff' },
          { label: 'Audit',     icon: ScrollText, href: '/admin/audit' },
          { label: 'Analytics', icon: BarChart2,  href: '/admin/analytics' },
          { label: 'Hospital',  icon: Hospital,   href: '/admin/hospital' },
          { label: 'Settings',  icon: Settings,   href: '/admin/settings' },
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

      <p className="text-xs text-muted-foreground/60 text-center pb-2">
        You manage <strong>your hospital only</strong>. Platform-level administration is handled by the UHID Super Admin.
      </p>
    </div>
  );
}
