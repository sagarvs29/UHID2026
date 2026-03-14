import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useClinicalNotes, useCreateClinicalNote } from '@/hooks/useClinical';
import {
  NOTE_VISIBILITIES,
  NOTE_VISIBILITY_LABELS,
  type CreateClinicalNoteFormValues,
} from '@/types/clinical';

// ─── Frontend Zod schema ──────────────────────────────────────────────────────
const icd10Regex = /^[A-Z][0-9]{2}(\.[0-9A-Z]{1,4})?$/;

const noteSchema = z.object({
  chiefComplaint:      z.string().min(5).max(500),
  symptomsRaw:         z.string().optional(), // comma-separated input
  icd10Code:           z.string().regex(icd10Regex, 'Invalid ICD-10 code (e.g. J18.9)'),
  icd10Description:    z.string().min(2).max(200),
  examinationFindings: z.string().max(5000).optional(),
  // vitals
  bp:          z.string().regex(/^\d{2,3}\/\d{2,3}$/, 'Format: 120/80').optional().or(z.literal('')),
  pulse:       z.coerce.number().int().min(20).max(300).optional().or(z.literal('')),
  temperature: z.coerce.number().min(30).max(45).optional().or(z.literal('')),
  spo2:        z.coerce.number().int().min(70).max(100).optional().or(z.literal('')),
  weight:      z.coerce.number().positive().optional().or(z.literal('')),
  height:      z.coerce.number().positive().optional().or(z.literal('')),
  diagnosis:   z.string().min(3).max(500),
  treatmentPlan: z.string().max(5000).optional(),
  visibility:  z.enum(NOTE_VISIBILITIES),
});

type NoteForm = z.infer<typeof noteSchema>;

