# Phase 4 — Doctor Portal & Pharma-Check Engine

> **Phase:** 4  
> **Status:** ⬜ PLANNED  
> **Duration:** Week 7–8  
> **Goal:** Doctors can look up patients (with consent), view full medical history, write clinical notes, issue prescriptions, and get real-time drug safety checks before finalizing any prescription.

---

## 📋 Table of Contents

1. [Overview](#1-overview)
2. [Patient Lookup Flow](#2-patient-lookup-flow)
3. [Clinical Notes](#3-clinical-notes)
4. [Prescription System](#4-prescription-system)
5. [Pharma-Check Engine](#5-pharma-check-engine)
6. [API Endpoints](#6-api-endpoints)
7. [Validation Rules](#7-validation-rules)
8. [Frontend Pages](#8-frontend-pages)
9. [Database Schema](#9-database-schema)
10. [Security Model](#10-security-model)
11. [Testing](#11-testing)

---

## 1. Overview

The doctor portal is the primary clinical workflow tool. A doctor can:

1. Look up any patient by UHID or QR scan
2. View records only if consent is granted (Phase 3)
3. Write structured clinical notes with ICD-10 coding
4. Issue multi-drug prescriptions
5. Instantly validate prescriptions through the Pharma-Check engine
6. View AI-generated summaries (Phase 5) of the patient's history

```
DOCTOR WORKFLOW:
────────────────────────────────────────────────────────────────────
Login → Doctor Dashboard →
Patient Lookup (UHID / QR) →
Consent Check (auto-gate) →
  [No consent] → Request Access Flow (Phase 3)
  [Consent active] → Patient Dashboard →
    ├── Medical History (consent-scoped)
    ├── AI Summary (Phase 5)
    ├── Write Clinical Note →
    │     Chief Complaint + ICD-10 + Examination + Plan
    └── New Prescription →
          Add Drugs → Pharma-Check → Save/Override
```

---

## 2. Patient Lookup Flow

### 2.1 By UHID

- Doctor enters UHID in search bar (format: `UH-XXXXXX`)
- Backend fetches patient's public profile (name, age, blood group, allergies)
- Consent check runs automatically:
  - `ACTIVE` consent → Full access per scope
  - No consent → Shows "Request Access" prompt
  - `PENDING` consent → Shows "Awaiting patient approval…"

### 2.2 By QR Code

- Doctor opens QR scanner (uses device camera)
- Scans patient's QR code
- QR decoded → UHID extracted → same flow as above
- If QR is time-limited, access inherits the QR's scope (Phase 6)

### 2.3 Consent-Gated Patient Dashboard

Once consent is verified, the patient dashboard shows:

| Tab | Consent Required | Content |
|-----|-----------------|---------|
| Overview | Any scope | Public info: name, DOB, blood group, emergency contacts |
| Medical Records | `LAB_REPORT` / `IMAGING` / `PRESCRIPTION` / etc. | Filtered to consented scope |
| Prescriptions | `PRESCRIPTION` | All past prescriptions from all doctors |
| Clinical Notes | `CLINICAL_NOTES` | Notes written by this doctor + shared notes |
| AI Summary | `ALL` or `CLINICAL_NOTES` | GPT-4o summary (Phase 5) |

---

## 3. Clinical Notes

### 3.1 Structure

Each clinical note is a structured encounter record:

| Field | Type | Description |
|-------|------|-------------|
| Chief Complaint | Short text | Primary reason for visit ("Chest pain, shortness of breath") |
| Symptoms | Tag list | Duration-aware symptom tags |
| ICD-10 Code | Code + Description | Searchable ICD-10 code picker (search by name or code) |
| Examination Findings | Rich text | Physical exam observations |
| Vital Signs | Object | BP, pulse, temperature, SpO2, weight, height |
| Diagnosis | Text | Formal diagnosis statement |
| Treatment Plan | Rich text | Treatment recommendations, follow-up instructions |
| Attachments | File refs | Link to uploaded records from this encounter |
| Visibility | Enum | `PRIVATE` (only this doctor) \| `HOSPITAL` \| `PATIENT_VISIBLE` |

### 3.2 ICD-10 Integration

- Search endpoint returns matching ICD-10 codes
- Free text search: "diabetes" → returns `E11.9`, `E10.9`, `E11.65`, etc.
- Stored as `{ code: "E11.9", description: "Type 2 diabetes without complications" }`

---

## 4. Prescription System

### 4.1 Prescription Header

| Field | Required | Description |
|-------|----------|-------------|
| Patient UHID | ✅ | Auto-populated from current patient |
| Doctor ID | ✅ | Auto-populated from session |
| Hospital ID | ✅ | Auto-populated from doctor's hospital |
| Diagnosis | ✅ | Short diagnosis label |
| Notes | No | Additional prescription notes |
| Follow-up date | No | When patient should return |
| Valid until | No | Prescription validity (default 30 days) |

### 4.2 Prescription Item (Drug Entry)

Each drug in a prescription:

| Field | Required | Description |
|-------|----------|-------------|
| Drug Name | ✅ | Generic name (not brand) |
| Dosage | ✅ | e.g., "500mg" |
| Form | ✅ | Tablet / Capsule / Syrup / Injection / Cream / Other |
| Frequency | ✅ | e.g., "Twice daily", "Every 8 hours" |
| Duration | ✅ | e.g., "7 days" |
| Route | ✅ | Oral / IV / IM / Topical / Inhalation / Sublingual |
| Instructions | No | "Take after meals", "Avoid sunlight" |
| Quantity | ✅ | Total units to dispense |

---

## 5. Pharma-Check Engine

This is one of the most critical safety features of UHID. Before a prescription is saved, the Pharma-Check engine runs automatically and reports any drug safety issues.

### 5.1 What It Checks

| Check Type | Description |
|------------|-------------|
| **Drug-Drug Interaction** | Does any pair of prescribed drugs interact dangerously? Checks the entire prescription + patient's active medications from recent prescriptions |
| **Drug-Allergy** | Does any prescribed drug or its drug class match the patient's documented allergies? |
| **Drug-Condition** | Does any prescribed drug have a contraindication with the patient's diagnosed conditions (from clinical notes)? |
| **Duplicate Drug** | Is the same drug being prescribed that is already in an active prescription? |

### 5.2 Severity Levels

| Level | Color | Action Required |
|-------|-------|-----------------|
| `LOW` | 🟡 Yellow | Informational warning — pharmacist note |
| `MODERATE` | 🟠 Orange | Soft block — doctor must acknowledge |
| `HIGH` | 🔴 Red | Hard block — requires explicit override + reason |
| `CRITICAL` | ⛔ Dark Red | Hard block — override requires supervising doctor co-sign |

### 5.3 Pharma-Check Flow

```
Doctor adds drug to prescription →
Frontend sends /pharma-check request →
Backend queries:
  1. Patient's active prescriptions (last 90 days) → extract current drugs
  2. Patient's allergy list (from medical records + clinical notes)
  3. Patient's condition list (from clinical notes ICD-10 codes)
  4. Drug interaction database (curated list) →
Backend returns:
  - List of flagged issues with severity
  - Suggested alternatives for HIGH/CRITICAL flags
Frontend shows:
  - GREEN: "No issues found ✅"
  - YELLOW: Warning cards with details
  - RED/CRITICAL: Block modal with override option
```

### 5.4 Override Mechanism

For HIGH severity issues:
```
Doctor clicks "Override"  →
Modal shows: "Overriding a HIGH severity interaction. Provide clinical justification:" →
Doctor enters reason (min 30 chars) →
Override logged in pharma_check_logs with:
  - doctorId
  - patientId
  - prescriptionId
  - overrideReason
  - severity
  - timestamp
→ Patient is notified in-app after prescription saved
```

For CRITICAL severity:
```
"This interaction requires supervisory sign-off. 
Please contact your department head or use emergency override."
→ If emergency override used: same log + AuditLog entry flagged for admin review
```

### 5.5 Drug Interaction Data

The interaction database is maintained as a structured JSON/DB table:

```json
{
  "drugA": "warfarin",
  "drugB": "aspirin",
  "severity": "HIGH",
  "mechanism": "Both inhibit platelet function. Increased bleeding risk.",
  "clinicalEffect": "Risk of major bleeding events including GI and intracranial",
  "alternatives": {
    "forDrugB": ["acetaminophen (for pain)", "clopidogrel (with caution, consult hematology)"]
  }
}
```

---

## 6. API Endpoints

**Base URL:** `http://localhost:5000/api/v1`

### GET /prescriptions?patientUhid=UH-847291

Get all prescriptions for a patient (consent required).

**Auth:** `DOCTOR` (active consent) | `PATIENT` (own records)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx...",
      "diagnosis": "Type 2 Diabetes - Routine Management",
      "prescribedBy": {
        "name": "Dr. Suresh Menon",
        "hospital": "Apollo Chennai",
        "specialty": "Endocrinology"
      },
      "createdAt": "2026-01-15T10:30:00.000Z",
      "validUntil": "2026-02-15T10:30:00.000Z",
      "items": [
        {
          "drugName": "Metformin",
          "dosage": "500mg",
          "form": "Tablet",
          "frequency": "Twice daily",
          "duration": "30 days",
          "route": "Oral"
        }
      ]
    }
  ]
}
```

---

### POST /prescriptions

Create a new prescription.

**Auth:** `DOCTOR`

**Request Body:**
```json
{
  "patientUhid": "UH-847291",
  "diagnosis": "Type 2 Diabetes - Routine Management",
  "notes": "Monitor HbA1c every 3 months",
  "followUpDate": "2026-03-15T10:00:00.000Z",
  "validUntil": "2026-02-15T10:30:00.000Z",
  "items": [
    {
      "drugName": "Metformin",
      "dosage": "500mg",
      "form": "TABLET",
      "frequency": "Twice daily",
      "duration": "30 days",
      "route": "ORAL",
      "instructions": "Take after meals",
      "quantity": 60
    }
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "prescriptionId": "clyyy...",
    "pharmaCheck": {
      "passed": true,
      "issues": []
    }
  }
}
```

---

### POST /prescriptions/pharma-check

Run pharma-check on a drug list without saving (used for live checking as doctor adds drugs).

**Auth:** `DOCTOR`

**Request Body:**
```json
{
  "patientUhid": "UH-847291",
  "drugs": [
    { "name": "Warfarin", "dosage": "5mg" },
    { "name": "Aspirin", "dosage": "100mg" }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "passed": false,
    "issues": [
      {
        "type": "DRUG_INTERACTION",
        "severity": "HIGH",
        "drugs": ["Warfarin", "Aspirin"],
        "mechanism": "Both inhibit platelet function. Increased bleeding risk.",
        "clinicalEffect": "Risk of major bleeding events",
        "alternatives": {
          "forAspirin": ["Acetaminophen for pain relief"]
        },
        "requiresOverride": true
      }
    ]
  }
}
```

---

### POST /prescriptions/:id/clinical-notes

Create a clinical note linked to a consultation visit.

**Auth:** `DOCTOR`

**Request Body:**
```json
{
  "chiefComplaint": "Chest pain on exertion for 3 days",
  "symptoms": ["Chest pain", "Shortness of breath"],
  "icd10Code": "I20.9",
  "icd10Description": "Angina pectoris, unspecified",
  "examinationFindings": "BP: 145/90, Pulse: 88, SpO2: 97%. Mild chest tenderness on palpation.",
  "vitalSigns": {
    "bp": "145/90",
    "pulse": 88,
    "temperature": 37.1,
    "spo2": 97,
    "weight": 72,
    "height": 172
  },
  "diagnosis": "Unstable Angina — requires further workup",
  "treatmentPlan": "ECG ordered. Referred to cardiology. Advised rest. Start Aspirin 325mg stat.",
  "visibility": "PATIENT_VISIBLE"
}
```

---

### GET /prescriptions/clinical-notes/:patientUhid

Get all clinical notes for a patient.

**Auth:** `DOCTOR` (active consent with `CLINICAL_NOTES` scope) | `PATIENT` (own records, only `PATIENT_VISIBLE` notes)

---

## 7. Validation Rules

### Prescription Validation (Zod Schema)

```typescript
const prescriptionItemSchema = z.object({
  drugName: z.string().min(2, "Drug name required").max(200),
  dosage: z.string().min(1).max(50),
  form: z.enum(["TABLET", "CAPSULE", "SYRUP", "INJECTION", "CREAM", "OTHER"]),
  frequency: z.string().min(1).max(100),
  duration: z.string().min(1).max(100),
  route: z.enum(["ORAL", "IV", "IM", "TOPICAL", "INHALATION", "SUBLINGUAL"]),
  instructions: z.string().max(500).optional(),
  quantity: z.number().int().positive().max(9999),
});

const createPrescriptionSchema = z.object({
  patientUhid: z.string().regex(/^UH-[A-Z0-9]{6}$/),
  diagnosis: z.string().min(3).max(300),
  notes: z.string().max(2000).optional(),
  followUpDate: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  items: z.array(prescriptionItemSchema).min(1).max(20),
});
```

### Clinical Note Validation

| Field | Rule |
|-------|------|
| `chiefComplaint` | 5–500 chars, required |
| `icd10Code` | Regex `/^[A-Z][0-9]{2}(\.[0-9A-Z]{1,4})?$/` |
| `vitalSigns.bp` | Regex `/^\d{2,3}\/\d{2,3}$/` |
| `vitalSigns.spo2` | 70–100 |
| `vitalSigns.pulse` | 20–300 |
| `vitalSigns.temperature` | 30–45 |
| `visibility` | Enum: `PRIVATE` \| `HOSPITAL` \| `PATIENT_VISIBLE` |

---

## 8. Frontend Pages

### 8.1 Patient Lookup (`/doctor/patient-lookup`)

- UHID search bar with format hint
- QR scanner button (opens camera modal)
- Recent patients (last 5 looked up, stored in session)
- On found: shows patient card (name, age, blood group, photo thumbnail)
- Consent status badge: `ACTIVE ✅` | `PENDING ⏳` | `NO ACCESS ❌`

### 8.2 Patient Dashboard (`/doctor/patient/:uhid`)

- Tabs: Overview | Records | Prescriptions | Clinical Notes | AI Summary
- Each tab checks consent scope before rendering
- **Overview:** Allergies list, emergency contacts, blood group, chronic conditions
- **Records:** Filterable by type, with file viewer
- **Prescriptions:** Timeline of all prescriptions, expandable drug lists

### 8.3 New Prescription (`/doctor/patient/:uhid/prescribe`)

- Drug search with autocomplete
- Drug card per item with: name, dosage, form, frequency, duration, route
- **Pharma-Check status strip** (bottom of page):
  - `✅ No drug interactions detected`
  - `⚠️ 1 moderate interaction — review before saving`
  - `🚫 CRITICAL interaction — resolve before proceeding`
- Real-time check fires on each drug add/remove
- Save button disabled if CRITICAL unresolved
- Override modal for HIGH severity

### 8.4 Clinical Notes (`/doctor/patient/:uhid/notes`)

- Past notes timeline (most recent first)
- "New Note" button opens structured form
- ICD-10 search typeahead
- Vital signs input grid
- Rich text editor for findings and treatment plan

---

## 9. Database Schema

### `prescriptions` table

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | String (CUID) | PK |
| `patientId` | String | FK → patients |
| `doctorId` | String | FK → doctors |
| `hospitalId` | String | FK → hospitals |
| `diagnosis` | String | NOT NULL |
| `notes` | String | nullable |
| `followUpDate` | DateTime | nullable |
| `validUntil` | DateTime | nullable |
| `createdAt` | DateTime | DEFAULT now() |

### `prescription_items` table

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | String (CUID) | PK |
| `prescriptionId` | String | FK → prescriptions, CASCADE DELETE |
| `drugName` | String | NOT NULL |
| `dosage` | String | NOT NULL |
| `form` | DrugForm | NOT NULL |
| `frequency` | String | NOT NULL |
| `duration` | String | NOT NULL |
| `route` | DrugRoute | NOT NULL |
| `instructions` | String | nullable |
| `quantity` | Int | NOT NULL |

### `clinical_notes` table

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | String (CUID) | PK |
| `patientId` | String | FK → patients |
| `doctorId` | String | FK → doctors |
| `chiefComplaint` | String | NOT NULL |
| `symptoms` | String[] | NOT NULL |
| `icd10Code` | String | NOT NULL |
| `icd10Description` | String | NOT NULL |
| `examinationFindings` | String | nullable |
| `vitalSigns` | JSON | nullable |
| `diagnosis` | String | NOT NULL |
| `treatmentPlan` | String | nullable |
| `visibility` | NoteVisibility | DEFAULT PRIVATE |
| `createdAt` | DateTime | DEFAULT now() |

### `pharma_check_logs` table

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | String (CUID) | PK |
| `prescriptionId` | String | FK → prescriptions |
| `doctorId` | String | FK → doctors |
| `patientId` | String | FK → patients |
| `checkType` | String | NOT NULL |
| `severity` | InteractionSeverity | NOT NULL |
| `drugs` | String[] | NOT NULL |
| `mechanism` | String | NOT NULL |
| `overridden` | Boolean | DEFAULT false |
| `overrideReason` | String | nullable |
| `createdAt` | DateTime | DEFAULT now() |

---

## 10. Security Model

| Threat | Mitigation |
|--------|-----------|
| Doctor accessing patient without consent | Middleware checks for ACTIVE consent on every patient data endpoint |
| Scope mismatch (no prescription scope but reads prescriptions) | Service layer checks `consent.scope.includes("PRESCRIPTION")` |
| Ignoring Pharma-Check | HIGH severity blocks save until override with reason. CRITICAL requires admin co-sign |
| Forging pharma-check override | Override reason stored and linked to prescription + AuditLog |
| Doctor at unverified hospital | `requireVerifiedHospital()` middleware on prescribe endpoints |

---

## 11. Testing

| Test Scenario | Expected Result |
|---------------|----------------|
| Doctor with no consent tries to access patient | 403 Forbidden |
| Doctor adds warfarin + aspirin → pharma check | `HIGH` severity flag returned |
| Doctor overrides HIGH with reason <30 chars | 400 Validation error |
| Doctor overrides HIGH with valid reason | Prescription saved, PharmaCheckLog created |
| Patient with aspirin allergy → doctor prescribes aspirin | `CRITICAL` DRUG_ALLERGY flag returned |
| Valid prescription with 5 drugs, no interactions | Prescription saved, pharmaCheck.passed = true |
| Patient retrieves their own prescription | 200, includes all items |
| Insurance reads prescription (no consent) | 403 Forbidden |
| Clinical note saved as PRIVATE → patient requests it | Patient API returns 404 for note |

---

*Previous Phase: [Phase 3 — Consent](./PHASE_3_CONSENT.md)  
Next Phase: [Phase 5 — AI Features →](./PHASE_5_AI.md)*
