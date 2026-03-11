# Phase 7 — Insurance Portal

> **Phase:** 7  
> **Status:** ⬜ PLANNED  
> **Duration:** Week 11  
> **Goal:** Insurance providers can create claims, request consent-gated patient record access, verify record authenticity via blockchain hash, and get AI-assisted fraud detection. Patients remain in control of what insurers can see.

---

## 📋 Table of Contents

1. [Overview](#1-overview)
2. [Claim Lifecycle](#2-claim-lifecycle)
3. [Record Verification (Blockchain Hash)](#3-record-verification-blockchain-hash)
4. [AI Fraud Detection](#4-ai-fraud-detection)
5. [API Endpoints](#5-api-endpoints)
6. [Validation Rules](#6-validation-rules)
7. [Frontend Pages](#7-frontend-pages)
8. [Database Schema](#8-database-schema)
9. [Security Model](#9-security-model)
10. [Testing](#10-testing)

---

## 1. Overview

```
INSURANCE CLAIM FLOW:
────────────────────────────────────────────────────────────────────
Patient or Insurer submits claim →
Insurer requests access to relevant patient records (consent required) →
Patient approves access (OTP, Phase 3) →
Insurer views consent-scoped records →
Insurer requests record verification (blockchain hash check) →
AI fraud detection runs →
Insurer makes decision: APPROVED | REJECTED | HOLD →
Patient notified of decision →
Final claim record stored with all supporting documents
```

---

## 2. Claim Lifecycle

### 2.1 Status Flow

```
SUBMITTED → (insurer reviews) → UNDER_REVIEW
              ↓                       ↓
           APPROVED              REJECTED
              ↓
           PAID                  HOLD (needs more info)
```

### 2.2 Claim Types

| Type | Description |
|------|-------------|
| `HOSPITALIZATION` | In-patient hospital stay claim |
| `OUTPATIENT` | OPD / day procedure claim |
| `MEDICINE_REIMBURSEMENT` | Drug/pharmacy reimbursement |
| `DIAGNOSTIC` | Lab tests / imaging |
| `SURGERY` | Surgical procedure claim |
| `CRITICAL_ILLNESS` | Critical illness lump sum claim |
| `MATERNITY` | Maternity-related claim |

---

## 3. Record Verification (Blockchain Hash)

UHID generates a **SHA-256 content hash** of every uploaded medical record at the time of upload.

This hash is stored in the `medical_records.fileHash` column.

### 3.1 Verification Process

```
Insurer downloads document from Cloudinary signed URL →
Insurer uploads document to /insurance/verify-record →
Backend:
  1. Computes SHA-256 hash of the uploaded file
  2. Compares with stored hash in medical_records table
  3. If match → "AUTHENTIC: Document has not been modified"
  4. If mismatch → "TAMPERED: Document does not match original"
```

### 3.2 Why This Matters

- Prevents patients or hospitals from submitting altered discharge summaries or falsified lab reports
- Tamper-evident without requiring a full blockchain network — SHA-256 comparison is sufficient for MVP
- Future: Anchor hash to Ethereum (Polygon) or Hyperledger for full immutability

### 3.3 Verification Response

```json
{
  "success": true,
  "data": {
    "recordId": "clxxx...",
    "originalHash": "a3f5c9d1e7...",
    "submittedHash": "a3f5c9d1e7...",
    "isAuthentic": true,
    "verifiedAt": "2026-02-26T10:00:00.000Z",
    "recordType": "DISCHARGE_SUMMARY",
    "uploadedAt": "2026-01-15T10:30:00.000Z",
    "uploadedBy": "Apollo Hospital, Chennai (HospitalStaff)"
  }
}
```

---

## 4. AI Fraud Detection

Before the insurer reviews a claim, the AI fraud detection module flags suspicious patterns.

### 4.1 Fraud Flags

| Flag | Trigger Condition |
|------|-----------------|
| `DUPLICATE_CLAIM` | Same patient, same diagnosis, same dates — similar claim exists |
| `RECORD_TAMPER` | File hash mismatch detected |
| `DIAGNOSIS_MISMATCH` | ICD-10 code in clinical notes doesn't match claim diagnosis |
| `DATE_ANOMALY` | Discharge date before admission date, or future dates |
| `HIGH_FREQUENCY` | More than 5 claims in 90 days for the same patient |
| `FACILITY_UNREGISTERED` | Claim from hospital not registered in UHID |
| `PRESCRIPTION_DISCREPANCY` | Claimed medications not found in any prescription record |

### 4.2 Fraud Detection Output

```json
{
  "fraudScore": 72,
  "riskLevel": "HIGH",
  "flags": [
    {
      "type": "DUPLICATE_CLAIM",
      "detail": "Similar claim (ID: clyyy...) was submitted 14 days ago for same diagnosis.",
      "severity": "HIGH"
    },
    {
      "type": "PRESCRIPTION_DISCREPANCY",
      "detail": "Claimed medication 'Clopidogrel' not found in any recorded prescription for this patient.",
      "severity": "MODERATE"
    }
  ],
  "recommendation": "MANUAL_REVIEW",
  "analysedAt": "2026-02-26T10:00:00.000Z"
}
```

### 4.3 Fraud Score Thresholds

| Score | Risk Level | Recommended Action |
|-------|-----------|-------------------|
| 0–25 | LOW | Auto-approve eligible |
| 26–50 | MODERATE | Supervisor review |
| 51–75 | HIGH | Detailed manual review required |
| 76–100 | CRITICAL | Flag for investigation, hold claim |

---

## 5. API Endpoints

**Base URL:** `http://localhost:5000/api/v1/insurance`

### POST /insurance/claims

Submit a new insurance claim.

**Auth:** `INSURANCE_PROVIDER`

**Request Body:**
```json
{
  "patientUhid": "UH-847291",
  "policyNumber": "MAX-2023-847291",
  "claimType": "HOSPITALIZATION",
  "diagnosis": "Acute Myocardial Infarction",
  "icd10Code": "I21.9",
  "admissionDate": "2026-01-15",
  "dischargeDate": "2026-01-20",
  "hospitalName": "Fortis Hospital, Mumbai",
  "claimedAmount": 250000,
  "currency": "INR",
  "notes": "Emergency PTCA procedure performed."
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "claimId": "clxxx...",
    "claimNumber": "CLM-2026-00847",
    "status": "SUBMITTED",
    "fraudScore": 12,
    "riskLevel": "LOW"
  }
}
```

---

### POST /insurance/claims/:id/request-access

Request consent to view patient records for a claim.

**Auth:** `INSURANCE_PROVIDER`

**Request Body:**
```json
{
  "scope": ["LAB_REPORT", "DISCHARGE_SUMMARY", "PRESCRIPTION"],
  "purpose": "Review records for claim CLM-2026-00847",
  "durationDays": 30
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Access request sent. Patient will be notified.",
  "data": {
    "consentId": "clyyy...",
    "status": "PENDING"
  }
}
```

---

### GET /insurance/claims/:id/records

View patient records for an approved claim (requires active consent).

**Auth:** `INSURANCE_PROVIDER` (must have active consent)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "records": [
      {
        "id": "clxxx...",
        "type": "DISCHARGE_SUMMARY",
        "uploadedAt": "2026-01-21T10:00:00.000Z",
        "description": "Discharge Summary - Fortis Mumbai",
        "signedUrl": "https://res.cloudinary.com/uhid/...",
        "fileHash": "a3f5c9d1e7..."
      }
    ],
    "consentScope": ["LAB_REPORT", "DISCHARGE_SUMMARY", "PRESCRIPTION"],
    "consentExpiresAt": "2026-03-26T10:00:00.000Z"
  }
}
```

---

### POST /insurance/verify-record

Verify a document's authenticity.

**Auth:** `INSURANCE_PROVIDER`

**Request (multipart/form-data):**
- `file`: The document to verify
- `recordId`: ID of the original record to compare against

---

### PATCH /insurance/claims/:id/decision

Update claim decision.

**Auth:** `INSURANCE_PROVIDER`

**Request Body:**
```json
{
  "status": "APPROVED",
  "approvedAmount": 240000,
  "notes": "All documents verified. Amount approved minus co-pay.",
  "settlementDate": "2026-03-05"
}
```

**Valid Status Transitions:**

| Current Status | Allowed Next Status |
|----------------|-------------------|
| `SUBMITTED` | `UNDER_REVIEW` |
| `UNDER_REVIEW` | `APPROVED`, `REJECTED`, `HOLD` |
| `HOLD` | `UNDER_REVIEW`, `APPROVED`, `REJECTED` |
| `APPROVED` | `PAID` |

---

### GET /insurance/claims

List all claims for the authenticated insurance provider.

**Auth:** `INSURANCE_PROVIDER`

**Query Params:** `?status=UNDER_REVIEW&page=1&limit=20`

---

### GET /insurance/claims/:id

Get full claim detail including documents, fraud analysis, and audit trail.

**Auth:** `INSURANCE_PROVIDER`

---

## 6. Validation Rules

### Claim Submission

| Field | Rule |
|-------|------|
| `patientUhid` | Must exist in DB |
| `policyNumber` | 5–50 alphanumeric, optional |
| `claimType` | Enum validation |
| `icd10Code` | Regex `/^[A-Z][0-9]{2}(\.[0-9A-Z]{1,4})?$/` |
| `admissionDate` | Must be a past date |
| `dischargeDate` | Must be ≥ admissionDate |
| `claimedAmount` | Positive number, max 10,000,000 |
| `hospitalName` | 3–200 chars |

### Claim Decision

| Field | Rule |
|-------|------|
| `status` | Must be a valid transition (see table above) |
| `approvedAmount` | Required if status = APPROVED; must be ≤ claimedAmount |
| `notes` | Required for REJECTED (min 20 chars explaining reason) |

---

## 7. Frontend Pages

### 7.1 Insurance Dashboard (`/insurance/dashboard`)

- Stats row: Total Claims | Under Review | Approved This Month | Total Settled Amount
- Claims table with columns: Patient UHID, Type, Amount, Status, Fraud Score, Actions
- Fraud Score badge: green (low) / yellow (moderate) / red (high/critical)
- Filters: by status, date range, type, fraud risk level
- Export to CSV button

### 7.2 New Claim Form (`/insurance/claims/new`)

- Patient UHID lookup
- Dynamic form based on claim type selection
- Date pickers for admission/discharge
- ICD-10 code search
- Amount field with currency selector
- Submit → shows fraud analysis result card before final confirm

### 7.3 Claim Detail (`/insurance/claims/:id`)

**Tabs:**
- **Overview:** Claim info, status badge, timeline of status changes
- **Fraud Analysis:** Fraud score gauge, flags list with severity, AI recommendation
- **Patient Records:** Documents from consented records, download + verify button per document
- **Documents:** Uploaded claim documents (receipts, bills)
- **Audit Trail:** Full log of who viewed/acted on the claim

### 7.4 Record Verification UI

- "Verify Document" button on each record card
- Upload dialog: "Upload the same document to verify authenticity"
- Result: ✅ "Authentic — Document not modified" or ❌ "Tampered — Hash mismatch"

---

## 8. Database Schema

### `insurance_claims` table

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | String (CUID) | PK |
| `claimNumber` | String | UNIQUE, generated |
| `patientId` | String | FK → patients |
| `insuranceProviderId` | String | FK → insurance_providers |
| `policyNumber` | String | nullable |
| `claimType` | ClaimType | NOT NULL |
| `diagnosis` | String | NOT NULL |
| `icd10Code` | String | NOT NULL |
| `admissionDate` | DateTime | nullable |
| `dischargeDate` | DateTime | nullable |
| `hospitalName` | String | NOT NULL |
| `claimedAmount` | Float | NOT NULL |
| `approvedAmount` | Float | nullable |
| `currency` | String | DEFAULT "INR" |
| `status` | ClaimStatus | DEFAULT SUBMITTED |
| `fraudScore` | Int | nullable |
| `fraudFlags` | JSON | nullable |
| `notes` | String | nullable |
| `settlementDate` | DateTime | nullable |
| `createdAt` | DateTime | DEFAULT now() |
| `updatedAt` | DateTime | auto-update |

### `claim_documents` table

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | String (CUID) | PK |
| `claimId` | String | FK → insurance_claims |
| `documentType` | String | NOT NULL |
| `fileUrl` | String | NOT NULL |
| `fileHash` | String | NOT NULL |
| `originalRecordId` | String | FK → medical_records, nullable |
| `isVerified` | Boolean | DEFAULT false |
| `verifiedAt` | DateTime | nullable |
| `uploadedAt` | DateTime | DEFAULT now() |

---

## 9. Security Model

| Threat | Mitigation |
|--------|-----------|
| Insurer accessing records without consent | `requireConsent()` middleware with `INSURANCE_PROVIDER` type check |
| Document forgery | SHA-256 hash comparison on every submitted document |
| Claim tampering | `claimNumber` is system-generated; claims are immutable after final decision |
| Mass record scraping | Rate limit on `/insurance/claims/:id/records` (10 req/min per provider) |
| Data inference without consent | Fraud analysis uses only data the insurer already has consent for |

---

## 10. Testing

| Test Scenario | Expected Result |
|---------------|----------------|
| Submit claim → fraud score returned | 201, fraudScore in response |
| Submit claim for same patient same dates | fraudFlags includes DUPLICATE_CLAIM |
| Request record access → patient approves | Insurer can view scoped records |
| Insurer verifies unmodified document | `isAuthentic: true` |
| Insurer verifies modified document | `isAuthentic: false` |
| Decision REJECTED without notes | 400 Validation error |
| Claim status PAID → attempt to change | 409 invalid transition |
| Insurer reads records after consent expires | 403 Forbidden |

---

*Previous Phase: [Phase 6 — QR & Emergency](./PHASE_6_QR_EMERGENCY.md)  
Next Phase: [Phase 8 — Admin Portal →](./PHASE_8_ADMIN.md)*