// ─── Note Card ────────────────────────────────────────────────────────────────
function NoteCard({ note }: { note: import('@/types/clinical').ClinicalNote }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <li data-testid="note-card" className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">{note.chiefComplaint}</p>
          <p className="text-xs text-muted-foreground">
            {note.icd10Code} · {note.icd10Description}
          </p>
          <p className="text-xs text-muted-foreground">
            Dr {note.doctor.firstName} {note.doctor.lastName} · {new Date(note.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs ${
            note.visibility === 'PATIENT_VISIBLE' ? 'bg-green-100 text-green-700' :
            note.visibility === 'HOSPITAL' ? 'bg-blue-100 text-blue-700' :
            'bg-gray-100 text-gray-600'
          }`}>
            {NOTE_VISIBILITY_LABELS[note.visibility]}
          </span>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-primary hover:underline"
          >
            {expanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2 text-sm">
          {note.symptoms.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Symptoms</p>
              <div className="flex flex-wrap gap-1">
                {note.symptoms.map((s) => (
                  <span key={s} className="rounded-full bg-muted px-2 py-0.5 text-xs">{s}</span>
                ))}
              </div>
            </div>
          )}

          {note.examinationFindings && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Examination findings</p>
              <p className="text-xs text-foreground whitespace-pre-wrap">{note.examinationFindings}</p>
            </div>
          )}

          {note.vitalSigns && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Vital signs</p>
              <div className="mt-1 flex flex-wrap gap-3">
                {note.vitalSigns.bp          && <span className="text-xs">BP: {note.vitalSigns.bp}</span>}
                {note.vitalSigns.pulse        && <span className="text-xs">HR: {note.vitalSigns.pulse} bpm</span>}
                {note.vitalSigns.temperature  && <span className="text-xs">Temp: {note.vitalSigns.temperature}°C</span>}
                {note.vitalSigns.spo2         && <span className="text-xs">SpO₂: {note.vitalSigns.spo2}%</span>}
                {note.vitalSigns.weight       && <span className="text-xs">Wt: {note.vitalSigns.weight} kg</span>}
                {note.vitalSigns.height       && <span className="text-xs">Ht: {note.vitalSigns.height} cm</span>}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-muted-foreground">Diagnosis</p>
            <p className="text-xs text-foreground">{note.diagnosis}</p>
          </div>

          {note.treatmentPlan && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Treatment plan</p>
              <p className="text-xs text-foreground whitespace-pre-wrap">{note.treatmentPlan}</p>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

// ─── New Note Form ────────────────────────────────────────────────────────────
function NewNoteForm({
  uhid,
  onCreated,
}: {
  uhid: string;
  onCreated: () => void;
}) {
  const createNote = useCreateClinicalNote(uhid);
  const [serverError, setServerError] = useState('');

  const {
    register, control, handleSubmit, reset,
    formState: { errors, isSubmitting },
  } = useForm<NoteForm>({
    resolver: zodResolver(noteSchema),
    defaultValues: { visibility: 'PRIVATE' },
  });

  const onSubmit = async (values: NoteForm) => {
    setServerError('');
    const symptoms = values.symptomsRaw
      ? values.symptomsRaw.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const hasVitals = values.bp || values.pulse || values.temperature || values.spo2 || values.weight || values.height;

    const payload: CreateClinicalNoteFormValues = {
      patientUhid:         uhid,
      chiefComplaint:      values.chiefComplaint,
      symptoms,
      icd10Code:           values.icd10Code,
      icd10Description:    values.icd10Description,
      examinationFindings: values.examinationFindings || undefined,
      vitalSigns: hasVitals ? {
        bp:          values.bp || undefined,
        pulse:       values.pulse ? Number(values.pulse) : undefined,
        temperature: values.temperature ? Number(values.temperature) : undefined,
        spo2:        values.spo2 ? Number(values.spo2) : undefined,
        weight:      values.weight ? Number(values.weight) : undefined,
        height:      values.height ? Number(values.height) : undefined,
      } : undefined,
      diagnosis:    values.diagnosis,
      treatmentPlan: values.treatmentPlan || undefined,
      visibility:   values.visibility,
    };

    try {
      await createNote.mutateAsync(payload);
      reset();
      onCreated();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setServerError(e.response?.data?.error ?? 'Failed to create note');
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      data-testid="new-note-form"
      className="rounded-lg border border-border bg-card p-4"
    >
      <h3 className="mb-4 text-sm font-semibold text-foreground">New Clinical Note</h3>

      <div className="space-y-4">
        {/* Chief complaint */}
        <div>
          <label className="text-xs font-medium text-foreground">
            Chief complaint <span className="text-destructive">*</span>
          </label>
          <input
            {...register('chiefComplaint')}
            data-testid="chief-complaint"
            placeholder="Presenting complaint"
            className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {errors.chiefComplaint && <p className="mt-0.5 text-xs text-destructive">{errors.chiefComplaint.message}</p>}
        </div>

        {/* Symptoms */}
        <div>
          <label className="text-xs font-medium text-foreground">Symptoms (comma-separated)</label>
          <input
            {...register('symptomsRaw')}
            data-testid="symptoms-input"
            placeholder="fever, cough, headache"
            className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* ICD-10 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-foreground">
              ICD-10 code <span className="text-destructive">*</span>
            </label>
            <input
              {...register('icd10Code')}
              data-testid="icd10-code"
              placeholder="e.g. J18.9"
              className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
            />
            {errors.icd10Code && <p className="mt-0.5 text-xs text-destructive">{errors.icd10Code.message}</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">
              ICD-10 description <span className="text-destructive">*</span>
            </label>
            <input
              {...register('icd10Description')}
              data-testid="icd10-description"
              placeholder="e.g. Pneumonia, unspecified"
              className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
            {errors.icd10Description && <p className="mt-0.5 text-xs text-destructive">{errors.icd10Description.message}</p>}
          </div>
        </div>

        {/* Vital signs grid */}
        <div>
          <p className="text-xs font-medium text-foreground">Vital signs</p>
          <div className="mt-1 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {[
              { name: 'bp',          label: 'BP',      placeholder: '120/80', testId: 'vitals-bp' },
              { name: 'pulse',       label: 'HR (bpm)', placeholder: '72',   testId: 'vitals-pulse' },
              { name: 'temperature', label: 'Temp °C', placeholder: '37.0',  testId: 'vitals-temp' },
              { name: 'spo2',        label: 'SpO₂ %',  placeholder: '98',   testId: 'vitals-spo2' },
              { name: 'weight',      label: 'Wt (kg)', placeholder: '70',   testId: 'vitals-weight' },
              { name: 'height',      label: 'Ht (cm)', placeholder: '175',  testId: 'vitals-height' },
            ].map(({ name, label, placeholder, testId }) => (
              <div key={name}>
                <label className="text-xs text-muted-foreground">{label}</label>
                <input
                  {...register(name as keyof NoteForm)}
                  data-testid={testId}
                  placeholder={placeholder}
                  className="mt-0.5 w-full rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            ))}
          </div>
          {(errors.bp || errors.pulse || errors.temperature || errors.spo2) && (
            <p className="mt-1 text-xs text-destructive">
              {errors.bp?.message || errors.pulse?.message || errors.temperature?.message || errors.spo2?.message}
            </p>
          )}
        </div>

        {/* Examination findings */}
        <div>
          <label className="text-xs font-medium text-foreground">Examination findings</label>
          <textarea
            {...register('examinationFindings')}
            rows={3}
            data-testid="examination-findings"
            className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Diagnosis */}
        <div>
          <label className="text-xs font-medium text-foreground">
            Diagnosis <span className="text-destructive">*</span>
          </label>
          <input
            {...register('diagnosis')}
            data-testid="note-diagnosis"
            className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {errors.diagnosis && <p className="mt-0.5 text-xs text-destructive">{errors.diagnosis.message}</p>}
        </div>

        {/* Treatment plan */}
        <div>
          <label className="text-xs font-medium text-foreground">Treatment plan</label>
          <textarea
            {...register('treatmentPlan')}
            rows={3}
            data-testid="treatment-plan"
            className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Visibility */}
        <div>
          <label className="text-xs font-medium text-foreground">
            Visibility <span className="text-destructive">*</span>
          </label>
          <Controller
            control={control}
            name="visibility"
            render={({ field }) => (
              <select
                {...field}
                data-testid="note-visibility"
                className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {NOTE_VISIBILITIES.map((v) => (
                  <option key={v} value={v}>{NOTE_VISIBILITY_LABELS[v]}</option>
                ))}
              </select>
            )}
          />
        </div>

        {serverError && (
          <p data-testid="note-server-error" className="text-xs text-destructive">{serverError}</p>
        )}

        <button
          type="submit"
          data-testid="submit-note"
          disabled={isSubmitting}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving…' : 'Save clinical note'}
        </button>
      </div>
    </form>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ClinicalNotesPage() {
  const { uhid } = useParams<{ uhid: string }>();
  const [showForm, setShowForm] = useState(false);
  const { data: notes, isLoading, refetch } = useClinicalNotes(uhid ?? '');

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link
        to={`/doctor/patient/${uhid}`}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        ← Back to patient
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Clinical Notes</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          data-testid="toggle-note-form"
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {showForm ? 'Cancel' : '+ New note'}
        </button>
      </div>
      <p className="text-sm text-muted-foreground">{uhid}</p>

      {showForm && (
        <div className="mt-6">
          <NewNoteForm
            uhid={uhid!}
            onCreated={() => {
              setShowForm(false);
              refetch();
            }}
          />
        </div>
      )}

      <div className="mt-6">
        {isLoading ? (
          <div data-testid="notes-loading" className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-lg bg-muted" />
            ))}
          </div>
        ) : !notes?.length ? (
          <p data-testid="no-notes" className="text-sm text-muted-foreground">
            No clinical notes recorded yet.
          </p>
        ) : (
          <ul data-testid="notes-list" className="space-y-3">
            {notes.map((note) => <NoteCard key={note.id} note={note} />)}
          </ul>
        )}
      </div>
    </div>
  );
}
