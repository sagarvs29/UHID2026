import { useHospitalAnalytics } from '@/hooks/useAdmin';
import {
  BarChart2,
  Users,
  FileText,
  Activity,
  Clock,
  Zap,
  Brain,
  TrendingUp,
} from 'lucide-react';

export default function AnalyticsPage() {
  const { data: analytics, isLoading } = useHospitalAnalytics();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const kpis = [
    { label: 'Total Patients',         value: analytics?.totalPatients ?? 0,                 icon: Users,    color: 'text-blue-600' },
    { label: 'Records (Month)',         value: analytics?.recordsUploadedThisMonth ?? 0,      icon: FileText, color: 'text-emerald-600' },
    { label: 'Prescriptions (Month)',   value: analytics?.prescriptionsIssuedThisMonth ?? 0,  icon: Activity, color: 'text-violet-600' },
    { label: 'Pending Consents',        value: analytics?.pendingConsents ?? 0,               icon: Clock,    color: 'text-amber-600' },
    { label: 'Emergency Overrides',     value: analytics?.emergencyOverridesThisMonth ?? 0,   icon: Zap,      color: 'text-red-600' },
    { label: 'AI Reports (Month)',      value: analytics?.aiReportsThisMonth ?? 0,            icon: Brain,    color: 'text-cyan-600' },
  ];

  const trend = analytics?.trends.recordsPerDay ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BarChart2 className="w-6 h-6 text-primary" />
          Hospital Analytics
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Operational and clinical analytics for your hospital.
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

      {/* Records trend chart */}
      {trend.length > 0 && (
        <div className="rounded-xl border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Records Uploaded — Last 30 Days
          </h2>
          <div className="flex items-end gap-1 h-32">
            {trend.slice(-30).map(({ date, count }) => {
              const max = Math.max(...trend.map((d) => d.count), 1);
              const pct = Math.max((count / max) * 100, 3);
              return (
                <div
                  key={date}
                  className="flex-1 group relative"
                >
                  <div
                    title={`${date}: ${count} records`}
                    style={{ height: `${pct}%` }}
                    className="w-full rounded-sm bg-primary/50 hover:bg-primary transition-colors min-h-[3px]"
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
            <span>{trend[0]?.date}</span>
            <span>{trend[trend.length - 1]?.date}</span>
          </div>
        </div>
      )}

      {/* Note */}
      <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
        <p className="text-xs text-muted-foreground leading-relaxed flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-primary shrink-0" />
          Analytics are scoped to your hospital only. Platform-wide analytics are available to Super Admins.
        </p>
      </div>
    </div>
  );
}
