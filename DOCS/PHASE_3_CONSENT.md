# Phase 3 — Consent Management System

> **Phase:** 3  
> **Status:** ⬜ PLANNED  
> **Duration:** Week 6  
> **Goal:** Patients have full control over who accesses their medical data. Doctors and insurance providers must request access. All access requires patient OTP approval. Access can be time-limited or revoked at any time.

---

## 📋 Table of Contents

1. [Overview](#1-overview)
2. [Consent Lifecycle](#2-consent-lifecycle)
3. [OTP Verification](#3-otp-verification)
4. [Real-Time Notifications](#4-real-time-notifications)
5. [API Endpoints](#5-api-endpoints)
6. [Validation Rules](#6-validation-rules)
7. [Frontend Pages](#7-frontend-pages)
8. [Database Schema](#8-database-schema)
9. [Security Model](#9-security-model)
10. [Testing](#10-testing)

---

## 1. Overview

The consent system is the **privacy backbone** of UHID. No doctor, insurance provider, or any third party can access a patient's medical records without explicit patient consent — except in verified medical emergencies (covered in Phase 6).

```
CONSENT REQUEST FLOW:
──────────────────────────────────────────────────────────────────────
Doctor/Insurance requests access →
System sends OTP to patient phone/email →
Patient receives real-time notification (Socket.io) →
Patient enters OTP to approve OR clicks Deny →
Consent record created (ACTIVE or DENIED) →
Doctor/Insurance gets notified of decision →
Access granted for specified scope + duration

CONSENT REVOCATION:
──────────────────────────────────────────────────────────────────────
Patient visits Consent Management page →
Clicks Revoke on an active consent →
Consent status updated to REVOKED →
Redis session for that consent deleted →
Doctor/Insurance gets real-time notification →
All subsequent API calls blocked

CONSENT EXPIRY:
──────────────────────────────────────────────────────────────────────
Cron job runs every 15 minutes →
Finds consents where expiresAt < now() AND status = ACTIVE →
Updates status to EXPIRED →
Clears Redis session →
AuditLog entry created
```

---

## 2. Consent Lifecycle

### 2.1 Status Flow

```
PENDING ──(patient approves)──► ACTIVE ──(time expires)──► EXPIRED
   │                               │
   │                               └──(patient revokes)──► REVOKED
   │
   └──(patient denies)──► DENIED
```

### 2.2 Consent Scope

When requesting access, the requester specifies which categories of records they need:

| Scope Value | Description |
|-------------|-------------|
| `ALL` | Complete medical history |
| `LAB_REPORT` | All lab reports |
| `IMAGING` | All imaging reports |
| `PRESCRIPTION` | All prescriptions |
| `DISCHARGE_SUMMARY` | Discharge summaries |
| `VACCINATION` | Vaccination records |
| `ECG` | ECG reports |
| `CLINICAL_NOTES` | Doctor's clinical notes |
| `EMERGENCY_ONLY` | Emergency profile only (blood group, allergies) |

Multiple scopes can be requested: `["LAB_REPORT", "PRESCRIPTION"]`

### 2.3 Consent Duration Options

| Option | Duration | Use Case |
|--------|----------|----------|
| 2 hours | 2 hours | Quick consultation same-day |
| 24 hours | 24 hours | Full-day hospital visit |
| 7 days | 7 days | Post-surgery follow-up period |
| 30 days | 30 days | Insurance claim review |
| Permanent | No expiry | Primary doctor designation |
| Custom | 1–365 days | Patient-specified |

---

## 3. OTP Verification

### 3.1 OTP for Consent Approval

When a patient approves a consent request, they must verify with OTP:

```
Patient sees pending request →
Clicks "Approve" →
System generates 6-digit OTP →
Sends via SMS (MSG91) + Email →
Stores in Redis: otp:consent:<consentId> with 10-minute TTL →
Patient enters OTP →
Backend validates OTP →
On success: consent status → ACTIVE, OTP deleted from Redis →
On failure (3 attempts): lock for 5 minutes
```

### 3.2 OTP Security Rules

| Rule | Value |
|------|-------|
| OTP length | 6 digits |
| OTP TTL | 10 minutes |
| Max attempts | 3 per OTP |
| Lock duration | 5 minutes after 3 failures |
| Delivery | SMS via MSG91 (primary) + Email (fallback) |
| Redis key | `otp:consent:<consentId>` |

---

## 4. Real-Time Notifications

### 4.1 Socket.io Events

**Server → Patient (when doctor requests access):**
```json
{
  "event": "consent:request",
  "data": {
    "consentId": "clxxx...",
    "requestedBy": {
      "type": "DOCTOR",
      "name": "Dr. Anita Desai",
      "hospital": "Fortis Hospital, Mumbai",
      "specialty": "Cardiology"
    },
    "scope": ["LAB_REPORT", "PRESCRIPTION"],
    "purpose": "Cardiac Consultation",
    "requestedAt": "2026-02-26T09:15:00.000Z"
  }
}
```

**Server → Doctor (when patient approves):**
```json
{
  "event": "consent:approved",
  "data": {
    "consentId": "clxxx...",
    "patientUhid": "UH-847291",
    "expiresAt": "2026-02-27T09:15:00.000Z",
    "scope": ["LAB_REPORT", "PRESCRIPTION"]
  }
}
```

**Server → Doctor (when patient denies):**
```json
{
  "event": "consent:denied",
  "data": {
    "consentId": "clxxx...",
    "message": "Patient has denied the access request."
  }
}
```

**Server → Doctor (when patient revokes active consent):**
```json
{
  "event": "consent:revoked",
  "data": {
    "consentId": "clxxx...",
    "message": "Patient has revoked your access.",
    "revokedAt": "2026-02-26T14:30:00.000Z"
  }
}
```

### 4.2 Push Notification (In-App)

All consent events also create an entry in a notifications table and show in the in-app notification bell:

| Event | Patient Notification | Doctor/Insurance Notification |
|-------|---------------------|-------------------------------|
| Request received | "Dr. Anita Desai is requesting access to your records" | — |
| Patient approves | — | "Rajesh Kumar has approved your access request" |
| Patient denies | — | "Access request denied by patient" |
| Consent expires | "Dr. Suresh Menon's access to your records has expired" | "Your access to patient records has expired" |
| Consent revoked | — | "Patient has revoked your record access" |

---

## 5. API Endpoints

**Base URL:** `http://localhost:5000/api/v1/consents`

### POST /consents/request

Doctor or Insurance requests access to a patient's records.

**Auth:** `DOCTOR` | `INSURANCE_PROVIDER`

**Request Body:**
```json
{
  "patientUhid": "UH-847291",
  "scope": ["LAB_REPORT", "PRESCRIPTION"],
  "purpose": "Cardiac consultation - new patient referral",
  "isTemporary": true,
  "durationHours": 24
}
```

**Validation:**
- `patientUhid` must exist
- `scope` must be non-empty array of valid values
- `purpose` 10–500 chars
- `durationHours` 1–8760 (1 year max); required if `isTemporary: true`
- Cannot create duplicate PENDING request from same doctor for same patient

**Response (201):**
```json
{
  "success": true,
  "message": "Access request sent. Patient has been notified.",
  "data": {
    "consentId": "clxxx...",
    "status": "PENDING",
    "requestedAt": "2026-02-26T09:15:00.000Z"
  }
}
```

---

### POST /consents/approve

Patient approves a pending consent request.

**Auth:** `PATIENT`

**Request Body:**
```json
{
  "consentId": "clxxx...",
  "otp": "847291",
  "durationHours": 24
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Access approved successfully.",
  "data": {
    "consentId": "clxxx...",
    "status": "ACTIVE",
    "expiresAt": "2026-02-27T09:15:00.000Z",
    "grantedTo": "Dr. Anita Desai - Fortis Hospital"
  }
}
```

---

### POST /consents/deny

Patient denies a pending consent request.

**Auth:** `PATIENT`

**Request Body:**
```json
{ "consentId": "clxxx..." }
```

**Response (200):**
```json
{ "success": true, "message": "Access request denied." }
```

---

### DELETE /consents/:id (Revoke)

Patient revokes an active consent.

**Auth:** `PATIENT` (must be the patient who owns the consent)

**Response (200):**
```json
{
  "success": true,
  "message": "Access revoked. Dr. Anita Desai can no longer view your records.",
  "data": { "revokedAt": "2026-02-26T14:30:00.000Z" }
}
```

---

### GET /consents/active

Get all active consents for the authenticated patient.

**Auth:** `PATIENT`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx...",
      "grantedToType": "DOCTOR",
      "grantedTo": {
        "name": "Dr. Suresh Menon",
        "hospital": "Apollo Hospital, Chennai",
        "specialty": "General Medicine"
      },
      "scope": ["ALL"],
      "purpose": "Primary Care Doctor",
      "isTemporary": false,
      "expiresAt": null,
      "grantedAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### GET /consents/pending

Get all pending consent requests waiting for patient approval.

**Auth:** `PATIENT`

---

### GET /consents/history

Full consent history (all statuses) for audit.

**Auth:** `PATIENT`

---

### GET /consents/check/:uhid

Doctor/Insurance checks if they have active consent for a specific patient.

**Auth:** `DOCTOR` | `INSURANCE_PROVIDER`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "hasAccess": true,
    "consentId": "clxxx...",
    "scope": ["LAB_REPORT", "PRESCRIPTION"],
    "expiresAt": "2026-02-27T09:15:00.000Z",
    "expiresIn": "18 hours"
  }
}
```

---

## 6. Validation Rules

| Rule | Description |
|------|-------------|
| One pending request | Cannot create a second PENDING request while one exists from the same requester for the same patient |
| Own consent only | Patients can only approve/deny/revoke their OWN consents |
| Active consent | Doctor/Insurance can only view records if consent is `ACTIVE` (not PENDING, EXPIRED, REVOKED, DENIED) |
| Scope enforcement | Even with consent, API only returns records within the approved scope |
| Expiry enforcement | Consent auto-expires at `expiresAt`. Redis TTL ensures server-side enforcement |
| Hospital verification | Doctor must belong to a verified hospital to request consent |

---

## 7. Frontend Pages

### 7.1 Consent Management Page (`/patient/consent`)

**Section: Active Permissions**
- Cards for each active consent
- Shows: requester name, hospital/company, scope, expiry date/time
- "Time remaining" countdown badge
- **Actions:** Modify duration | Revoke (with confirmation modal)

**Section: Pending Requests**
- Cards for each pending consent request
- Shows: who is requesting, what scope, why (purpose)
- Timestamp "Requested X minutes ago"
- **Actions:** 
  - ✅ Approve (triggers OTP modal)
  - ❌ Deny
  - ⏰ Approve for limited time (24h quick option)

**OTP Modal (on Approve):**
- "OTP sent to +91-XXXXXXXX and your email"
- 6-digit OTP input boxes
- Countdown timer (10 minutes)
- Resend button (enabled after 60 seconds)
- Error state on wrong OTP (shows attempts remaining)

**Section: Access History**
- Timeline of all past consents (approved, denied, revoked, expired)
- Filterable by requester name, date, status

### 7.2 Doctor — Request Access Flow

On Patient Lookup page, if no active consent exists:
- "Request Access" button
- Modal: select scope checkboxes, enter purpose, select duration
- Submit → Patient notified → Status shows "Pending..."
- When approved → Status changes to "Active ✅" in real-time

---

## 8. Database Schema

### `consents` table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String (CUID) | PK | |
| `patientId` | String | FK → patients | Patient who owns this consent |
| `grantedToType` | ConsentGrantedToType | NOT NULL | `DOCTOR` or `INSURANCE_PROVIDER` |
| `doctorId` | String | FK → doctors, nullable | Set if grantedToType=DOCTOR |
| `insuranceProviderId` | String | FK → insurance_providers, nullable | Set if grantedToType=INSURANCE |
| `scope` | String[] | NOT NULL | Array of allowed record types |
| `purpose` | String | NOT NULL | Reason for access request |
| `status` | ConsentStatus | DEFAULT PENDING | Current state |
| `isTemporary` | Boolean | DEFAULT true | Permanent or time-limited |
| `durationHours` | Int | nullable | Duration in hours (if temporary) |
| `expiresAt` | DateTime | nullable | Calculated from durationHours |
| `otpVerified` | Boolean | DEFAULT false | Whether OTP was used to approve |
| `otpVerifiedAt` | DateTime | nullable | When OTP was verified |
| `requestedAt` | DateTime | DEFAULT now() | When request was made |
| `grantedAt` | DateTime | nullable | When patient approved |
| `revokedAt` | DateTime | nullable | When patient revoked |

### Indexes

```sql
CREATE INDEX idx_consents_patient  ON consents(patientId);
CREATE INDEX idx_consents_doctor   ON consents(doctorId);
CREATE INDEX idx_consents_status   ON consents(status);
CREATE INDEX idx_consents_expires  ON consents(expiresAt);
```

---

## 9. Security Model

| Threat | Mitigation |
|--------|-----------|
| Doctor accessing without consent | `requireConsent()` middleware on all patient record endpoints |
| Replaying old OTPs | OTP deleted from Redis after single use |
| OTP brute force | 3-attempt limit, 5-minute lockout |
| Consent scope bypass | Service layer filters records by consent scope before returning |
| Permanent access abuse | Patients can revoke permanent consents at any time |
| Consent after expiry | Redis TTL + cron job enforce expiry server-side |
| Forging consent | Consent tied to DB record with patient's own userId |

---

## 10. Testing

| Test Scenario | Expected Result |
|---------------|----------------|
| Doctor requests access → patient approves OTP | Consent ACTIVE, doctor can view records |
| Doctor requests access → patient denies | Consent DENIED, doctor gets 403 |
| Doctor requests access → patient ignores → 24h passes | Consent EXPIRED by cron |
| Patient revokes active consent | Consent REVOKED, doctor's next request returns 403 |
| Wrong OTP entered 3 times | Account locked for 5 minutes |
| Doctor with PENDING consent tries to access records | 403 Forbidden |
| Doctor requests with scope `["LAB_REPORT"]` → tries to access prescription | 403 Forbidden |
| Duplicate pending request from same doctor | 409 Conflict |

---

*Previous Phase: [Phase 2 — Records](./PHASE_2_RECORDS.md)  
Next Phase: [Phase 4 — Doctor Portal & Pharma-Check →](./PHASE_4_CLINICAL.md)*
