# API Reference — UHID

> Complete reference for all API endpoints across the UHID platform. All endpoints are prefixed with `/api/v1`.

---

## Global Conventions

| Convention | Value |
|-----------|-------|
| Base URL (dev) | `http://localhost:5000/api/v1` |
| Base URL (prod) | `https://api.uhid.health/api/v1` |
| Content-Type | `application/json` (except file uploads: `multipart/form-data`) |
| Auth Header | `Authorization: Bearer <accessToken>` |
| Error format | `{ "success": false, "message": "...", "errors": {...} }` |
| Success format | `{ "success": true, "data": {...} }` or `{ "success": true, "message": "..." }` |
| Pagination | `{ "data": [...], "total": N, "page": N, "limit": N }` |
| UHID format | `UH-[A-Z0-9]{6}` — example: `UH-847291` |

---

## HTTP Status Codes Used

| Code | Meaning |
|------|---------|
| 200 | OK — successful GET, PATCH |
| 201 | Created — successful POST |
| 204 | No Content — successful DELETE |
| 302 | Redirect — file download |
| 400 | Bad Request — validation error |
| 401 | Unauthorized — invalid/expired token |
| 403 | Forbidden — insufficient role/consent |
| 404 | Not Found |
| 409 | Conflict — duplicate resource |
| 413 | Payload Too Large — file >10MB |
| 422 | Unprocessable — business logic violation |
| 429 | Too Many Requests — rate limited |
| 500 | Internal Server Error |

---

## Auth Routes — `/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | None | Register new user |
| POST | `/auth/login` | None | Login, get tokens |
| POST | `/auth/refresh` | Refresh token | Get new access token |
| POST | `/auth/logout` | ✅ Any | Logout, invalidate refresh token |
| POST | `/auth/verify-email` | None | Verify email with OTP |
| POST | `/auth/resend-verification` | None | Resend email OTP |
| POST | `/auth/forgot-password` | None | Request password reset OTP |
| POST | `/auth/reset-password` | None | Reset password with OTP |
| GET | `/auth/me` | ✅ Any | Get current user profile |

---

## Records Routes — `/records`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/records/upload` | HOSPITAL_STAFF | Upload medical record |
| GET | `/records` | PATIENT / DOCTOR / STAFF | List records (filter by patientUhid) |
| GET | `/records/:id` | PATIENT (own) / DOCTOR (consent) | Get single record metadata |
| GET | `/records/:id/download` | PATIENT (own) / DOCTOR (consent) | Get signed download URL |
| DELETE | `/records/:id` | HOSPITAL_ADMIN / SUPER_ADMIN | Soft delete record |

---

## Consents Routes — `/consents`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/consents/request` | DOCTOR / INSURANCE_PROVIDER | Request patient access |
| POST | `/consents/approve` | PATIENT | Approve with OTP |
| POST | `/consents/deny` | PATIENT | Deny request |
| DELETE | `/consents/:id` | PATIENT | Revoke active consent |
| GET | `/consents/active` | PATIENT | List active consents |
| GET | `/consents/pending` | PATIENT | List pending requests |
| GET | `/consents/history` | PATIENT | Full consent history |
| GET | `/consents/check/:uhid` | DOCTOR / INSURANCE_PROVIDER | Check own consent for patient |

---

## Prescriptions Routes — `/prescriptions`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/prescriptions` | DOCTOR | Create prescription |
| GET | `/prescriptions` | PATIENT / DOCTOR | List prescriptions (by patientUhid) |
| GET | `/prescriptions/:id` | PATIENT (own) / DOCTOR (consent) | Get prescription detail |
| POST | `/prescriptions/pharma-check` | DOCTOR | Run pharma-check (no save) |
| POST | `/prescriptions/:id/clinical-notes` | DOCTOR | Create clinical note |
| GET | `/prescriptions/clinical-notes/:patientUhid` | DOCTOR (consent) / PATIENT | List clinical notes |

---

## QR Routes — `/qr`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/qr/generate` | PATIENT | Generate new QR code |
| POST | `/qr/validate` | DOCTOR / HOSPITAL_STAFF | Scan/validate QR code |
| GET | `/qr/emergency/:uhid` | None (public) | Get emergency profile |
| POST | `/qr/sos` | PATIENT | Activate SOS |
| GET | `/qr/my-codes` | PATIENT | List generated QR codes |
| DELETE | `/qr/:id` | PATIENT | Revoke QR code |

---

## Emergency Routes — `/emergency`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/emergency/override` | DOCTOR | Emergency access override |
| GET | `/emergency/access-log` | PATIENT | View who accessed via emergency |

---

