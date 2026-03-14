import { useParams, useNavigate } from 'react-router-dom';
import {
  Loader2, AlertCircle, Brain, ChevronLeft,
  RefreshCw, ShieldAlert, Pill, Activity,
  AlertTriangle, Clock,
} from 'lucide-react';
import axios from 'axios';
import { format, parseISO } from 'date-fns';
import { useClinicalSummary } from '@/hooks/useAi';
import type { RiskLevel, ActiveCondition, CurrentMedication, RiskScores } from '@/types/ai';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getApiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const detail = (err.response?.data as { error?: string })?.error;
    if (detail) return detail;
  }
  return (err as Error)?.message ?? 'Something went wrong. Please try again.';
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const RISK_COLORS: Record<RiskLevel, string> = {
  LOW:      'text-green-600 bg-green-50 border-green-200',
  MODERATE: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  HIGH:     'text-orange-700 bg-orange-50 border-orange-200',
  CRITICAL: 'text-red-700 bg-red-50 border-red-200',
};

function RiskChip({ level }: { level: RiskLevel }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${RISK_COLORS[level]}`}>
      {level}
    </span>
  );
}

function Section({ icon, title, children }: { icon: JSX.Element; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-5 space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
        {icon} {title}
      </h3>
      {children}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AiSummaryPage() {
  const { uhid = '' } = useParams<{ uhid: string }>();
  const navigate       = useNavigate();
  const summary        = useClinicalSummary();

  const result     = summary.data;
  const isLoading  = summary.isPending;
  const error      = summary.error;

  function handleGenerate() {
    summary.mutate(uhid);
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded-lg p-2 hover:bg-accent transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" /> AI Clinical Summary
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">UHID: {uhid}</p>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center gap-3 py-16" data-testid="ai-loading">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Generating clinical summary…</p>
          </div>
        )}

        {/* Error */}
        {!isLoading && error && (
          <div
            className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-4"
            data-testid="ai-error"
          >
            <AlertCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-destructive">Summary generation failed</p>
              <p className="text-xs text-destructive/80">
                {getApiErrorMessage(error)}
              </p>
            </div>
          </div>
        )}

        {/* No result yet */}
        {!isLoading && !error && !result && (
          <div className="rounded-2xl border bg-card p-8 flex flex-col items-center gap-4 text-center">
            <Brain className="w-10 h-10 text-primary/60" />
            <div>
              <h2 className="text-base font-semibold text-foreground">Generate AI Summary</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Aggregate the patient's full history — conditions, medications, vitals and labs —
                into a concise clinical briefing with risk stratification.
              </p>
            </div>
            <button
              onClick={handleGenerate}
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-colors"
            >
              <Brain className="w-4 h-4" /> Generate Summary
            </button>
          </div>
        )}

        {/* Result panel */}
        {result && (
          <div className="space-y-5" data-testid="summary-panel">

            {/* Cached + last updated */}
            {result.cached && (
              <div
                className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700"
                data-testid="last-updated"
              >
                <Clock className="w-3.5 h-3.5 shrink-0" />
                Showing cached summary · Last updated{' '}
                {result.lastUpdated
                  ? format(parseISO(String(result.lastUpdated)), 'dd MMM yyyy HH:mm')
                  : '—'}
              </div>
            )}

            {/* Briefing */}
            <Section icon={<Brain className="w-4 h-4 text-primary" />} title="Clinical Briefing">
              <p className="text-sm text-foreground leading-relaxed">{result.summaryForDoctor}</p>
            </Section>

            {/* Risk scores */}
            <Section icon={<ShieldAlert className="w-4 h-4 text-primary" />} title="Risk Stratification">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="risk-scores">
                {Object.entries(result.riskScore as RiskScores).map(([domain, level]) => (
                  <div key={domain} className="flex flex-col items-center gap-1 rounded-xl border p-3">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                      {domain}
                    </span>
                    <RiskChip level={level as RiskLevel} />
                  </div>
                ))}
              </div>
            </Section>

            {/* Active conditions */}
            {(result.activeConditions as ActiveCondition[])?.length > 0 && (
              <Section icon={<Activity className="w-4 h-4 text-primary" />} title="Active Conditions">
                <ul className="space-y-1.5" data-testid="conditions-list">
                  {(result.activeConditions as ActiveCondition[]).map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono font-bold text-muted-foreground shrink-0">
                        {c.icd10}
                      </span>
                      <span className="text-foreground">{c.description}</span>
                      <span className="ml-auto text-[10px] text-muted-foreground whitespace-nowrap">{c.since}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* Medications */}
            {(result.currentMedications as CurrentMedication[])?.length > 0 && (
              <Section icon={<Pill className="w-4 h-4 text-primary" />} title="Current Medications">
                <ul className="space-y-1.5" data-testid="medications-list">
                  {(result.currentMedications as CurrentMedication[]).map((m, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                      <span className="font-medium">{m.drug}</span>
                      <span className="text-muted-foreground">· {m.frequency}</span>
                      <span className="ml-auto text-[10px] text-muted-foreground">{m.since}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* Vital trends */}
            {result.vitalTrends && Object.keys(result.vitalTrends).length > 0 && (
              <Section icon={<Activity className="w-4 h-4 text-primary" />} title="Vital Trends">
                <div className="grid grid-cols-2 gap-3" data-testid="vital-trends">
                  {Object.entries(result.vitalTrends).map(([key, points]) => (
                    <div key={key} className="rounded-xl border p-3 space-y-1">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{key}</p>
                      {(points as { date: string; value: string }[]).slice(-3).map((pt, i) => (
                        <p key={i} className="text-xs text-foreground">
                          <span className="text-muted-foreground">{pt.date}</span> · {pt.value}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Attention items */}
            {(result.attentionItems as string[])?.length > 0 && (
              <Section icon={<AlertTriangle className="w-4 h-4 text-orange-500" />} title="Attention Required">
                <ul className="space-y-2" data-testid="attention-items">
                  {(result.attentionItems as string[]).map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="w-3.5 h-3.5 text-orange-500 mt-0.5 shrink-0" />
                      <span className="text-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* Regenerate */}
            <div className="flex justify-end">
              <button
                onClick={handleGenerate}
                disabled={summary.isPending}
                className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
                data-testid="regenerate-btn"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${summary.isPending ? 'animate-spin' : ''}`} />
                Refresh Summary
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
