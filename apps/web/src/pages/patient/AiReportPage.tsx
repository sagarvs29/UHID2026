import { useParams, useNavigate } from 'react-router-dom';
import {
  Loader2, AlertCircle, Sparkles, ChevronLeft,
  RefreshCw, CheckCircle2, AlertTriangle, XCircle,
  Info, Clock,
} from 'lucide-react';
import axios from 'axios';
import { useDecodeReport, useCachedSummary } from '@/hooks/useAi';
import type { SimplifiedValue, ValueStatus, RiskLevel } from '@/types/ai';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getApiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const detail = (err.response?.data as { error?: string })?.error;
    if (detail) return detail;
  }
  return (err as Error)?.message ?? 'Something went wrong. Please try again.';
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const RISK_BADGE: Record<RiskLevel, { label: string; classes: string }> = {
  LOW:      { label: 'Low Risk',      classes: 'bg-green-100 text-green-700 border-green-200' },
  MODERATE: { label: 'Moderate Risk', classes: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  HIGH:     { label: 'High Risk',     classes: 'bg-orange-100 text-orange-700 border-orange-200' },
  CRITICAL: { label: 'Critical',      classes: 'bg-red-100 text-red-700 border-red-200' },
};

const STATUS_ICON: Record<ValueStatus, JSX.Element> = {
  NORMAL:   <CheckCircle2  className="w-4 h-4 text-green-500 shrink-0" />,
  LOW:      <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />,
  HIGH:     <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />,
  CRITICAL: <XCircle       className="w-4 h-4 text-red-500 shrink-0" />,
};

function ValueCard({ v }: { v: SimplifiedValue }) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-foreground">{v.parameter}</span>
        {STATUS_ICON[v.status]}
      </div>
      <p className="text-xs text-muted-foreground">
        Result: <span className="font-medium text-foreground">{v.value}</span>
        &nbsp;·&nbsp; Normal: {v.normalRange}
      </p>
      <p className="text-xs text-foreground">{v.explanation}</p>
      {v.recommendation && (
        <p className="text-xs text-primary font-medium">💡 {v.recommendation}</p>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AiReportPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate     = useNavigate();

  // Try to load a cached result first (no extra request if already decoded)
  const cached = useCachedSummary(id);
  const decode = useDecodeReport();

  const result = decode.data ?? (cached.isSuccess ? cached.data : null);
  const isLoading = cached.isLoading || decode.isPending;
  const error     = decode.error ?? (cached.error ?? null);

  function handleDecode() {
    decode.mutate(id);
  }

  const risk = RISK_BADGE[result?.overallRiskLevel ?? 'LOW'];

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Back + header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded-lg p-2 hover:bg-accent transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" /> AI Report Analysis
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Powered by GPT-4o — for informational purposes only
            </p>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center gap-3 py-16" data-testid="ai-loading">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Analysing your report…</p>
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
              <p className="text-sm font-semibold text-destructive">Analysis failed</p>
              <p className="text-xs text-destructive/80">
                {getApiErrorMessage(error)}
              </p>
            </div>
          </div>
        )}

        {/* No result yet — trigger decode */}
        {!isLoading && !error && !result && (
          <div className="rounded-2xl border bg-card p-8 flex flex-col items-center gap-4 text-center">
            <Sparkles className="w-10 h-10 text-primary/60" />
            <div>
              <h2 className="text-base font-semibold text-foreground">Explain This Report</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Our AI will translate your lab results into plain language, highlight any values
                outside normal range, and suggest next steps.
              </p>
            </div>
            <button
              onClick={handleDecode}
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-colors"
            >
              <Sparkles className="w-4 h-4" /> Analyse Report
            </button>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-5" data-testid="ai-result">

            {/* Cached notice */}
            {result.cached && (
              <div
                className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700"
                data-testid="cached-notice"
              >
                <Clock className="w-3.5 h-3.5 shrink-0" />
                Showing previously generated analysis
              </div>
            )}

            {/* Risk badge + summary */}
            <div className="rounded-2xl border bg-card p-5 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-sm font-bold text-foreground">Summary</h2>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${risk.classes}`}
                  data-testid="risk-badge"
                >
                  {risk.label}
                </span>
              </div>
              <p className="text-sm text-foreground leading-relaxed" data-testid="summary-text">
                {result.summaryText}
              </p>
            </div>

            {/* Simplified values */}
            {result.simplifiedValues?.length > 0 && (
              <div className="space-y-3" data-testid="simplified-values">
                <h3 className="text-sm font-semibold text-foreground">Parameter Breakdown</h3>
                {result.simplifiedValues.map((v, i) => (
                  <ValueCard key={i} v={v} />
                ))}
              </div>
            )}

            {/* Action items */}
            {result.actionItems?.length > 0 && (
              <div className="rounded-2xl border bg-card p-5 space-y-3" data-testid="action-items">
                <h3 className="text-sm font-semibold text-foreground">Recommended Actions</h3>
                <ul className="space-y-2">
                  {result.actionItems.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                      <span className="mt-0.5 text-primary font-bold">›</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Disclaimer */}
            <div
              className="flex items-start gap-2 rounded-xl border border-muted bg-muted/30 px-4 py-3"
              data-testid="disclaimer"
            >
              <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">{result.disclaimer}</p>
            </div>

            {/* Regenerate */}
            <div className="flex justify-end">
              <button
                onClick={handleDecode}
                disabled={decode.isPending}
                className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
                data-testid="regenerate-btn"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${decode.isPending ? 'animate-spin' : ''}`} />
                Regenerate
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
