import { useState } from 'react';
import { Search, AlertCircle, Loader2, FileText, Download, Eye } from 'lucide-react';
import { useGetRecords, useDownloadRecord, getRecordErrorMessage } from '@/hooks/useRecords';
import { RECORD_TYPE_LABELS, RECORD_SUBTYPE_LABELS } from '@/types/records';
import type { MedicalRecordSummary, RecordSubType } from '@/types/records';
import { format } from 'date-fns';

function RecordCard({
  record,
  onDownload,
  downloading,
}: {
  record: MedicalRecordSummary;
  onDownload: (id: string) => void;
  downloading: boolean;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border bg-card p-4 hover:bg-accent/30 transition-colors">
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 shrink-0">
        <FileText className="w-5 h-5 text-primary" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{record.title}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
          <span className="text-xs text-muted-foreground">
            {RECORD_TYPE_LABELS[record.recordType]}
            {record.subType && ` · ${RECORD_SUBTYPE_LABELS[record.subType as RecordSubType]}`}
          </span>
          {record.labName && (
            <span className="text-xs text-muted-foreground">{record.labName}</span>
          )}
          {record.testDate && (
            <span className="text-xs text-muted-foreground">
              {format(new Date(record.testDate), 'dd MMM yyyy')}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {record.hasAiSummary && (
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700">
            AI
          </span>
        )}
        <button
          onClick={() => onDownload(record.id)}
          disabled={downloading}
          title="Download"
          className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40"
        >
          {downloading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}

export default function SearchPatientPage() {
  const [uhidInput, setUhidInput] = useState('');
  const [uhid, setUhid] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useGetRecords(uhid);
  const download = useDownloadRecord();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = uhidInput.trim().toUpperCase();
    if (trimmed) setUhid(trimmed);
  };

  const handleDownload = (id: string) => {
    setDownloadingId(id);
    download.mutate(id, {
      onSettled: () => setDownloadingId(null),
    });
  };

  const records = data?.records ?? [];
  const pagination = data?.pagination;

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Search Patient Records</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Enter a patient UHID to view their uploaded medical records.
        </p>
      </div>

      {/* ── Search form ── */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            value={uhidInput}
            onChange={(e) => setUhidInput(e.target.value)}
            placeholder="Enter Patient UHID (e.g. UH-847291)"
            className="w-full rounded-xl border border-border bg-background pl-9 pr-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={!uhidInput.trim() || isLoading}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Search
        </button>
      </form>

      {/* ── States ── */}
      {!uhid && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card py-16 text-center">
          <Eye className="w-10 h-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Enter a patient UHID to search</p>
        </div>
      )}

      {uhid && isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {uhid && isError && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
          <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-destructive">Could not load records</p>
            <p className="text-xs text-destructive/80 mt-0.5">{getRecordErrorMessage(error)}</p>
          </div>
        </div>
      )}

      {uhid && !isLoading && !isError && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              UHID: <span className="font-mono font-semibold text-foreground">{uhid}</span>
            </p>
            {pagination && (
              <p className="text-xs text-muted-foreground">
                {pagination.total} record{pagination.total !== 1 ? 's' : ''} found
              </p>
            )}
          </div>

          {records.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card py-12 text-center">
              <FileText className="w-8 h-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No records found for this patient</p>
            </div>
          ) : (
            <div className="space-y-2">
              {records.map((record) => (
                <RecordCard
                  key={record.id}
                  record={record}
                  onDownload={handleDownload}
                  downloading={downloadingId === record.id}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
