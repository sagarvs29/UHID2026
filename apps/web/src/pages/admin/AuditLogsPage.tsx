import { useState } from 'react';
import { useAuditLogs } from '@/hooks/useAdmin';
import { api } from '@/lib/api';
import type { AuditLogFilters, AuditLogEntry, AuditAction, AuditSeverity } from '@/types/admin';
import { Download, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react';

const SEVERITY_COLORS: Record<AuditSeverity, string> = {
  LOW:      'bg-gray-100 text-gray-600',
  MEDIUM:   'bg-blue-100 text-blue-700',
  HIGH:     'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-700',
};

const ALL_ACTIONS: AuditAction[] = [
  'LOGIN','LOGOUT','FAILED_LOGIN','PASSWORD_RESET','EMAIL_VERIFIED','TOKEN_REFRESHED',
  'RECORD_UPLOADED','RECORD_VIEWED','RECORD_DOWNLOADED','RECORD_DELETED',
  'CONSENT_REQUESTED','CONSENT_APPROVED','CONSENT_DENIED','CONSENT_REVOKED','CONSENT_EXPIRED',
  'PRESCRIPTION_CREATED','PRESCRIPTION_VIEWED','CLINICAL_NOTE_CREATED','CLINICAL_NOTE_VIEWED','PHARMA_CHECK_OVERRIDE',
  'EMERGENCY_OVERRIDE','QR_GENERATED','QR_USED','QR_REVOKED','SOS_ACTIVATED','EMERGENCY_CODE_USED',
  'STAFF_VERIFIED','STAFF_REJECTED','STAFF_DEACTIVATED','HOSPITAL_VERIFIED','HOSPITAL_SUSPENDED','OVERRIDE_REVIEWED',
  'CLAIM_SUBMITTED','CLAIM_DECISION','RECORD_VERIFIED','AI_REPORT_GENERATED','AI_SUMMARY_GENERATED',
  'APPOINTMENT_BOOKED','APPOINTMENT_CANCELLED','APPOINTMENT_COMPLETED','VIDEO_ROOM_JOINED',
];

const ROLES = ['PATIENT','DOCTOR','HOSPITAL_STAFF','HOSPITAL_ADMIN','INSURANCE_PROVIDER','SUPER_ADMIN','PHARMACIST'];
const SEVERITIES: AuditSeverity[] = ['LOW','MEDIUM','HIGH','CRITICAL'];

// ─── Detail Drawer ────────────────────────────────────────────────────────────

function DetailDrawer({ log, onClose }: { log: AuditLogEntry; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end" data-testid="detail-drawer">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-card border-l shadow-xl flex flex-col h-full overflow-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-sm font-semibold text-foreground">Audit Log Detail</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          {[
            ['ID',         log.id],
            ['Action',     log.action],
            ['Severity',   log.severity],
            ['Actor ID',   log.actorId],
            ['Actor Role', log.actorRole],
            ['Target ID',  log.targetId ?? '—'],
            ['Target Type',log.targetType ?? '—'],
            ['Hospital',   log.hospitalId ?? '—'],
            ['IP Address', log.ipAddress ?? '—'],
            ['User Agent', log.userAgent ?? '—'],
            ['Time',       new Date(log.createdAt).toLocaleString()],
          ].map(([label, val]) => (
            <div key={label} className="flex gap-3">
              <span className="text-muted-foreground w-28 shrink-0">{label}</span>
              <span className="font-medium break-all">{val}</span>
            </div>
          ))}
          {log.metadata != null && (
            <div>
              <p className="text-muted-foreground mb-1">Metadata</p>
              <pre className="bg-muted rounded-lg p-3 text-xs overflow-auto whitespace-pre-wrap">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AuditLogsPage() {
  const [draft, setDraft] = useState<AuditLogFilters>({});
  const [applied, setApplied] = useState<AuditLogFilters>({});
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AuditLogEntry | null>(null);
  const [exporting, setExporting] = useState(false);

  const filters: AuditLogFilters = { ...applied, page, limit: 50 };
  const { data, isLoading, isError } = useAuditLogs(filters);

  const totalPages = data?.totalPages ?? 1;

  const handleApply = () => {
    setApplied({ ...draft });
    setPage(1);
  };

  const handleClear = () => {
    setDraft({});
    setApplied({});
    setPage(1);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (applied.action)     params.set('action',     applied.action);
      if (applied.actorRole)  params.set('actorRole',  applied.actorRole);
      if (applied.severity)   params.set('severity',   applied.severity);
      if (applied.hospitalId) params.set('hospitalId', applied.hospitalId);
      if (applied.search)     params.set('search',     applied.search);
      if (applied.dateFrom)   params.set('dateFrom',   applied.dateFrom);
      if (applied.dateTo)     params.set('dateTo',     applied.dateTo);
      const qs = params.toString();
      const res = await api.get<string>(`/admin/audit-logs/export${qs ? `?${qs}` : ''}`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data as unknown as BlobPart], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">Audit Logs</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Complete access and activity trail for your hospital.
        </p>
      </div>

      {/* ── Filter bar ── */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Filter className="w-4 h-4 text-primary" />
          Filters
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <select
            data-testid="filter-action"
            value={draft.action ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, action: (e.target.value as AuditAction) || undefined }))}
            className="rounded-lg border px-3 py-2 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="">All actions</option>
            {ALL_ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>

          <select
            data-testid="filter-severity"
            value={draft.severity ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, severity: (e.target.value as AuditSeverity) || undefined }))}
            className="rounded-lg border px-3 py-2 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="">All severities</option>
            {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            value={draft.actorRole ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, actorRole: e.target.value || undefined }))}
            className="rounded-lg border px-3 py-2 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="">All roles</option>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>

          <input
            type="date"
            value={draft.dateFrom ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, dateFrom: e.target.value || undefined }))}
            className="rounded-lg border px-3 py-2 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <input
            type="date"
            value={draft.dateTo ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, dateTo: e.target.value || undefined }))}
            className="rounded-lg border px-3 py-2 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/40"
          />

          <input
            data-testid="filter-search"
            type="text"
            placeholder="Search actor/target/IP…"
            value={draft.search ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, search: e.target.value || undefined }))}
            className="rounded-lg border px-3 py-2 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            data-testid="apply-filters"
            onClick={handleApply}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Apply
          </button>
          <button
            onClick={handleClear}
            className="px-4 py-2 text-sm rounded-lg border hover:bg-muted/40 transition-colors"
          >
            Clear
          </button>
          <div className="flex-1" />
          <button
            data-testid="export-csv"
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border border-primary/30 text-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      {isLoading && (
        <div className="flex justify-center py-12" data-testid="audit-loading">
          <div className="w-6 h-6 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {isError && (
        <div
          data-testid="audit-error"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          Failed to load audit logs. Please try again.
        </div>
      )}

      {!isLoading && !isError && (
        <>
          {data?.logs.length === 0 ? (
            <p className="text-center py-12 text-sm text-muted-foreground" data-testid="no-logs">
              No audit log entries match your filters.
            </p>
          ) : (
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="px-4 py-2 border-b bg-muted/30 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {data?.total.toLocaleString()} total entries
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs" data-testid="audit-table">
                  <thead>
                    <tr className="text-muted-foreground border-b">
                      <th className="text-left px-4 py-2 font-medium">Time</th>
                      <th className="text-left px-4 py-2 font-medium">Action</th>
                      <th className="text-left px-4 py-2 font-medium">Actor</th>
                      <th className="text-left px-4 py-2 font-medium">Role</th>
                      <th className="text-left px-4 py-2 font-medium">Target</th>
                      <th className="text-left px-4 py-2 font-medium">Severity</th>
                      <th className="text-left px-4 py-2 font-medium">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.logs.map((log) => (
                      <tr
                        key={log.id}
                        data-testid="audit-row"
                        onClick={() => setSelected(log)}
                        className="border-b last:border-0 hover:bg-muted/20 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-2 font-mono whitespace-nowrap">{log.action}</td>
                        <td className="px-4 py-2 text-muted-foreground max-w-[100px] truncate">{log.actorId}</td>
                        <td className="px-4 py-2 text-muted-foreground">{log.actorRole}</td>
                        <td className="px-4 py-2 text-muted-foreground max-w-[80px] truncate">{log.targetId ?? '—'}</td>
                        <td className="px-4 py-2">
                          <span
                            data-testid="severity-badge"
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${SEVERITY_COLORS[log.severity]}`}
                          >
                            {log.severity}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">{log.ipAddress ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border hover:bg-muted/40 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border hover:bg-muted/40 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Detail drawer ── */}
      {selected && <DetailDrawer log={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
