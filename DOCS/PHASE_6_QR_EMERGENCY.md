# Phase 6 — QR Codes & Emergency Access

> **Phase:** 6
> **Status:** ⬜ PLANNED
> **Duration:** Week 10
> **Goal:** Patients carry a secure digital health card (QR) that gives tiered access to medical information based on who is scanning. Public scanners (anonymous) see minimum survival data only. Verified UHID doctors see full clinical details. Every single scan is permanently logged and visible on the patient's dashboard.

---

## 📋 Table of Contents

1. [Overview](#1-overview)
2. [3-Tier QR Access Model](#2-3-tier-qr-access-model)
3. [QR Generation Flow](#3-qr-generation-flow)
4. [QR Scan Audit Log — Patient Dashboard](#4-qr-scan-audit-log--patient-dashboard)
5. [QR Security Safeguards](#5-qr-security-safeguards)
6. [SOS Emergency Button](#6-sos-emergency-button)
7. [Doctor Emergency Override](#7-doctor-emergency-override)
8. [API Endpoints](#8-api-endpoints)
9. [Validation Rules](#9-validation-rules)
10. [Frontend Pages](#10-frontend-pages)
11. [Database Schema](#11-database-schema)
12. [Security Model & Threat Table](#12-security-model--threat-table)
13. [Testing](#13-testing)

---

## 1. Overview

UHID has three emergency access pathways:

| Pathway | Who Uses It | Auth Required | Logged |
|---------|------------|---------------|--------|
| **Tier 1 Public QR Scan** | Anyone — paramedic, bystander | ❌ None | ✅ Always |
| **Tier 2 Doctor QR Scan** | Verified UHID doctors only | ✅ Doctor login | ✅ Always |
| **Tier 3 Patient-Initiated Share** | Patient manually shares from app | ✅ Patient in app | ✅ Always |
| **SOS Activation** | Patient presses SOS button | ✅ Patient | ✅ Always |
| **Doctor Emergency Override** | Unconscious patient, no QR | ✅ Doctor login | ✅ Always (HIGH severity) |

> **Core Design Principle:** *Minimum Viable Emergency Data for public. Full clinical data only for verified UHID doctors. Every scan visible to the patient. No exceptions.*

---

## 2. 3-Tier QR Access Model

### 🟢 Tier 1 — Public Scan (No Login Required)

**Who:** Anyone — paramedic, bystander, stranger, non-UHID doctor
**How:** Scan QR with any camera app. No app, no account, no login needed.

**Shows ONLY:**
```
┌──────────────────────────────────────┐
│      UniHealth ID — Emergency         │
│      UHID: UH-847291                 │
├──────────────────────────────────────┤
│  🩸 Blood Group:  B+                 │
│  🚨 Critical Allergy: YES            │
│     (type is hidden for safety)      │
│  📞 Emergency Contact:               │
│     Call Meena — 98XXXXXXXX          │
├──────────────────────────────────────┤
│  ⚕️  Are you a UHID doctor?          │
│  [Scan Again with Doctor Login →]    │
└──────────────────────────────────────┘
```

**Does NOT show:** Which specific allergy, medicines, conditions, diagnoses, Aadhaar, address, insurance info.

**Why allergy type is hidden in Tier 1:**
> A bad actor who finds the patient's phone only learns *"has an allergy"* — not *what* the allergy is. A paramedic calls the emergency contact who provides the specific allergy verbally. This eliminates the threat of intentional harm while preserving emergency utility.

**Logged as:** `PUBLIC_SCAN`
**Patient notified:** SMS + push → *"Your emergency QR was scanned at 11:42 PM near Bangalore. [View Details]"*

---

### 🔵 Tier 2 — Verified UHID Doctor Scan (Login Required)

**Who:** Only doctors who are registered and verified on the UHID portal
**How:** Scan QR → automatically redirected to UHID doctor login → OTP verified → full data shown

**Shows:**
```
┌──────────────────────────────────────────┐
│  Patient: Rajesh Kumar  |  UH-847291     │
│  Age: 67  |  Gender: Male  |  B+         │
├──────────────────────────────────────────┤
│  ⚠️  ALLERGIES (CRITICAL)               │
│  • Penicillin → Anaphylaxis (SEVERE)    │
│  • Sulfa drugs → Rash (MODERATE)        │
├──────────────────────────────────────────┤
│  💊 CURRENT MEDICINES                   │
│  • Metformin 500mg — twice daily        │
│  • Amlodipine 5mg — once daily          │
├──────────────────────────────────────────┤
│  🏥 CHRONIC CONDITIONS                  │
│  • Type 2 Diabetes (E11.9)              │
│  • Hypertension (I10)                   │
├──────────────────────────────────────────┤
│  🔪 PAST SURGERIES                      │
│  • Cardiac bypass — Apollo Pune (2024)  │
├──────────────────────────────────────────┤
│  📞 Emergency Contact                   │
│  Meena (Wife) — 98XXXXXXXX              │
└──────────────────────────────────────────┘
```

**Access duration:** Read-only for 2 hours (emergency profile only — not full record files)
**Logged as:** `DOCTOR_SCAN` — doctor name, UHID doctor ID, hospital affiliation, timestamp, location
**Patient notified:** SMS + push → *"Dr. Priya Sharma (UHID: DR-001234, Manipal Hospital) scanned your emergency QR at 11:42 PM. [View Scan Log]"*

---

### 🔴 Tier 3 — Patient-Initiated Share (App Open)

**Who:** Patient manually generates a one-time share from within the app
**How:** Patient opens UHID app → taps "Generate Emergency Share" → gets a fresh QR valid for 10 minutes

**Shows:** Everything — full medical history, record files, insurance info, complete prescriptions, all contacts

**Expires:** Automatically in 10 minutes. Single use only — invalidated after first scan.
**Logged as:** `PATIENT_INITIATED` — marked as patient-confirmed share, timestamp
**Patient notified:** Push → *"Your one-time share QR was scanned by Dr. Priya Sharma."*

---

## 3. QR Generation Flow

### Static Emergency QR (Always Active)

```
Patient registers on UHID →
System auto-generates their permanent Emergency QR →
Stored in DB: qr_codes table (isEmergencyCard = true) →
QR token signed with EMERGENCY_SECRET (JWT) →
QR image generated and saved to Cloudinary →
Shown on patient dashboard as downloadable card →
Auto-rotates every 24 hours (system cron at midnight) →
Old token invalidated in Redis, new one generated
```

### One-Time Doctor Share QR (Tier 3)

```
Patient taps "Generate Emergency Share" →
Selects scope (which data) and duration →
Backend generates signed JWT:
  { patientId, scope, tier: 3, isOneTime: true, expiresAt: +10min, jti } →
Stored in Redis: qr:share:<jti> with 10-min TTL →
QR code rendered on screen →
Doctor scans → JWT sent to /qr/validate →
Backend verifies signature + Redis existence →
Access granted → Redis key deleted (one-time) →
Logged to qr_scan_logs
```

---

## 4. QR Scan Audit Log — Patient Dashboard

Every patient has a **"QR Scan History"** section on their dashboard. This is read-only for the patient — they cannot edit or delete it.

### UI Display

```
┌──────────────────────────────────────────────────────────────┐
│  🔍 My QR Scan History                    [Invalidate QR ⚡] │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  🔵  Dr. Priya Sharma                           DOCTOR SCAN  │
│      UHID: DR-001234 · Manipal Hospital, Bangalore           │
│      March 11, 2026 · 11:42 PM                               │
│      Tier 2 — Full clinical data accessed                    │
│      Location: Bangalore, Karnataka                          │
│                                                        [→]   │
│                                                                │
│  🟢  Anonymous (Public Scan)                     PUBLIC SCAN  │
│      No login · Unregistered user                            │
│      March 11, 2026 · 11:40 PM                               │
│      Tier 1 — Blood group + contact only                     │
│      Location: Bangalore, Karnataka                          │
│                                                        [→]   │
│                                                                │
│  🟡  Kavya Reddy                           INSURANCE SCAN    │
│      UHID: INS-005621 · Star Health Insurance                │
│      March 9, 2026 · 2:15 PM                                 │
│      Tier 2 — Claim verification access                      │
│      Location: Mumbai, Maharashtra                           │
│                                                        [→]   │
│                                                                │
│  🔴  PATIENT SHARE                       PATIENT INITIATED   │
│      You shared your full profile via one-time QR            │
│      March 8, 2026 · 10:00 AM                                │
│      Tier 3 — Full history shared                            │
│      Scanned by: Dr. Suresh Menon (DR-000812)                │
│                                                        [→]   │
│                                                                │
│  ⚠️   SUSPICIOUS — Rate Limit Triggered          FLAGGED     │
│      5 scans in 2 minutes from same location                 │
│      March 8, 2026 · 3:17 AM                                 │
│      Tier 1 only · Auto-locked for 1 hour                    │
│                               [View Details]  [Report Abuse] │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

### What Each Log Entry Records

| Field | Public Scan | Doctor Scan | Insurance Scan | Patient Initiated |
|-------|-------------|-------------|----------------|-------------------|
| Timestamp | ✅ | ✅ | ✅ | ✅ |
| Scanner Name | ❌ Anonymous | ✅ Full name | ✅ Full name | ✅ Name of scanner |
| Scanner UHID ID | ❌ | ✅ DR-XXXXXX | ✅ INS-XXXXXX | ✅ |
| Hospital / Org | ❌ | ✅ | ✅ | ✅ |
| Approx Location | ✅ City/State | ✅ City/State | ✅ City/State | ✅ City/State |
| Tier Accessed | ✅ Tier 1 | ✅ Tier 2 | ✅ Tier 2 | ✅ Tier 3 |
| Suspicious Flag | ✅ Auto-detect | ✅ Auto-detect | ✅ Auto-detect | ✅ Auto-detect |

---

## 5. QR Security Safeguards

### 5.1 Auto-Rotation (24 hours)

- Static emergency QR token auto-rotates every night at midnight IST
- Old JWT becomes invalid — screenshot of old QR stops working next day
- Patient never needs to do anything — fully automatic
- Rotation creates a new `qr_scan_logs` group for new day

### 5.2 Remote Invalidation (Phone Lost)

```
Ravi reports phone lost →
Opens UHID on any browser → logs in with OTP on registered number →
Dashboard → "My QR" → "Invalidate & Regenerate Now" →
All active QR tokens for this patient expired instantly in Redis →
New QR generated immediately →
SMS confirmation: "Your emergency QR has been invalidated and regenerated."
Old QR on lost phone → permanently dead
```

### 5.3 Rate Limiting

| Trigger | Action |
|---------|--------|
| Same QR scanned 5+ times in 1 hour | QR auto-locks for 1 hour |
| Lock triggers | Patient SMS + push alert immediately |
| Locked QR scanned | Returns `QR_RATE_LIMITED` error |
| Logged as | `SUSPICIOUS_SCAN` with `isSuspicious: true` |
| Patient action | Can report abuse or immediately invalidate |

### 5.4 Suspicious Activity Auto-Detection

| Pattern | System Action |
|---------|--------------|
| 5+ scans in under 5 minutes | Flag `isSuspicious = true`, notify patient via SMS |
| Scan between 2 AM – 5 AM | Flag as suspicious in log, patient sees ⚠️ badge |
| Scan location differs from patient's last known city | Flag + notify patient |
| Same IP scanning 3+ different patient QRs in 1 hour | Flag + alert Super Admin |

### 5.5 What a Phone Thief Gets

If someone steals Ravi's phone and scans the QR:

| What they scan | What they see |
|----------------|---------------|
| Lock screen QR (Tier 1) | Blood group + *"Has critical allergy: YES"* + emergency contact number |
| What they DO NOT see | Which allergy, medicines, conditions, Aadhaar, address |
| What Ravi gets instantly | SMS: *"Your QR was scanned at 11:42 PM near Bangalore"* |
| What Ravi can do | Log into UHID on any device, invalidate QR within seconds |

---

## 6. SOS Emergency Button

Patient presses the **SOS button** in the UHID app (available on home screen widget):

```
Patient presses SOS →
App captures GPS coordinates →
SOS record created in emergency_accesses table →
Parallel actions (all within 3 seconds):
  1. SMS to all emergency contacts:
     "EMERGENCY: Rajesh Kumar activated SOS.
      Location: https://maps.google.com/?q=12.97,77.59
      Time: 11:42 PM — UniHealth ID"
  2. Push notification to emergency contacts on UHID
  3. Alert to patient's primary care doctor
  4. Nearest 3 verified UHID hospitals notified (Haversine formula)
  5. Emergency Code generated: "EMG-4X9R" (valid 2 hours)
     → Any verified UHID doctor can enter this code
     → Gets temporary full-record access
  6. All actions logged to audit_logs + qr_scan_logs
```

### SOS Emergency Code

- 6-character alphanumeric: `EMG-4X9R`
- Valid for 2 hours from SOS activation
- Any verified UHID doctor at any hospital can use it
- Access logged: doctor ID, hospital, timestamp, records accessed
- Patient notified of every access after emergency period ends

---

## 7. Doctor Emergency Override

For unconscious/unresponsive patients with no QR and no SOS:

```
Doctor opens UHID → Emergency Access page →
Enters patient UHID →
Selects reason type:
  [ ] Patient unconscious / unresponsive
  [ ] Critical care — no time for consent
  [ ] Patient unable to use phone
  [ ] Other (specify, min 20 chars) →
Confirms acknowledgement checkbox:
  "I confirm this access is medically necessary.
   This action is permanently logged and will be reviewed." →
Access granted for 4 hours (read-only) →
AuditLog: action = EMERGENCY_ACCESS_OVERRIDE, severity = HIGH →
Hospital Admin notified in real-time →
Patient notified via SMS after emergency period:
  "Dr. Priya Sharma accessed your records via emergency override
   on March 11 at 11:42 PM. Reason: Patient unconscious.
   [Review Access Log]"
```

---

## 8. API Endpoints

**Base URL:** `/api/v1/qr`

---

### GET /qr/emergency/:uhid
**Tier 1 — Public, no auth required**

Returns minimum survival data only. No specific allergy names. No medicines. No conditions.

**Response (200):**
```json
{
  "success": true,
  "tier": 1,
  "data": {
    "uhid": "UH-847291",
    "bloodGroup": "B_POSITIVE",
    "hasCriticalAllergy": true,
    "emergencyContact": {
      "name": "Meena",
      "relation": "Wife",
      "phone": "+91-98XXXXXXXX"
    },
    "scannedAt": "2026-03-11T18:12:00.000Z"
  }
}
```

> Note: `hasCriticalAllergy: true` — type is intentionally omitted in Tier 1.

---

### POST /qr/scan/doctor
**Tier 2 — DOCTOR auth required**

Doctor scans QR and gets full clinical emergency profile.

**Auth:** `DOCTOR`

**Request Body:**
```json
{ "qrToken": "eyJhbGci..." }
```

**Response (200):**
```json
{
  "success": true,
  "tier": 2,
  "data": {
    "uhid": "UH-847291",
    "name": "Rajesh Kumar",
    "age": 67,
    "bloodGroup": "B_POSITIVE",
    "allergies": [
      { "name": "Penicillin", "reaction": "Anaphylaxis", "severity": "SEVERE" },
      { "name": "Sulfa drugs", "reaction": "Rash", "severity": "MODERATE" }
    ],
    "currentMedications": [
      { "name": "Metformin", "dose": "500mg", "frequency": "twice daily" },
      { "name": "Amlodipine", "dose": "5mg", "frequency": "once daily" }
    ],
    "chronicConditions": ["Type 2 Diabetes (E11.9)", "Hypertension (I10)"],
    "pastSurgeries": ["Cardiac bypass — Apollo Pune (March 2024)"],
    "emergencyContacts": [
      { "name": "Meena", "relation": "Wife", "phone": "+91-98XXXXXXXX" }
    ],
    "accessExpiresAt": "2026-03-11T20:12:00.000Z"
  }
}
```

---

### POST /qr/generate
**Tier 3 — PATIENT generates one-time share**

**Auth:** `PATIENT`

**Request Body:**
```json
{
  "scope": ["LAB_REPORT", "PRESCRIPTION", "CLINICAL_NOTE"],
  "durationMinutes": 10,
  "label": "For Dr. Suresh — March 11"
}
```

**Response (201):**
```json
{
  "success": true,
  "tier": 3,
  "data": {
    "qrId": "clxxx...",
    "qrToken": "eyJhbGci...",
    "qrImageUrl": "data:image/png;base64,...",
    "expiresAt": "2026-03-11T18:22:00.000Z",
    "isOneTime": true
  }
}
```

---

### GET /qr/scan-logs
**Patient views their QR scan history**

**Auth:** `PATIENT`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "clyyy...",
      "tier": 2,
      "scanType": "DOCTOR_SCAN",
      "scannerName": "Dr. Priya Sharma",
      "scannerUhidId": "DR-001234",
      "organization": "Manipal Hospital Bangalore",
      "location": "Bangalore, Karnataka",
      "isSuspicious": false,
      "scannedAt": "2026-03-11T18:12:00.000Z"
    },
    {
      "id": "clzzz...",
      "tier": 1,
      "scanType": "PUBLIC_SCAN",
      "scannerName": null,
      "scannerUhidId": null,
      "organization": null,
      "location": "Bangalore, Karnataka",
      "isSuspicious": false,
      "scannedAt": "2026-03-11T18:10:00.000Z"
    }
  ]
}
```

---

### POST /qr/invalidate
**Patient immediately invalidates all active QR tokens**

**Auth:** `PATIENT`

**Request Body:**
```json
{ "reason": "Phone lost or stolen" }
```

**Response (200):**
```json
{
  "success": true,
  "message": "All active QR tokens invalidated. New emergency QR generated.",
  "data": {
    "invalidatedCount": 2,
    "newQrGeneratedAt": "2026-03-11T18:15:00.000Z"
  }
}
```

---

### POST /qr/sos
**Patient activates SOS**

**Auth:** `PATIENT`

**Request Body:**
```json
{
  "latitude": 12.9716,
  "longitude": 77.5946,
  "message": "Chest pain, cannot breathe"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "SOS activated. Emergency contacts and nearby hospitals notified.",
  "data": {
    "sosId": "clxxx...",
    "emergencyCode": "EMG-4X9R",
    "emergencyCodeExpiresAt": "2026-03-11T20:12:00.000Z",
    "notifiedContacts": 2,
    "notifiedHospitals": 3
  }
}
```

---

### POST /emergency/override
**Doctor emergency override — unconscious patient**

**Auth:** `DOCTOR`

**Request Body:**
```json
{
  "patientUhid": "UH-847291",
  "reasonType": "PATIENT_UNCONSCIOUS",
  "reason": "Patient brought in unconscious after road accident, critical care required immediately",
  "acknowledgement": true
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessGranted": true,
    "expiresAt": "2026-03-11T22:12:00.000Z",
    "auditLogId": "clyyy..."
  }
}
```

---

## 9. Validation Rules

| Rule | Constraint |
|------|-----------|
| Tier 1 public scan | No auth — always allowed, always logged |
| Tier 2 doctor scan | Must have valid DOCTOR JWT — unverified doctors rejected |
| Tier 3 scope | Must be valid subset of `ConsentScope` enum values |
| Tier 3 duration | 5–60 minutes only |
| SOS lat/lng | Valid GPS coordinates required |
| Override reason | Minimum 20 characters |
| Override acknowledgement | Must be explicitly `true` |
| Emergency code | Valid 6-char alphanumeric, not expired, max 3 attempts (then 15-min lockout) |
| QR rate limit | Max 5 scans per QR per hour — auto-lock on breach |

---

## 10. Frontend Pages

### 10.1 Patient QR Dashboard (`/patient/qr`)

**Section A — My Emergency QR**
- Live preview of current emergency QR image
- "Download as PNG" button
- "Invalidate & Regenerate" button (with confirmation dialog)
- Shows time until next auto-rotation

**Section B — QR Scan History** ← NEW
- Chronological list of all QR scans
- Filter by: All / Doctor / Public / Suspicious
- Each entry shows: scanner name, org, tier, location, timestamp
- ⚠️ badge on suspicious entries
- "Report Abuse" button on suspicious entries
- "Invalidate QR" quick action on suspicious entries

**Section C — Generate One-Time Share**
- Scope selector (checkboxes per record type)
- Duration picker (5 / 10 / 30 / 60 minutes)
- Label input (optional)
- "Generate QR" → shows QR on screen, countdown timer
- Auto-expires, single-use only

**Section D — SOS Settings**
- Emergency contacts list (add/edit/remove)
- Large red SOS test button (with "This is a test" flag)
- SOS history (last 5 activations)

### 10.2 Doctor QR Scanner (`/doctor/scan`)

- Camera view with QR frame overlay
- Manual token entry fallback
- On Tier 2 success: Full patient emergency card shown (see Tier 2 data above)
- On Tier 1 redirect: *"This QR requires doctor login — you are logged in. Fetching full data..."*
- On error: Specific message — Expired / Used / Rate-limited / Invalid

---

## 11. Database Schema

### `qr_codes` table (updated)

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | String (CUID) | PK | |
| `patientId` | String | FK → patients | |
| `jti` | String | UNIQUE NOT NULL | JWT ID — Redis-backed |
| `scope` | ConsentScope[] | NOT NULL | Data accessible |
| `tier` | Int | NOT NULL DEFAULT 1 | 1 = public, 2 = doctor, 3 = patient-share |
| `isOneTime` | Boolean | DEFAULT false | Tier 3 always true |
| `isEmergencyCard` | Boolean | DEFAULT false | Permanent static QR |
| `label` | String | nullable | Patient-assigned label |
| `expiresAt` | DateTime | NOT NULL | |
| `usedAt` | DateTime | nullable | First scan time |
| `usedByDoctorId` | String | nullable | FK → doctors.id |
| `isRevoked` | Boolean | DEFAULT false | |
| `revokedAt` | DateTime | nullable | |
| `revokedReason` | String | nullable | "PHONE_LOST", "SUSPICIOUS", "MANUAL" |
| `createdAt` | DateTime | DEFAULT now() | |

---

### `qr_scan_logs` table ← NEW TABLE

> Every QR scan — public, doctor, or patient-initiated — creates a row here.
> This is the data shown on the patient's QR Scan History dashboard.
> **INSERT-ONLY. Never updated or deleted.**

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | String (CUID) | PK | |
| `qrCodeId` | String | FK → qr_codes | Which QR was scanned |
| `patientId` | String | FK → patients | Whose QR |
| `tier` | Int | NOT NULL | 1, 2, or 3 |
| `scanType` | QrScanType | NOT NULL | Enum — see below |
| `scannedById` | String | nullable | FK → users — null if public scan |
| `scannerName` | String | nullable | Snapshot at scan time |
| `scannerUhidId` | String | nullable | DR-XXXXXX or INS-XXXXXX |
| `organization` | String | nullable | Hospital or insurance company |
| `ipAddress` | String | nullable | Hashed for privacy |
| `location` | String | nullable | City, State (from IP geolocation) |
| `isSuspicious` | Boolean | DEFAULT false | Auto-flagged |
| `suspicionReason` | String | nullable | e.g. "RATE_LIMIT_EXCEEDED" |
| `reportedByPatient` | Boolean | DEFAULT false | Patient manually reported |
| `scannedAt` | DateTime | DEFAULT now() | |

**QrScanType enum:**
```
PUBLIC_SCAN          — Tier 1, no login
DOCTOR_SCAN          — Tier 2, verified UHID doctor
INSURANCE_SCAN       — Tier 2, verified insurance user
PATIENT_INITIATED    — Tier 3, patient generated one-time share
SUSPICIOUS_SCAN      — Auto-flagged rate-limit breach
```

---

### `emergency_accesses` table (unchanged)

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | String (CUID) | PK | |
| `patientId` | String | FK → patients | |
| `accessedByDoctorId` | String | nullable FK → doctors | |
| `accessType` | EmergencyAccessType | NOT NULL | Enum |
| `reason` | String | nullable | Doctor-entered reason |
| `reasonType` | String | nullable | e.g. "PATIENT_UNCONSCIOUS" |
| `latitude` | Float | nullable | SOS location |
| `longitude` | Float | nullable | SOS location |
| `emergencyCode` | String | nullable | e.g. "EMG-A4X2" |
| `emergencyCodeExpiresAt` | DateTime | nullable | |
| `expiresAt` | DateTime | NOT NULL | Auto-revoked after |
| `isActive` | Boolean | DEFAULT true | |
| `cancelledAt` | DateTime | nullable | |
| `createdAt` | DateTime | DEFAULT now() | |

---

## 12. Security Model & Threat Table

| Threat | How It Happens | Mitigation |
|--------|---------------|-----------|
| **Phone stolen → QR scanned** | Bad actor finds phone, scans QR | Tier 1 shows only blood group + *"has allergy: YES"* — allergy type hidden. Patient alerted by SMS instantly. Can invalidate QR in seconds from any device. |
| **Allergy-based harm** | Attacker learns specific allergy to cause harm | Allergy TYPE never shown in Tier 1. Contact number shown instead — paramedic calls for specifics. |
| **QR screenshot abuse** | QR screenshot saved, used later | 24-hour auto-rotation. Old QR dead by next day. |
| **Forged QR** | Attacker creates fake QR | JWT signed with `EMERGENCY_SECRET` server-side only. Signature verification rejects all forged tokens. |
| **QR replay attack** | Valid QR reused multiple times | One-time QRs deleted from Redis on first scan. All QRs validated against Redis (not just JWT expiry). |
| **Unknown doctor scanning** | Non-UHID doctor scans, gets full data | Full data (Tier 2) only served to authenticated, verified UHID doctors. Non-logged-in users get Tier 1 only. |
| **Emergency override abuse** | Doctor abuses override for non-emergency | Every override logged to `audit_logs` with `CRITICAL` severity. Hospital Admin sees all overrides in real-time. Patient notified after. Escalation path to Medical Council. |
| **Rate-limit bypass** | Attacker scans many times quickly | 5 scans/hour limit per QR. Auto-lock + immediate patient SMS on breach. Logged as SUSPICIOUS. |
| **SOS spam** | Malicious SOS activations | Rate limit: 1 SOS per 10 minutes per patient. |
| **IP scraping** | Attacker scans many different patient QRs | Same IP scanning 3+ patient QRs in 1 hour → Super Admin alerted. |

---

## 13. Testing

| Test Scenario | Expected Result |
|---------------|----------------|
| Anonymous user scans QR (Tier 1) | 200 — blood group + hasCriticalAllergy: true + contact only |
| Allergy name present in Tier 1 response | ❌ FAIL — must never appear |
| Verified UHID doctor scans (Tier 2) | 200 — full allergies, medicines, conditions |
| Non-UHID user tries Tier 2 endpoint | 401 Unauthorized |
| Patient generates one-time QR, doctor scans | 200 first scan. 400 QR_USED on second scan. |
| Expired QR scanned | 400 QR_EXPIRED |
| Patient invalidates QR → old QR scanned | 400 QR_REVOKED |
| QR scanned 6 times in 1 hour | 429 QR_RATE_LIMITED, patient SMS triggered |
| Scan logged in patient dashboard | GET /qr/scan-logs returns entry with correct tier/type |
| Public scan generates patient notification | SMS + push sent within 5 seconds |
| Doctor scan generates patient notification | SMS + push with doctor name + hospital within 5 seconds |
| Doctor emergency override < 20 char reason | 400 Validation error |
| Doctor override on patient | AuditLog row with severity = HIGH created |
| Patient activates SOS | Emergency code generated, 3 hospitals notified |
| Suspicious scan (5 in 2 min) | isSuspicious = true in scan log, patient alerted |

---

*Previous Phase: [Phase 5 — AI Features](./PHASE_5_AI.md)
Next Phase: [Phase 7 — Insurance Portal →](./PHASE_7_INSURANCE.md)*
