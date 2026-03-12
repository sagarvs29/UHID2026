# Phase 2 — Medical Records: Completion Report

**Date completed:** 2026-03-12  
**Git branch:** main  
**Phase:** 2 of 10  

---

## Summary

Phase 2 implements the full medical records pipeline:
- Hospital staff upload files (PDF/image) → stored privately on Cloudinary
- Patients retrieve their records via signed URLs (5-minute expiry)
- All file access is authenticated — raw Cloudinary URLs are never exposed

---

## Endpoints Implemented

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/records/upload` | `HOSPITAL_STAFF` | Upload a medical record file for a patient |
| `GET` | `/api/v1/records/:uhid` | `PATIENT` / `DOCTOR` / `HOSPITAL_STAFF` / `HOSPITAL_ADMIN` | List all records for a patient (paginated + filtered) |
| `GET` | `/api/v1/records/record/:id` | `PATIENT` / `DOCTOR` / `HOSPITAL_STAFF` / `HOSPITAL_ADMIN` | Get a single record with a fresh signed URL |
| `GET` | `/api/v1/records/record/:id/download` | `PATIENT` / `DOCTOR` | Get a named download URL (5-min expiry) |

---

## Files Created / Modified

### New Files
| File | Purpose |
|------|---------|
| `src/validators/records.validator.ts` | Zod schemas: `uploadRecordSchema`, `getRecordsQuerySchema` |
| `src/middlewares/upload.middleware.ts` | Multer memory-storage config with error wrapping |
| `src/services/records.service.ts` | Business logic: upload, list, get, download |
| `src/controllers/records.controller.ts` | HTTP handlers for all 4 endpoints |
| `src/routes/records.routes.ts` | Express router with correct route ordering |
| `scripts/verify-staff.js` | One-time utility: set staff `isVerified=true` in DB |
| `scripts/check-seed.js` | One-time utility: inspect seeded data |
| `scripts/test-record.pdf` | Minimal PDF used in endpoint testing |

### Modified Files
| File | Change |
|------|--------|
| `src/lib/cloudinary.ts` | Added `uploadMedicalRecord()`, `getSignedUrl()`, `deleteCloudinaryFile()` |
| `src/app.ts` | Imported and registered `recordsRouter` at `/api/v1/records` |
| `.env` | Added `?pgbouncer=true&connection_limit=1` to `DATABASE_URL` to fix Supabase PgBouncer prepared-statement collisions |

---

## Key Design Decisions

### 1. Cloudinary Private Storage
- All uploads use `type: 'authenticated'` — files are not publicly accessible
- `resource_type: 'raw'` for PDFs, `resource_type: 'image'` for images
- Folder structure: `uhid/medical-records/{patientUhid}/`
- Signed URLs generated on every read request (5-min expiry, never cached)

### 2. No `labName` Field
The `MedicalRecord` schema has no `labName` column. Removed from validator, service, and controller. Staff should include lab name in `description` or `title` if needed.

### 3. Route Ordering — Critical
`GET /record/:id` and `GET /record/:id/download` are registered **before** `GET /:uhid` in the router. If `:uhid` came first, Express would match `record` as a UHID value and never reach the specific routes.

### 4. Staff Access Check in Controller
Instead of a separate `resolveStaffProfile` middleware that augments `AuthRequest`, the controller directly queries `HospitalStaff` by `userId` at upload time. This avoids extending the `AuthRequest` type and keeps the auth middleware clean.

### 5. Tags — Flexible Parsing
Multer can pass multipart form-data `tags` as either a string (`"urgent,baseline"`) or an array (if sent multiple times). The Zod validator handles both: `z.union([z.string(), z.array(z.string())])`.

### 6. `page`/`limit` Coercion
Query params are always strings from HTTP. The validator coerces both `string | number` (to handle cases where already-parsed values might re-enter) using `z.union([z.string(), z.number()])`.

### 7. PgBouncer Fix
Supabase's connection pooler (port 6543) uses transaction pooling mode which doesn't support PostgreSQL prepared statements. Added `?pgbouncer=true&connection_limit=1` to `DATABASE_URL` — this tells Prisma to use simple query protocol (no prepared statements).

---

## Audit Log Actions Used

| Action | When |
|--------|------|
| `RECORD_UPLOADED` | Staff uploads a record |
| `RECORD_DOWNLOADED` | Patient or doctor downloads a record |
| `RECORD_VIEWED` | (To be added in Phase 3 when consent is enforced) |

---

## Access Control Matrix

| Role | Upload | List by UHID | Get by ID | Download |
|------|--------|-------------|-----------|----------|
| `HOSPITAL_STAFF` | ✅ (own hospital) | ✅ | ✅ | ❌ |
| `HOSPITAL_ADMIN` | ❌ | ✅ | ✅ | ❌ |
| `PATIENT` | ❌ | ✅ (own only) | ✅ (own only) | ✅ (own only) |
| `DOCTOR` | ❌ | ✅ (Phase 3: consent check) | ✅ (Phase 3: consent check) | ✅ (Phase 3: consent check) |

> **Note:** Doctor access to patient records without consent check is a Phase 3 concern. For now doctors are authorized at the route level — Phase 3 will add middleware to verify active consent exists before returning data.

---

## Test Results

All tested with real data against live Supabase + Cloudinary:

```
✅ POST /api/v1/records/upload
   → 201 { id, recordType, subType, title, mimeType, fileSize, tags, patient, hospital }
   → Cloudinary: file uploaded to uhid/medical-records/UHID-QX74-5EPN-9667/

✅ GET /api/v1/records/UHID-QX74-5EPN-9667
   → 200 { records: [{ ...record, hospital, uploadedByStaff, aiSummaries }], pagination }

✅ GET /api/v1/records/record/cmmn47tvp0002d9587fuahulz
   → 200 { ...record, fileUrl: <5-min signed URL>, aiSummary: null }

✅ GET /api/v1/records/record/cmmn47tvp0002d9587fuahulz/download
   → 200 { downloadUrl, expiresAt, fileName: "Complete_Blood_Count_Test_UHID-QX74-5EPN-9667.pdf" }

✅ Edge: Patient uploading → 403 "Access denied. Required: HOSPITAL_STAFF"
✅ Edge: Unauthenticated request → 401 "No token provided"
✅ Edge: Wrong UHID → 404 "Patient not found"
```

---

## Seeded Test Accounts

| Role | Email | Password | Notes |
|------|-------|----------|-------|
| Patient | patient@uhid.health | `Patient@1234!` | UHID: `UHID-QX74-5EPN-9667` |
| Hospital Staff | teststaff2@gmail.com | `SecurePass@123` | `isVerified: true` set via script |

---

## Phase 3 Preview — Consent Management

Phase 3 will add:
- `ConsentRequest` model — patient grants access to a specific doctor for a time window
- `verifyConsent` middleware — injects between `authenticate` and doctor-facing record handlers
- Doctor cannot list or view any patient records without an active consent grant
