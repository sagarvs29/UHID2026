# 🧪 UHID Platform — Intern Testing Guide

> **Live URL:** https://uhid2026-production.up.railway.app  
> **Last Updated:** April 6, 2026

---

## 📋 Table of Contents

1. [Getting Started](#1-getting-started)
2. [Test Account Setup](#2-test-account-setup)
3. [Patient Features](#3-patient-features)
4. [Doctor Features](#4-doctor-features)
5. [Hospital Staff Features](#5-hospital-staff-features)
6. [Hospital Admin Features](#6-hospital-admin-features)
7. [Insurance Provider Features](#7-insurance-provider-features)
8. [Super Admin Features](#8-super-admin-features)
9. [Cross-Role Test Scenarios](#9-cross-role-test-scenarios)
10. [Bug Reporting Template](#10-bug-reporting-template)

---

## 1. Getting Started

### What is UHID?
UHID (UniHealth ID) is a **unified digital health identity platform** that gives every patient a single health ID across all hospitals. The core innovation is **consent-based access** — no doctor, hospital, or insurance company can see a patient's records without their explicit OTP-verified permission.

### Browser Requirements
- ✅ Chrome (recommended), Firefox, or Edge
- ✅ Desktop or mobile browser
- ❌ Internet Explorer is NOT supported

### Testing Rules
- Use **real email addresses** you can access (OTP emails will be sent)
- Don't use offensive or fake data
- Report every bug you find using the template at the bottom
- Take screenshots when you find issues

---

## 2. Test Account Setup

### Registration Order (IMPORTANT — follow this sequence)

Since the platform has role dependencies, register accounts in this order:

| Step | Who | What to Do |
|------|-----|-----------|
| 1 | **Super Admin** | Already exists (ask Sagar for credentials) |
| 2 | **Hospital** | Super Admin creates a hospital + its admin |
| 3 | **Doctor** | Register as doctor → select the hospital → wait for admin verification |
| 4 | **Staff** | Register as hospital staff → select the hospital → wait for admin verification |
| 5 | **Patient** | Register as patient (self-service, no approval needed) |
| 6 | **Insurance** | Register as insurance provider |

### How to Register (All Roles)

1. Go to the homepage → click **"Get Started"** or **"Login"**
2. On the login page → click **"Create an account"**
3. Select your **role** from the dropdown
4. Fill in the required fields
5. Click **Register**
6. Check your email for **verification link** → click it
7. Login with your credentials

---

## 3. Patient Features

> **Login as:** Patient account

### 3.1 Dashboard
| What to Test | Steps | Expected Result |
|---|---|---|
| Dashboard loads | Login as patient → see dashboard | Shows stats cards: total records, active consents, upcoming appointments |
| Quick stats are correct | Check numbers on cards | Should show 0 for new accounts |

### 3.2 Medical Records
| What to Test | Steps | Expected Result |
|---|---|---|
| Records page loads | Sidebar → **"My Records"** | Shows list of records (empty for new patient) |
| View a record | Click **"View"** on any record | Opens the file in a new tab |
| Download a record | Click **"Download"** on any record | Downloads the file |
| AI Explain | Click **"Explain with AI"** on a lab report | AI generates a plain-language explanation |
| Filter by type | Use the record type filter dropdown | Only shows records of that type |

> ⚠️ Records are uploaded by hospital staff. You need a staff member to upload records for your UHID first.

### 3.3 Consent Management
| What to Test | Steps | Expected Result |
|---|---|---|
| View pending consents | Sidebar → **"Consents"** | Shows list of pending/active consent requests |
| Approve consent | Click **"Approve"** on a pending request → enter OTP from email | Consent becomes ACTIVE, doctor can now see your records |
| Deny consent | Click **"Deny"** on a pending request | Consent becomes DENIED |
| Revoke consent | Click **"Revoke"** on an active consent | Consent becomes REVOKED, doctor loses access immediately |
| Scope selection | When approving, check if you can choose what to share | Should show options: All, Lab Reports, Imaging, etc. |
| Temporary consent | Check if you can set an expiry time | Consent should auto-expire after the set duration |

### 3.4 Emergency QR Code
| What to Test | Steps | Expected Result |
|---|---|---|
| Generate QR | Sidebar → **"QR Card"** → click **"Generate QR"** | QR code image appears |
| QR has tiers | Scan the QR with a phone camera | Shows emergency info (Tier 1: name, blood group, allergies) |
| Add a label | Enter a label like "For Dr. Priya" → generate | QR is created with custom label |
| Download QR | Click **"Download"** | QR image downloads to your device |
| Revoke QR | Click **"Revoke"** on an active QR | QR becomes invalid, scanning shows error |

### 3.5 Find a Doctor & Appointments
| What to Test | Steps | Expected Result |
|---|---|---|
| Search doctors | Sidebar → **"Find a Doctor"** → type a name or specialty | Doctor cards appear with details |
| Filter by specialty | Select a specialty from the filter | Only matching doctors shown |
| Filter by city | Type a city name | Only doctors from that city shown |
| Book appointment | Click **"Book"** on a doctor → fill form | Appointment is created, shows in "My Appointments" |
| Cancel appointment | Go to **"Appointments"** → click **"Cancel"** → enter reason | Appointment status changes to CANCELLED |
| Rate appointment | After a completed appointment → click **"Rate"** → give stars + comment | Rating is saved, visible on doctor's profile |

### 3.6 Profile Management
| What to Test | Steps | Expected Result |
|---|---|---|
| View profile | Sidebar → **"Profile"** | Shows all your details |
| Update allergies | Add allergies (e.g., "Penicillin", "Peanuts") | Saved and shows on profile |
| Update chronic conditions | Add conditions (e.g., "Diabetes") | Saved and shows on profile |
| Update emergency contacts | Add emergency contact info | Saved |

---

## 4. Doctor Features

> **Login as:** Doctor account (must be verified by hospital admin first)

### 4.1 Dashboard
| What to Test | Steps | Expected Result |
|---|---|---|
| Dashboard loads | Login as doctor | Shows today's appointments, recent patients |

### 4.2 Patient Lookup & Consent Request
| What to Test | Steps | Expected Result |
|---|---|---|
| Search patient | Sidebar → **"Patient Lookup"** → enter UHID | If you have consent → shows patient profile. If not → shows "No active consent" |
| Request consent | When no consent exists → click **"Request Consent"** → fill purpose | Patient receives notification + email |
| View with consent | After patient approves → search again | Full patient profile with records, prescriptions, notes |

### 4.3 Create Prescription
| What to Test | Steps | Expected Result |
|---|---|---|
| New prescription | On patient page → **"Prescriptions"** tab → **"+ New Prescription"** | Prescription form opens |
| Add drugs | Enter drug name, dosage, form (tablet/capsule), frequency, duration | Drug added to prescription |
| Smart pharma-check | Add a drug the patient is allergic to | ⚠️ Warning: "Patient is allergic to [drug]!" |
| Drug interaction | Add two conflicting drugs (e.g., Warfarin + Aspirin) | ⚠️ Warning: "Drug interaction detected" |
| Override warning | Click **"Override"** → enter reason | Warning is overridden but logged in audit trail |
| Save prescription | Click **"Save Prescription"** | Prescription saved, visible to patient |

### 4.4 Clinical Notes (SOAP Notes)
| What to Test | Steps | Expected Result |
|---|---|---|
| New note | On patient page → **"Clinical Notes"** tab → **"+ New Note"** | Note form opens |
| ICD-10 search | Type a diagnosis → search ICD-10 codes | Matching codes appear (e.g., "J18.9 - Pneumonia") |
| Visibility setting | Set to "Patient Visible" vs "Hospital Only" vs "Private" | Note visibility is set correctly |
| Save note | Fill all fields → save | Note appears in patient's record |

### 4.5 Appointments & Video Calls
| What to Test | Steps | Expected Result |
|---|---|---|
| Set availability | Sidebar → **"Availability"** → set time slots | Slots saved, visible to patients |
| View appointments | Sidebar → **"Appointments"** | Shows list of booked appointments |
| Join video call | For a video appointment → click **"Join Call"** | Opens Jitsi video room in browser |

---

## 5. Hospital Staff Features

> **Login as:** Hospital Staff account (must be verified by hospital admin)

### 5.1 Search Patient
| What to Test | Steps | Expected Result |
|---|---|---|
| Search by UHID | Sidebar → **"Search Patient"** → enter UHID | Patient's basic info appears |
| Invalid UHID | Enter a fake UHID | "Patient not found" message |

### 5.2 Upload Medical Record
| What to Test | Steps | Expected Result |
|---|---|---|
| Upload form | Sidebar → **"Upload Record"** | Upload form with all fields |
| Enter patient UHID | Type the patient's UHID | Patient name auto-fills |
| Select record type | Choose: Lab Report, Imaging, Prescription, etc. | Type is selected |
| Upload file | Select a PDF/JPEG/PNG file (max 10MB) | File uploads successfully |
| Add metadata | Enter title, description, tags, record date | All fields saved |
| Submit | Click **"Upload"** | Record created, patient can see it in their dashboard |
| Upload notification | After upload | Patient receives notification about new record |

### 5.3 Test Different File Types
| File Type | Expected |
|-----------|----------|
| PDF (lab report) | ✅ Should upload successfully |
| JPEG (imaging) | ✅ Should upload successfully |
| PNG (discharge) | ✅ Should upload successfully |
| File > 10MB | ❌ Should show error "File too large" |
| EXE file | ❌ Should be rejected |

---

## 6. Hospital Admin Features

> **Login as:** Hospital Admin account (created by Super Admin)

### 6.1 Dashboard & Analytics
| What to Test | Steps | Expected Result |
|---|---|---|
| Dashboard loads | Login as admin | Shows KPIs: patients, records, consents, overrides |
| Charts render | Check the trend chart | Shows records per day |

### 6.2 Staff & Doctor Verification
| What to Test | Steps | Expected Result |
|---|---|---|
| View pending | Sidebar → **"People"** → **"Pending Verifications"** | Shows unverified doctors/staff |
| Verify a doctor | Click **"Verify"** on a doctor | Doctor is now active, can login and use platform |
| Reject a member | Click **"Reject"** with a note | Member is rejected, sees rejection notice |

### 6.3 Active Staff Management
| What to Test | Steps | Expected Result |
|---|---|---|
| View active staff | **"People"** → **"Active Members"** | Shows all verified doctors and staff |
| Deactivate member | Click **"Deactivate"** → enter reason | Member is deactivated, can't use platform |

### 6.4 Audit Logs
| What to Test | Steps | Expected Result |
|---|---|---|
| View logs | Sidebar → **"Audit Logs"** | Shows all actions by hospital staff |
| Filter by action | Filter by "RECORD_UPLOADED" | Only shows record upload events |
| Filter by severity | Filter by "HIGH" or "CRITICAL" | Shows high-severity events |
| Filter by date | Set date range | Shows events in that range |
| Search | Search by user ID | Shows events by that user |

### 6.5 Hospital Profile
| What to Test | Steps | Expected Result |
|---|---|---|
| View profile | Sidebar → **"Hospital Profile"** | Shows hospital name, location, NABH status, stats |

### 6.6 Security Settings
| What to Test | Steps | Expected Result |
|---|---|---|
| View settings | Sidebar → **"Security"** | Shows security configuration options |

---

## 7. Insurance Provider Features

> **Login as:** Insurance Provider account

### 7.1 Dashboard
| What to Test | Steps | Expected Result |
|---|---|---|
| Dashboard loads | Login as insurance | Shows claim stats: total, approved, pending, rejected |
| Stats are accurate | Check the numbers | Match the actual claims |

### 7.2 Submit New Claim
| What to Test | Steps | Expected Result |
|---|---|---|
| New claim form | Sidebar → **"New Claim"** | Shows claim submission form |
| Enter patient UHID | Enter a valid UHID | Patient info validates |
| Fill claim details | Enter policy number, diagnosis, ICD-10, treatment dates, amount | All fields accepted |
| Submit | Click **"Submit Claim"** | Claim created with status SUBMITTED |

### 7.3 Claims Management
| What to Test | Steps | Expected Result |
|---|---|---|
| View all claims | Sidebar → **"Claims"** | Shows all submitted claims |
| Filter by status | Filter by SUBMITTED, APPROVED, REJECTED | Shows matching claims |
| View claim detail | Click on a claim | Shows full claim details |
| Approve claim | Click **"Approve"** → enter approved amount | Claim status → APPROVED |
| Reject claim | Click **"Reject"** → enter reason | Claim status → REJECTED |
| Put on hold | Click **"Hold"** → enter reason | Claim status → HOLD |

### 7.4 Record Verification
| What to Test | Steps | Expected Result |
|---|---|---|
| Verify integrity | On a claim → click **"Verify Records"** | System checks SHA-256 hash, shows ✅ if not tampered |

---

## 8. Super Admin Features

> **Login as:** Super Admin account (ask Sagar for credentials)

### 8.1 Platform Dashboard
| What to Test | Steps | Expected Result |
|---|---|---|
| Dashboard loads | Login as super admin | Shows platform-wide KPIs |
| All 6 stat cards | Check all cards | Total users, records, consents, claims, SOS, AI reports |

### 8.2 Hospital Management
| What to Test | Steps | Expected Result |
|---|---|---|
| View all hospitals | Sidebar → **"Hospitals"** | Shows all registered hospitals |
| Create hospital | Click **"+ Register Hospital"** → fill form | New hospital created with admin account |
| Verify hospital | Click **"Verify"** on a pending hospital | Hospital is now verified |
| Suspend hospital | Click **"Suspend"** → enter reason | Hospital is suspended |
| Search/filter | Search by name, filter by city, NABH status | Results filter correctly |

### 8.3 All Users
| What to Test | Steps | Expected Result |
|---|---|---|
| View users | Sidebar → **"Users"** | Shows all users across the platform |
| User counts | Check role-wise counts | Breakdown by Patient, Doctor, Staff, Admin, Insurance |

### 8.4 Platform Settings
| What to Test | Steps | Expected Result |
|---|---|---|
| View settings | Sidebar → **"Settings"** | Shows platform configuration |
| Maintenance mode | Toggle ON | Platform should block non-admin access |

### 8.5 Platform Audit Logs
| What to Test | Steps | Expected Result |
|---|---|---|
| View logs | Sidebar → **"Audit Logs"** | Shows ALL actions across ALL hospitals |

---

## 9. Cross-Role Test Scenarios

These test the **end-to-end flow** between multiple roles. These are the most important tests.

### 🔄 Scenario 1: Complete Record Upload → View → AI Explain

| Step | Role | Action | Expected |
|------|------|--------|----------|
| 1 | Staff | Upload a lab report PDF for Patient UHID | Record created successfully |
| 2 | Patient | Login → check "My Records" | New record appears |
| 3 | Patient | Click "View" on the record | File opens in new tab |
| 4 | Patient | Click "Explain with AI" | AI generates explanation |

### 🔄 Scenario 2: Consent Flow (The Core Feature)

| Step | Role | Action | Expected |
|------|------|--------|----------|
| 1 | Doctor | Search patient by UHID | "No active consent" message |
| 2 | Doctor | Click "Request Consent" → enter purpose | Request sent |
| 3 | Patient | Login → go to "Consents" | See pending request from doctor |
| 4 | Patient | Click "Approve" → check email for OTP | OTP email received |
| 5 | Patient | Enter OTP | Consent becomes ACTIVE |
| 6 | Doctor | Search same patient again | Now sees full patient profile + records |
| 7 | Patient | Go to "Consents" → click "Revoke" | Consent revoked |
| 8 | Doctor | Search same patient again | "No active consent" — access lost |

### 🔄 Scenario 3: Prescription with Safety Check

| Step | Role | Action | Expected |
|------|------|--------|----------|
| 1 | Patient | Update profile → add allergy "Penicillin" | Allergy saved |
| 2 | Doctor | Create prescription for this patient → add "Amoxicillin" | ⚠️ Allergy warning appears |
| 3 | Doctor | Override warning with reason → save | Prescription saved with override logged |
| 4 | Patient | Go to "My Records" | Can see the new prescription |

### 🔄 Scenario 4: Insurance Claim Flow

| Step | Role | Action | Expected |
|------|------|--------|----------|
| 1 | Insurance | Submit claim for a patient UHID | Claim created |
| 2 | Insurance | Try to verify records | Needs patient consent first |
| 3 | Patient | Grant consent to insurance provider | Consent active |
| 4 | Insurance | Verify records again | SHA-256 hash check passes ✅ |
| 5 | Insurance | Approve claim with amount | Claim approved |

### 🔄 Scenario 5: Hospital Onboarding

| Step | Role | Action | Expected |
|------|------|--------|----------|
| 1 | Super Admin | Create new hospital + admin | Hospital created |
| 2 | Admin | Login → see empty dashboard | Dashboard loads |
| 3 | Doctor | Register under new hospital | Account created, pending verification |
| 4 | Admin | Go to "People" → verify the doctor | Doctor is now active |
| 5 | Doctor | Login → can now use all features | All features accessible |

### 🔄 Scenario 6: Emergency QR Access

| Step | Role | Action | Expected |
|------|------|--------|----------|
| 1 | Patient | Generate emergency QR code | QR generated |
| 2 | Anyone | Scan QR with phone | Sees Tier 1 data (name, blood group, allergies) |
| 3 | Patient | Check QR scan history | Shows who scanned and when |

---

## 10. Bug Reporting Template

When you find a bug, copy this template and fill it in:

```
## Bug Report

**Tester Name:** [Your name]
**Date:** [Date]
**Role Tested:** [Patient / Doctor / Staff / Admin / Insurance / Super Admin]
**Page/Feature:** [e.g., Consent Management → Approve Flow]
**Browser & Device:** [e.g., Chrome 120 on Windows 11]

### Steps to Reproduce
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Expected Behavior
[What should have happened]

### Actual Behavior
[What actually happened]

### Screenshot
[Attach screenshot if possible]

### Severity
- [ ] 🔴 Critical — app crashes or data loss
- [ ] 🟠 High — feature doesn't work at all
- [ ] 🟡 Medium — feature works but has issues
- [ ] 🟢 Low — cosmetic / minor UX issue
```

---

## ✅ Testing Checklist

Use this checklist to track your progress:

### Patient Testing
- [ ] Register a patient account
- [ ] Verify email
- [ ] Login successfully
- [ ] View dashboard
- [ ] View medical records (after staff uploads one)
- [ ] Approve a consent request with OTP
- [ ] Deny a consent request
- [ ] Revoke an active consent
- [ ] Generate emergency QR
- [ ] Find a doctor
- [ ] Book an appointment
- [ ] Cancel an appointment
- [ ] Update profile (allergies, conditions)

### Doctor Testing
- [ ] Register as doctor under a hospital
- [ ] Get verified by admin
- [ ] Login successfully
- [ ] Search patient by UHID
- [ ] Request consent
- [ ] View patient records (after consent granted)
- [ ] Create a prescription
- [ ] See pharma-check warning
- [ ] Create clinical notes with ICD-10 code
- [ ] Set availability
- [ ] View appointments

### Staff Testing
- [ ] Register as staff under a hospital
- [ ] Get verified by admin
- [ ] Upload a medical record (PDF)
- [ ] Upload a medical record (JPEG)
- [ ] Test file size limit (>10MB should fail)
- [ ] Search patient by UHID

### Admin Testing
- [ ] Login as hospital admin
- [ ] View dashboard analytics
- [ ] Verify a pending doctor
- [ ] Verify a pending staff member
- [ ] Reject a member with notes
- [ ] View audit logs
- [ ] Filter audit logs
- [ ] View hospital profile

### Insurance Testing
- [ ] Register as insurance provider
- [ ] Submit a new claim
- [ ] View claims list
- [ ] Approve a claim
- [ ] Reject a claim
- [ ] Verify record integrity

### Super Admin Testing
- [ ] Login as super admin
- [ ] View platform dashboard
- [ ] Create a new hospital
- [ ] Verify a hospital
- [ ] View all users
- [ ] View platform audit logs
- [ ] Check platform settings

---

## 📞 Support

If you're stuck or find a critical bug, contact:
- **Sagar** — Project Lead
- Report bugs in the shared document/group

**Happy Testing! 🚀**
