# Phase 5 — AI Features (Report Decoder & Clinical Summary)

> **Phase:** 5  
> **Status:** ⬜ PLANNED  
> **Duration:** Week 9  
> **Goal:** Make medical data understandable. AI translates complex lab reports into plain language for patients, and generates comprehensive diagnostic summaries for doctors. All AI output is cached to control costs.

---

## 📋 Table of Contents

1. [Overview](#1-overview)
2. [AI Service Architecture](#2-ai-service-architecture)
3. [Report Decoder (Patient Feature)](#3-report-decoder-patient-feature)
4. [AI Clinical Summary (Doctor Feature)](#4-ai-clinical-summary-doctor-feature)
5. [OCR Pipeline](#5-ocr-pipeline)
6. [Prompt Engineering](#6-prompt-engineering)
7. [API Endpoints](#7-api-endpoints)
8. [Caching Strategy](#8-caching-strategy)
9. [Frontend Pages](#9-frontend-pages)
10. [Database Schema](#10-database-schema)
11. [Cost Control](#11-cost-control)
12. [Security Model](#12-security-model)
13. [Testing](#13-testing)

---

## 1. Overview

```
AI FEATURE MAP:
────────────────────────────────────────────────────────────────────
[PATIENT] Medical Record (image/PDF) →
  OCR (Tesseract → Google Vision fallback) →
  GPT-4o Report Decoder →
  Patient-friendly summary + Risk Level

[DOCTOR] Patient History Request →
  Aggregate: clinical notes + prescriptions + records →
  GPT-4o Clinical Summary →
  Conditions, Trends, Medication Review, Risk Score

[BOTH] Response cached in ai_report_summaries table →
  If same record requested within 7 days → return cached
  AI does not re-run, cost stays controlled
```

---

## 2. AI Service Architecture

The AI service is a separate **Python FastAPI** microservice running on port 8000:

```
apps/ai/
├── main.py                     # FastAPI app entry point
├── requirements.txt
└── routers/
    ├── __init__.py
    ├── ocr.py                  # POST /ai/ocr
    ├── report_decoder.py       # POST /ai/decode
    └── clinical_summary.py     # POST /ai/clinical-summary
```

**Why separate service?**
- Python ecosystem for OCR (Tesseract) + AI (OpenAI, LangChain)
- Scales independently — GPU-heavy AI calls don't block Express API
- Can be replaced with a different AI provider without touching Node.js backend

**Communication:** Express backend → HTTP POST to `http://ai-service:8000/ai/...`

**Auth between services:** Shared `INTERNAL_SERVICE_SECRET` header. AI service rejects any request without this header — not exposed to public internet.

---

## 3. Report Decoder (Patient Feature)

### 3.1 Purpose

Patients receive lab reports with values like:
- `HbA1c: 7.8%`
- `LDL: 148 mg/dL`
- `TSH: 0.02 mIU/L`

Most patients don't know what these mean. The Report Decoder translates them into plain language WITH context.

### 3.2 Input

- A medical record file (image or PDF) previously uploaded to Cloudinary
- OR extracted OCR text from a prior OCR step

### 3.3 Output Structure

```json
{
  "recordId": "clxxx...",
  "summaryText": "Your blood sugar control (HbA1c) is slightly above the normal range, suggesting your diabetes may need attention. Your cholesterol (LDL) is also on the higher side. Your thyroid is working faster than normal.",
  "simplifiedValues": [
    {
      "parameter": "HbA1c",
      "value": "7.8%",
      "normalRange": "4.0–5.6% (non-diabetic) | <7.0% (diabetic control)",
      "status": "HIGH",
      "explanation": "This measures your average blood sugar over the past 3 months. A reading above 7% for a diabetic patient means blood sugar levels need better management.",
      "recommendation": "Discuss with your doctor about adjusting your diabetes medication or diet."
    },
    {
      "parameter": "LDL Cholesterol",
      "value": "148 mg/dL",
      "normalRange": "<100 mg/dL (optimal)",
      "status": "HIGH",
      "explanation": "LDL is 'bad' cholesterol. High LDL increases heart disease risk.",
      "recommendation": "Consider reducing saturated fats. Your doctor may discuss cholesterol medication."
    }
  ],
  "overallRiskLevel": "MODERATE",
  "actionItems": [
    "Schedule a follow-up with your doctor within 2 weeks",
    "Monitor fasting blood sugar daily",
    "Review current diabetes medication with your doctor"
  ],
  "disclaimer": "This is an AI-generated summary for informational purposes only. It is not a medical diagnosis. Always consult a qualified healthcare provider.",
  "generatedAt": "2026-02-26T10:00:00.000Z",
  "modelUsed": "gpt-4o"
}
```

### 3.4 Risk Level Classification

| Level | Criteria |
|-------|----------|
| `NORMAL` | All parameters within normal range |
| `LOW` | 1–2 parameters slightly out of range |
| `MODERATE` | Multiple out-of-range values OR one significantly abnormal |
| `HIGH` | Critical values (e.g., dangerously low hemoglobin, very high troponin) |
| `CRITICAL` | Values indicating immediate medical emergency |

---

## 4. AI Clinical Summary (Doctor Feature)

### 4.1 Purpose

A doctor seeing a new patient with years of medical history needs a quick, structured overview. The AI Clinical Summary aggregates all available data and produces a doctor-grade briefing.

### 4.2 Input

- Patient UHID
- Consent must include `ALL` or `CLINICAL_NOTES` scope
- Backend aggregates:
  - All clinical notes (ICD-10 codes, diagnoses)
  - All prescriptions (drug names, durations)
  - All medical records (file names, types, dates)
  - Vital sign trends from clinical notes

### 4.3 Output Structure

```json
{
  "patientUhid": "UH-847291",
  "summaryForDoctor": "67-year-old male with a 5-year history of Type 2 Diabetes and hypertension. Currently managed on Metformin + Amlodipine. Recent HbA1c trend: improving (8.2 → 7.8 → 7.1 over 12 months). BP remains borderline — last reading 148/92. No recent hospitalizations. Mild renal impairment noted in March 2026 labs (eGFR 62). Cardiac risk is moderate based on Framingham score estimation.",
  "activeConditions": [
    { "icd10": "E11.9", "description": "Type 2 Diabetes Mellitus", "since": "2021-03" },
    { "icd10": "I10", "description": "Essential Hypertension", "since": "2020-07" }
  ],
  "currentMedications": [
    { "drug": "Metformin 500mg", "frequency": "Twice daily", "since": "2021-03" },
    { "drug": "Amlodipine 5mg", "frequency": "Once daily", "since": "2020-07" }
  ],
  "vitalTrends": {
    "hba1c": [
      { "date": "2025-06", "value": "8.2%" },
      { "date": "2025-09", "value": "7.8%" },
      { "date": "2026-01", "value": "7.1%" }
    ],
    "bp": [
      { "date": "2025-12", "value": "145/92" },
      { "date": "2026-02", "value": "148/90" }
    ]
  },
  "riskScore": {
    "overall": "MODERATE",
    "cardiovascular": "MODERATE",
    "renal": "LOW",
    "diabetic": "LOW"
  },
  "attentionItems": [
    "Renal function declining — eGFR 62 (March 2026), consider nephrology referral",
    "BP consistently borderline — evaluate antihypertensive regimen",
    "Review Metformin dose given renal impairment (eGFR <60 threshold)"
  ],
  "modelUsed": "gpt-4o",
  "generatedAt": "2026-02-26T10:00:00.000Z"
}
```

---

## 5. OCR Pipeline

```
File uploaded (image/PDF) →
Step 1: Tesseract OCR (local, fast, free)
  → If confidence > 85% → use Tesseract output
  → If confidence < 85% → escalate to Google Vision

Step 2: Google Cloud Vision API (paid fallback)
  → Higher accuracy for printed medical documents
  → Supports multi-language (English, Hindi, Tamil, etc.)
  → Returns structured text blocks

Step 3: Text cleaning
  → Remove scan artifacts (stray symbols, broken spacing)
  → Normalize whitespace, fix common OCR errors
  → Output: clean plain text

Step 4: Store extracted text in medical_records.extractedText
  → Used by AI Report Decoder (no need to re-OCR)
  → Used for full-text search
```

### 5.1 OCR API Endpoint

**POST /ai/ocr** (on AI service, internal only)

```json
// Request
{ "fileUrl": "https://res.cloudinary.com/uhid/...", "mimeType": "image/jpeg" }

// Response
{
  "text": "LABORATORY REPORT\nPatient: Rajesh Kumar\nHbA1c: 7.8%\nLDL Cholesterol: 148 mg/dL\n...",
  "confidence": 0.92,
  "engine": "tesseract"
}
```

---

## 6. Prompt Engineering

### 6.1 Report Decoder System Prompt

```
You are a medical AI assistant that explains lab reports to patients in simple, 
non-technical language. Your audience is a layperson with no medical training.

Rules:
1. NEVER make a diagnosis. Always say "consult your doctor".
2. Use simple, empathetic language (reading level: Grade 8).
3. For each parameter, explain what it measures, what the result means, and 
   whether it's a concern.
4. Always include a disclaimer that this is for information only.
5. Classify overall risk as: NORMAL, LOW, MODERATE, HIGH, or CRITICAL.
6. Output ONLY the JSON structure provided — no extra prose.

{JSON_OUTPUT_SCHEMA}
```

### 6.2 Clinical Summary System Prompt

```
You are a clinical decision support AI for doctors. Your output is read by 
licensed physicians. You speak concisely, using medical terminology.

Rules:
1. Aggregate all provided data (conditions, medications, labs, vitals).
2. Identify trends over time — improving or deteriorating.
3. Flag drug-condition conflicts (e.g., Metformin + eGFR <60).
4. Calculate a multi-domain risk score.
5. List attention items in priority order.
6. Output ONLY the JSON structure provided — no extra prose.

{JSON_OUTPUT_SCHEMA}
```

### 6.3 GPT-4o Model Settings

| Parameter | Value | Reason |
|-----------|-------|--------|
| `model` | `gpt-4o` | Best accuracy for medical text |
| `temperature` | `0.1` | Near-deterministic, consistent summaries |
| `max_tokens` | `2000` (decoder), `3000` (summary) | Control costs |
| `response_format` | `{ type: "json_object" }` | Enforces JSON output |
| Fallback | `gemini-1.5-pro` | If OpenAI quota exceeded |

---

## 7. API Endpoints

**Base URL:** `http://localhost:5000/api/v1/ai`
(Express proxies to AI service at port 8000)

### POST /ai/decode

Run Report Decoder on a medical record.

**Auth:** `PATIENT` (own records only)

**Request Body:**
```json
{ "recordId": "clxxx..." }
```

**Response (200):**
```json
{
  "success": true,
  "data": { /* full ReportDecoder output as above */ },
  "cached": false
}
```

---

### POST /ai/clinical-summary

Generate AI clinical summary for a patient.

**Auth:** `DOCTOR` (active consent with ALL or CLINICAL_NOTES scope)

**Request Body:**
```json
{ "patientUhid": "UH-847291" }
```

**Response (200):**
```json
{
  "success": true,
  "data": { /* full ClinicalSummary output as above */ },
  "cached": false
}
```

---

### GET /ai/summary/:recordId

Retrieve cached summary for a record (no re-generation).

**Auth:** `PATIENT` (own records) | `DOCTOR` (with consent)

---

## 8. Caching Strategy

AI calls are expensive ($0.005–$0.015 per call). Caching prevents redundant calls:

```
User requests AI decode for record X →
Check ai_report_summaries table:
  Record exists AND updatedAt < 7 days → Return cached
  Record exists AND file has been updated → Regenerate
  No record → Call AI → Store result → Return

For Clinical Summary:
  Cached for 24 hours (patient data changes more frequently)
  Cache key: patientId + hash of aggregated data context
  If new prescription or clinical note added → cache invalidated
```

### Cache TTLs

| Feature | Cache Duration | Invalidation Trigger |
|---------|---------------|----------------------|
| Report Decoder | 7 days | Record file replaced |
| Clinical Summary | 24 hours | New prescription, new clinical note, new record |

---

## 9. Frontend Pages

### 9.1 Patient — "Understand My Report" (`/patient/records/:id/ai`)

- Button on each medical record: **"🔍 Explain This Report"**
- Shows loading skeleton while AI processes
- Result shows:
  - **Risk badge** (color coded by level)
  - Summary paragraph in plain language
  - Parameter breakdown table with color-coded status (green/yellow/red)
  - Recommended action items (bullet list)
  - Disclaimer text in grey
  - "Generated by AI · For informational use only" footer
- Cached responses show: "Analysis from [date] · Regenerate"

### 9.2 Doctor — AI Summary Panel (`/doctor/patient/:uhid/ai-summary`)

- Tab in patient dashboard: **"AI Summary"**
- Auto-loads when doctor opens patient (with appropriate consent scope)
- Shows:
  - Patient summary paragraph
  - Active Conditions table with ICD-10 codes
  - Current Medications with duration
  - Vital trends (mini sparkline charts)
  - Risk scores (pill badges per domain)
  - Attention Items (ordered list with severity icons)
- "Regenerate" button (re-runs AI, clears 24h cache)
- "Last updated" timestamp shown

---

## 10. Database Schema

### `ai_report_summaries` table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String (CUID) | PK | |
| `recordId` | String | FK → medical_records, nullable | For Report Decoder |
| `patientId` | String | FK → patients | |
| `summaryType` | SummaryType | NOT NULL | `REPORT_DECODER` \| `CLINICAL_SUMMARY` |
| `summaryText` | String | NOT NULL | Main AI-generated text |
| `structuredData` | JSON | nullable | Full parsed output (simplifiedValues, riskLevel, etc.) |
| `riskLevel` | String | nullable | For Report Decoder: NORMAL/LOW/MODERATE/HIGH/CRITICAL |
| `modelUsed` | String | NOT NULL | `gpt-4o`, `gemini-1.5-pro` |
| `tokensUsed` | Int | nullable | For cost tracking |
| `generatedAt` | DateTime | NOT NULL | When AI produced this |
| `updatedAt` | DateTime | auto-update | For cache invalidation |

---

## 11. Cost Control

| Strategy | Description |
|----------|-------------|
| **Cache aggressively** | 7-day cache for report decoder, 24h for clinical summary |
| **Cache invalidation** | Only re-run AI if underlying data changes |
| **Token limits** | `max_tokens: 2000` for decoder, `3000` for summary |
| **Temperature 0.1** | Reduces variability → helps caching (same input = same output) |
| **Batch OCR first** | Run OCR once, store extracted text, AI reads text (not file) |
| **Gemini fallback** | If OpenAI quota exceeded, automatically switch to Gemini |
| **Admin dashboard** | Show total AI spend per day/month, per-patient breakdown |

---

## 12. Security Model

| Threat | Mitigation |
|--------|-----------|
| Patient accessing another patient's AI summary | Record/consent check before proxy to AI service |
| Direct calls to AI service port 8000 | AI service only accessible internally (no public route); `INTERNAL_SERVICE_SECRET` header required |
| Prompt injection attacks | User data is wrapped in structured JSON, never concatenated raw into the prompt |
| Medical advice liability | Strict disclaimer in every AI output, enforced by system prompt |
| Data sent to OpenAI | No patient PII (name, Aadhaar, phone) sent in prompts — only medical values and codes |

---

## 13. Testing

| Test Scenario | Expected Result |
|---------------|----------------|
| Patient requests decode of their own lab report | 200, structured JSON returned |
| Patient requests decode of another patient's report | 403 Forbidden |
| Second request for same record within 7 days | 200, `cached: true` |
| New clinical note added → doctor re-runs summary | AI called fresh (cache invalidated) |
| OpenAI returns error → fallback to Gemini | 200 with `modelUsed: "gemini-1.5-pro"` |
| OCR confidence < 85% → Tesseract → Google Vision | Final text from Google Vision |
| Prompt with patient name in OCR text | Name stripped before sending to AI |

---

*Previous Phase: [Phase 4 — Doctor Portal](./PHASE_4_CLINICAL.md)  
Next Phase: [Phase 6 — QR Codes & Emergency →](./PHASE_6_QR_EMERGENCY.md)*
