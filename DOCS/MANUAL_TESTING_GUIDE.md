# UHID Platform — Manual Testing Guide (Role-Based)

> **URL:** http://localhost:5173  
> **API:** http://localhost:5000  
> **AI Service:** http://localhost:8000  
> **Date:** March 2026

---

## 📋 Pre-Requisites

Before testing, make sure:

1. **Database is seeded:**
   ```bash
   cd apps/api
   npx prisma db seed
   ```
   This creates the Super Admin account.

2. **All 3 servers are running:**
   | Service | Command | Port |
   |---------|---------|------|
   | API | `cd apps/api && npx tsx src/index.ts` | 5000 |
   | Frontend | `cd apps/web && npm run dev` | 5173 |
   | AI Service | `cd apps/ai && uvicorn main:app --port 8000` | 8000 |

---

## 🔑 Pre-Seeded Account

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `superadmin@uhid.health` | `Admin@1234!` |

> All other accounts need to be **registered** via the UI.

---

## 📝 Registration Order (Recommended)

Register accounts in this order for a smooth testing flow:

| Step | Role | Why First? |
|------|------|-----------|
| 1 | **Hospital Admin** | Must exist before doctors/staff can register under a hospital |
| 2 | **Doctor** | Needs hospital; needs admin verification before accessing patients |
| 3 | **Hospital Staff** | Needs hospital; uploads records for patients |
| 4 | **Patient** | The core user — gets UHID, records, consents |
| 5 | **Insurance Provider** | Submits claims for patients; needs super admin verification |

---

## 🏥 STEP-BY-STEP TESTING FLOW

---

### STEP 1: Super Admin — Verify Hospital

**Login:** `superadmin@uhid.health` / `Admin@1234!`  
**Route:** `/superadmin/dashboard`

| # | Action | How |
|---|--------|-----|
| 1 | View platform-wide stats | Dashboard loads KPI cards automatically |
| 2 | View hospitals list | Scroll down to hospitals table |
| 3 | Verify a hospital | Click "Verify" button next to a hospital |
| 4 | View audit logs | Sidebar → Audit Logs (`/superadmin/audit`) |

**Pages Available:**
| Page | Route | Status |
|------|-------|--------|
| Dashboard | `/superadmin/dashboard` | ✅ Working |
| Audit Logs | `/superadmin/audit` | ✅ Working |
| Hospitals | `/superadmin/hospitals` | 🔜 Coming Soon |
| Users | `/superadmin/users` | 🔜 Coming Soon |
| Analytics | `/superadmin/analytics` | 🔜 Coming Soon |

---

### STEP 2: Register a Hospital Admin

**Route:** `/register` → Choose "Hospital Staff" role (with Admin sub-role)  

> **Note:** When registering, a Hospital is auto-created. The Super Admin must verify it.

**Registration Fields:**
- Email, Password, Confirm Password
- First Name, Last Name
- Hospital Name (creates new hospital)
- Staff Type: `ADMIN`

**After Registration:**
1. Check your email for verification link → Click it
2. Login with the Hospital Admin credentials
3. The hospital needs verification by Super Admin

**Then as Super Admin:**
1. Login as `superadmin@uhid.health`
2. Go to Dashboard → Hospitals → Verify the new hospital

---

### STEP 3: Register a Doctor

**Route:** `/register` → Choose "Doctor"

**Registration Fields:**
- Email, Password, Confirm Password
- First Name, Last Name
- Specialty (e.g., "Cardiology", "General Medicine")
- License Number (e.g., "MH-12345")
- Hospital (select from dropdown — the one created in Step 2)

**After Registration:**
1. Verify email via the link sent
2. ⚠️ **Doctor is NOT active yet** — Hospital Admin must verify

**As Hospital Admin:**
1. Login → Sidebar → "Staff" (`/admin/staff`)
2. Find the pending doctor → Click "Verify"
3. Doctor is now active and can access patient data

---

### STEP 4: Register a Patient

**Route:** `/register` → Choose "Patient"

**Registration Fields:**
- Email, Password, Confirm Password
- First Name, Last Name
- Date of Birth
- Gender
- Phone (optional)
- Blood Group (optional)
- Allergies (optional — add "Penicillin" for testing pharma-check)
- Chronic Conditions (optional — add "CKD" for testing)

**After Registration:**
1. Verify email
2. Login → You get a **UHID** (e.g., `UHID-A2B4-C6D8-E1F3`)
3. This UHID is your unique health identifier

---

### STEP 5: Register an Insurance Provider

**Route:** `/register` → Choose "Insurance Provider"

**Registration Fields:**
- Email, Password, Confirm Password
- Company Name, License Number
- Contact details

**After Registration:**
1. Verify email
2. ⚠️ **Not active yet** — Super Admin must verify
3. As Super Admin → verify the insurance provider

---

## 🧑‍⚕️ ROLE-WISE FEATURE TESTING

---

### 👤 PATIENT (`/patient/*`)

**Login:** Your registered patient email + password

