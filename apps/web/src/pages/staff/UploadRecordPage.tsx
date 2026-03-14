import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Upload, FileText, Image, AlertCircle, CheckCircle2,
  Loader2, X, RefreshCw,
} from 'lucide-react';
import { useUploadRecord, getRecordErrorMessage } from '@/hooks/useRecords';
import {
  RECORD_TYPES, RECORD_TYPE_LABELS, SUB_TYPES_FOR, RECORD_SUBTYPE_LABELS,
} from '@/types/records';
import type { RecordType, RecordSubType, UploadFormValues } from '@/types/records';

// ─── Zod schema ───────────────────────────────────────────────────────────────
const schema = z.object({
  patientUhid: z
    .string({ required_error: 'Patient UHID is required' })
    .min(1, 'Patient UHID is required'),
  recordType: z
    .string({ required_error: 'Record type is required' })
    .refine((v) => (RECORD_TYPES as readonly string[]).includes(v), {
      message: 'Record type is required',
    }) as z.ZodType<RecordType>,
  subType: z.string().optional() as z.ZodOptional<z.ZodEnum<[string, ...string[]]>>,
  title: z
    .string({ required_error: 'Title is required' })
    .min(3, 'Title must be at least 3 characters')
    .max(200),
  description: z.string().max(500).optional(),
  recordDate: z.string().optional(),
  tags: z.string().optional(),
  file: z
    .custom<FileList>((v) => v instanceof FileList && v.length > 0, 'Please select a file')
    .refine(
      (fl) => fl[0]?.size <= 10 * 1024 * 1024,
      'File must be under 10 MB'
    )
    .refine(
      (fl) => ['application/pdf','image/jpeg','image/jpg','image/png','image/webp']
                .includes(fl[0]?.type),
      'Allowed formats: PDF, JPG, PNG, WebP'
    ),
});

