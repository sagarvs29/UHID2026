# Phase 8 — Admin Portal & Audit System

> **Phase:** 8  
> **Status:** ⬜ PLANNED  
> **Duration:** Week 12  
> **Goal:** Hospital admins manage their staff and view analytics. Super admins oversee the entire platform. Every sensitive action is permanently logged. Admins can search, filter, and export audit logs for compliance and investigation purposes.

---

## 📋 Table of Contents

1. [Overview](#1-overview)
2. [Role Hierarchy](#2-role-hierarchy)
3. [Hospital Admin Features](#3-hospital-admin-features)
4. [Super Admin Features](#4-super-admin-features)
5. [Audit Log System](#5-audit-log-system)
6. [API Endpoints](#6-api-endpoints)
7. [Validation Rules](#7-validation-rules)
8. [Frontend Pages](#8-frontend-pages)
9. [Database Schema](#9-database-schema)
10. [Security Model](#10-security-model)
11. [Testing](#11-testing)

---

## 1. Overview

```
ADMIN HIERARCHY:
────────────────────────────────────────────────────────────────────
SuperAdmin (platform-wide)
  └── Can verify/deactivate any Hospital
  └── Can impersonate any HospitalAdmin (read-only)
  └── Sees all audit logs across all hospitals
  └── Views platform-wide analytics

HospitalAdmin (one hospital)
  └── Manages staff (doctors + staff) of their hospital
  └── Approves pending staff verifications
  └── Views their hospital's analytics + audit logs
  └── Sees emergency override notifications
```

---

## 2. Role Hierarchy

| Role | Scope | Created By |
|------|-------|-----------|
| `SUPER_ADMIN` | Platform-wide | System/Seed script |
| `HOSPITAL_ADMIN` | Single hospital | Super Admin |
| `DOCTOR` | Single hospital | Hospital Admin |
| `HOSPITAL_STAFF` | Single hospital | Hospital Admin |
| `PATIENT` | Self | Self-registration |
| `INSURANCE_PROVIDER` | Self | Self-registration + Super Admin approval |

---

## 3. Hospital Admin Features

### 3.1 Staff Management

**Pending Verifications Queue:**
- List of doctors/staff who registered and are awaiting verification
- Shows: Name, role, license number, NMC/state registration number, joined date
- Actions: **Verify** | **Reject** (with reason) | **Request More Info**

**Verified Staff List:**
- All active staff in this hospital
- Shows: Name, role, specialty, last login
- Actions: **Deactivate** | **Change Department** | **View Activity**

**Staff Profile:**
- Full staff details: qualifications, registration numbers, uploaded certificates
- Activity log for this staff member

### 3.2 Hospital Analytics Dashboard

| Metric | Description |
|--------|-------------|
| Total Patients | All patients who have been registered at this hospital |
| Records Uploaded (30d) | Files uploaded by hospital staff this month |
| Prescriptions Issued (30d) | Prescriptions written by doctors this month |
| Consents Pending | Pending consent requests from this hospital's doctors |
| Emergency Overrides (30d) | Count of emergency overrides used by doctors |
| AI Reports Generated (30d) | Report decoder + clinical summary usage |

Charts:
- Records uploaded per day (last 30 days) — bar chart
- Top 5 record types uploaded — pie chart
- Doctor activity heatmap

### 3.3 Emergency Override Notifications

Whenever a doctor in this hospital uses an emergency override:
- Real-time notification in admin dashboard
- Shows: Doctor name, patient UHID, reason, timestamp
- Admin must mark as "Reviewed" within 48 hours
- Unreviewed overrides show as a badge on admin header

---

## 4. Super Admin Features

### 4.1 Hospital Management

- List of all registered hospitals with: name, city, NABH status, admin, staff count
- Actions: **Verify Hospital** | **Suspend** | **View Analytics**
- Add new hospital (for hospitals without self-registration)

### 4.2 Platform Analytics

| Metric | Description |
|--------|-------------|
| Total Users | Breakdown by role |
| Total Records | Count + total storage used |
| AI API Cost (30d) | OpenAI/Gemini spend |
| Active Consents | Across all patients |
| Claims Processed | Total + breakdown by status |
| SOS Events (30d) | Count of SOS activations |

### 4.3 Insurance Provider Management

- Approve or reject new insurance provider registrations
- Suspend/reactivate providers
- View their claim and consent activity

---

## 5. Audit Log System

### 5.1 What Is Logged

Every sensitive action in UHID creates an AuditLog entry. The `AuditAction` enum has 40+ values:

| Category | Actions Logged |
|----------|---------------|
| **Auth** | `LOGIN`, `LOGOUT`, `FAILED_LOGIN`, `PASSWORD_RESET`, `EMAIL_VERIFIED` |
| **Records** | `RECORD_UPLOADED`, `RECORD_VIEWED`, `RECORD_DOWNLOADED`, `RECORD_DELETED` |
| **Consent** | `CONSENT_REQUESTED`, `CONSENT_APPROVED`, `CONSENT_DENIED`, `CONSENT_REVOKED`, `CONSENT_EXPIRED` |
| **Prescriptions** | `PRESCRIPTION_CREATED`, `PRESCRIPTION_VIEWED`, `PHARMA_CHECK_OVERRIDE` |
| **Emergency** | `EMERGENCY_OVERRIDE`, `QR_GENERATED`, `QR_USED`, `QR_REVOKED`, `SOS_ACTIVATED` |
| **Admin** | `STAFF_VERIFIED`, `STAFF_DEACTIVATED`, `HOSPITAL_VERIFIED`, `HOSPITAL_SUSPENDED` |
| **Insurance** | `CLAIM_SUBMITTED`, `CLAIM_DECISION`, `RECORD_VERIFIED` |
| **AI** | `AI_REPORT_GENERATED`, `AI_SUMMARY_GENERATED` |

### 5.2 Audit Log Entry Structure

```json
{
  "id": "clxxx...",
  "action": "EMERGENCY_OVERRIDE",
  "severity": "HIGH",
  "actorId": "cldoc...",
  "actorRole": "DOCTOR",
  "actorName": "Dr. Suresh Menon",
  "targetId": "clpat...",
  "targetType": "PATIENT",
  "targetUhid": "UH-847291",
  "hospitalId": "clhos...",
  "metadata": {
    "reason": "Patient unconscious in ER, needs critical care review",
    "reasonType": "CRITICAL_CARE",
    "accessDuration": "4 hours"
  },
  "ipAddress": "103.45.67.89",
  "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0...)",
  "createdAt": "2026-02-26T09:15:00.000Z"
}
```

### 5.3 Audit Log Filters

| Filter | Type | Description |
|--------|------|-------------|
| `action` | Enum / multi-select | Filter by specific action(s) |
| `actorRole` | Enum | Filter by who performed the action |
| `targetUhid` | String | All actions on a specific patient |
| `severity` | Enum | LOW / MEDIUM / HIGH / CRITICAL |
| `hospitalId` | String | (Super Admin only) filter by hospital |
| `dateFrom` / `dateTo` | DateTime | Date range |
| `search` | String | Search actor name, target UHID, IP |

### 5.4 Audit Log Export

- CSV export of filtered results
- PDF report for compliance (formatted)
- Maximum export: 50,000 rows per request
- Export action itself is logged

---

## 6. API Endpoints

**Base URL:** `http://localhost:5000/api/v1/admin`

### GET /admin/pending-verifications

Get list of staff pending verification.

**Auth:** `HOSPITAL_ADMIN`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx...",
      "name": "Dr. Ananya Sharma",
      "role": "DOCTOR",
      "specialty": "Cardiology",
      "licenseNumber": "MCI-2019-047382",
      "registeredAt": "2026-02-25T10:00:00.000Z",
      "documents": [
        { "type": "MEDICAL_DEGREE", "url": "https://..." },
        { "type": "REGISTRATION_CERTIFICATE", "url": "https://..." }
      ]
    }
  ]
}
```

---

### PATCH /admin/verify-staff/:userId

Verify a staff member.

**Auth:** `HOSPITAL_ADMIN`

**Request Body:**
```json
{
  "action": "VERIFY",
  "notes": "Documents verified. MBBS degree and MCI registration confirmed."
}
```

Valid actions: `VERIFY` | `REJECT` | `REQUEST_MORE_INFO`

---

### PATCH /admin/deactivate-staff/:userId

Deactivate a staff member.

**Auth:** `HOSPITAL_ADMIN`

**Request Body:**
```json
{ "reason": "Employment terminated." }
```

---

### GET /admin/analytics

Get hospital analytics.

**Auth:** `HOSPITAL_ADMIN`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalPatients": 4820,
    "recordsUploadedThisMonth": 1243,
    "prescriptionsIssuedThisMonth": 892,
    "pendingConsents": 14,
    "emergencyOverridesThisMonth": 2,
    "aiReportsThisMonth": 337,
    "trends": {
      "recordsPerDay": [
        { "date": "2026-02-01", "count": 42 },
        { "date": "2026-02-02", "count": 38 }
      ]
    }
  }
}
```

---

### GET /admin/audit-logs

Get audit logs with filters.

**Auth:** `HOSPITAL_ADMIN` (own hospital only) | `SUPER_ADMIN` (all)

**Query Params:** `?action=EMERGENCY_OVERRIDE&severity=HIGH&dateFrom=2026-01-01&page=1&limit=50`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "total": 127,
    "page": 1,
    "limit": 50,
    "logs": [ /* array of AuditLog entries */ ]
  }
}
```

---

### GET /admin/audit-logs/export

Export audit logs as CSV.

**Auth:** `HOSPITAL_ADMIN` | `SUPER_ADMIN`

**Query Params:** Same filters as above

**Response:** `Content-Type: text/csv` file download

---

### GET /admin/super/hospitals

[Super Admin] List all hospitals.

**Auth:** `SUPER_ADMIN`

---

### PATCH /admin/super/hospitals/:id/verify

[Super Admin] Verify a hospital.

**Auth:** `SUPER_ADMIN`

---

### GET /admin/super/analytics

[Super Admin] Platform-wide analytics.

**Auth:** `SUPER_ADMIN`

---

## 7. Validation Rules

| Rule | Description |
|------|-------------|
| Verify action | Must be `VERIFY`, `REJECT`, or `REQUEST_MORE_INFO` |
| Reject reason | Required for `REJECT` (min 10 chars) |
| Deactivate reason | Required (min 10 chars) |
| Audit log export | Max date range: 365 days per export |
| Hospital admin scope | Can only manage staff within own hospital |
| Super admin only | `/admin/super/*` endpoints reject non-`SUPER_ADMIN` tokens |

---

## 8. Frontend Pages

### 8.1 Hospital Admin Dashboard (`/admin/dashboard`)

- KPI cards (stats)
- "Pending Verifications" alert card with count
- Recent audit log preview (last 10 entries)
- Emergency overrides requiring review (badge count)
- Charts: records trend, top record types

### 8.2 Staff Management (`/admin/staff`)

- Two tabs: **Pending** | **Active Staff**
- Pending tab: each card shows documents, verify/reject buttons
- Active tab: searchable table with filters (by role, specialty)
- Click row → Staff detail page
- Deactivate button with confirmation modal

### 8.3 Audit Log Viewer (`/admin/audit-logs`)

- Filter bar: action, role, date range, severity, search
- Table with columns: Time | Actor | Action | Target | Severity | IP
- Row click → full JSON detail drawer
- Severity color-coding: LOW (grey) / MEDIUM (blue) / HIGH (orange) / CRITICAL (red)
- Export CSV button (runs filtered export)

### 8.4 Super Admin — Platform Overview (`/super-admin`)

- Platform stats
- Hospital list with verification status
- Pending insurance provider approvals
- Global audit log viewer (hospital filter added)
- AI cost breakdown per hospital

---

## 9. Database Schema

### `audit_logs` table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String (CUID) | PK | |
| `action` | AuditAction | NOT NULL | Enum of 40+ action types |
| `severity` | AuditSeverity | NOT NULL | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| `actorId` | String | NOT NULL | User who performed the action |
| `actorRole` | Role | NOT NULL | Role of actor at time of action |
| `targetId` | String | nullable | Patient/record/claim being acted on |
| `targetType` | String | nullable | Type of target entity |
| `hospitalId` | String | FK → hospitals, nullable | For hospital-scoped logs |
| `metadata` | JSON | nullable | Additional context |
| `ipAddress` | String | nullable | Actor's IP |
| `userAgent` | String | nullable | Browser/device info |
| `createdAt` | DateTime | DEFAULT now() | Immutable — never updated |

**Index:**
```sql
CREATE INDEX idx_audit_actor   ON audit_logs(actorId);
CREATE INDEX idx_audit_target  ON audit_logs(targetId);
CREATE INDEX idx_audit_hospital ON audit_logs(hospitalId);
CREATE INDEX idx_audit_created ON audit_logs(createdAt DESC);
CREATE INDEX idx_audit_action  ON audit_logs(action);
```

---

## 10. Security Model

| Threat | Mitigation |
|--------|-----------|
| Admin accessing another hospital's data | `hospitalId` check middleware on all admin endpoints |
| Audit log tampering | Audit logs are INSERT-only; no UPDATE or DELETE allowed on this table |
| Staff account not properly deactivated | Deactivation immediately invalidates all refresh tokens (Redis scan + delete) |
| Mass audit log export abuse | Export rate limited: 5 exports per hour per admin |
| Super admin impersonation | Super admin accounts use additional TOTP (2FA) on login |

---

## 11. Testing

| Test Scenario | Expected Result |
|---------------|----------------|
| Hospital admin verifies pending doctor | Doctor `isVerified: true`, AuditLog created |
| Hospital admin tries to access another hospital's staff | 403 Forbidden |
| Super admin verifies a hospital | Hospital `isVerified: true` |
| Emergency override occurs → admin notified | Real-time notification in admin dashboard |
| Audit log CSV export (large date range) | CSV file returned, max 50k rows |
| Admin tries to delete audit log entry | 405 Method Not Allowed |
| Deactivated doctor tries to login | 403 Account deactivated |

---

*Previous Phase: [Phase 7 — Insurance Portal](./PHASE_7_INSURANCE.md)  
Next Phase: [Phase 9 — Telehealth & Notifications →](./PHASE_9_TELEHEALTH.md)*