| # | Feature | Route | How to Test |
|---|---------|-------|-------------|
| 1 | **Dashboard** | `/patient/dashboard` | View your UHID, recent records, stats |
| 2 | **Upload Record** | `/patient/records` | Click "Upload" → Choose PDF/image → Upload |
| 3 | **View Records** | `/patient/records` | View list of all uploaded records |
| 4 | **Download Record** | `/patient/records` | Click a record → Download button |
| 5 | **AI Report Decode** | `/patient/records/:id/ai` | Click "AI Decode" on any record (needs AI service running) |
| 6 | **Manage Consent** | `/patient/consent` | Grant/revoke access to doctors or insurance |
| 7 | **Grant Consent to Doctor** | `/patient/consent` | Click "Grant Access" → Enter doctor email → Choose scope → Email OTP verification |
| 8 | **Find a Doctor** | `/patient/find-doctor` | Search by name/specialty → View profiles |
| 9 | **Book Appointment** | `/patient/find-doctor` | Select doctor → Pick a time slot → Book |
| 10 | **View Appointments** | `/patient/appointments` | View upcoming + past appointments |
| 11 | **Join Video Call** | `/patient/appointments` | Click "Join" on an upcoming appointment |
| 12 | **QR Emergency Card** | `/patient/qr` | Generate QR code → Download → Share |
| 13 | **Emergency Page** | `/emergency/:uhid` | Open this URL in incognito — shows basic emergency info (NO auth needed) |

**Key Testing Scenarios:**
- Upload 2-3 medical reports (PDF or images)
- Try the AI decode on a blood report
- Grant consent to the doctor you registered
- Book an appointment with that doctor
- Generate your emergency QR code

---

### 🩺 DOCTOR (`/doctor/*`)

**Login:** Your registered + verified doctor email + password

| # | Feature | Route | How to Test |
|---|---------|-------|-------------|
| 1 | **Dashboard** | `/doctor/dashboard` | View stats, upcoming appointments |
| 2 | **Patient Lookup** | `/doctor/patient-lookup` | Enter patient UHID → View profile (needs active consent) |
| 3 | **Patient Dashboard** | `/doctor/patient/:uhid` | Full view of patient — records, notes, prescriptions |
| 4 | **View Patient Records** | `/doctor/records` | Browse patient records (consent-gated) |
| 5 | **Create Clinical Note** | `/doctor/patient/:uhid/notes` | Write a clinical note with ICD-10 code, symptoms, diagnosis |
| 6 | **Write Prescription** | `/doctor/patient/:uhid/prescribe` | Prescribe drugs → Pharma-check runs automatically |
| 7 | **Pharma Check** | Auto on prescribe | System checks drug-drug, drug-allergy, drug-condition interactions |
| 8 | **AI Clinical Summary** | `/doctor/patient/:uhid/ai-summary` | Generate AI summary of all patient data (needs AI service) |
| 9 | **Manage Consent Requests** | `/doctor/consents` | View consent requests from patients |
| 10 | **Appointments** | `/doctor/appointments` | View all appointments, upcoming and past |
| 11 | **Join Video Call** | `/doctor/appointments` | Click "Join" to enter video room |

**Key Testing Scenarios:**
- Lookup the patient by their UHID
- View their records (must have active consent)
- Write a clinical note with ICD-10: `J06.9` (Upper respiratory infection)
- Prescribe: Amoxicillin 500mg + Ibuprofen 400mg → Check pharma results
- If patient has "Penicillin" allergy, prescribing Amoxicillin → ⚠️ HIGH alert
- Prescribe Warfarin + Aspirin → ⚠️ Drug-drug interaction alert

---

### 👨‍💼 HOSPITAL STAFF (`/staff/*`)

**Login:** Staff account (must be verified by Hospital Admin)

| # | Feature | Route | How to Test |
|---|---------|-------|-------------|
| 1 | **Dashboard** | `/staff/dashboard` | View stats |
| 2 | **Upload Record** | `/staff/upload` | Upload medical record on behalf of a patient (by UHID) |
| 3 | **Search Patient** | `/staff/search` | Search patient by UHID or name |

**Key Testing Scenarios:**
- Search for the patient by UHID
- Upload a lab report PDF on their behalf

---

### 🏛️ HOSPITAL ADMIN (`/admin/*`)

**Login:** Hospital Admin credentials

| # | Feature | Route | How to Test |
|---|---------|-------|-------------|
| 1 | **Dashboard** | `/admin/dashboard` | KPI cards — total patients, records, prescriptions, emergency overrides |
| 2 | **Staff Management** | `/admin/staff` | View all staff → Verify pending doctors/staff → Deactivate |
| 3 | **Verify Doctor** | `/admin/staff` | Click "Verify" next to a pending doctor |
| 4 | **Reject Doctor** | `/admin/staff` | Click "Reject" next to a pending doctor |
| 5 | **Deactivate Staff** | `/admin/staff` | Click "Deactivate" to suspend a staff member |
| 6 | **Audit Logs** | `/admin/audit` | View all audit events — filter by action, severity, date |
| 7 | **Export Audit CSV** | `/admin/audit` | Click "Export CSV" to download audit log |

