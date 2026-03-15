import { useState } from 'react';
import {
  FileText, Loader2, AlertCircle, Download, X, ChevronLeft, ChevronRight,
  Sparkles, Calendar, Building2,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  useMyRecords, useGetRecord, useDownloadRecord, getRecordErrorMessage,
} from '@/hooks/useRecords';
import {
  RECORD_TYPES, RECORD_TYPE_LABELS, RECORD_SUBTYPE_LABELS,
} from '@/types/records';
import type { MedicalRecordSummary, RecordSubType, GetRecordsParams } from '@/types/records';

// ─── Detail modal ──────────────────────────────────────────────────────────────
function RecordDetailModal({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const { data: record, isLoading, isError, error } = useGetRecord(id);
  const download = useDownloadRecord();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border bg-card shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">Record Details</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-accent transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-5">
          {isLoading && (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}

          {isError && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
              <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-sm text-destructive">{getRecordErrorMessage(error)}</p>
            </div>
          )}

          {record && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-foreground">{record.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {RECORD_TYPE_LABELS[record.recordType]}
                  {record.subType && ` · ${RECORD_SUBTYPE_LABELS[record.subType as RecordSubType]}`}
                </p>
              </div>

              <dl className="grid grid-cols-2 gap-3 text-xs">
                {record.testDate && (
                  <>
                    <dt className="text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Date
                    </dt>
                    <dd className="font-medium text-foreground">
                      {format(new Date(record.testDate), 'dd MMM yyyy')}
                    </dd>
                  </>
                )}
                {record.hospital && (
                  <>
                    <dt className="text-muted-foreground flex items-center gap-1">
                      <Building2 className="w-3 h-3" /> Hospital
                    </dt>
                    <dd className="font-medium text-foreground">{record.hospital.name}</dd>
                  </>
                )}
                {record.labName && (
                  <>
                    <dt className="text-muted-foreground">Lab</dt>
                    <dd className="font-medium text-foreground">{record.labName}</dd>
                  </>
                )}
                {record.isVerified !== undefined && (
                  <>
                    <dt className="text-muted-foreground">Verified</dt>
                    <dd className={record.isVerified ? 'text-green-600 font-medium' : 'text-amber-600 font-medium'}>
                      {record.isVerified ? 'Yes' : 'Pending'}
                    </dd>
                  </>
                )}
              </dl>

              {record.description && (
                <p className="text-xs text-muted-foreground border-t pt-3">{record.description}</p>
              )}

              {record.aiSummary && (
                <div className="rounded-xl bg-violet-50 border border-violet-200 p-3">
                  <div className="flex items-center gap-1.5 text-violet-700 mb-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold">AI Summary</span>
                  </div>
                  <p className="text-xs text-violet-800 leading-relaxed">{record.aiSummary.summaryText}</p>
                </div>
              )}

              {record.tags && record.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {record.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] text-secondary-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <button
                onClick={() => download.mutate(id)}
                disabled={download.isPending}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-60"
              >
                {download.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Download File
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Record card ───────────────────────────────────────────────────────────────
function RecordCard({
  record,
  onClick,
}: {
  record: MedicalRecordSummary;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left w-full flex items-start gap-3 rounded-xl border bg-card p-4 hover:bg-accent/30 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
    >
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 shrink-0 mt-0.5">
        <FileText className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{record.title}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
          <span className="text-xs text-muted-foreground">
            {RECORD_TYPE_LABELS[record.recordType]}
            {record.subType && ` · ${RECORD_SUBTYPE_LABELS[record.subType as RecordSubType]}`}
          </span>
          {record.hospital && (
            <span className="text-xs text-muted-foreground">{record.hospital.name}</span>
          )}
          {record.testDate && (
            <span className="text-xs text-muted-foreground">
              {format(new Date(record.testDate), 'dd MMM yyyy')}
            </span>
          )}
        </div>
      </div>
      {record.hasAiSummary && (
        <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700 shrink-0">
          <Sparkles className="w-2.5 h-2.5" />
          AI
        </span>
      )}
    </button>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function PatientRecordsPage() {
  const [params, setParams] = useState<GetRecordsParams>({ page: 1, limit: 10 });
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const queryParams: GetRecordsParams = {
    ...params,
    type: (typeFilter || undefined) as GetRecordsParams['type'],
  };

  const { data, isLoading, isError, error } = useMyRecords(queryParams);
  const records = data?.records ?? [];
  const pagination = data?.pagination;

  const handleTypeFilter = (type: string) => {
    setTypeFilter(type);
    setParams((p) => ({ ...p, page: 1 }));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">

      {/* ── Header ── */}
      <div>
        <h1 className="text-xl font-bold text-foreground">My Medical Records</h1>
        <p className="text-sm text-muted-foreground mt-1">
          View and download your medical records uploaded by hospital staff.
        </p>
      </div>

      {/* ── Type filter chips ── */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleTypeFilter('')}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            typeFilter === ''
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-accent'
          }`}
        >
          All
        </button>
        {RECORD_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => handleTypeFilter(t)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              typeFilter === t
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-accent'
            }`}
          >
            {RECORD_TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* ── States ── */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {isError && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
          <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
          <p className="text-sm text-destructive">{getRecordErrorMessage(error)}</p>
        </div>
      )}

      {!isLoading && !isError && records.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card py-16 text-center">
          <FileText className="w-10 h-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No records found</p>
          <p className="text-xs text-muted-foreground mt-1">
            {typeFilter ? 'Try clearing the filter.' : 'Records uploaded by hospital staff will appear here.'}
          </p>
        </div>
      )}

      {records.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {pagination?.total ?? records.length} record{(pagination?.total ?? records.length) !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="space-y-2">
            {records.map((r) => (
              <RecordCard key={r.id} record={r} onClick={() => setSelectedId(r.id)} />
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) - 1 }))}
                disabled={(params.page ?? 1) <= 1}
                className="rounded-lg border p-2 hover:bg-accent transition-colors disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-muted-foreground">
                Page {params.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) + 1 }))}
                disabled={(params.page ?? 1) >= pagination.totalPages}
                className="rounded-lg border p-2 hover:bg-accent transition-colors disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Detail modal ── */}
      {selectedId && (
        <RecordDetailModal id={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
