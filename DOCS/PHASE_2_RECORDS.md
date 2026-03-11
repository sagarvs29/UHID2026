# Phase 2 — Medical Records & File Upload

> **Phase:** 2  
> **Status:** ⬜ PLANNED  
> **Duration:** Weeks 4–5  
> **Goal:** Hospital staff can upload medical records (PDFs/images). The AI service extracts structured data via OCR. Patients can view, filter, and download their complete medical history.

---

## 📋 Table of Contents

1. [Overview](#1-overview)
2. [File Upload Pipeline](#2-file-upload-pipeline)
3. [OCR Processing](#3-ocr-processing)
4. [Record Types & Sub-Types](#4-record-types--sub-types)
5. [API Endpoints](#5-api-endpoints)
6. [Validation Rules](#6-validation-rules)
7. [Frontend — Hospital Staff Pages](#7-frontend--hospital-staff-pages)
8. [Frontend — Patient Pages](#8-frontend--patient-pages)
9. [Database Schema](#9-database-schema)
10. [Security & Access Control](#10-security--access-control)
11. [Testing](#11-testing)

---

## 1. Overview

```
UPLOAD FLOW (Hospital Staff):
──────────────────────────────────────────────────────────────────────
Staff selects patient by UHID →
Fills metadata (record type, date, doctor) →
Uploads PDF/image →
Multer handles buffer → Upload to Cloudinary (private folder) →
Queue OCR job to AI service →
AI extracts structured values →
Staff reviews extracted data →
Staff confirms → Record saved to DB →
Patient notified (Socket.io)

VIEWING FLOW (Patient):
──────────────────────────────────────────────────────────────────────
Patient visits My Records →
API returns paginated records with filters →
Patient clicks record → Cloudinary signed URL generated (5-min TTL) →
PDF opens in inline viewer OR image renders →
Patient can download or trigger AI Summary
```

---

## 2. File Upload Pipeline

### 2.1 Multer Configuration

```typescript
// middlewares/upload.middleware.ts

const storage = multer.memoryStorage(); // Keep in buffer for Cloudinary

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: PDF, JPG, PNG, WebP'));
    }
  },
});
```

### 2.2 Cloudinary Upload

```typescript
// lib/cloudinary.ts — upload function

async function uploadMedicalRecord(
  fileBuffer: Buffer,
  mimeType: string,
  patientUhid: string,
  recordType: string
): Promise<{ url: string; publicId: string }> {
  
  const result = await cloudinary.uploader.upload_stream({
    folder: `uhid/records/${patientUhid}`,
    resource_type: mimeType === 'application/pdf' ? 'raw' : 'image',
    access_mode: 'authenticated', // Private — requires signed URL
    format: mimeType === 'application/pdf' ? 'pdf' : undefined,
    tags: [recordType, patientUhid],
  });

  return { url: result.secure_url, publicId: result.public_id };
}

// Generate signed URL for viewing (5-min expiry)
function getSignedUrl(publicId: string): string {
  return cloudinary.url(publicId, {
    sign_url: true,
    type: 'authenticated',
    expires_at: Math.floor(Date.now() / 1000) + 300, // 5 minutes
  });
}
```

### 2.3 Upload → OCR → Save Sequence

```
1. POST /api/v1/records/upload
   ├── Auth: Hospital Staff only
   ├── Multer parses multipart/form-data
   ├── Validate patient UHID exists
   ├── Upload file → Cloudinary → get URL + publicId
   │
2. POST /ai/ocr (internal call to Python AI service)
   ├── Send: { fileUrl, mimeType, recordType }
   ├── Receive: { extractedData: { key: value pairs } }
   │
3. Return to staff UI:
   ├── Show extractedData for review
   ├── Staff can edit any value
   ├── Staff confirms
   │
4. POST /api/v1/records/confirm/:tempId
   ├── Save MedicalRecord to DB with confirmed extractedData
   ├── Emit Socket.io event: 'record:uploaded' to patient
   └── Return created record
```

---

## 3. OCR Processing

### 3.1 AI Service Endpoint

**POST** `http://localhost:8000/ai/ocr`

**Request:**
```json
{
  "fileUrl": "https://res.cloudinary.com/uhid/...",
  "mimeType": "application/pdf",
  "recordType": "LAB_REPORT",
  "recordSubType": "CBC"
}
```

**Response:**
```json
{
  "success": true,
  "extractedData": {
    "hemoglobin": "12.8 g/dL",
    "wbc": "8500 cells/µL",
    "platelets": "245000 /µL",
    "rbc": "4.2 million/µL",
    "hematocrit": "38%",
    "mcv": "90 fL",
    "mch": "30 pg",
    "labName": "Apollo Diagnostics",
    "testDate": "2026-02-20",
    "referringDoctor": "Dr. Suresh Menon"
  },
  "confidence": 0.94
}
```

### 3.2 OCR Engine Strategy

| Scenario | Engine Used |
|----------|-------------|
| Clear printed PDF/image | Tesseract OCR (free, open-source) |
| Low quality / handwritten | Google Vision API (accurate, paid) |
| DICOM imaging reports (text portion) | Tesseract on report PDF |
| Failure fallback | Return empty `extractedData: {}` — staff enters manually |

### 3.3 Structured Extraction by Record Type

| Record Type | Extracted Fields |
|-------------|-----------------|
| **CBC** | Hemoglobin, WBC, RBC, Hematocrit, MCV, MCH, Platelets |
| **Lipid Profile** | Total Cholesterol, HDL, LDL, Triglycerides, VLDL |
| **HbA1c** | HbA1c %, Estimated Average Glucose |
| **LFT** | ALT, AST, ALP, Bilirubin Total/Direct, Albumin |
| **KFT** | Creatinine, Urea, eGFR, Uric Acid, Electrolytes |
| **Imaging** | Findings text, Impression text, Radiologist name |
| **Prescription** | Drug names, dosages, frequencies (from printed Rx) |
| **Discharge Summary** | Admission date, discharge date, diagnosis, procedures |

---

## 4. Record Types & Sub-Types

### RecordType Enum

| Value | Description |
|-------|-------------|
| `LAB_REPORT` | Blood tests, urine analysis, pathology |
| `IMAGING` | X-ray, MRI, CT Scan, Ultrasound, PET Scan |
| `PRESCRIPTION` | Doctor-issued medication prescription |
| `DISCHARGE_SUMMARY` | Hospital discharge document |
| `VACCINATION` | Vaccine certificates and records |
| `ECG` | Electrocardiogram reports |
| `OTHER` | Any other document |

### RecordSubType Enum

| Parent Type | Sub-Types |
|-------------|-----------|
| `LAB_REPORT` | `CBC`, `LIPID_PROFILE`, `LFT`, `KFT`, `HBA1C`, `THYROID_PROFILE`, `BLOOD_SUGAR`, `URINE_ROUTINE` |
| `IMAGING` | `XRAY`, `MRI`, `CT_SCAN`, `ULTRASOUND`, `PET_SCAN` |
| `ECG` | `ECG_REPORT` |
| Any | `OTHER` |

---

## 5. API Endpoints

**Base URL:** `http://localhost:5000/api/v1/records`

### POST /records/upload

Upload a medical record.

**Auth:** `HOSPITAL_STAFF`  
**Content-Type:** `multipart/form-data`

**Form Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | ✅ | PDF, JPG, PNG — max 10MB |
| `patientUhid` | String | ✅ | Patient's UHID (e.g., UH-847291) |
| `recordType` | String | ✅ | One of `RecordType` enum values |
| `recordSubType` | String | ❌ | One of `RecordSubType` enum values |
| `title` | String | ✅ | Human-readable title (max 200 chars) |
| `testDate` | String | ❌ | ISO date of when test was performed |
| `referringDoctorId` | String | ❌ | Doctor's CUID who ordered the test |
| `labName` | String | ❌ | Lab/hospital name for external tests |
| `description` | String | ❌ | Additional context (max 500 chars) |

**Success Response (201):**
```json
{
  "success": true,
  "message": "Record uploaded. AI extraction in progress.",
  "data": {
    "recordId": "clxxx...",
    "fileUrl": "https://res.cloudinary.com/...",
    "extractedData": {
      "hemoglobin": "12.8 g/dL",
      "wbc": "8500 cells/µL"
    },
    "ocrConfidence": 0.94
  }
}
```

---

### GET /records/:uhid

Get all records for a patient.

**Auth:** `PATIENT` (own only) | `DOCTOR` (with active consent)

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `type` | String | Filter by `RecordType` |
| `subType` | String | Filter by `RecordSubType` |
| `hospitalId` | String | Filter by hospital |
| `from` | ISO Date | Start of date range |
| `to` | ISO Date | End of date range |
| `page` | Number | Page number (default: 1) |
| `limit` | Number | Results per page (default: 10, max: 50) |
| `sort` | String | `createdAt_asc` or `createdAt_desc` (default: desc) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "records": [
      {
        "id": "clxxx...",
        "recordType": "LAB_REPORT",
        "recordSubType": "CBC",
        "title": "Complete Blood Count - Feb 2026",
        "testDate": "2026-02-20",
        "labName": "Apollo Diagnostics",
        "fileMimeType": "application/pdf",
        "hasAiSummary": true,
        "hospital": { "id": "...", "name": "Apollo Hospital, Chennai" },
        "uploadedByStaff": { "firstName": "Lakshmi", "staffType": "LAB_TECHNICIAN" },
        "createdAt": "2026-02-20T10:30:00.000Z"
      }
    ],
    "pagination": {
      "total": 47,
      "page": 1,
      "limit": 10,
      "totalPages": 5
    }
  }
}
```

---

### GET /records/:id

Get a single record with full details.

**Auth:** `PATIENT` (own) | `DOCTOR` (with consent)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "clxxx...",
    "recordType": "LAB_REPORT",
    "recordSubType": "CBC",
    "title": "Complete Blood Count - Feb 2026",
    "description": "Routine annual blood work",
    "fileUrl": "SIGNED_CLOUDINARY_URL",  // 5-minute signed URL
    "fileMimeType": "application/pdf",
    "fileSizeBytes": 245760,
    "extractedData": {
      "hemoglobin": "12.8 g/dL",
      "wbc": "8500 cells/µL",
      "platelets": "245000 /µL"
    },
    "aiSummary": {
      "summaryText": "Your blood test shows slightly low hemoglobin...",
      "riskLevel": "BORDERLINE",
      "generatedAt": "2026-02-20T11:00:00.000Z"
    },
    "testDate": "2026-02-20",
    "labName": "Apollo Diagnostics",
    "hospital": { "name": "Apollo Hospital, Chennai" },
    "isVerified": true
  }
}
```

---

### GET /records/:id/download

Get a fresh signed URL for downloading a record.

**Auth:** `PATIENT` | `DOCTOR` (with consent)  
**Audit:** Logs `DOWNLOAD_RECORD` action

**Response (200):**
```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://res.cloudinary.com/...?signature=...&expires=...",
    "expiresAt": "2026-02-26T10:35:00.000Z",
    "fileName": "CBC_Report_UH-847291_2026-02-20.pdf"
  }
}
```

---

### DELETE /records/:id

Soft-delete a record (Admin only; records are not truly deleted for audit compliance).

**Auth:** `SUPER_ADMIN` only

---

## 6. Validation Rules

### Upload Validation (Zod)

```typescript
const uploadSchema = z.object({
  patientUhid: z.string()
    .regex(/^UH-[A-Z0-9]{6}$/, 'Invalid UHID format (expected UH-XXXXXX)'),
  
  recordType: z.enum(['LAB_REPORT', 'IMAGING', 'PRESCRIPTION', 
                       'DISCHARGE_SUMMARY', 'VACCINATION', 'ECG', 'OTHER']),
  
  recordSubType: z.enum([...validSubTypes]).optional(),
  
  title: z.string()
    .min(3, 'Title too short (min 3 chars)')
    .max(200, 'Title too long (max 200 chars)')
    .trim(),
  
  testDate: z.string()
    .datetime()
    .refine(d => new Date(d) <= new Date(), 'Test date cannot be in the future')
    .optional(),
  
  description: z.string()
    .max(500, 'Description max 500 chars')
    .optional(),
  
  labName: z.string().max(200).optional(),
});
```

### File Validation

| Rule | Constraint |
|------|------------|
| Allowed MIME types | `application/pdf`, `image/jpeg`, `image/png`, `image/webp` |
| Maximum file size | 10MB |
| Minimum file size | 1KB (reject empty files) |
| File name | Sanitized — special chars removed, spaces → underscores |
| Content-Type | Verified against magic bytes, not just MIME header |

---

## 7. Frontend — Hospital Staff Pages

### 7.1 Upload Medical Record Page (`/staff/upload`)

**Flow:**
1. **Patient Search** — Enter UHID or scan QR → Patient card appears with name, age, allergies
2. **Record Type Selection** — Choose type and sub-type (dropdowns)
3. **Metadata Entry** — Test date, referring doctor, lab name, title
4. **File Upload** — Drag-and-drop zone; shows preview for images, filename for PDFs
5. **OCR Processing** — Loading state "AI is extracting data..."
6. **Review Screen** — Table of extracted values; staff can edit each field
7. **Confirm & Save** — Green button; success toast; option to upload another

### 7.2 Upload History Page (`/staff/uploads`)

- Table of all records uploaded by this staff member
- Columns: Patient UHID, Record Type, Date, Status (Pending/Confirmed)
- Search by UHID or date range

---

## 8. Frontend — Patient Pages

### 8.1 My Records Page (`/patient/records`)

**Features:**
- Card grid/list view of all records
- Each card shows: record type icon, title, hospital, date, AI summary badge
- **Filters:** Record type, hospital, date range, has AI summary
- **Sort:** Newest first (default), oldest first
- Pagination (10 per page with "Load More")
- **Actions per card:** View, Download, AI Summary, Share with Doctor

### 8.2 Record Viewer (Modal or Full Page)

- **PDF files:** Rendered inline using `react-pdf`
- **Images:** Full-screen image viewer with zoom
- **Extracted Data:** Structured table with color-coded normal/abnormal indicators:
  - 🟢 Normal
  - 🟡 Borderline  
  - 🔴 Abnormal/Critical
- **AI Summary section** (if generated)
- Download button (signed URL)

### 8.3 Medical History Timeline (`/patient/history`)

- Vertical timeline sorted by date (newest at top)
- Grouped by month/year
- Filter by record type (chips: All, Lab, Imaging, Prescription, etc.)
- Click any item → opens Record Viewer

---

## 9. Database Schema

### `medical_records` table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String (CUID) | PK | |
| `patientId` | String | FK → patients | |
| `recordType` | RecordType | NOT NULL | Classification |
| `recordSubType` | RecordSubType | nullable | More specific type |
| `title` | String | NOT NULL | Human-readable name |
| `description` | String | nullable | Additional notes |
| `fileUrl` | String | NOT NULL | Cloudinary URL |
| `filePublicId` | String | NOT NULL | For deletion/signing |
| `fileMimeType` | String | NOT NULL | MIME type |
| `fileSizeBytes` | Int | nullable | File size |
| `extractedData` | Json | nullable | OCR structured output |
| `testDate` | DateTime | nullable | When test was done |
| `labName` | String | nullable | External lab name |
| `referringDoctorId` | String | nullable | FK → doctors |
| `uploadedByStaffId` | String | nullable | FK → hospital_staff |
| `hospitalId` | String | nullable | FK → hospitals |
| `blockchainHash` | String | nullable | Future feature |
| `isVerified` | Boolean | DEFAULT false | Staff confirmed |
| `createdAt` | DateTime | DEFAULT now() | |
| `updatedAt` | DateTime | Auto-updated | |

### Indexes

```sql
CREATE INDEX idx_medical_records_patient     ON medical_records(patientId);
CREATE INDEX idx_medical_records_type        ON medical_records(recordType);
CREATE INDEX idx_medical_records_date        ON medical_records(testDate);
CREATE INDEX idx_medical_records_hospital    ON medical_records(hospitalId);
CREATE INDEX idx_medical_records_created     ON medical_records(createdAt DESC);
```

---

## 10. Security & Access Control

| Actor | Permission | Condition |
|-------|-----------|-----------|
| Hospital Staff | Upload records | Must belong to a verified hospital |
| Patient | View own records | JWT must match the record's patientId |
| Doctor | View patient records | Must have an ACTIVE consent from patient |
| Insurance | View specific records | Must have an ACTIVE consent from patient |
| Hospital Admin | View hospital records | Only records uploaded by their hospital staff |
| Super Admin | View all records | For compliance/legal purposes only |

**Important rules:**
- Patients can **never upload** their own records (only hospital staff can)
- Records cannot be deleted — only soft-deleted (isDeleted flag, future)
- Every view/download action is logged in `audit_logs`
- File URLs are **signed** (private) — direct Cloudinary URL without signature returns 401

---

## 11. Testing

### Unit Tests

| Test | Expected |
|------|----------|
| Upload with valid UHID → saves record | Record in DB with correct patientId |
| Upload with invalid UHID → 404 | Error response |
| Upload file > 10MB → 400 | Error: file too large |
| Upload invalid MIME type → 400 | Error: invalid file type |
| Non-staff user uploads → 403 | Error: forbidden |

### Integration Tests

```
Full Upload Flow:
Staff uploads PDF → OCR returns mock data → Staff confirms → 
Record in DB → Patient API returns the record → 
Patient downloads → Signed URL returned → AuditLog created

Access Control Flow:
Patient A requests patient B's records → 403 Forbidden
Doctor without consent requests records → 403 Forbidden
Doctor with expired consent requests records → 403 Forbidden
Doctor with active consent requests records → 200 OK
```

---

*Previous Phase: [Phase 1 — Auth](./PHASE_1_AUTH.md)  
Next Phase: [Phase 3 — Consent Management →](./PHASE_3_CONSENT.md)*