**Key Testing Scenarios:**
- Verify the doctor you registered
- Check audit logs after each action (verify, login, record upload all create logs)
- Filter audit logs by `STAFF_VERIFIED` action

---

### 🛡️ INSURANCE PROVIDER (`/insurance/*`)

**Login:** Insurance provider account (must be verified by Super Admin)

| # | Feature | Route | How to Test |
|---|---------|-------|-------------|
| 1 | **Dashboard** | `/insurance/dashboard` | View claims overview |
| 2 | **Submit New Claim** | `/insurance/claims/new` | Enter patient UHID, diagnosis, ICD-10 code, hospital, amount |
| 3 | **View Claim** | `/insurance/claims/:id` | View claim details + fraud detection score |
| 4 | **Verify Records** | Claim detail page | Verify medical record hash integrity |
| 5 | **Update Claim Status** | Claim detail page | Move: SUBMITTED → UNDER_REVIEW → APPROVED/REJECTED |

**Key Testing Scenarios:**
- Submit a claim for the patient (by UHID)
- Use ICD-10: `J18.9` (Pneumonia), amount: ₹1,50,000
- Check fraud score — if patient has no prior claims, score should be LOW
- Submit a duplicate claim → Fraud flag: `DUPLICATE_CLAIM`
- Update status: SUBMITTED → UNDER_REVIEW → APPROVED

**Valid Status Transitions:**
```
SUBMITTED → UNDER_REVIEW
UNDER_REVIEW → APPROVED / REJECTED / HOLD
HOLD → UNDER_REVIEW / APPROVED / REJECTED
APPROVED → PAID
REJECTED → (terminal)
PAID → (terminal)
```

---

### 🌐 PUBLIC — No Login Required

| Feature | URL | How to Test |
|---------|-----|-------------|
| **Emergency Profile** | `http://localhost:5173/emergency/UHID-XXXX-XXXX-XXXX` | Replace with a real patient UHID — shows name, blood group, allergies, emergency contacts |

---

## 🧪 CROSS-ROLE SCENARIO: Full End-to-End

This tests the entire platform in one flow:

```
1. Super Admin → Login → Dashboard ✓

2. Register Hospital Admin → Verify email → Login
3. Super Admin → Verify hospital

4. Register Doctor → Verify email → Login (sees "Pending" status)
5. Hospital Admin → Staff page → Verify doctor

6. Register Patient → Verify email → Login → Get UHID
7. Patient → Upload 2 medical records (PDF)
8. Patient → AI Decode on a record
9. Patient → Grant consent to Doctor (email OTP)
10. Patient → Generate QR card

11. Doctor → Patient Lookup → Enter UHID → View profile
12. Doctor → View patient records
13. Doctor → Write clinical note (ICD-10: J06.9)
14. Doctor → Prescribe drugs → Check pharma alerts
15. Doctor → Generate AI clinical summary

16. Patient → Book appointment with Doctor
17. Doctor → View appointments → Join call
18. Patient → Join call (video room)

19. Register Insurance Provider → Verify email
20. Super Admin → Verify insurance provider
21. Insurance → Submit claim for patient
22. Insurance → Check fraud score
23. Insurance → SUBMITTED → UNDER_REVIEW → APPROVED

24. Hospital Admin → Audit logs → Filter by today → Export CSV
25. Super Admin → Audit logs → View all platform activity

26. Open incognito → /emergency/UHID-XXXX → View emergency profile
```

---

## 🔴 Known Limitations

| Feature | Status | Notes |
|---------|--------|-------|
| SMS OTP | ❌ Removed | All OTP is email-only |
| Video Call | ⚠️ Needs Jitsi keys working | Page loads but call may fail without valid keys |
| AI Features | ⚠️ Needs AI service running | Start with `uvicorn main:app --port 8000` |
| Profile pages | 🔜 Coming Soon | All role profile pages show placeholder |
| Super Admin: Users list | 🔜 Coming Soon | Placeholder page |
| Super Admin: Hospitals management | 🔜 Coming Soon | Only verify action works from dashboard |

---

## 📧 Email OTP Flow

Since we use **email-only OTP** (no SMS):

1. Patient grants consent → OTP sent to **patient's email**
2. Open email → Copy 6-digit OTP
3. Enter OTP in the consent confirmation dialog
4. Consent is now ACTIVE

> ⚠️ Check spam folder if OTP email doesn't arrive within 30 seconds

---

## 🐛 If Something Breaks

1. **API error in browser console?** → Check terminal running `npx tsx src/index.ts`
2. **401 Unauthorized?** → Token expired. Logout → Login again
3. **403 Forbidden?** → Doctor not verified, or no active consent
4. **AI features fail?** → Make sure `http://localhost:8000/health` returns OK
5. **Database error?** → Run `npx prisma db push` to sync schema

---

*Last updated: March 15, 2026*
