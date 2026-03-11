# UniHealth ID (UHID) - Feature Documentation

> **Version:** 1.0  
> **Last Updated:** March 11, 2026  
> **Status:** ⬜ Planning Phase — No Code Written Yet

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [User Roles](#user-roles)
3. [Patient Features](#1-patient-features)
4. [Doctor Features](#2-doctor-features)
5. [Hospital Staff Features](#3-hospital-staff-features)
6. [Hospital Admin Features](#4-hospital-admin-features)
7. [Insurance Provider Features](#5-insurance-provider-features)
8. [Emergency Access System](#6-emergency-access-system)
9. [AI-Powered Features](#7-ai-powered-features)
10. [Access Control Matrix](#access-control-matrix)

---

## Overview

UniHealth ID (UHID) is a centralized digital health identity platform that provides a **unique 6-digit health ID** to every patient. The platform enables secure storage, access, and sharing of medical records across healthcare providers, with AI-powered insights and drug safety features.

### Core Principles

| Principle | Description |
|-----------|-------------|
| **Single Identity** | One UHID for lifetime health records |
| **Hospital-Verified Data** | Only hospitals can upload medical records |
| **Patient Consent** | Patients control who accesses their data |
| **AI-Assisted Care** | Smart summaries and drug interaction checks |
| **Emergency Ready** | Quick access during medical emergencies |

---

## User Roles

| Role | Description | Primary Actions |
|------|-------------|-----------------|
| **Patient** | Health record owner | View records, manage consent, emergency access |
| **Doctor** | Healthcare provider | View history, prescribe, consultations |
| **Hospital Staff** | Lab technicians, nurses | Upload reports, register patients |
| **Hospital Admin** | Administrative management | Manage staff, view analytics |
| **Insurance Provider** | Claims processing | Verify records, process claims |

---

## 1. Patient Features

Patients are the primary owners of their health data. They can view all their records but cannot upload or modify medical documents.

### 1.1 UHID Registration

**Description:** Every patient receives a unique 6-digit Universal Health ID that remains constant throughout their lifetime.

**Example:**
```
┌─────────────────────────────────────────────────────────────┐
│                    UHID REGISTRATION                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Full Name:        Rajesh Kumar                              │
│  Date of Birth:    15-03-1985                                │
│  Gender:           Male                                       │
│  Phone:            +91-9876543210                            │
│  Email:            rajesh.kumar@email.com                    │
│  Aadhaar:          XXXX-XXXX-4521 (Verified ✓)              │
│                                                               │
│  Emergency Contact:                                           │
│  Name:             Priya Kumar (Wife)                        │
│  Phone:            +91-9876543211                            │
│                                                               │
│  ─────────────────────────────────────────────────────────   │
│                                                               │
│  🎉 Your UHID has been generated!                            │
│                                                               │
│         ┌─────────────────────┐                              │
│         │                     │                              │
│         │      8 4 7 2 9 1    │                              │
│         │                     │                              │
│         └─────────────────────┘                              │
│                                                               │
│  Save this ID - You'll use it for all medical services       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Access:** Patient, Hospital Staff (during registration)

---

### 1.2 Profile Management

**Description:** Patients can update their personal information, emergency contacts, and critical health details.

**Example:**
```
┌─────────────────────────────────────────────────────────────┐
│                    MY HEALTH PROFILE                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  UHID: 847291                     [Edit Profile]             │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  PERSONAL INFORMATION                                │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  Name:          Rajesh Kumar                         │    │
│  │  Age:           41 years                             │    │
│  │  Blood Group:   B+                                   │    │
│  │  Height:        175 cm                               │    │
│  │  Weight:        78 kg                                │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  ⚠️ CRITICAL HEALTH INFO                            │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  Allergies:     Penicillin, Sulfa drugs             │    │
│  │  Conditions:    Type 2 Diabetes, Hypertension       │    │
│  │  Current Meds:  Metformin 500mg, Lisinopril 10mg   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  📞 EMERGENCY CONTACTS                               │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  1. Priya Kumar (Wife)     +91-9876543211           │    │
│  │  2. Amit Kumar (Brother)   +91-9876543212           │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Access:** Patient only

---

### 1.3 View Medical Records

**Description:** Patients can view all their hospital-uploaded medical records including lab reports, imaging, prescriptions, and discharge summaries.

**Example:**
```
┌─────────────────────────────────────────────────────────────┐
│                    MY MEDICAL RECORDS                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  UHID: 847291 - Rajesh Kumar                                 │
│                                                               │
│  Filter: [All Types ▼]  [All Hospitals ▼]  [2026 ▼]        │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  📅 February 20, 2026                                │    │
│  │  🏥 Apollo Hospital, Chennai                         │    │
│  │  📄 Complete Blood Count (CBC)                       │    │
│  │  👨‍⚕️ Dr. Suresh Menon                                │    │
│  │                                                       │    │
│  │  [View Report] [AI Summary] [Download PDF]           │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  📅 February 15, 2026                                │    │
│  │  🏥 Max Hospital, Delhi                              │    │
│  │  📄 Chest X-Ray                                      │    │
│  │  👨‍⚕️ Dr. Priya Sharma                                │    │
│  │                                                       │    │
│  │  [View Image] [AI Summary] [Download PDF]            │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  📅 February 10, 2026                                │    │
│  │  🏥 Apollo Hospital, Chennai                         │    │
│  │  💊 Prescription                                     │    │
│  │  👨‍⚕️ Dr. Suresh Menon                                │    │
│  │                                                       │    │
│  │  [View Prescription] [Check Interactions]            │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  Showing 3 of 47 records                    [Load More]      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Access:** Patient (full), Doctor (with consent), Insurance (with consent)

---

### 1.4 Consent Management

**Description:** Patients control who can access their medical records. They can grant time-limited or permanent access to doctors, hospitals, or insurance providers.

**Example:**
```
┌─────────────────────────────────────────────────────────────┐
│                    CONSENT MANAGEMENT                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  📋 ACTIVE ACCESS PERMISSIONS                        │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │                                                       │    │
│  │  👨‍⚕️ Dr. Suresh Menon                                │    │
│  │     Apollo Hospital, Chennai                         │    │
│  │     Access: Full Records                             │    │
│  │     Valid: Permanent (Primary Doctor)                │    │
│  │     [Modify] [Revoke]                                │    │
│  │                                                       │    │
│  │  ─────────────────────────────────────────────────   │    │
│  │                                                       │    │
│  │  🏥 Max Hospital, Delhi                              │    │
│  │     Access: Emergency Records Only                   │    │
│  │     Valid: Until March 15, 2026                      │    │
│  │     [Modify] [Revoke]                                │    │
│  │                                                       │    │
│  │  ─────────────────────────────────────────────────   │    │
│  │                                                       │    │
│  │  🏢 ICICI Lombard Insurance                          │    │
│  │     Access: Records from Feb 2026 only               │    │
│  │     Purpose: Claim #CLM-2026-4521                    │    │
│  │     Valid: Until March 01, 2026                      │    │
│  │     [Revoke]                                         │    │
│  │                                                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  📨 PENDING ACCESS REQUESTS                          │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │                                                       │    │
│  │  👨‍⚕️ Dr. Anita Desai                                 │    │
│  │     Fortis Hospital, Mumbai                          │    │
│  │     Requesting: Full Medical History                 │    │
│  │     Reason: Cardiac Consultation                     │    │
│  │     Requested: 2 hours ago                           │    │
│  │                                                       │    │
│  │     [✅ Approve]  [❌ Deny]  [⏰ Grant for 24hrs]    │    │
│  │                                                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Access:** Patient only

---

### 1.5 QR Code Generation

**Description:** Patients can generate temporary or permanent QR codes to share their records quickly with healthcare providers.

**Example:**
```
┌─────────────────────────────────────────────────────────────┐
│                    GENERATE ACCESS QR                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Select what to share:                                       │
│                                                               │
│  ☑️ Basic Profile (Name, Blood Group, Allergies)            │
│  ☑️ Current Medications                                      │
│  ☑️ Recent Lab Reports (Last 6 months)                      │
│  ☐ Complete Medical History                                  │
│  ☐ All Prescriptions                                         │
│  ☐ Imaging Reports (X-Ray, MRI, CT)                         │
│                                                               │
│  Access Duration:                                             │
│  ○ 15 minutes (Quick consultation)                           │
│  ● 24 hours (Hospital visit)                                 │
│  ○ 7 days (Extended care)                                    │
│  ○ Custom: [___] days                                        │
│                                                               │
│  ─────────────────────────────────────────────────────────   │
│                                                               │
│                    [Generate QR Code]                        │
│                                                               │
│         ┌─────────────────────────────┐                      │
│         │  ▄▄▄▄▄▄▄ ▄▄▄▄▄ ▄▄▄▄▄▄▄     │                      │
│         │  █ ▄▄▄ █ ▀█▄█▀ █ ▄▄▄ █     │                      │
│         │  █ ███ █ ▀▄▄▄▀ █ ███ █     │                      │
│         │  █▄▄▄▄▄█ ▄▀█▀▄ █▄▄▄▄▄█     │                      │
│         │  ▄▄▄▄▄ ▄▄▄█▀▄▄▄ ▄ ▄ ▄      │                      │
│         │  █ ▄▄▄ █ ▄▄▀██▀▄▄▀▄▄▄█     │                      │
│         │  █▄▄▄▄▄█ ▄▀▀▀ ▀▄▀ ▀▄▄      │                      │
│         └─────────────────────────────┘                      │
│                                                               │
│         Valid until: Feb 27, 2026, 10:30 AM                  │
│         Access Code: 7X9K2M (Backup)                         │
│                                                               │
│         [Download QR]  [Print]  [Share via WhatsApp]         │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Access:** Patient only

---

### 1.6 Report Decoder (AI Summary)

**Description:** AI-powered feature that converts complex medical reports into simple, easy-to-understand language.

**Example:**
```
┌─────────────────────────────────────────────────────────────┐
│                    AI REPORT DECODER                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  📄 Report: Complete Blood Count (CBC)                       │
│  📅 Date: February 20, 2026                                  │
│  🏥 Lab: Apollo Diagnostics, Chennai                         │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  📊 ORIGINAL LAB VALUES                              │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  Parameter        Value      Normal Range   Status   │    │
│  │  ─────────────────────────────────────────────────   │    │
│  │  Hemoglobin       12.8 g/dL  13.0-17.0     ⚠️ Low   │    │
│  │  WBC Count        8,500      4,000-11,000  ✅ Normal │    │
│  │  Platelet Count   245,000    150,000-400K  ✅ Normal │    │
│  │  RBC Count        4.2 M/μL   4.5-5.5       ⚠️ Low   │    │
│  │  Hematocrit       38%        40-50%        ⚠️ Low   │    │
│  │  MCV              90 fL      80-100        ✅ Normal │    │
│  │  MCH              30 pg      27-33         ✅ Normal │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  🤖 AI SIMPLIFIED EXPLANATION                        │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │                                                       │    │
│  │  📌 WHAT THIS REPORT MEANS:                          │    │
│  │                                                       │    │
│  │  Your blood test shows slightly low hemoglobin and   │    │
│  │  red blood cell count. This is called "mild anemia." │    │
│  │                                                       │    │
│  │  🔴 AREAS OF CONCERN:                                │    │
│  │  • Hemoglobin is slightly below normal (12.8 vs 13+) │    │
│  │  • Red blood cells are slightly low                  │    │
│  │                                                       │    │
│  │  ✅ GOOD NEWS:                                        │    │
│  │  • White blood cells are healthy (good immunity)     │    │
│  │  • Platelets are normal (blood clotting is fine)     │    │
│  │                                                       │    │
│  │  💡 SIMPLE RECOMMENDATIONS:                          │    │
│  │  • Eat iron-rich foods (spinach, lentils, red meat)  │    │
│  │  • Include Vitamin C to help iron absorption         │    │
│  │  • Follow up with your doctor in 4-6 weeks           │    │
│  │                                                       │    │
│  │  ⚠️ NOTE: This is AI-generated guidance. Please      │    │
│  │  consult your doctor for medical advice.             │    │
│  │                                                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  [Share with Doctor]  [Ask Follow-up Question]  [Print]      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Access:** Patient, Doctor (with consent)

---

### 1.7 Pharma-Check (Drug Interaction Checker)

**Description:** Patients can check if their current medications have any harmful interactions with new drugs.

**Example:**
```
┌─────────────────────────────────────────────────────────────┐
│                    PHARMA-CHECK                              │
│              Drug Interaction Checker                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Your Current Medications:                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  💊 Metformin 500mg      (Diabetes)      2x daily   │    │
│  │  💊 Lisinopril 10mg      (Blood Pressure) 1x daily  │    │
│  │  💊 Aspirin 75mg         (Blood Thinner)  1x daily  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  Check New Medication:                                       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Enter medicine name: [Ibuprofen 400mg          ]   │    │
│  │                                      [Check Now]     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ─────────────────────────────────────────────────────────   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  🚨 INTERACTION RESULTS                              │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │                                                       │    │
│  │  ⛔ SEVERE INTERACTION FOUND                         │    │
│  │                                                       │    │
│  │  Ibuprofen + Aspirin                                 │    │
│  │  ─────────────────────────────────────────────────   │    │
│  │  Risk Level: 🔴 HIGH                                 │    │
│  │                                                       │    │
│  │  What happens:                                        │    │
│  │  Taking Ibuprofen with Aspirin can increase the      │    │
│  │  risk of stomach bleeding and reduce the heart-      │    │
│  │  protective effects of Aspirin.                      │    │
│  │                                                       │    │
│  │  ─────────────────────────────────────────────────   │    │
│  │                                                       │    │
│  │  ⚠️ MODERATE INTERACTION                             │    │
│  │                                                       │    │
│  │  Ibuprofen + Lisinopril                              │    │
│  │  ─────────────────────────────────────────────────   │    │
│  │  Risk Level: 🟡 MODERATE                             │    │
│  │                                                       │    │
│  │  What happens:                                        │    │
│  │  Ibuprofen may reduce the effectiveness of your      │    │
│  │  blood pressure medication.                          │    │
│  │                                                       │    │
│  │  💡 RECOMMENDATION:                                  │    │
│  │  Consider Paracetamol (Acetaminophen) as a safer    │    │
│  │  alternative for pain relief. Consult your doctor.  │    │
│  │                                                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  [Share with Doctor]  [Find Alternatives]  [Print Report]    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Access:** Patient, Doctor (automatic during prescription)

---

### 1.8 Access History (Audit Log)

**Description:** Patients can see a complete log of who accessed their medical records and when.

**Example:**
```
┌─────────────────────────────────────────────────────────────┐
│                    ACCESS HISTORY                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Filter: [All Users ▼]  [All Actions ▼]  [Last 30 days ▼]  │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  📅 Feb 26, 2026, 09:15 AM                          │    │
│  │  👨‍⚕️ Dr. Suresh Menon                                │    │
│  │  🏥 Apollo Hospital, Chennai                         │    │
│  │  📋 Action: Viewed Complete Blood Count Report       │    │
│  │  ⏱️ Duration: 5 minutes                              │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  📅 Feb 25, 2026, 02:30 PM                          │    │
│  │  🏢 ICICI Lombard Insurance                          │    │
│  │  📋 Action: Verified medical records for claim       │    │
│  │  📄 Records Accessed: 5 documents                    │    │
│  │  ⏱️ Duration: 12 minutes                             │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  📅 Feb 24, 2026, 11:00 AM                          │    │
│  │  🏥 Max Hospital, Delhi (Emergency Override)        │    │
│  │  👨‍⚕️ Dr. Rahul Verma                                 │    │
│  │  📋 Action: Emergency access - Patient unconscious   │    │
│  │  📄 Records Accessed: Emergency profile, allergies   │    │
│  │  ⚠️ Emergency Protocol Activated                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  Showing 3 of 28 access records              [Load More]     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Access:** Patient only

---

### 1.9 Telehealth Booking

**Description:** Patients can book video consultations with doctors and share their records during the call.

**Example:**
```
┌─────────────────────────────────────────────────────────────┐
│                    BOOK CONSULTATION                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Specialty: [General Medicine ▼]                             │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  👨‍⚕️ Dr. Suresh Menon                                │    │
│  │     General Medicine | Apollo Hospital               │    │
│  │     ⭐ 4.8 (324 reviews) | 15 years exp             │    │
│  │     🗣️ English, Hindi, Tamil                        │    │
│  │     💰 ₹500 per consultation                         │    │
│  │                                                       │    │
│  │     Available Slots (Feb 27, 2026):                  │    │
│  │     [10:00 AM] [11:30 AM] [2:00 PM] [4:30 PM]       │    │
│  │                                                       │    │
│  │     [Book Appointment]                               │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ─────────────────────────────────────────────────────────   │
│                                                               │
│  📋 Pre-Consultation Checklist:                              │
│  ☑️ Share recent lab reports (last 3 months)                │
│  ☑️ Share current medications                                │
│  ☐ Describe symptoms (optional)                              │
│                                                               │
│  [Complete Booking - ₹500]                                   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Access:** Patient only (booking), Doctor (conducting)

---

### 1.10 Family Linking

**Description:** Patients can link family members to manage health records for children, elderly parents, or dependents.

**Example:**
```
┌─────────────────────────────────────────────────────────────┐
│                    FAMILY MEMBERS                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Primary Account: Rajesh Kumar (UHID: 847291)                │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  LINKED FAMILY MEMBERS                               │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │                                                       │    │
│  │  👩 Priya Kumar (Wife)                               │    │
│  │     UHID: 847292                                     │    │
│  │     Access: View & Manage                            │    │
│  │     [View Records] [Manage Consents]                 │    │
│  │                                                       │    │
│  │  👦 Arjun Kumar (Son, 8 years)                       │    │
│  │     UHID: 847293                                     │    │
│  │     Access: Full Control (Minor)                     │    │
│  │     [View Records] [Manage Consents]                 │    │
│  │                                                       │    │
│  │  👴 Ramesh Kumar (Father, 72 years)                  │    │
│  │     UHID: 847294                                     │    │
│  │     Access: Caregiver Access                         │    │
│  │     [View Records] [Book Appointments]               │    │
│  │                                                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  [+ Add Family Member]                                       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Access:** Primary account holder

---

## 2. Doctor Features

Doctors can access patient records (with consent), add prescriptions, clinical notes, and receive AI-powered assistance.

### 2.1 Patient Lookup

**Description:** Doctors can search for patients using their UHID or by scanning their QR code.

**Example:**
```
┌─────────────────────────────────────────────────────────────┐
│                    PATIENT LOOKUP                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  🔍 Search Patient:                                          │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                                                       │    │
│  │   Enter UHID: [8 4 7 2 9 1]      [Search]           │    │
│  │                                                       │    │
│  │               ─── OR ───                             │    │
│  │                                                       │    │
│  │         [📷 Scan Patient QR Code]                    │    │
│  │                                                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ─────────────────────────────────────────────────────────   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  ✅ PATIENT FOUND                                    │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │                                                       │    │
│  │  Name:        Rajesh Kumar                           │    │
│  │  UHID:        847291                                 │    │
│  │  Age/Gender:  41 years, Male                         │    │
│  │  Blood Group: B+                                     │    │
│  │                                                       │    │
│  │  ⚠️ Allergies: Penicillin, Sulfa drugs              │    │
│  │                                                       │    │
│  │  ─────────────────────────────────────────────────   │    │
│  │                                                       │    │
│  │  Access Status: 🔒 Consent Required                  │    │
│  │                                                       │    │
│  │  [Request Full Access]                               │    │
│  │                                                       │    │
│  │  Patient will receive OTP to approve access          │    │
│  │                                                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Access:** Doctor (search), Patient (approval)

---

### 2.2 Patient Dashboard (After Consent)

**Description:** Once consent is granted, doctors see a comprehensive dashboard with all patient information.

**Example:**
```
┌─────────────────────────────────────────────────────────────┐
│                    PATIENT DASHBOARD                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  👤 Rajesh Kumar | UHID: 847291 | 41y Male | B+             │
│  🕐 Session: Valid for 2 hours | [End Session]              │
│                                                               │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │ Overview │ Reports  │ History  │ Meds     │ Notes    │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘  │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  🤖 AI CLINICAL SUMMARY                              │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │                                                       │    │
│  │  Key Conditions:                                      │    │
│  │  • Type 2 Diabetes (Diagnosed: 2019)                 │    │
│  │  • Hypertension (Controlled, since 2020)             │    │
│  │                                                       │    │
│  │  Recent Concerns:                                     │    │
│  │  • Mild anemia detected (Feb 2026 CBC)               │    │
│  │  • HbA1c trending up (6.8% → 7.2%)                  │    │
│  │                                                       │    │
│  │  Current Medications: 3 active                        │    │
│  │  Last Visit: Feb 10, 2026 (General checkup)          │    │
│  │                                                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌──────────────────────┐  ┌──────────────────────────┐    │
│  │  ⚠️ ALLERGIES        │  │  📋 RECENT REPORTS       │    │
│  │  • Penicillin        │  │  • CBC (Feb 20)          │    │
│  │  • Sulfa drugs       │  │  • HbA1c (Feb 15)        │    │
│  │  • Shellfish         │  │  • Lipid Panel (Feb 10)  │    │
│  └──────────────────────┘  └──────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  💊 CURRENT MEDICATIONS                              │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  Metformin 500mg    | 2x daily | Since: Jan 2019   │    │
│  │  Lisinopril 10mg    | 1x daily | Since: Mar 2020   │    │
│  │  Aspirin 75mg       | 1x daily | Since: Mar 2020   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  [📝 Add Prescription]  [📋 Add Clinical Notes]  [🔬 Order Test]│
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Access:** Doctor (with patient consent)

---

### 2.3 Add Prescription (with Pharma-Check)

**Description:** When doctors prescribe medications, the system automatically checks for drug interactions before saving.

**Example:**
```
┌─────────────────────────────────────────────────────────────┐
│                    NEW PRESCRIPTION                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Patient: Rajesh Kumar (UHID: 847291)                        │
│  Date: February 26, 2026                                     │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  CURRENT MEDICATIONS (Auto-loaded)                   │    │
│  │  ├── Metformin 500mg (2x daily)                      │    │
│  │  ├── Lisinopril 10mg (1x daily)                      │    │
│  │  └── Aspirin 75mg (1x daily)                         │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  Add New Medications:                                        │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Medicine 1:                                          │    │
│  │  Name: [Warfarin 5mg                            ]    │    │
│  │  Dosage: [1 tablet    ] Frequency: [Once daily  ▼]  │    │
│  │  Duration: [30 days   ] Instructions: [After food]  │    │
│  │                                          [+ Add More]│    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│                     [💊 Check & Save Prescription]           │
│                                                               │
└─────────────────────────────────────────────────────────────┘

                              │
                              ▼

┌─────────────────────────────────────────────────────────────┐
│              ⚠️ PHARMA-CHECK ALERT                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  🚨 CRITICAL INTERACTION DETECTED                            │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                                                       │    │
│  │  ⛔ Warfarin + Aspirin                               │    │
│  │                                                       │    │
│  │  Severity: 🔴 HIGH RISK                              │    │
│  │                                                       │    │
│  │  Clinical Impact:                                     │    │
│  │  Both medications are blood thinners. Combining      │    │
│  │  them significantly increases bleeding risk,         │    │
│  │  especially gastrointestinal bleeding.               │    │
│  │                                                       │    │
│  │  Recommendation:                                      │    │
│  │  • Discontinue Aspirin if starting Warfarin          │    │
│  │  • Or use alternative anticoagulant                  │    │
│  │  • Monitor INR closely if must use together          │    │
│  │                                                       │    │
│  │  Reference: FDA Drug Interaction Database            │    │
│  │                                                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  🔄 SUGGESTED ALTERNATIVES                           │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  • Clopidogrel 75mg (Lower bleeding risk)           │    │
│  │  • Rivaroxaban 10mg (No INR monitoring needed)      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  Choose Action:                                              │
│                                                               │
│  [⚠️ Proceed Anyway]  [✏️ Modify Prescription]  [❌ Cancel] │
│       (Logged)                                               │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Access:** Doctor only

---

### 2.4 Add Clinical Notes

**Description:** Doctors can document consultation findings, observations, and treatment plans.

**Example:**
```
┌─────────────────────────────────────────────────────────────┐
│                    CLINICAL NOTES                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Patient: Rajesh Kumar (UHID: 847291)                        │
│  Visit Date: February 26, 2026                               │
│  Visit Type: [Follow-up Consultation ▼]                      │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  CHIEF COMPLAINT                                     │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │ Patient complains of fatigue and occasional │    │    │
│  │  │ dizziness for the past 2 weeks.            │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  EXAMINATION FINDINGS                                │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │ BP: 130/85 mmHg                             │    │    │
│  │  │ Pulse: 78 bpm, regular                      │    │    │
│  │  │ Mild pallor noted in conjunctiva            │    │    │
│  │  │ No pedal edema                              │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  DIAGNOSIS                                           │    │
│  │  [🔍 Search ICD-10: Iron deficiency anemia     ]    │    │
│  │  Selected: D50.9 - Iron deficiency anemia, unsp.    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  TREATMENT PLAN                                      │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │ 1. Start iron supplementation               │    │    │
│  │  │ 2. Dietary modifications - increase iron    │    │    │
│  │  │ 3. Repeat CBC in 6 weeks                    │    │    │
│  │  │ 4. Monitor for GI symptoms                  │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  [Save Notes]  [Save & Add Prescription]  [Cancel]           │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Access:** Doctor only (create), Patient (view)

---

### 2.5 Emergency Override Access

**Description:** In emergency situations, doctors can access patient records without prior consent. All emergency access is logged and audited.

**Example:**
```
┌─────────────────────────────────────────────────────────────┐
│              🚨 EMERGENCY ACCESS REQUEST                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ⚠️ You are requesting emergency access to patient records  │
│  without prior consent. This action is logged and audited.  │
│                                                               │
│  Patient UHID: [847291        ]                              │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  EMERGENCY REASON (Required)                         │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  ● Patient is unconscious                            │    │
│  │  ○ Life-threatening emergency                        │    │
│  │  ○ Patient unable to provide consent                 │    │
│  │  ○ Other: [_______________________________]         │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  Additional Details:                                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Patient brought to ER after road accident.          │    │
│  │ Need to check allergies before administering        │    │
│  │ medication and check for existing conditions.       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  📋 VERIFICATION                                     │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  Doctor: Dr. Rahul Verma (ID: DR-4521)              │    │
│  │  Hospital: Max Hospital, Delhi (Verified)           │    │
│  │  Department: Emergency Medicine                      │    │
│  │  Current Location: Emergency Room                    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ☑️ I confirm this is a genuine medical emergency           │
│  ☑️ I understand this access is logged and audited          │
│  ☑️ Patient will be notified after emergency                │
│                                                               │
│  [🚨 Grant Emergency Access]            [Cancel]             │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Access:** Doctor (emergency only), logged for audit

---

## 3. Hospital Staff Features

Hospital staff (lab technicians, nurses, administrative staff) are responsible for uploading and managing patient medical records.

### 3.1 Patient Registration

**Description:** Register new patients and generate their UHID.

**Example:**
```
┌─────────────────────────────────────────────────────────────┐
│                    NEW PATIENT REGISTRATION                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  🏥 Apollo Hospital, Chennai                                 │
│  👤 Staff: Nurse Lakshmi (ID: STF-2341)                     │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  PATIENT INFORMATION                                 │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  Full Name:      [Ananya Sharma                 ]   │    │
│  │  Date of Birth:  [12-06-1990                    ]   │    │
│  │  Gender:         [Female ▼]                         │    │
│  │  Phone:          [+91-9876543215                ]   │    │
│  │  Email:          [ananya.sharma@email.com       ]   │    │
│  │  Address:        [42, MG Road, Chennai          ]   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  IDENTITY VERIFICATION                               │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  Aadhaar Number: [XXXX-XXXX-4532]  [Verify OTP]    │    │
│  │  Status: ✅ Verified                                │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  EMERGENCY CONTACT                                   │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  Name:          [Vikram Sharma                  ]   │    │
│  │  Relationship:  [Husband ▼]                         │    │
│  │  Phone:         [+91-9876543216                 ]   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  CRITICAL HEALTH INFO (Optional)                    │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  Blood Group:    [A+ ▼]                             │    │
│  │  Known Allergies:[None                          ]   │    │
│  │  Chronic Conditions: [None                      ]   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│                    [Register Patient]                        │
│                                                               │
└─────────────────────────────────────────────────────────────┘

                              │
                              ▼

┌─────────────────────────────────────────────────────────────┐
│              ✅ PATIENT REGISTERED SUCCESSFULLY             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│         ┌─────────────────────────────┐                      │
│         │                             │                      │
│         │      UHID: 8 4 7 2 9 5      │                      │
│         │                             │                      │
│         └─────────────────────────────┘                      │
│                                                               │
│  Patient: Ananya Sharma                                      │
│  Registered at: Apollo Hospital, Chennai                     │
│  Date: February 26, 2026, 10:45 AM                          │
│                                                               │
│  SMS sent to: +91-9876543215                                │
│  Email sent to: ananya.sharma@email.com                     │
│                                                               │
│  [Print UHID Card]  [Upload Records]  [New Registration]    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Access:** Hospital Staff only

---

### 3.2 Upload Medical Records

**Description:** Upload lab reports, imaging results, prescriptions, and other medical documents. The system extracts data using OCR and AI.

**Example:**
```
┌─────────────────────────────────────────────────────────────┐
│                    UPLOAD MEDICAL RECORD                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Patient: [Search UHID or Name: 847291            ] [Find]  │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  ✅ PATIENT FOUND                                    │    │
│  │  Name: Rajesh Kumar | UHID: 847291 | 41y Male       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ─────────────────────────────────────────────────────────   │
│                                                               │
│  Record Type: [Lab Report ▼]                                 │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  📄 Sub-type:                                        │    │
│  │  ○ Complete Blood Count (CBC)                        │    │
│  │  ● Lipid Profile                                     │    │
│  │  ○ Liver Function Test (LFT)                         │    │
│  │  ○ Kidney Function Test (KFT)                        │    │
│  │  ○ Thyroid Profile                                   │    │
│  │  ○ HbA1c                                             │    │
│  │  ○ Other: [________________]                         │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  Test Date: [26-02-2026        ]                            │
│  Referring Doctor: [Dr. Suresh Menon ▼]                     │
│  Department: [General Medicine ▼]                            │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                                                       │    │
│  │         📁 Drop files here or click to browse        │    │
│  │                                                       │    │
│  │         Supported: PDF, JPG, PNG (Max 10MB)          │    │
│  │                                                       │    │
│  │  ┌───────────────────────────────────────────────┐  │    │
│  │  │  📄 lipid_profile_847291.pdf                  │  │    │
│  │  │     2.3 MB | Uploaded ✓                       │  │    │
│  │  └───────────────────────────────────────────────┘  │    │
│  │                                                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  [🔍 Process & Extract Data]                                 │
│                                                               │
└─────────────────────────────────────────────────────────────┘

                              │
                              ▼

┌─────────────────────────────────────────────────────────────┐
│              🤖 AI DATA EXTRACTION COMPLETE                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  EXTRACTED VALUES (Please verify)                    │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  Parameter           │ Value    │ Unit   │ Status   │    │
│  │  ─────────────────────────────────────────────────   │    │
│  │  Total Cholesterol   │ 215      │ mg/dL  │ ⚠️ High  │    │
│  │  HDL Cholesterol     │ 45       │ mg/dL  │ ⚠️ Low   │    │
│  │  LDL Cholesterol     │ 140      │ mg/dL  │ ⚠️ High  │    │
│  │  Triglycerides       │ 180      │ mg/dL  │ ⚠️ High  │    │
│  │  VLDL                │ 36       │ mg/dL  │ ✅ Normal│    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ☑️ I have verified the extracted data is correct           │
│                                                               │
│  [✅ Confirm & Save]  [✏️ Edit Values]  [❌ Cancel]         │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Access:** Hospital Staff only

---

### 3.3 Upload Imaging Reports

**Description:** Upload X-rays, MRI, CT scans, ECG, and ultrasound images.

**Example:**
```
┌─────────────────────────────────────────────────────────────┐
│                    UPLOAD IMAGING REPORT                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Patient: Rajesh Kumar | UHID: 847291                        │
│                                                               │
│  Imaging Type: [MRI ▼]                                       │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  📄 Body Part:                                       │    │
│  │  ○ Brain                                             │    │
│  │  ● Spine - Lumbar                                    │    │
│  │  ○ Spine - Cervical                                  │    │
│  │  ○ Knee                                              │    │
│  │  ○ Shoulder                                          │    │
│  │  ○ Abdomen                                           │    │
│  │  ○ Other: [________________]                         │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  Scan Date: [26-02-2026        ]                            │
│  Radiologist: [Dr. Meera Nair ▼]                            │
│  Clinical Indication: [Lower back pain since 3 months   ]   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  📁 UPLOAD FILES                                     │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │                                                       │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │  📄 MRI_Lumbar_847291.dcm                   │    │    │
│  │  │     15.4 MB | DICOM | Uploaded ✓            │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  │                                                       │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │  📄 MRI_Report_847291.pdf                   │    │    │
│  │  │     1.2 MB | PDF | Uploaded ✓               │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  │                                                       │    │
│  │  [+ Add More Files]                                  │    │
│  │                                                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  📝 RADIOLOGIST FINDINGS (From Report)              │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │ Mild disc bulge at L4-L5 level with no      │    │    │
│  │  │ significant nerve root compression.          │    │    │
│  │  │ Vertebral bodies show normal signal.        │    │    │
│  │  │ No evidence of spinal stenosis.             │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  [✅ Save Imaging Report]  [Cancel]                          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Access:** Hospital Staff only

---

## 4. Hospital Admin Features

Hospital administrators manage staff, monitor operations, and ensure compliance.

### 4.1 Staff Management

**Description:** Add, verify, and manage hospital staff with appropriate access levels.

**Example:**
```
┌─────────────────────────────────────────────────────────────┐
│                    STAFF MANAGEMENT                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  🏥 Apollo Hospital, Chennai                                 │
│                                                               │
│  [+ Add Staff]  [📊 Export]  Filter: [All Departments ▼]   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  NAME           │ ROLE        │ DEPT     │ STATUS   │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  Dr. Suresh M.  │ Doctor      │ Medicine │ ✅ Active│    │
│  │  Dr. Priya S.   │ Doctor      │ Cardio   │ ✅ Active│    │
│  │  Lakshmi K.     │ Nurse       │ General  │ ✅ Active│    │
│  │  Ravi Kumar     │ Lab Tech    │ Pathology│ ✅ Active│    │
│  │  Sunita P.      │ Receptionist│ Front    │ ⏸️ Leave │    │
│  │  Dr. Amit R.    │ Doctor      │ Ortho    │ 🔴 Pending│    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  🔴 PENDING VERIFICATIONS                            │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │                                                       │    │
│  │  Dr. Amit Rajan                                      │    │
│  │  Role: Doctor (Orthopedics)                          │    │
│  │  Medical License: KA-MED-2015-4521                   │    │
│  │  Submitted: Feb 25, 2026                             │    │
│  │                                                       │    │
│  │  Documents:                                           │    │
│  │  ✅ Medical Degree Certificate                       │    │
│  │  ✅ Medical Council Registration                     │    │
│  │  ⏳ Background Verification (In Progress)           │    │
│  │                                                       │    │
│  │  [✅ Approve]  [❌ Reject]  [📄 View Documents]     │    │
│  │                                                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Access:** Hospital Admin only

---

### 4.2 Analytics Dashboard

**Description:** View hospital-wide statistics and operational metrics.

**Example:**
```
┌─────────────────────────────────────────────────────────────┐
│                    HOSPITAL ANALYTICS                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  🏥 Apollo Hospital, Chennai | February 2026                 │
│                                                               │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│  │   PATIENTS   │ │   RECORDS    │ │    STAFF     │         │
│  │    1,245     │ │    8,432     │ │     156      │         │
│  │   This Month │ │   Uploaded   │ │    Active    │         │
│  │   ↑ 12%      │ │   ↑ 23%      │ │   ↑ 3       │         │
│  └──────────────┘ └──────────────┘ └──────────────┘         │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  📊 RECORDS BY TYPE                                  │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │                                                       │    │
│  │  Lab Reports     ████████████████████  4,521 (54%)  │    │
│  │  Prescriptions   ██████████████        2,134 (25%)  │    │
│  │  Imaging         ██████                1,102 (13%)  │    │
│  │  Discharge       ████                    675 (8%)   │    │
│  │                                                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  ⚠️ PHARMA-CHECK ALERTS THIS MONTH                  │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │                                                       │    │
│  │  Total Alerts:        234                            │    │
│  │  Critical Prevented:   45 (19%)                      │    │
│  │  Doctor Overrides:     12 (5%)                       │    │
│  │  Modified Prescriptions: 189 (81%)                   │    │
│  │                                                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Access:** Hospital Admin only

---

### 4.3 Audit Logs

**Description:** Track all system activities for compliance and security.

**Example:**
```
┌─────────────────────────────────────────────────────────────┐
│                    SYSTEM AUDIT LOGS                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Filter: [All Actions ▼] [All Users ▼] [Last 7 days ▼]     │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  TIMESTAMP       │ USER        │ ACTION    │ DETAILS │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  Feb 26, 10:45   │ Ravi Kumar  │ UPLOAD    │ Lab     │    │
│  │                  │ (Lab Tech)  │           │ report  │    │
│  │                  │             │           │ 847291  │    │
│  │──────────────────────────────────────────────────────│    │
│  │  Feb 26, 10:30   │ Dr. Suresh  │ VIEW      │ Patient │    │
│  │                  │ (Doctor)    │           │ 847291  │    │
│  │──────────────────────────────────────────────────────│    │
│  │  Feb 26, 10:28   │ Dr. Suresh  │ PRESCRIBE │ Rx with │    │
│  │                  │ (Doctor)    │           │ alert   │    │
│  │                  │             │           │ override│    │
│  │──────────────────────────────────────────────────────│    │
│  │  Feb 26, 09:15   │ SYSTEM      │ EMERGENCY │ Dr.Rahul│    │
│  │                  │             │ ACCESS    │ accessed│    │
│  │                  │             │           │ 847291  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  [Export CSV]  [Generate Compliance Report]                  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Access:** Hospital Admin only

---

## 5. Insurance Provider Features

Insurance providers can verify patient records (with consent) for claim processing.

### 5.1 Request Patient Access

**Description:** Request consent from patients to access their medical records for claim verification.

**Example:**
```
┌─────────────────────────────────────────────────────────────┐
│                    REQUEST PATIENT ACCESS                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  🏢 ICICI Lombard Insurance                                  │
│  👤 Agent: Sunil Mehta (ID: INS-7842)                       │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  CLAIM DETAILS                                       │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  Claim Number:    CLM-2026-4521                      │    │
│  │  Policy Number:   POL-8574621                        │    │
│  │  Claim Type:      Hospitalization                    │    │
│  │  Claim Amount:    ₹2,50,000                          │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  Patient UHID: [847291        ]  [Find Patient]             │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  ✅ PATIENT FOUND                                    │    │
│  │  Name: Rajesh Kumar | UHID: 847291                   │    │
│  │  Policy Status: Active ✓                             │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  SELECT RECORDS TO REQUEST                           │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  ☑️ Admission Records (Feb 2026)                     │    │
│  │  ☑️ Discharge Summary                                │    │
│  │  ☑️ Treatment Records                                │    │
│  │  ☑️ Billing Details                                  │    │
│  │  ☐ Complete Medical History                          │    │
│  │  ☐ All Lab Reports                                   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  Access Duration: [7 days ▼]                                 │
│  Purpose: [Claim verification for hospitalization     ]     │
│                                                               │
│  [📨 Send Access Request to Patient]                        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Access:** Insurance Provider only

---

### 5.2 Verify & Process Claims

**Description:** Review verified medical records and process insurance claims.

**Example:**
```
┌─────────────────────────────────────────────────────────────┐
│                    CLAIM VERIFICATION                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Claim: CLM-2026-4521 | Patient: Rajesh Kumar (847291)      │
│  Access: ✅ Granted until March 05, 2026                    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  📋 VERIFIED MEDICAL RECORDS                         │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │                                                       │    │
│  │  Document             │ Source      │ Date    │ ✓    │    │
│  │  ─────────────────────────────────────────────────   │    │
│  │  Admission Report     │ Apollo Hosp │ Feb 10  │ ✅   │    │
│  │  ECG Report           │ Apollo Hosp │ Feb 10  │ ✅   │    │
│  │  Angiography Report   │ Apollo Hosp │ Feb 11  │ ✅   │    │
│  │  Surgery Notes        │ Apollo Hosp │ Feb 12  │ ✅   │    │
│  │  Discharge Summary    │ Apollo Hosp │ Feb 18  │ ✅   │    │
│  │  Final Bill           │ Apollo Hosp │ Feb 18  │ ✅   │    │
│  │                                                       │    │
│  │  [View Document] for each row                        │    │
│  │                                                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  🔐 BLOCKCHAIN VERIFICATION                          │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  ✅ All documents verified                           │    │
│  │  ✅ Hospital source authenticated                    │    │
│  │  ✅ No tampering detected                            │    │
│  │  ✅ Upload timestamps verified                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  🤖 AI FRAUD CHECK                                   │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  ✅ Diagnosis consistent with treatment              │    │
│  │  ✅ Timeline is logical                              │    │
│  │  ✅ Hospital is network partner                      │    │
│  │  ✅ No duplicate claims found                        │    │
│  │  ✅ Billing within expected range                    │    │
│  │                                                       │    │
│  │  Risk Score: LOW ✅                                  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  💰 CLAIM DECISION                                   │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │                                                       │    │
│  │  Claimed Amount:      ₹2,50,000                      │    │
│  │  Eligible Amount:     ₹2,35,000                      │    │
│  │  Deductions:          ₹15,000 (Non-covered items)   │    │
│  │                                                       │    │
│  │  Decision: [Approve ▼]                               │    │
│  │  Notes: [Standard cardiac procedure claim      ]    │    │
│  │                                                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  [✅ Approve Claim]  [❌ Reject]  [⏸️ Request More Info]   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Access:** Insurance Provider (with patient consent)

---

## 6. Emergency Access System

Special access mechanisms for medical emergencies.

### 6.1 Patient SOS Mode

**Description:** Patients can activate emergency mode to alert contacts and enable quick medical access.

**Example:**
```
┌─────────────────────────────────────────────────────────────┐
│                    🚨 SOS MODE ACTIVATED                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Patient: Rajesh Kumar | UHID: 847291                        │
│  Activated: Feb 26, 2026, 03:45 PM                          │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  ✅ ACTIONS COMPLETED                                │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │                                                       │    │
│  │  📍 Location shared with emergency contacts          │    │
│  │     GPS: 13.0827° N, 80.2707° E                     │    │
│  │     Address: Near Apollo Hospital, Chennai           │    │
│  │                                                       │    │
│  │  📱 SMS alerts sent to:                              │    │
│  │     • Priya Kumar (Wife): +91-9876543211            │    │
│  │     • Amit Kumar (Brother): +91-9876543212          │    │
│  │                                                       │    │
│  │  🏥 Nearby hospitals notified:                       │    │
│  │     • Apollo Hospital (0.5 km)                       │    │
│  │     • Government Hospital (1.2 km)                   │    │
│  │                                                       │    │
│  │  🔓 Emergency access code generated:                 │    │
│  │     Code: 7X9K2M (Valid for 2 hours)                │    │
│  │                                                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  📋 EMERGENCY INFO (Visible to Responders)          │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │                                                       │    │
│  │  🆔 UHID: 847291                                     │    │
│  │  🩸 Blood Type: B+                                   │    │
│  │  ⚠️ Allergies: Penicillin, Sulfa                    │    │
│  │  💊 Current Meds: Metformin, Lisinopril, Aspirin    │    │
│  │  🏥 Conditions: Type 2 Diabetes, Hypertension       │    │
│  │  📞 Emergency: +91-9876543211 (Wife)                │    │
│  │                                                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  [🆘 Call Ambulance]  [📞 Call Emergency Contact]           │
│                                                               │
│  [Deactivate SOS Mode]                                       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Access:** Patient (activate), Emergency responders (view)

---

### 6.2 Emergency QR Card — 3-Tier Security Model

**Description:** Physical or digital QR card that provides critical medical information without login. Uses a **3-tier access model** to balance emergency utility with privacy protection. Allergy names are **never** shown to anonymous scanners — only confirmed to present (prevents phone-theft harm scenarios).

#### Tier 1 — Public Scan (Anyone with a phone)
```
┌─────────────────────────────────────────────────────────────┐
│              EMERGENCY HEALTH CARD                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │     ┌───────────────┐    UNIHEALTH ID               │    │
│  │     │  QR CODE      │    EMERGENCY CARD             │    │
│  │     │  ▄▄▄▄▄▄▄▄▄▄▄  │                               │    │
│  │     │  █ ▄▄▄ █▄█▀█  │    Name: Rajesh Kumar         │    │
│  │     │  █ ███ █▀▄▄█  │    UHID: UHID-847291          │    │
│  │     │  █▄▄▄▄▄█▄█▄█  │    Blood: B+                  │    │
│  │     │  █▄█▄█▄█▄█▄█  │                               │    │
│  │     └───────────────┘    ⚠️ Has Critical Allergy    │    │
│  │                           (Call contact for details) │    │
│  │     Emergency Contact: +91-9876543211               │    │
│  │     SCAN QR FOR MORE INFO (Doctor login required    │    │
│  │     for full medical details)                       │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```
**What Tier 1 shows:** Name · Blood group · "Has critical allergy: YES" (type hidden) · Emergency contact number
**What Tier 1 hides:** Allergy names · Medications · Conditions · Medical history

#### Tier 2 — Doctor Scan (Verified UHID doctor login required)
```
┌─────────────────────────────────────────────────────────────┐
│  🏥 FULL EMERGENCY PROFILE  [🔵 Doctor Access — Logged]     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Blood Type: B+                                              │
│  ⚠️ ALLERGIES: Penicillin, Sulfa drugs                      │
│                                                               │
│  Conditions:                                                  │
│  • Type 2 Diabetes (Since 2019)                             │
│  • Hypertension (Controlled)                                 │
│                                                               │
│  Current Medications:                                         │
│  • Metformin 500mg (Diabetes)                               │
│  • Lisinopril 10mg (Blood Pressure)                         │
│  • Aspirin 75mg (Blood Thinner)                             │
│                                                               │
│  Emergency Contact:                                           │
│  Priya Kumar (Wife): +91-9876543211                         │
│                                                               │
│  [View Full Medical Records]                                 │
│                                                               │
│  ⚠️ This access has been logged. Patient will be notified.  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```
**Who can access:** Any doctor with a verified UHID account (DOCTOR role)
**Patient is notified:** Instant SMS — "Dr. [Name] at [Hospital] viewed your emergency profile at [time]"

#### Tier 3 — Patient-Initiated Share (One-time 10-minute link)
```
┌─────────────────────────────────────────────────────────────┐
│  🔴 TEMPORARY FULL ACCESS  [Expires in 08:42]               │
├─────────────────────────────────────────────────────────────┤
│  Patient authorized this share. Full profile visible:       │
│  All records · All allergies · All medications · Notes      │
│  Insurance details · Lab reports                            │
│                                                               │
│  🔴 This is a ONE-TIME link. Auto-expires. Logged.          │
└─────────────────────────────────────────────────────────────┘
```
**Who can access:** Anyone with the temporary link (patient generates it consciously)
**Auto-expires:** 10 minutes · single-use · patient gets SMS confirmation when used

#### Tier Summary

| Feature | Tier 1 (Public) | Tier 2 (Doctor) | Tier 3 (Patient) |
|---------|----------------|-----------------|------------------|
| Login required | ❌ None | ✅ UHID doctor | ❌ None (patient pre-auth) |
| Blood group | ✅ Shown | ✅ Shown | ✅ Shown |
| Allergy names | ❌ Hidden | ✅ Shown | ✅ Shown |
| Medications | ❌ Hidden | ✅ Shown | ✅ Shown |
| Conditions | ❌ Hidden | ✅ Shown | ✅ Shown |
| Full records | ❌ Hidden | 🔵 With permission | ✅ Shown |
| Access logged | ✅ Yes | ✅ Yes (with identity) | ✅ Yes |
| Patient notified | ✅ SMS | ✅ SMS + name | ✅ SMS on use |
| Expiry | 24h auto-rotate | Session | 10 min / single-use |

**Access:** Anyone (Tier 1) · Verified UHID doctors (Tier 2) · Patient-authorized anyone (Tier 3)

---

## 7. AI-Powered Features

### 7.1 Report Decoder Engine

**Description:** Converts complex medical terminology into patient-friendly language.

**Capabilities:**
- Lab report interpretation
- Medical term explanations
- Risk level indicators
- Lifestyle recommendations
- Follow-up suggestions

**Example Input → Output:**
```
INPUT (Medical Report):
"Hemoglobin: 10.2 g/dL (Ref: 13.0-17.0)
MCV: 72 fL (Ref: 80-100)
Serum Ferritin: 8 ng/mL (Ref: 20-250)"

OUTPUT (Patient-Friendly):
"Your blood tests show signs of iron deficiency anemia:

🔴 What This Means:
Your body doesn't have enough iron to make healthy red blood 
cells. This can make you feel tired, weak, or short of breath.

💡 Simple Steps:
• Eat iron-rich foods: spinach, lentils, red meat
• Have Vitamin C with meals to absorb iron better
• Avoid tea/coffee with meals (blocks iron absorption)

⚠️ Important:
Please see your doctor. You may need iron supplements.
This is not a diagnosis - consult your healthcare provider."
```

---

### 7.2 Pharma-Check Engine

**Description:** Real-time drug interaction detection system.

**Capabilities:**
- Drug-drug interactions
- Drug-allergy checks
- Drug-condition warnings
- Dosage recommendations
- Alternative suggestions

**Database Sources:**
- OpenFDA API (primary — free, 100k req/day)
- icd10-codes npm (ICD-10 offline lookup)
- FDA Drug Interactions

---

### 7.3 AI Clinical Summary

**Description:** Generates concise clinical summaries for doctors.

**Example Output:**
```
┌─────────────────────────────────────────────────────────────┐
│  🤖 AI CLINICAL SUMMARY - Rajesh Kumar (847291)            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  📌 KEY POINTS                                               │
│  • 41-year-old male with Type 2 DM and Hypertension         │
│  • Well-controlled on current medications                    │
│  • Recent CBC shows mild iron deficiency anemia             │
│  • HbA1c trending upward (6.8% → 7.2%)                     │
│                                                               │
│  ⚠️ ATTENTION REQUIRED                                      │
│  • Diabetes control deteriorating - review diet/medication  │
│  • Anemia needs investigation - consider iron studies       │
│  • Due for annual eye and kidney screening                  │
│                                                               │
│  💊 CURRENT MEDICATIONS                                      │
│  • Metformin 500mg BD - Adequate for current HbA1c         │
│  • Lisinopril 10mg OD - BP well controlled                 │
│  • Aspirin 75mg OD - Continue for CV protection            │
│                                                               │
│  📅 LAST VISITS                                              │
│  • Feb 10, 2026 - General checkup (Dr. Suresh)             │
│  • Jan 05, 2026 - Diabetes review (Dr. Suresh)             │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Access Control Matrix

### Summary Table

| Feature | Patient | Doctor | Hospital Staff | Hospital Admin | Insurance |
|---------|:-------:|:------:|:--------------:|:--------------:|:---------:|
| **UHID Registration** | ✅ | - | ✅ | - | - |
| **View Own Records** | ✅ | - | - | - | - |
| **View Patient Records** | - | 🔶 | 🔶 | ❌ | 🔶 |
| **Upload Records** | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Add Prescriptions** | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Report Decoder** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Pharma-Check** | ✅ | ✅ (Auto) | ❌ | ❌ | ❌ |
| **Consent Management** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Emergency Override** | SOS | ✅ | ❌ | ❌ | ❌ |
| **Staff Management** | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Analytics Dashboard** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Audit Logs** | Own | Own | ❌ | ✅ | Own |
| **Claim Processing** | ❌ | ❌ | ❌ | ❌ | ✅ |

**Legend:**
- ✅ Full Access
- 🔶 Conditional (Consent/Session based)
- ❌ No Access
- `-` Not Applicable

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Feb 26, 2026 | Project Team | Initial feature documentation |

---

*This document outlines the planned features for UniHealth ID. Implementation details and technical specifications will be documented separately.*