## AI Routes — `/ai`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/ai/decode` | PATIENT | Run Report Decoder on own record |
| POST | `/ai/clinical-summary` | DOCTOR | Generate clinical summary for patient |
| GET | `/ai/summary/:recordId` | PATIENT / DOCTOR | Get cached AI summary |

---

## Insurance Routes — `/insurance`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/insurance/claims` | INSURANCE_PROVIDER | Submit new claim |
| GET | `/insurance/claims` | INSURANCE_PROVIDER | List own claims |
| GET | `/insurance/claims/:id` | INSURANCE_PROVIDER | Get claim detail |
| POST | `/insurance/claims/:id/request-access` | INSURANCE_PROVIDER | Request consent for claim |
| GET | `/insurance/claims/:id/records` | INSURANCE_PROVIDER (consent) | View patient records for claim |
| POST | `/insurance/verify-record` | INSURANCE_PROVIDER | Verify document hash |
| PATCH | `/insurance/claims/:id/decision` | INSURANCE_PROVIDER | Update claim status |

---

## Hospital Routes — `/hospital`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/hospital/doctors` | PATIENT | Browse/search doctors |
| GET | `/hospital/doctors/:id` | PATIENT | Get doctor profile |
| GET | `/hospital/doctors/:id/slots` | PATIENT | Get available appointment slots |
| POST | `/hospital/appointments` | PATIENT | Book appointment |
| GET | `/hospital/appointments` | PATIENT / DOCTOR | List own appointments |
| GET | `/hospital/appointments/:id` | PATIENT / DOCTOR | Get appointment detail |
| GET | `/hospital/appointments/join/:id` | PATIENT / DOCTOR | Get Jitsi video call token |
| PATCH | `/hospital/appointments/:id/cancel` | PATIENT / DOCTOR | Cancel appointment |

---

## Admin Routes — `/admin`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/pending-verifications` | HOSPITAL_ADMIN | List pending staff verifications |
| PATCH | `/admin/verify-staff/:userId` | HOSPITAL_ADMIN | Verify/reject staff |
| PATCH | `/admin/deactivate-staff/:userId` | HOSPITAL_ADMIN | Deactivate staff account |
| GET | `/admin/staff` | HOSPITAL_ADMIN | List all hospital staff |
| GET | `/admin/analytics` | HOSPITAL_ADMIN | Hospital analytics dashboard |
| GET | `/admin/audit-logs` | HOSPITAL_ADMIN / SUPER_ADMIN | Get audit logs with filters |
| GET | `/admin/audit-logs/export` | HOSPITAL_ADMIN / SUPER_ADMIN | Export audit logs as CSV |
| GET | `/admin/super/hospitals` | SUPER_ADMIN | List all hospitals |
| PATCH | `/admin/super/hospitals/:id/verify` | SUPER_ADMIN | Verify hospital |
| GET | `/admin/super/analytics` | SUPER_ADMIN | Platform-wide analytics |
| GET | `/admin/notifications` | HOSPITAL_ADMIN | Emergency override notifications |

---

## Notification Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/notifications` | Any | List in-app notifications |
| PATCH | `/notifications/:id/read` | Any | Mark notification as read |
| PATCH | `/notifications/read-all` | Any | Mark all as read |

---

## AI Service Routes (Internal — Port 8000)

> These routes are on the Python FastAPI service. Not exposed to public internet. Called only from Express backend with `X-Internal-Secret` header.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/ai/ocr` | Extract text from image/PDF |
| POST | `/ai/decode` | Report Decoder (GPT-4o) |
| POST | `/ai/clinical-summary` | Clinical Summary (GPT-4o) |
| GET | `/health` | AI service health check |

---

## Common Error Response Examples

### 400 — Validation Error
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "patientUhid": ["UHID must match format UH-XXXXXX"],
    "items": ["At least one drug is required"]
  }
}
```

### 401 — Unauthorized
```json
{
  "success": false,
  "message": "Access token is invalid or expired.",
  "code": "TOKEN_EXPIRED"
}
```

### 403 — Forbidden (No Consent)
```json
{
  "success": false,
  "message": "You do not have active consent to access this patient's records.",
  "code": "CONSENT_REQUIRED"
}
```

### 403 — Forbidden (Wrong Role)
```json
{
  "success": false,
  "message": "Access denied. Required role: DOCTOR",
  "code": "INSUFFICIENT_ROLE"
}
```

### 409 — Conflict
```json
{
  "success": false,
  "message": "A pending consent request from you already exists for this patient.",
  "code": "DUPLICATE_REQUEST"
}
```

### 429 — Rate Limited
```json
{
  "success": false,
  "message": "Too many requests. Please try again in 15 minutes.",
  "retryAfter": 900
}
```

---

*← Back to [Master Index](./MASTER_INDEX.md)*
