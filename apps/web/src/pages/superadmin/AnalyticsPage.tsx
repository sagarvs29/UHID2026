import { usePlatformAnalytics } from '@/hooks/useAdmin';
import {
  BarChart2,
  Users,
  ScrollText,
  ShieldCheck,
  Landmark,
  HeartPulse,
  Brain,
  TrendingUp,
} from 'lucide-react';

export default function AnalyticsPage() {
  const { data: analytics, isLoading } = usePlatformAnalytics();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const kpis = [
    { label: 'Total Users',       value: analytics?.users.total ?? 0,          icon: Users,       color: 'text-blue-600' },
    { label: 'Total Records',     value: analytics?.totalRecords ?? 0,         icon: ScrollText,  color: 'text-emerald-600' },
    { label: 'Active Consents',   value: analytics?.activeConsents ?? 0,       icon: ShieldCheck, color: 'text-violet-600' },
    { label: 'Total Claims',      value: analytics?.claims.total ?? 0,         icon: Landmark,    color: 'text-orange-600' },
    { label: 'SOS Events (Month)', value: analytics?.sosEventsThisMonth ?? 0,  icon: HeartPulse,  color: 'text-red-600' },
    { label: 'AI Reports (30d)',  value: analytics?.aiUsageThisMonth ?? 0,     icon: Brain,       color: 'text-cyan-600' },
  ];

  const claimStatuses = Object.entries(analytics?.claims.byStatus ?? {});
  const roleBreakdown = Object.entries(analytics?.users.byRole ?? {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BarChart2 className="w-6 h-6 text-primary" />
          Platform Analytics
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Real-time platform-wide metrics and usage statistics.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {kpis.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border bg-card px-4 py-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-5 h-5 ${color}`} />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Users by role */}
      {roleBreakdown.length > 0 && (
        <div className="rounded-xl border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Users by Role
          </h2>
          <div className="space-y-2">
            {roleBreakdown.map(([role, count]) => {
              const total = analytics?.users.total ?? 1;
              const pct = ((count as number) / total * 100).toFixed(1);
              return (
                <div key={role} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-28 shrink-0">{role}</span>
                  <div className="flex-1 h-5 bg-muted/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/60 rounded-full transition-all"
                      style={{ width: `${Math.max(Number(pct), 2)}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-foreground w-14 text-right">
                    {(count as number).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-muted-foreground w-10 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Claims by status */}
      {claimStatuses.length > 0 && (
        <div className="rounded-xl border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Landmark className="w-4 h-4 text-primary" />
            Claims by Status
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {claimStatuses.map(([status, count]) => (
              <div key={status} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30">
                <span className="text-xs text-muted-foreground capitalize">{status.toLowerCase().replace(/_/g, ' ')}</span>
                <span className="text-sm font-bold text-foreground">{(count as number).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
        <p className="text-xs text-muted-foreground leading-relaxed flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary shrink-0" />
          Analytics are computed from live platform data. Numbers reflect the current state of the UHID system.
        </p>
      </div>
    </div>
  );
}