const MIME_ICON: Record<string, React.ElementType> = {
  'application/pdf': FileText,
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function UploadRecordPage() {
  const upload = useUploadRecord();
  const [dragOver, setDragOver] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ name: string; size: number; type: string } | null>(null);
  const [uploadedRecord, setUploadedRecord] = useState<{ id: string; title: string } | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<UploadFormValues>({
    resolver: zodResolver(schema),
  });

  const selectedType = watch('recordType') as RecordType | undefined;
  const availableSubTypes = selectedType ? SUB_TYPES_FOR[selectedType] ?? [] : [];

  // Clear subType when recordType changes
  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setValue('recordType', e.target.value as RecordType);
    setValue('subType', undefined);
  };

  // File drop handler
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const dt = new DataTransfer();
        dt.items.add(files[0]);
        setValue('file', dt.files, { shouldValidate: true });
        setPreviewFile({ name: files[0].name, size: files[0].size, type: files[0].type });
      }
    },
    [setValue]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setPreviewFile({ name: f.name, size: f.size, type: f.type });
  };

  const onSubmit = (values: UploadFormValues) => {
    upload.mutate(
      {
        file:        values.file[0],
        patientUhid: values.patientUhid.trim().toUpperCase(),
        recordType:  values.recordType,
        subType:     values.subType as RecordSubType | undefined,
        title:       values.title,
        description: values.description,
        recordDate:  values.recordDate,
        tags:        values.tags,
      },
      {
        onSuccess: (data) => {
          setUploadedRecord({ id: data.id, title: data.title });
        },
      }
    );
  };

  const handleUploadAnother = () => {
    reset();
    setPreviewFile(null);
    setUploadedRecord(null);
    upload.reset();
  };

  // ── Success screen ──
  if (uploadedRecord) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-green-800">Record Uploaded Successfully</h2>
          <p className="mt-2 text-sm text-green-700">
            <span className="font-semibold">{uploadedRecord.title}</span> has been saved. The patient will be notified.
          </p>
          <button
            onClick={handleUploadAnother}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <RefreshCw className="w-4 h-4" />
            Upload Another Record
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* ── Page header ── */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Upload Medical Record</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a record for a patient. Only PDF and image files under 10 MB are accepted.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* ── Patient UHID ── */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Patient</h2>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Patient UHID <span className="text-destructive">*</span>
            </label>
            <input
              {...register('patientUhid')}
              placeholder="e.g. UH-847291"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
            {errors.patientUhid && (
              <p className="mt-1.5 text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.patientUhid.message}
              </p>
            )}
          </div>
        </div>

        {/* ── Record classification ── */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Record Details</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Record type */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Record Type <span className="text-destructive">*</span>
              </label>
              <select
                {...register('recordType')}
                onChange={handleTypeChange}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              >
                <option value="">Select type...</option>
                {RECORD_TYPES.map((t) => (
                  <option key={t} value={t}>{RECORD_TYPE_LABELS[t]}</option>
                ))}
              </select>
              {errors.recordType && (
                <p className="mt-1.5 text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.recordType.message}
                </p>
              )}
            </div>

            {/* Sub-type */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Sub-type
                {availableSubTypes.length === 0 && (
                  <span className="ml-1 text-muted-foreground/50">(optional)</span>
                )}
              </label>
              <select
                {...register('subType')}
                disabled={availableSubTypes.length === 0}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors disabled:opacity-40"
              >
                <option value="">Select sub-type...</option>
                {availableSubTypes.map((st) => (
                  <option key={st} value={st}>{RECORD_SUBTYPE_LABELS[st as RecordSubType]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Title <span className="text-destructive">*</span>
            </label>
            <input
              {...register('title')}
              placeholder="e.g. Complete Blood Count — Feb 2026"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
            {errors.title && (
              <p className="mt-1.5 text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.title.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Test/record date */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Record Date
              </label>
              <input
                type="date"
                {...register('recordDate')}
                max={new Date().toISOString().split('T')[0]}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Tags <span className="text-muted-foreground/50">(comma-separated)</span>
              </label>
              <input
                {...register('tags')}
                placeholder="e.g. annual, routine, apollo"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Description
            </label>
            <textarea
              {...register('description')}
              rows={2}
              placeholder="Additional notes about this record..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-none"
            />
            {errors.description && (
              <p className="mt-1.5 text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>
        </div>

        {/* ── File upload ── */}
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">File</h2>

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            className={`relative rounded-xl border-2 border-dashed transition-colors ${
              dragOver
                ? 'border-primary bg-primary/5'
                : errors.file
                ? 'border-destructive/50 bg-destructive/5'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <input
              {...register('file')}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={handleFileInput}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              aria-label="Upload file"
            />
            <div className="flex flex-col items-center justify-center py-8 pointer-events-none">
              {previewFile ? (
                <>
                  {(() => {
                    const Icon = MIME_ICON[previewFile.type] ?? Image;
                    return <Icon className="w-8 h-8 text-primary mb-2" />;
                  })()}
                  <p className="text-sm font-medium text-foreground">{previewFile.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatBytes(previewFile.size)}</p>
                  <button
                    type="button"
                    className="mt-2 pointer-events-auto flex items-center gap-1 text-xs text-destructive hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewFile(null);
                      setValue('file', new DataTransfer().files);
                    }}
                  >
                    <X className="w-3 h-3" /> Remove
                  </button>
                </>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-muted-foreground/50 mb-2" />
                  <p className="text-sm font-medium text-foreground">
                    Drop file here or <span className="text-primary">browse</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, JPG, PNG, WebP — max 10 MB
                  </p>
                </>
              )}
            </div>
          </div>

          {errors.file && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.file.message as string}
            </p>
          )}
        </div>

        {/* ── API error ── */}
        {upload.isError && (
          <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-sm text-destructive">{getRecordErrorMessage(upload.error)}</p>
          </div>
        )}

        {/* ── Submit ── */}
        <button
          type="submit"
          disabled={upload.isPending}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {upload.isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
          ) : (
            <><Upload className="w-4 h-4" /> Upload Record</>
          )}
        </button>

      </form>
    </div>
  );
}
