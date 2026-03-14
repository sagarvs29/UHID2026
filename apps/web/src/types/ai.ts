// ─── Report Decoder types ─────────────────────────────────────────────────────

export type ValueStatus = 'NORMAL' | 'LOW' | 'HIGH' | 'CRITICAL';
export type RiskLevel   = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface SimplifiedValue {
  parameter:      string;
  value:          string;
  normalRange:    string;
  status:         ValueStatus;
  explanation:    string;
  recommendation: string;
}

export interface DecodeResponse {
  recordId:          string;
  summaryText:       string;
  simplifiedValues:  SimplifiedValue[];
  overallRiskLevel:  RiskLevel;
  actionItems:       string[];
  disclaimer:        string;
  modelUsed:         string;
  tokensUsed:        number;
  cached:            boolean;
}

// ─── Clinical Summary types ───────────────────────────────────────────────────

export interface ActiveCondition {
  icd10:       string;
  description: string;
  since:       string;
}

export interface CurrentMedication {
  drug:      string;
  frequency: string;
  since:     string;
}

export interface VitalPoint {
  date:  string;
  value: string;
}

export interface VitalTrends {
  bp?:          VitalPoint[];
  pulse?:       VitalPoint[];
  temperature?: VitalPoint[];
  spo2?:        VitalPoint[];
}

export interface RiskScores {
  overall:        RiskLevel;
  cardiovascular: RiskLevel;
  renal:          RiskLevel;
  diabetic:       RiskLevel;
}

export interface ClinicalSummaryResponse {
  patientUhid:        string;
  summaryForDoctor:   string;
  activeConditions:   ActiveCondition[];
  currentMedications: CurrentMedication[];
  vitalTrends:        VitalTrends;
  riskScore:          RiskScores;
  attentionItems:     string[];
  modelUsed:          string;
  tokensUsed:         number;
  cached:             boolean;
  lastUpdated:        string;
}

// ─── Cached summary (GET /ai/summary/:recordId) ───────────────────────────────
export type AiSummaryCache = DecodeResponse & { lastUpdated: string };
