import { useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreatePrescription, usePharmaCheck } from '@/hooks/useClinical';
import {
  DRUG_FORMS,
  DRUG_ROUTES,
  DRUG_FORM_LABELS,
  DRUG_ROUTE_LABELS,
  SEVERITY_COLORS,
  SEVERITY_BADGE,
  CHECK_TYPE_LABELS,
  type PharmaIssue,
  type CreatePrescriptionFormValues,
} from '@/types/clinical';

// ─── Frontend Zod schema ──────────────────────────────────────────────────────
const itemSchema = z.object({
  drugName:     z.string().min(2, 'Required').max(200),
  dosage:       z.string().min(1, 'Required').max(50),
  form:         z.enum(DRUG_FORMS),
  frequency:    z.string().min(1, 'Required').max(100),
  duration:     z.string().min(1, 'Required').max(100),
  route:        z.enum(DRUG_ROUTES),
  instructions: z.string().max(500).optional(),
  quantity:     z.coerce.number().int().positive().max(9999),
});

const prescriptionSchema = z.object({
  diagnosis:    z.string().min(3).max(300),
  notes:        z.string().max(2000).optional(),
  followUpDate: z.string().optional(),
  validUntil:   z.string().optional(),
  items:        z.array(itemSchema).min(1).max(20),
});

type PrescriptionForm = z.infer<typeof prescriptionSchema>;

// ─── Pharma-Check Status Strip ────────────────────────────────────────────────
function PharmaCheckStrip({
  issues,
  overrideReasons,
  onOverrideChange,
  isChecking,
  checked,
}: {
  issues: PharmaIssue[];
  overrideReasons: Record<string, string>;
  onOverrideChange: (key: string, reason: string) => void;
  isChecking: boolean;
  checked: boolean;
}) {
  if (isChecking) {
    return (
      <div data-testid="pharma-checking" className="animate-pulse rounded-lg border border-border p-3 text-sm text-muted-foreground">
        Running safety check…
      </div>
    );
  }

  if (!checked) {
    return (
      <div data-testid="pharma-idle" className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
        Add at least one drug and enter a diagnosis to run the safety check.
      </div>
    );
  }

  if (issues.length === 0) {
    return (
      <div data-testid="pharma-passed" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
        ✓ No drug safety issues detected.
      </div>
    );
  }

  return (
    <div data-testid="pharma-issues" className="space-y-3">
      {issues.map((issue) => (
        <div
          key={issue.interactionKey}
          data-testid={`pharma-issue-${issue.severity.toLowerCase()}`}
          className={`rounded-lg border p-3 ${SEVERITY_COLORS[issue.severity]}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${SEVERITY_BADGE[issue.severity]}`}>
                  {issue.severity}
                </span>
                <span className="text-xs font-medium">{CHECK_TYPE_LABELS[issue.type]}</span>
              </div>
              <p className="mt-1 text-xs font-semibold">
                {issue.drugs.join(' + ')}
              </p>
              <p className="mt-0.5 text-xs">{issue.mechanism}</p>
              <p className="mt-0.5 text-xs opacity-80">{issue.clinicalEffect}</p>

              {issue.alternatives && Object.entries(issue.alternatives).length > 0 && (
                <div className="mt-1 text-xs opacity-80">
                  <span className="font-medium">Alternatives: </span>
                  {Object.entries(issue.alternatives).map(([key, alts]) => (
                    <span key={key}>{alts.join(', ')}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {issue.requiresOverride && (
            <div className="mt-3">
              <label className="text-xs font-semibold">
                Override reason required (≥30 chars)
                <span className="ml-1 text-destructive">*</span>
              </label>
              <textarea
                data-testid={`override-input-${issue.interactionKey}`}
                value={overrideReasons[issue.interactionKey] ?? ''}
                onChange={(e) => onOverrideChange(issue.interactionKey, e.target.value)}
                rows={2}
                placeholder="Clinical justification for overriding this alert…"
                className="mt-1 w-full rounded border border-current bg-white/60 px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-current"
              />
              <p className={`mt-0.5 text-xs ${
                (overrideReasons[issue.interactionKey]?.length ?? 0) >= 30
                  ? 'text-green-700'
                  : 'text-muted-foreground'
              }`}>
                {overrideReasons[issue.interactionKey]?.length ?? 0}/30 chars
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Drug Row ─────────────────────────────────────────────────────────────────
function DrugRow({
  index,
  control,
  register,
  errors,
  onRemove,
}: {
  index: number;
  control: ReturnType<typeof useForm<PrescriptionForm>>['control'];
  register: ReturnType<typeof useForm<PrescriptionForm>>['register'];
  errors: ReturnType<typeof useForm<PrescriptionForm>>['formState']['errors'];
  onRemove: () => void;
}) {
  const itemErrors = errors.items?.[index];
  return (
    <div data-testid={`drug-row-${index}`} className="rounded-lg border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground">Drug #{index + 1}</p>
        <button
          type="button"
          onClick={onRemove}
          data-testid={`remove-drug-${index}`}
          className="text-xs text-destructive hover:underline"
        >
          Remove
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {/* Drug name */}
        <div className="col-span-2 sm:col-span-1">
          <label className="text-xs font-medium">Drug name <span className="text-destructive">*</span></label>
          <input
            {...register(`items.${index}.drugName`)}
            data-testid={`drug-name-${index}`}
            placeholder="e.g. Amoxicillin"
            className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {itemErrors?.drugName && <p className="mt-0.5 text-xs text-destructive">{itemErrors.drugName.message}</p>}
        </div>

        {/* Dosage */}
        <div>
          <label className="text-xs font-medium">Dosage <span className="text-destructive">*</span></label>
          <input
            {...register(`items.${index}.dosage`)}
            data-testid={`drug-dosage-${index}`}
            placeholder="e.g. 500mg"
            className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {itemErrors?.dosage && <p className="mt-0.5 text-xs text-destructive">{itemErrors.dosage.message}</p>}
        </div>

        {/* Form */}
        <div>
          <label className="text-xs font-medium">Form <span className="text-destructive">*</span></label>
          <Controller
            control={control}
            name={`items.${index}.form`}
            render={({ field }) => (
              <select
                {...field}
                data-testid={`drug-form-${index}`}
                className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {DRUG_FORMS.map((f) => (
                  <option key={f} value={f}>{DRUG_FORM_LABELS[f]}</option>
                ))}
              </select>
            )}
          />
        </div>

        {/* Frequency */}
        <div>
          <label className="text-xs font-medium">Frequency <span className="text-destructive">*</span></label>
          <input
            {...register(`items.${index}.frequency`)}
            data-testid={`drug-frequency-${index}`}
            placeholder="e.g. TDS"
            className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {itemErrors?.frequency && <p className="mt-0.5 text-xs text-destructive">{itemErrors.frequency.message}</p>}
        </div>

        {/* Duration */}
        <div>
          <label className="text-xs font-medium">Duration <span className="text-destructive">*</span></label>
          <input
            {...register(`items.${index}.duration`)}
            data-testid={`drug-duration-${index}`}
            placeholder="e.g. 7 days"
            className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {itemErrors?.duration && <p className="mt-0.5 text-xs text-destructive">{itemErrors.duration.message}</p>}
        </div>

        {/* Route */}
        <div>
          <label className="text-xs font-medium">Route <span className="text-destructive">*</span></label>
          <Controller
            control={control}
            name={`items.${index}.route`}
            render={({ field }) => (
              <select
                {...field}
                data-testid={`drug-route-${index}`}
                className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {DRUG_ROUTES.map((r) => (
                  <option key={r} value={r}>{DRUG_ROUTE_LABELS[r]}</option>
                ))}
              </select>
            )}
          />
        </div>

        {/* Quantity */}
        <div>
          <label className="text-xs font-medium">Qty <span className="text-destructive">*</span></label>
          <input
            {...register(`items.${index}.quantity`)}
            type="number"
            min={1}
            max={9999}
            data-testid={`drug-quantity-${index}`}
            className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {itemErrors?.quantity && <p className="mt-0.5 text-xs text-destructive">{itemErrors.quantity.message}</p>}
        </div>

        {/* Instructions */}
        <div className="col-span-2 sm:col-span-2">
          <label className="text-xs font-medium">Instructions</label>
          <input
            {...register(`items.${index}.instructions`)}
            data-testid={`drug-instructions-${index}`}
            placeholder="e.g. Take after food"
            className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function NewPrescriptionPage() {
  const { uhid } = useParams<{ uhid: string }>();
  const navigate = useNavigate();

  const [pharmaIssues, setPharmaIssues]   = useState<PharmaIssue[]>([]);
  const [overrideReasons, setOverrideReasons] = useState<Record<string, string>>({});
  const [pharmaChecked, setPharmaChecked] = useState(false);
  const [serverError, setServerError]     = useState('');

  const createPrescription = useCreatePrescription(uhid ?? '');
  const pharmaCheckMutation = usePharmaCheck();

  const {
    register, control, handleSubmit, watch,
    formState: { errors, isSubmitting },
  } = useForm<PrescriptionForm>({
    resolver: zodResolver(prescriptionSchema),
    defaultValues: { items: [{ form: 'TABLET', route: 'ORAL', quantity: 1 }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchedItems = watch('items');

  const runLiveCheck = useCallback(async () => {
    const drugs = (watchedItems ?? []).filter((d) => d.drugName?.trim());
    if (!drugs.length || !uhid) return;

    setPharmaChecked(true);
    const result = await pharmaCheckMutation.mutateAsync({
      patientUhid: uhid,
      drugs: drugs.map((d) => ({ name: d.drugName, dosage: d.dosage || '?' })),
    });
    setPharmaIssues(result.issues);
  }, [watchedItems, uhid, pharmaCheckMutation]);

  const handleOverrideChange = (key: string, reason: string) => {
    setOverrideReasons((prev) => ({ ...prev, [key]: reason }));
  };

  const hardBlockIssues = pharmaIssues.filter((i) => i.requiresOverride);
  const allOverridesProvided = hardBlockIssues.every(
    (i) => (overrideReasons[i.interactionKey]?.length ?? 0) >= 30
  );

  const onSubmit = async (values: PrescriptionForm) => {
    setServerError('');
    const payload: CreatePrescriptionFormValues = {
      patientUhid: uhid!,
      diagnosis:   values.diagnosis,
      notes:       values.notes,
      followUpDate: values.followUpDate || undefined,
      validUntil:  values.validUntil || undefined,
      items:       values.items as CreatePrescriptionFormValues['items'],
      overrides: hardBlockIssues.map((i) => ({
        interactionKey: i.interactionKey,
        reason: overrideReasons[i.interactionKey] ?? '',
      })),
    };

    try {
      await createPrescription.mutateAsync(payload);
      navigate(`/doctor/patient/${uhid}`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string; pharmaIssues?: PharmaIssue[] } } };
      if (e.response?.data?.pharmaIssues) {
        setPharmaIssues((prev) => [...prev, ...(e.response!.data!.pharmaIssues ?? [])]);
        setServerError('Prescription blocked by the safety check. Provide override reasons below.');
      } else {
        setServerError(e.response?.data?.error ?? 'An unexpected error occurred');
      }
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link
        to={`/doctor/patient/${uhid}`}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        ← Back to patient
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-foreground">New Prescription</h1>
      <p className="text-sm text-muted-foreground">{uhid}</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6">
        {/* Diagnosis */}
        <div>
          <label className="text-sm font-medium text-foreground">
            Diagnosis <span className="text-destructive">*</span>
          </label>
          <input
            {...register('diagnosis')}
            data-testid="diagnosis-input"
            placeholder="Primary diagnosis"
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {errors.diagnosis && <p className="mt-1 text-xs text-destructive">{errors.diagnosis.message}</p>}
        </div>

        {/* Drug list */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Drug List</h2>
            <button
              type="button"
              onClick={() => append({ drugName: '', dosage: '', form: 'TABLET', frequency: '', duration: '', route: 'ORAL', quantity: 1 })}
              data-testid="add-drug-btn"
              disabled={fields.length >= 20}
              className="text-xs text-primary hover:underline disabled:opacity-50"
            >
              + Add drug
            </button>
          </div>

          <div className="space-y-3">
            {fields.map((field, index) => (
              <DrugRow
                key={field.id}
                index={index}
                control={control}
                register={register}
                errors={errors}
                onRemove={() => remove(index)}
              />
            ))}
          </div>
        </div>

        {/* Run pharma-check */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Drug Safety Check</h2>
            <button
              type="button"
              onClick={runLiveCheck}
              data-testid="run-pharma-check-btn"
              disabled={pharmaCheckMutation.isPending}
              className="rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50"
            >
              {pharmaCheckMutation.isPending ? 'Checking…' : 'Run check'}
            </button>
          </div>
          <PharmaCheckStrip
            issues={pharmaIssues}
            overrideReasons={overrideReasons}
            onOverrideChange={handleOverrideChange}
            isChecking={pharmaCheckMutation.isPending}
            checked={pharmaChecked}
          />
        </div>

        {/* Optional fields */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-foreground">Follow-up date</label>
            <input
              {...register('followUpDate')}
              type="date"
              data-testid="follow-up-date"
              className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">Valid until</label>
            <input
              {...register('validUntil')}
              type="date"
              data-testid="valid-until"
              className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-foreground">Prescription notes</label>
          <textarea
            {...register('notes')}
            rows={3}
            data-testid="prescription-notes"
            className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {serverError && (
          <div data-testid="server-error" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {serverError}
          </div>
        )}

        {hardBlockIssues.length > 0 && !allOverridesProvided && (
          <p className="text-xs text-orange-700">
            ⚠ Provide override reasons (≥30 chars) for all HIGH/CRITICAL alerts before submitting.
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate(`/doctor/patient/${uhid}`)}
            className="flex-1 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/50"
          >
            Cancel
          </button>
          <button
            type="submit"
            data-testid="submit-prescription"
            disabled={isSubmitting || (hardBlockIssues.length > 0 && !allOverridesProvided)}
            className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Saving…' : 'Create prescription'}
          </button>
        </div>
      </form>
    </div>
  );
}
