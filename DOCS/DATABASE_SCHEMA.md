# Database Schema Reference# Database Schema Reference# Database Schema Reference



> **Version:** 2.1 — QR 3-Tier Security Model Added

> **Last Updated:** March 11, 2026

> **Status:** ⬜ PLANNED — Ready for `schema.prisma` implementation> **Version:** 2.0 — Fully Resolved  > Complete reference for all 22 database models in UHID. Generated from `apps/api/prisma/schema.prisma`.

> Single source of truth for all **28 database models** and **24 enums**.

> All naming conflicts resolved. All missing tables added.> **Last Updated:** March 11, 2026  



---> **Status:** ⬜ PLANNED — Ready for `schema.prisma` implementation  ---



## 📋 Table of Contents> Single source of truth for all 27 database models and all enums.  



1. [Entity Relationship Overview](#1-entity-relationship-overview)> All naming conflicts resolved. All missing tables added.## 📋 Table of Contents

2. [Enums — Complete Definitions](#2-enums--complete-definitions)

3. [User & Role Models](#3-user--role-models)

4. [Medical Data Models](#4-medical-data-models)

5. [Access Control Models](#5-access-control-models)---1. [Entity Relationship Overview](#1-entity-relationship-overview)

6. [AI & Logging Models](#6-ai--logging-models)

7. [Financial Models](#7-financial-models)2. [Enums](#2-enums)

8. [Telehealth & Notifications Models](#8-telehealth--notifications-models)

9. [Lookup Data Models](#9-lookup-data-models)## 📋 Table of Contents3. [User & Role Models](#3-user--role-models)

10. [Indexes & Performance](#10-indexes--performance)

11. [Naming Conflict Resolutions](#11-naming-conflict-resolutions)4. [Medical Data Models](#4-medical-data-models)



---1. [Entity Relationship Overview](#1-entity-relationship-overview)5. [Access Control Models](#5-access-control-models)



## 1. Entity Relationship Overview2. [Enums — Complete Definitions](#2-enums--complete-definitions)6. [AI & Logging Models](#6-ai--logging-models)



```3. [User & Role Models](#3-user--role-models)7. [Financial Models](#7-financial-models)

users (central identity)

  ├── patients (UHID, health data)4. [Medical Data Models](#4-medical-data-models)8. [Indexes & Performance](#8-indexes--performance)

  │     ├── medical_records

  │     ├── prescriptions → prescription_items5. [Access Control Models](#5-access-control-models)

  │     ├── clinical_notes

  │     ├── consents6. [AI & Logging Models](#6-ai--logging-models)---

  │     ├── qr_codes → qr_scan_logs

  │     ├── emergency_accesses7. [Financial Models](#7-financial-models)

  │     ├── appointments

  │     ├── family_links (self-referential)8. [Telehealth & Notifications Models](#8-telehealth--notifications-models)## 1. Entity Relationship Overview

  │     ├── insurance_claims → claim_documents

  │     ├── ai_report_summaries9. [Lookup Data Models](#9-lookup-data-models)

  │     └── doctor_reviews (ratings given by patient)

  │10. [Indexes & Performance](#10-indexes--performance)```

  ├── doctors (linked to hospital)

  │     ├── prescriptions (issued)11. [Naming Conflict Resolutions](#11-naming-conflict-resolutions)users (central identity)

  │     ├── clinical_notes (written)

  │     ├── appointments (scheduled)  ├── patients (UHID, health data)

  │     ├── consents (requested)

  │     ├── pharma_check_logs---  │     ├── medical_records

  │     ├── doctor_availability (weekly schedule)

  │     └── doctor_reviews (reviews received)  │     ├── prescriptions → prescription_items

  │

  ├── hospital_staff (linked to hospital)## 1. Entity Relationship Overview  │     ├── clinical_notes

  │     └── medical_records (uploaded)

  │  │     ├── consents

  ├── hospital_admins (linked to hospital)

  │     └── hospitals (managed)```  │     ├── qr_codes

  │

  ├── insurance_providersusers (central identity)  │     ├── emergency_accesses

  │     ├── consents (requested)

  │     └── insurance_claims (processed)  ├── patients (UHID, health data)  │     ├── appointments

  │

  └── super_admins  │     ├── medical_records  │     ├── family_links (self-referential)



hospitals  │     ├── prescriptions → prescription_items  │     ├── insurance_claims → claim_documents

  ├── doctors

  ├── hospital_staff  │     ├── clinical_notes  │     └── ai_report_summaries

  ├── hospital_admins

  └── appointments  │     ├── consents  │



notifications       (per-user inbox — 30-day TTL, cron cleanup)  │     ├── qr_codes  ├── doctors (linked to hospital)

audit_logs          (append-only, permanent — never deleted)

drug_interactions   (seeded reference data, OpenFDA-sourced)  │     ├── emergency_accesses  │     ├── prescriptions (issued)

icd10_codes         (seeded once, ~70,000 codes, npm package)

```  │     ├── emergency_contacts  │     ├── clinical_notes (written)



**Total Tables: 28**  │     ├── appointments  │     ├── appointments (scheduled)



---  │     ├── family_links (self-referential)  │     ├── consents (requested)



## 2. Enums — Complete Definitions  │     ├── insurance_claims → claim_documents  │     └── pharma_check_logs



> ⚠️ These are final. Use exactly these values in `schema.prisma`. No other enum values are valid.  │     ├── ai_report_summaries  │



### Role  │     └── doctor_reviews (ratings given by patient)  ├── hospital_staff (linked to hospital)



```prisma  │  │     └── medical_records (uploaded)

enum Role {

  PATIENT  ├── doctors (linked to hospital)  │

  DOCTOR

  HOSPITAL_STAFF  │     ├── prescriptions (issued)  ├── hospital_admins (linked to hospital)

  HOSPITAL_ADMIN

  INSURANCE_PROVIDER  │     ├── clinical_notes (written)  │     └── hospitals (managed)

  SUPER_ADMIN

}  │     ├── appointments (scheduled)  │

```

  │     ├── consents (requested)  ├── insurance_providers

### Gender

  │     ├── pharma_check_logs  │     ├── consents (requested)

```prisma

enum Gender {  │     ├── doctor_availability (weekly schedule)  │     └── insurance_claims (submitted)

  MALE

  FEMALE  │     └── doctor_reviews (reviews received)  │

  OTHER

  PREFER_NOT_TO_SAY  │  └── super_admins

}

```  ├── hospital_staff (linked to hospital)



### BloodGroup  │     └── medical_records (uploaded)hospitals



```prisma  │  ├── doctors

enum BloodGroup {

  A_POSITIVE  ├── hospital_admins (linked to hospital)  ├── hospital_staff

  A_NEGATIVE

  B_POSITIVE  │     └── hospitals (managed)  ├── hospital_admins

  B_NEGATIVE

  AB_POSITIVE  │  └── appointments

  AB_NEGATIVE

  O_POSITIVE  ├── insurance_providers

  O_NEGATIVE

  UNKNOWN  │     ├── consents (requested)audit_logs (append-only, all actors)

}

```  │     └── insurance_claims (processed)```



### RecordType  │



```prisma  └── super_admins---

enum RecordType {

  LAB_REPORT

  IMAGING

  PRESCRIPTIONhospitals## 2. Enums

  DISCHARGE_SUMMARY

  VACCINATION  ├── doctors

  ECG

  OTHER  ├── hospital_staff### Role

}

```  ├── hospital_admins



### RecordSubType  └── appointments```prisma



```prismaenum Role {

enum RecordSubType {

  // Lab sub-typesnotifications       (per-user inbox — 30-day TTL, cron cleanup)  PATIENT

  BLOOD_TEST

  URINE_TESTaudit_logs          (append-only, permanent — never deleted)  DOCTOR

  LIVER_FUNCTION

  KIDNEY_FUNCTIONdrug_interactions   (seeded reference data, OpenFDA-sourced)  HOSPITAL_STAFF

  LIPID_PROFILE

  THYROIDicd10_codes         (seeded once, ~70,000 codes, npm package)  HOSPITAL_ADMIN

  HBA1C

  BLOOD_SUGAR```  INSURANCE_PROVIDER

  COMPLETE_BLOOD_COUNT

  // Imaging sub-types  SUPER_ADMIN

  XRAY

  MRI**Total Tables: 28**}

  CT_SCAN

  ULTRASOUND```

  PET_SCAN

  MAMMOGRAPHY---

  // Cardiac / Other

  ECG_RECORDING### BloodGroup

  COVID_VACCINE

  ROUTINE_VACCINE## 2. Enums — Complete Definitions

  GENERAL

}```

```

> ⚠️ These are final. Use exactly these values in `schema.prisma`. No other enum values are valid.A_POSITIVE | A_NEGATIVE | B_POSITIVE | B_NEGATIVE

### ConsentStatus

AB_POSITIVE | AB_NEGATIVE | O_POSITIVE | O_NEGATIVE | UNKNOWN

```prisma

enum ConsentStatus {### Role```

  PENDING

  ACTIVE```prisma

  REVOKED

  DENIEDenum Role {### Gender

  EXPIRED

}  PATIENT

```

  DOCTOR```

### ConsentScope

  HOSPITAL_STAFFMALE | FEMALE | OTHER | PREFER_NOT_TO_SAY

```prisma

enum ConsentScope {  HOSPITAL_ADMIN```

  ALL

  LAB_REPORT  INSURANCE_PROVIDER

  IMAGING

  PRESCRIPTION  SUPER_ADMIN### RecordType

  DISCHARGE_SUMMARY

  VACCINATION}

  ECG

  CLINICAL_NOTES``````

  EMERGENCY_ONLY

}LAB_REPORT | IMAGING | PRESCRIPTION | DISCHARGE_SUMMARY

```

### GenderVACCINATION | ECG | OTHER

### AppointmentType

```prisma```

```prisma

enum AppointmentType {enum Gender {

  IN_PERSON

  VIDEO  MALE### RecordSubType

  PHONE

}  FEMALE

```

  OTHER```

### AppointmentStatus

  PREFER_NOT_TO_SAYBLOOD_TEST | URINE_TEST | LIVER_FUNCTION | KIDNEY_FUNCTION | LIPID_PROFILE |

```prisma

enum AppointmentStatus {}THYROID | XRAY | MRI | CT_SCAN | ULTRASOUND | ECG_RECORDING |

  SCHEDULED

  CONFIRMED```COVID_VACCINE | ROUTINE_VACCINE | GENERAL

  IN_PROGRESS

  COMPLETED```

  CANCELLED

  NO_SHOW### BloodGroup

}

``````prisma### ConsentStatus



### ClaimTypeenum BloodGroup {



```prisma  A_POSITIVE```

enum ClaimType {

  HOSPITALIZATION  A_NEGATIVEPENDING | ACTIVE | REVOKED | DENIED | EXPIRED

  OUTPATIENT

  SURGERY  B_POSITIVE```

  MATERNITY

  DENTAL  B_NEGATIVE

  VISION

  CRITICAL_ILLNESS  AB_POSITIVE### ClaimStatus

}

```  AB_NEGATIVE



### ClaimStatus  O_POSITIVE```



```prisma  O_NEGATIVESUBMITTED | UNDER_REVIEW | APPROVED | REJECTED | HOLD | PAID

enum ClaimStatus {

  SUBMITTED  UNKNOWN```

  UNDER_REVIEW

  APPROVED}

  REJECTED

  HOLD```### AppointmentStatus

  PAID

}

```

### RecordType```

### StaffType

```prismaSCHEDULED | CONFIRMED | IN_PROGRESS | COMPLETED | CANCELLED | NO_SHOW

```prisma

enum StaffType {enum RecordType {```

  NURSE

  PHARMACIST  LAB_REPORT

  LAB_TECHNICIAN

  RECEPTIONIST  IMAGING### InteractionSeverity

  RADIOLOGIST

  OTHER  PRESCRIPTION

}

```  DISCHARGE_SUMMARY```



### InteractionSeverity  VACCINATIONLOW | MODERATE | HIGH | CRITICAL



```prisma  ECG```

enum InteractionSeverity {

  LOW  OTHER

  MODERATE

  HIGH}### StaffType

  CRITICAL

}```

```

```

### PharmaCheckType

### RecordSubTypeNURSE | PHARMACIST | LAB_TECHNICIAN | RECEPTIONIST | RADIOLOGIST | OTHER

```prisma

enum PharmaCheckType {```prisma```

  DRUG_INTERACTION

  DRUG_ALLERGYenum RecordSubType {

  DRUG_CONDITION

  DUPLICATE_DRUG  // Lab sub-types---

}

```  BLOOD_TEST



### DrugForm  URINE_TEST## 3. User & Role Models



```prisma  LIVER_FUNCTION

enum DrugForm {

  TABLET  KIDNEY_FUNCTION### `users`

  CAPSULE

  SYRUP  LIPID_PROFILE

  INJECTION

  CREAM  THYROID| Column | Type | Constraints | Notes |

  DROPS

  INHALER  HBA1C|--------|------|-------------|-------|

  PATCH

  SUPPOSITORY  BLOOD_SUGAR| `id` | String (CUID) | PK | |

  OTHER

}  COMPLETE_BLOOD_COUNT| `email` | String | UNIQUE, NOT NULL | Lowercase enforced |

```

  // Imaging sub-types| `passwordHash` | String | NOT NULL | Argon2id output |

### DrugRoute

  XRAY| `role` | Role | NOT NULL | Enum |

```prisma

enum DrugRoute {  MRI| `isEmailVerified` | Boolean | DEFAULT false | |

  ORAL

  IV  CT_SCAN| `emailVerifyToken` | String | nullable | Redis-backed OTP |

  IM

  TOPICAL  ULTRASOUND| `isActive` | Boolean | DEFAULT true | Deactivation flag |

  INHALATION

  SUBLINGUAL  PET_SCAN| `createdAt` | DateTime | DEFAULT now() | |

  RECTAL

  NASAL  MAMMOGRAPHY| `updatedAt` | DateTime | auto-update | |

  OTHER

}  // Cardiac / Other

```

  ECG_RECORDING### `patients`

### NoteVisibility

  COVID_VACCINE

```prisma

enum NoteVisibility {  ROUTINE_VACCINE| Column | Type | Constraints | Notes |

  PRIVATE

  HOSPITAL  GENERAL|--------|------|-------------|-------|

  PATIENT_VISIBLE

}}| `id` | String (CUID) | PK | |

```

```| `userId` | String | UNIQUE FK → users | One-to-one |

### SummaryType

| `uhid` | String | UNIQUE NOT NULL | Format: `UH-XXXXXX` |

```prisma

enum SummaryType {### ConsentStatus| `firstName` | String | NOT NULL | |

  REPORT_DECODER

  CLINICAL_SUMMARY```prisma| `lastName` | String | NOT NULL | |

}

```enum ConsentStatus {| `dateOfBirth` | DateTime | NOT NULL | |



### EmergencyAccessType  PENDING| `gender` | Gender | NOT NULL | Enum |



```prisma  ACTIVE| `bloodGroup` | BloodGroup | DEFAULT UNKNOWN | |

enum EmergencyAccessType {

  QR_SCAN  REVOKED| `phone` | String | nullable | |

  SOS

  OVERRIDE  DENIED| `aadhaarEncrypted` | String | nullable | AES-256-GCM encrypted |

  EMERGENCY_CODE

}  EXPIRED| `photoUrl` | String | nullable | Cloudinary URL |

```

}| `allergies` | String[] | DEFAULT [] | Drug/food allergies |

### QrScanType

```| `chronicConditions` | String[] | DEFAULT [] | ICD-10 codes |

```prisma

enum QrScanType {| `address` | String | nullable | |

  PUBLIC_SCAN       // Tier 1 — no login, anyone

  DOCTOR_SCAN       // Tier 2 — verified UHID doctor### ConsentScope| `city` | String | nullable | |

  INSURANCE_SCAN    // Tier 2 — verified insurance user

  PATIENT_INITIATED // Tier 3 — patient generated one-time share```prisma| `state` | String | nullable | |

  SUSPICIOUS_SCAN   // Auto-flagged rate-limit or anomaly breach

}enum ConsentScope {| `pincode` | String | nullable | |

```

  ALL| `createdAt` | DateTime | DEFAULT now() | |

### AuditAction

  LAB_REPORT

```prisma

enum AuditAction {  IMAGING### `doctors`

  // Auth

  LOGIN  PRESCRIPTION

  LOGOUT

  FAILED_LOGIN  DISCHARGE_SUMMARY| Column | Type | Constraints | Notes |

  PASSWORD_RESET

  EMAIL_VERIFIED  VACCINATION|--------|------|-------------|-------|

  TOKEN_REFRESHED

  // Records  ECG| `id` | String (CUID) | PK | |

  RECORD_UPLOADED

  RECORD_VIEWED  CLINICAL_NOTES| `userId` | String | UNIQUE FK → users | |

  RECORD_DOWNLOADED

  RECORD_DELETED  EMERGENCY_ONLY| `hospitalId` | String | FK → hospitals | |

  // Consent

  CONSENT_REQUESTED}| `firstName` | String | NOT NULL | |

  CONSENT_APPROVED

  CONSENT_DENIED```| `lastName` | String | NOT NULL | |

  CONSENT_REVOKED

  CONSENT_EXPIRED| `specialty` | String | NOT NULL | |

  // Prescriptions & Clinical

  PRESCRIPTION_CREATED### AppointmentType| `licenseNumber` | String | UNIQUE | NMC registration |

  PRESCRIPTION_VIEWED

  CLINICAL_NOTE_CREATED```prisma| `qualifications` | String[] | NOT NULL | ["MBBS", "MD"] |

  CLINICAL_NOTE_VIEWED

  PHARMA_CHECK_OVERRIDEenum AppointmentType {| `experienceYears` | Int | nullable | |

  // Emergency

  EMERGENCY_OVERRIDE  IN_PERSON| `consultationFee` | Float | nullable | In INR |

  QR_GENERATED

  QR_USED  VIDEO| `languages` | String[] | DEFAULT ["English"] | |

  QR_REVOKED

  SOS_ACTIVATED  PHONE| `isVerified` | Boolean | DEFAULT false | |

  EMERGENCY_CODE_USED

  // Admin}| `verifiedAt` | DateTime | nullable | |

  STAFF_VERIFIED

  STAFF_REJECTED```| `verifiedByAdminId` | String | nullable | |

  STAFF_DEACTIVATED

  HOSPITAL_VERIFIED| `rating` | Float | DEFAULT 0 | 0.0–5.0 |

  HOSPITAL_SUSPENDED

  OVERRIDE_REVIEWED### AppointmentStatus| `totalReviews` | Int | DEFAULT 0 | |

  // Insurance

  CLAIM_SUBMITTED```prisma| `photoUrl` | String | nullable | |

  CLAIM_DECISION

  RECORD_VERIFIEDenum AppointmentStatus {| `createdAt` | DateTime | DEFAULT now() | |

  // AI

  AI_REPORT_GENERATED  SCHEDULED

  AI_SUMMARY_GENERATED

  // Appointments  CONFIRMED### `hospital_staff`

  APPOINTMENT_BOOKED

  APPOINTMENT_CANCELLED  IN_PROGRESS

  APPOINTMENT_COMPLETED

  VIDEO_ROOM_JOINED  COMPLETED| Column | Type | Constraints | Notes |

}

```  CANCELLED|--------|------|-------------|-------|



### AuditSeverity  NO_SHOW| `id` | String (CUID) | PK | |



```prisma}| `userId` | String | UNIQUE FK → users | |

enum AuditSeverity {

  LOW```| `hospitalId` | String | FK → hospitals | |

  MEDIUM

  HIGH| `firstName` | String | NOT NULL | |

  CRITICAL

}### ClaimType| `lastName` | String | NOT NULL | |

```

```prisma| `staffType` | StaffType | NOT NULL | Enum |

### AvailabilityDay

enum ClaimType {| `employeeId` | String | nullable | Hospital-issued |

```prisma

enum AvailabilityDay {  HOSPITALIZATION| `isVerified` | Boolean | DEFAULT false | |

  MONDAY

  TUESDAY  OUTPATIENT| `createdAt` | DateTime | DEFAULT now() | |

  WEDNESDAY

  THURSDAY  SURGERY

  FRIDAY

  SATURDAY  MATERNITY### `hospital_admins`

  SUNDAY

}  DENTAL

```

  VISION| Column | Type | Constraints | Notes |

### NotificationType

  CRITICAL_ILLNESS|--------|------|-------------|-------|

```prisma

enum NotificationType {}| `id` | String (CUID) | PK | |

  CONSENT_REQUESTED

  CONSENT_APPROVED```| `userId` | String | UNIQUE FK → users | |

  CONSENT_DENIED

  CONSENT_REVOKED| `hospitalId` | String | UNIQUE FK → hospitals | One admin per hospital |

  CONSENT_EXPIRED

  RECORD_UPLOADED### ClaimStatus| `firstName` | String | NOT NULL | |

  PRESCRIPTION_CREATED

  APPOINTMENT_BOOKED```prisma| `lastName` | String | NOT NULL | |

  APPOINTMENT_CONFIRMED

  APPOINTMENT_CANCELLEDenum ClaimStatus {| `createdAt` | DateTime | DEFAULT now() | |

  APPOINTMENT_REMINDER

  APPOINTMENT_STARTED  SUBMITTED

  EMERGENCY_SOS

  EMERGENCY_OVERRIDE  UNDER_REVIEW### `insurance_providers`

  CLAIM_DECISION

  STAFF_VERIFIED  APPROVED

  GENERAL

}  REJECTED| Column | Type | Constraints | Notes |

```

  HOLD|--------|------|-------------|-------|

---

  PAID| `id` | String (CUID) | PK | |

## 3. User & Role Models

}| `userId` | String | UNIQUE FK → users | |

### `users`

```| `companyName` | String | NOT NULL | |

| Column | Type | Constraints | Notes |

|--------|------|-------------|-------|| `licenseNumber` | String | UNIQUE | IRDAI license |

| `id` | String (CUID) | PK | |

| `email` | String | UNIQUE NOT NULL | Lowercase enforced |### StaffType| `isVerified` | Boolean | DEFAULT false | |

| `passwordHash` | String | NOT NULL | Argon2id output |

| `role` | Role | NOT NULL | Enum |```prisma| `verifiedAt` | DateTime | nullable | |

| `isEmailVerified` | Boolean | DEFAULT false | |

| `emailVerifyToken` | String | nullable | Redis-backed OTP |enum StaffType {| `createdAt` | DateTime | DEFAULT now() | |

| `isActive` | Boolean | DEFAULT true | Deactivation flag |

| `createdAt` | DateTime | DEFAULT now() | |  NURSE

| `updatedAt` | DateTime | auto-update | |

  PHARMACIST### `super_admins`

---

  LAB_TECHNICIAN

### `patients`

  RECEPTIONIST| Column | Type | Constraints | Notes |

| Column | Type | Constraints | Notes |

|--------|------|-------------|-------|  RADIOLOGIST|--------|------|-------------|-------|

| `id` | String (CUID) | PK | |

| `userId` | String | UNIQUE FK → users | One-to-one |  OTHER| `id` | String (CUID) | PK | |

| `uhid` | String | UNIQUE NOT NULL | Format: `UH-XXXXXX` |

| `firstName` | String | NOT NULL | |}| `userId` | String | UNIQUE FK → users | |

| `lastName` | String | NOT NULL | |

| `dateOfBirth` | DateTime | NOT NULL | |```| `firstName` | String | NOT NULL | |

| `gender` | Gender | NOT NULL | Enum |

| `bloodGroup` | BloodGroup | DEFAULT UNKNOWN | Enum || `lastName` | String | NOT NULL | |

| `phone` | String | nullable | |

| `aadhaarEncrypted` | String | nullable | AES-256-GCM encrypted |### InteractionSeverity| `createdAt` | DateTime | DEFAULT now() | |

| `photoUrl` | String | nullable | Cloudinary URL |

| `allergies` | String[] | DEFAULT [] | Drug/food allergy names |```prisma

| `chronicConditions` | String[] | DEFAULT [] | ICD-10 code strings |

| `address` | String | nullable | |enum InteractionSeverity {### `hospitals`

| `city` | String | nullable | |

| `state` | String | nullable | |  LOW

| `pincode` | String | nullable | |

| `createdAt` | DateTime | DEFAULT now() | |  MODERATE| Column | Type | Constraints | Notes |

| `updatedAt` | DateTime | auto-update | |

  HIGH|--------|------|-------------|-------|

---

  CRITICAL| `id` | String (CUID) | PK | |

### `doctors`

}| `name` | String | NOT NULL | |

| Column | Type | Constraints | Notes |

|--------|------|-------------|-------|```| `registrationNumber` | String | UNIQUE | |

| `id` | String (CUID) | PK | |

| `userId` | String | UNIQUE FK → users | || `address` | String | NOT NULL | |

| `hospitalId` | String | FK → hospitals | |

| `firstName` | String | NOT NULL | |### PharmaCheckType| `city` | String | NOT NULL | |

| `lastName` | String | NOT NULL | |

| `specialty` | String | NOT NULL | e.g. "Cardiology" |```prisma| `state` | String | NOT NULL | |

| `licenseNumber` | String | UNIQUE NOT NULL | NMC registration |

| `qualifications` | String[] | NOT NULL | e.g. ["MBBS", "MD"] |enum PharmaCheckType {| `pincode` | String | NOT NULL | |

| `experienceYears` | Int | DEFAULT 0 | |

| `consultationFee` | Float | DEFAULT 0.0 | In INR |  DRUG_INTERACTION| `phone` | String | nullable | |

| `languages` | String[] | DEFAULT ["English"] | Spoken languages |

| `availableForVideo` | Boolean | DEFAULT true | Accepts video appointments |  DRUG_ALLERGY| `email` | String | nullable | |

| `availableForInPerson` | Boolean | DEFAULT true | Accepts in-person appointments |

| `slotDurationMinutes` | Int | DEFAULT 30 | Minutes per appointment slot |  DRUG_CONDITION| `isVerified` | Boolean | DEFAULT false | Super Admin verifies |

| `isVerified` | Boolean | DEFAULT false | Hospital admin must verify |

| `verifiedAt` | DateTime | nullable | |  DUPLICATE_DRUG| `verifiedAt` | DateTime | nullable | |

| `verifiedByAdminId` | String | nullable | FK → hospital_admins.id |

| `rating` | Float | DEFAULT 0.0 | Computed: avg of doctor_reviews |}| `isNABH` | Boolean | DEFAULT false | NABH accreditation |

| `totalReviews` | Int | DEFAULT 0 | Computed count of doctor_reviews |

| `photoUrl` | String | nullable | Cloudinary URL |```| `specialties` | String[] | DEFAULT [] | |

| `createdAt` | DateTime | DEFAULT now() | |

| `updatedAt` | DateTime | auto-update | || `createdAt` | DateTime | DEFAULT now() | |



---### DrugForm



### `hospital_staff````prisma### `emergency_contacts`



| Column | Type | Constraints | Notes |enum DrugForm {

|--------|------|-------------|-------|

| `id` | String (CUID) | PK | |  TABLET| Column | Type | Constraints | Notes |

| `userId` | String | UNIQUE FK → users | |

| `hospitalId` | String | FK → hospitals | |  CAPSULE|--------|------|-------------|-------|

| `firstName` | String | NOT NULL | |

| `lastName` | String | NOT NULL | |  SYRUP| `id` | String (CUID) | PK | |

| `staffType` | StaffType | NOT NULL | Enum |

| `employeeId` | String | nullable | Hospital-issued ID |  INJECTION| `patientId` | String | FK → patients | |

| `isVerified` | Boolean | DEFAULT false | |

| `createdAt` | DateTime | DEFAULT now() | |  CREAM| `name` | String | NOT NULL | |

| `updatedAt` | DateTime | auto-update | |

  DROPS| `relation` | String | NOT NULL | "Mother", "Spouse" |

---

  INHALER| `phone` | String | NOT NULL | |

### `hospital_admins`

  PATCH| `isOnUhid` | Boolean | DEFAULT false | Uses UHID app |

| Column | Type | Constraints | Notes |

|--------|------|-------------|-------|  SUPPOSITORY| `emergencyContactUhid` | String | nullable | Their UHID |

| `id` | String (CUID) | PK | |

| `userId` | String | UNIQUE FK → users | |  OTHER

| `hospitalId` | String | UNIQUE FK → hospitals | One admin per hospital |

| `firstName` | String | NOT NULL | |}### `family_links`

| `lastName` | String | NOT NULL | |

| `createdAt` | DateTime | DEFAULT now() | |```



---| Column | Type | Constraints | Notes |



### `insurance_providers`### DrugRoute|--------|------|-------------|-------|



| Column | Type | Constraints | Notes |```prisma| `id` | String (CUID) | PK | |

|--------|------|-------------|-------|

| `id` | String (CUID) | PK | |enum DrugRoute {| `patientId` | String | FK → patients | Child/dependent |

| `userId` | String | UNIQUE FK → users | |

| `companyName` | String | NOT NULL | |  ORAL| `linkedToPatientId` | String | FK → patients | Parent/guardian |

| `licenseNumber` | String | UNIQUE NOT NULL | IRDAI license number |

| `isVerified` | Boolean | DEFAULT false | Super Admin approves |  IV| `relation` | String | NOT NULL | "Child", "Parent" |

| `verifiedAt` | DateTime | nullable | |

| `createdAt` | DateTime | DEFAULT now() | |  IM| `canManage` | Boolean | DEFAULT false | Guardian access |



---  TOPICAL| `createdAt` | DateTime | DEFAULT now() | |



### `super_admins`  INHALATION



| Column | Type | Constraints | Notes |  SUBLINGUAL---

|--------|------|-------------|-------|

| `id` | String (CUID) | PK | |  RECTAL

| `userId` | String | UNIQUE FK → users | |

| `firstName` | String | NOT NULL | |  NASAL## 4. Medical Data Models

| `lastName` | String | NOT NULL | |

| `createdAt` | DateTime | DEFAULT now() | |  OTHER



---}### `medical_records`



### `hospitals````



| Column | Type | Constraints | Notes || Column | Type | Constraints | Notes |

|--------|------|-------------|-------|

| `id` | String (CUID) | PK | |### NoteVisibility|--------|------|-------------|-------|

| `name` | String | NOT NULL | |

| `registrationNumber` | String | UNIQUE NOT NULL | |```prisma| `id` | String (CUID) | PK | |

| `address` | String | NOT NULL | |

| `city` | String | NOT NULL | |enum NoteVisibility {| `patientId` | String | FK → patients | |

| `state` | String | NOT NULL | |

| `pincode` | String | NOT NULL | |  PRIVATE| `uploadedByStaffId` | String | nullable | FK → hospital_staff |

| `phone` | String | nullable | |

| `email` | String | nullable | |  HOSPITAL| `hospitalId` | String | nullable | FK → hospitals |

| `isVerified` | Boolean | DEFAULT false | Super Admin verifies |

| `verifiedAt` | DateTime | nullable | |  PATIENT_VISIBLE| `recordType` | RecordType | NOT NULL | Enum |

| `isNABH` | Boolean | DEFAULT false | NABH accreditation flag |

| `specialties` | String[] | DEFAULT [] | Available specialties |}| `subType` | RecordSubType | nullable | Enum |

| `createdAt` | DateTime | DEFAULT now() | |

| `updatedAt` | DateTime | auto-update | |```| `title` | String | NOT NULL | |



---| `description` | String | nullable | |



### `emergency_contacts`### SummaryType| `fileUrl` | String | NOT NULL | Cloudinary URL |



| Column | Type | Constraints | Notes |```prisma| `filePublicId` | String | NOT NULL | Cloudinary public ID |

|--------|------|-------------|-------|

| `id` | String (CUID) | PK | |enum SummaryType {| `fileHash` | String | NOT NULL | SHA-256 for integrity |

| `patientId` | String | FK → patients | |

| `name` | String | NOT NULL | |  REPORT_DECODER| `mimeType` | String | NOT NULL | `image/jpeg`, `application/pdf` |

| `relation` | String | NOT NULL | "Mother", "Spouse", etc. |

| `phone` | String | NOT NULL | |  CLINICAL_SUMMARY| `fileSize` | Int | NOT NULL | Bytes |

| `isOnUhid` | Boolean | DEFAULT false | Contact also uses UHID |

| `emergencyContactUhid` | String | nullable | Their UHID if on platform |}| `extractedText` | String | nullable | OCR output |

| `createdAt` | DateTime | DEFAULT now() | |

```| `recordDate` | DateTime | nullable | When test was done |

---

| `tags` | String[] | DEFAULT [] | Searchable tags |

### `family_links`

### EmergencyAccessType| `isDeleted` | Boolean | DEFAULT false | Soft delete |

| Column | Type | Constraints | Notes |

|--------|------|-------------|-------|```prisma| `deletedAt` | DateTime | nullable | |

| `id` | String (CUID) | PK | |

| `patientId` | String | FK → patients | Child/dependent |enum EmergencyAccessType {| `createdAt` | DateTime | DEFAULT now() | |

| `linkedToPatientId` | String | FK → patients | Parent/guardian |

| `relation` | String | NOT NULL | "Child", "Parent", "Spouse" |  QR_SCAN

| `canManage` | Boolean | DEFAULT false | Guardian can manage records |

| `createdAt` | DateTime | DEFAULT now() | |  SOS### `prescriptions`



---  OVERRIDE



## 4. Medical Data Models  EMERGENCY_CODE| Column | Type | Constraints | Notes |



### `medical_records`}|--------|------|-------------|-------|



> **✅ Resolved:** Column is `fileHash` (SHA-256 of file bytes). `blockchainHash` from Phase 2 doc was an error — removed.```| `id` | String (CUID) | PK | |

> **✅ Resolved:** Column is `extractedText` (OCR output). `ocrExtractedText` from Phase 5 doc was an error — removed.

### QrScanType| `patientId` | String | FK → patients | |

| Column | Type | Constraints | Notes |

|--------|------|-------------|-------|```prisma| `doctorId` | String | FK → doctors | |

| `id` | String (CUID) | PK | |

| `patientId` | String | FK → patients | |enum QrScanType {| `hospitalId` | String | FK → hospitals | |

| `uploadedByStaffId` | String | nullable FK → hospital_staff | |

| `hospitalId` | String | nullable FK → hospitals | |  PUBLIC_SCAN       // Tier 1 — no login| `diagnosis` | String | NOT NULL | |

| `recordType` | RecordType | NOT NULL | Enum |

| `subType` | RecordSubType | nullable | Enum |  DOCTOR_SCAN       // Tier 2 — verified UHID doctor| `notes` | String | nullable | |

| `title` | String | NOT NULL | |

| `description` | String | nullable | |  INSURANCE_SCAN    // Tier 2 — verified insurance user| `followUpDate` | DateTime | nullable | |

| `fileUrl` | String | NOT NULL | Cloudinary private URL |

| `filePublicId` | String | NOT NULL | Cloudinary public ID |  CONSENT_DENIED| `validUntil` | DateTime | nullable | Default 30 days |

| `fileHash` | String | NOT NULL | SHA-256 of file content |

| `mimeType` | String | NOT NULL | `image/jpeg`, `application/pdf` |  CONSENT_REVOKED| `createdAt` | DateTime | DEFAULT now() | |

| `fileSize` | Int | NOT NULL | File size in bytes |

| `extractedText` | String | nullable | OCR-extracted text |  CONSENT_EXPIRED

| `recordDate` | DateTime | nullable | Date test was performed |

| `tags` | String[] | DEFAULT [] | Searchable tags |  RECORD_UPLOADED### `prescription_items`

| `isDeleted` | Boolean | DEFAULT false | Soft delete flag |

| `deletedAt` | DateTime | nullable | |  PRESCRIPTION_CREATED

| `createdAt` | DateTime | DEFAULT now() | |

| `updatedAt` | DateTime | auto-update | |  APPOINTMENT_BOOKED| Column | Type | Constraints | Notes |



---  APPOINTMENT_CONFIRMED|--------|------|-------------|-------|



### `prescriptions`  APPOINTMENT_CANCELLED| `id` | String (CUID) | PK | |



| Column | Type | Constraints | Notes |  APPOINTMENT_REMINDER| `prescriptionId` | String | FK → prescriptions, CASCADE DELETE | |

|--------|------|-------------|-------|

| `id` | String (CUID) | PK | |  APPOINTMENT_STARTED| `drugName` | String | NOT NULL | Generic name |

| `patientId` | String | FK → patients | |

| `doctorId` | String | FK → doctors | |  EMERGENCY_SOS| `dosage` | String | NOT NULL | "500mg" |

| `hospitalId` | String | FK → hospitals | |

| `appointmentId` | String | nullable FK → appointments | Linked if from telehealth |  EMERGENCY_OVERRIDE| `form` | String | NOT NULL | TABLET, CAPSULE, etc. |

| `diagnosis` | String | NOT NULL | |

| `notes` | String | nullable | |  CLAIM_DECISION| `frequency` | String | NOT NULL | "Twice daily" |

| `followUpDate` | DateTime | nullable | |

| `validUntil` | DateTime | nullable | Default: 30 days from creation |  STAFF_VERIFIED| `duration` | String | NOT NULL | "7 days" |

| `createdAt` | DateTime | DEFAULT now() | |

  GENERAL| `route` | String | NOT NULL | ORAL, IV, etc. |

---

}| `instructions` | String | nullable | |

### `prescription_items`

```| `quantity` | Int | NOT NULL | Units to dispense |

| Column | Type | Constraints | Notes |

|--------|------|-------------|-------|

| `id` | String (CUID) | PK | |

| `prescriptionId` | String | FK → prescriptions, CASCADE DELETE | |### AuditAction### `clinical_notes`

| `drugName` | String | NOT NULL | Generic name preferred |

| `dosage` | String | NOT NULL | e.g. "500mg" |```prisma

| `form` | DrugForm | NOT NULL | Enum |

| `frequency` | String | NOT NULL | e.g. "Twice daily" |enum AuditAction {| Column | Type | Constraints | Notes |

| `duration` | String | NOT NULL | e.g. "7 days" |

| `route` | DrugRoute | NOT NULL | Enum |  // Auth|--------|------|-------------|-------|

| `instructions` | String | nullable | e.g. "Take after meals" |

| `quantity` | Int | NOT NULL | Units to dispense |  LOGIN| `id` | String (CUID) | PK | |



---  LOGOUT| `patientId` | String | FK → patients | |



### `clinical_notes`  FAILED_LOGIN| `doctorId` | String | FK → doctors | |



| Column | Type | Constraints | Notes |  PASSWORD_RESET| `appointmentId` | String | nullable | FK → appointments |

|--------|------|-------------|-------|

| `id` | String (CUID) | PK | |  EMAIL_VERIFIED| `chiefComplaint` | String | NOT NULL | |

| `patientId` | String | FK → patients | |

| `doctorId` | String | FK → doctors | |  TOKEN_REFRESHED| `symptoms` | String[] | NOT NULL | |

| `appointmentId` | String | nullable FK → appointments | |

| `chiefComplaint` | String | NOT NULL | |  // Records| `icd10Code` | String | NOT NULL | |

| `symptoms` | String[] | NOT NULL | |

| `icd10Code` | String | NOT NULL | Format: `A00.0` |  RECORD_UPLOADED| `icd10Description` | String | NOT NULL | |

| `icd10Description` | String | NOT NULL | |

| `examinationFindings` | String | nullable | |  RECORD_VIEWED| `examinationFindings` | String | nullable | |

| `vitalSigns` | Json | nullable | `{ bp, pulse, temperature, spo2, weight, height }` |

| `diagnosis` | String | NOT NULL | |  RECORD_DOWNLOADED| `vitalSigns` | JSON | nullable | BP, pulse, temp, SpO2 |

| `treatmentPlan` | String | nullable | |

| `visibility` | NoteVisibility | DEFAULT PRIVATE | Enum |  RECORD_DELETED| `diagnosis` | String | NOT NULL | |

| `createdAt` | DateTime | DEFAULT now() | |

| `updatedAt` | DateTime | auto-update | |  // Consent| `treatmentPlan` | String | nullable | |



---  CONSENT_REQUESTED| `visibility` | String | DEFAULT PRIVATE | PRIVATE, HOSPITAL, PATIENT_VISIBLE |



## 5. Access Control Models  CONSENT_APPROVED| `createdAt` | DateTime | DEFAULT now() | |



### `consents`  CONSENT_DENIED



| Column | Type | Constraints | Notes |  CONSENT_REVOKED### `appointments`

|--------|------|-------------|-------|

| `id` | String (CUID) | PK | |  CONSENT_EXPIRED

| `patientId` | String | FK → patients | |

| `grantedToType` | String | NOT NULL | "DOCTOR" or "INSURANCE_PROVIDER" |  // Prescriptions & Clinical| Column | Type | Constraints | Notes |

| `doctorId` | String | nullable FK → doctors | |

| `insuranceProviderId` | String | nullable FK → insurance_providers | |  PRESCRIPTION_CREATED|--------|------|-------------|-------|

| `scope` | ConsentScope[] | NOT NULL | Array of ConsentScope enums |

| `purpose` | String | NOT NULL | |  PRESCRIPTION_VIEWED| `id` | String (CUID) | PK | |

| `status` | ConsentStatus | DEFAULT PENDING | Enum |

| `isTemporary` | Boolean | DEFAULT true | |  CLINICAL_NOTE_CREATED| `patientId` | String | FK → patients | |

| `durationHours` | Int | nullable | Null if permanent |

| `expiresAt` | DateTime | nullable | Null if permanent |  CLINICAL_NOTE_VIEWED| `doctorId` | String | FK → doctors | |

| `otpVerified` | Boolean | DEFAULT false | |

| `otpVerifiedAt` | DateTime | nullable | |  PHARMA_CHECK_OVERRIDE| `hospitalId` | String | FK → hospitals | |

| `requestedAt` | DateTime | DEFAULT now() | |

| `grantedAt` | DateTime | nullable | |  // Emergency| `scheduledAt` | DateTime | NOT NULL | |

| `revokedAt` | DateTime | nullable | |

  EMERGENCY_OVERRIDE| `type` | String | NOT NULL | IN_PERSON, VIDEO, PHONE |

---

  QR_GENERATED| `status` | AppointmentStatus | DEFAULT SCHEDULED | |

### `qr_codes`

  QR_USED| `chiefComplaint` | String | nullable | |

| Column | Type | Constraints | Notes |

|--------|------|-------------|-------|  QR_REVOKED| `notes` | String | nullable | |

| `id` | String (CUID) | PK | |

| `patientId` | String | FK → patients | |  SOS_ACTIVATED| `cancelReason` | String | nullable | |

| `jti` | String | UNIQUE NOT NULL | JWT ID — Redis-backed validation |

| `scope` | ConsentScope[] | NOT NULL | Accessible data scopes |  EMERGENCY_CODE_USED| `cancelledBy` | String | nullable | |

| `tier` | Int | NOT NULL DEFAULT 1 | 1 = public, 2 = doctor, 3 = patient-share |

| `isOneTime` | Boolean | DEFAULT false | Tier 3 always true |  // Admin| `confirmationNumber` | String | UNIQUE | APT-YYYY-NNNNN |

| `isEmergencyCard` | Boolean | DEFAULT false | Permanent static QR auto-generated at registration |

| `label` | String | nullable | Patient-assigned label |  STAFF_VERIFIED| `videoRoomName` | String | nullable | Jitsi room ID |

| `expiresAt` | DateTime | NOT NULL | |

| `usedAt` | DateTime | nullable | Timestamp of first scan |  STAFF_REJECTED| `completedAt` | DateTime | nullable | |

| `usedByDoctorId` | String | nullable | FK → doctors.id |

| `isRevoked` | Boolean | DEFAULT false | |  STAFF_DEACTIVATED| `createdAt` | DateTime | DEFAULT now() | |

| `revokedAt` | DateTime | nullable | |

| `revokedReason` | String | nullable | "PHONE_LOST" / "SUSPICIOUS" / "MANUAL" |  HOSPITAL_VERIFIED

| `createdAt` | DateTime | DEFAULT now() | |

  HOSPITAL_SUSPENDED---

---

  OVERRIDE_REVIEWED

### `qr_scan_logs` ← NEW TABLE

  // Insurance## 5. Access Control Models

> **INSERT-ONLY. Never updated or deleted.**

> Every scan of any QR (public, doctor, patient-initiated) creates one row.  CLAIM_SUBMITTED

> This is the data shown on the patient's "QR Scan History" dashboard section.

  CLAIM_DECISION### `consents`

| Column | Type | Constraints | Notes |

|--------|------|-------------|-------|  RECORD_VERIFIED

| `id` | String (CUID) | PK | |

| `qrCodeId` | String | FK → qr_codes | Which QR was scanned |  // AI| Column | Type | Constraints | Notes |

| `patientId` | String | FK → patients | Whose QR was scanned |

| `tier` | Int | NOT NULL | 1, 2, or 3 |  AI_REPORT_GENERATED|--------|------|-------------|-------|

| `scanType` | QrScanType | NOT NULL | Enum — see values below |

| `scannedById` | String | nullable FK → users | Null if public/anonymous scan |  AI_SUMMARY_GENERATED| `id` | String (CUID) | PK | |

| `scannerName` | String | nullable | Snapshot of name at scan time |

| `scannerUhidId` | String | nullable | DR-XXXXXX or INS-XXXXXX |  // Appointments| `patientId` | String | FK → patients | |

| `organization` | String | nullable | Hospital or insurance company |

| `ipAddress` | String | nullable | Hashed for privacy |  APPOINTMENT_BOOKED| `grantedToType` | String | NOT NULL | DOCTOR or INSURANCE_PROVIDER |

| `location` | String | nullable | City, State (IP geolocation) |

| `isSuspicious` | Boolean | DEFAULT false | Auto-flagged by rate-limit / time / location rules |  APPOINTMENT_CANCELLED| `doctorId` | String | nullable | FK → doctors |

| `suspicionReason` | String | nullable | "RATE_LIMIT_EXCEEDED" / "UNUSUAL_TIME" / "LOCATION_MISMATCH" |

| `reportedByPatient` | Boolean | DEFAULT false | Patient manually reported this scan |  APPOINTMENT_COMPLETED| `insuranceProviderId` | String | nullable | FK → insurance_providers |

| `scannedAt` | DateTime | DEFAULT now() | |

  VIDEO_ROOM_JOINED| `scope` | String[] | NOT NULL | Array of RecordType values |

**QrScanType enum values:**

}| `purpose` | String | NOT NULL | |

| Value | Meaning |

|-------|---------|```| `status` | ConsentStatus | DEFAULT PENDING | |

| `PUBLIC_SCAN` | Tier 1 — no login, anyone |

| `DOCTOR_SCAN` | Tier 2 — verified UHID doctor || `isTemporary` | Boolean | DEFAULT true | |

| `INSURANCE_SCAN` | Tier 2 — verified insurance user |

| `PATIENT_INITIATED` | Tier 3 — patient generated one-time share |### AuditSeverity| `durationHours` | Int | nullable | |

| `SUSPICIOUS_SCAN` | Auto-flagged rate-limit or anomaly breach |

```prisma| `expiresAt` | DateTime | nullable | |

---

enum AuditSeverity {| `otpVerified` | Boolean | DEFAULT false | |

### `emergency_accesses`

  LOW| `otpVerifiedAt` | DateTime | nullable | |

| Column | Type | Constraints | Notes |

|--------|------|-------------|-------|  MEDIUM| `requestedAt` | DateTime | DEFAULT now() | |

| `id` | String (CUID) | PK | |

| `patientId` | String | FK → patients | |  HIGH| `grantedAt` | DateTime | nullable | |

| `accessedByDoctorId` | String | nullable FK → doctors | |

| `accessType` | EmergencyAccessType | NOT NULL | Enum |  CRITICAL| `revokedAt` | DateTime | nullable | |

| `reason` | String | nullable | Doctor-entered reason |

| `reasonType` | String | nullable | e.g. "CRITICAL_CARE" |}

| `latitude` | Float | nullable | GPS lat (SOS only) |

| `longitude` | Float | nullable | GPS lng (SOS only) |```### `qr_codes`

| `emergencyCode` | String | nullable | e.g. "EMG-A4X2" |

| `emergencyCodeExpiresAt` | DateTime | nullable | |

| `expiresAt` | DateTime | NOT NULL | Auto-revoked after this |

| `isActive` | Boolean | DEFAULT true | |### AvailabilityDay| Column | Type | Constraints | Notes |

| `cancelledAt` | DateTime | nullable | |

| `createdAt` | DateTime | DEFAULT now() | |```prisma|--------|------|-------------|-------|



---enum AvailabilityDay {| `id` | String (CUID) | PK | |



## 6. AI & Logging Models  MONDAY| `patientId` | String | FK → patients | |



### `ai_report_summaries`  TUESDAY| `jti` | String | UNIQUE | JWT ID |



| Column | Type | Constraints | Notes |  WEDNESDAY| `scope` | String[] | NOT NULL | |

|--------|------|-------------|-------|

| `id` | String (CUID) | PK | |  THURSDAY| `isOneTime` | Boolean | DEFAULT false | |

| `recordId` | String | nullable FK → medical_records | Null for clinical summaries |

| `patientId` | String | FK → patients | |  FRIDAY| `isEmergencyCard` | Boolean | DEFAULT false | |

| `summaryType` | SummaryType | NOT NULL | Enum |

| `summaryText` | String | NOT NULL | Main AI-generated explanation |  SATURDAY| `label` | String | nullable | Patient's label |

| `structuredData` | Json | nullable | Full parsed JSON output |

| `riskLevel` | String | nullable | NORMAL / LOW / MODERATE / HIGH / CRITICAL |  SUNDAY| `expiresAt` | DateTime | NOT NULL | |

| `modelUsed` | String | NOT NULL | "gpt-4o", "gemini-1.5-flash" |

| `tokensUsed` | Int | nullable | For cost tracking |}| `usedAt` | DateTime | nullable | |

| `generatedAt` | DateTime | NOT NULL | |

| `updatedAt` | DateTime | auto-update | Used for cache invalidation |```| `usedByDoctorId` | String | nullable | |



---| `isRevoked` | Boolean | DEFAULT false | |



### `pharma_check_logs`---| `revokedAt` | DateTime | nullable | |



| Column | Type | Constraints | Notes || `createdAt` | DateTime | DEFAULT now() | |

|--------|------|-------------|-------|

| `id` | String (CUID) | PK | |## 3. User & Role Models

| `prescriptionId` | String | nullable FK → prescriptions | Null if live-check without saving |

| `doctorId` | String | FK → doctors | |### `emergency_accesses`

| `patientId` | String | FK → patients | |

| `checkType` | PharmaCheckType | NOT NULL | Enum |### `users`

| `severity` | InteractionSeverity | NOT NULL | Enum |

| `drugs` | String[] | NOT NULL | Drug names involved || Column | Type | Constraints | Notes |

| `mechanism` | String | NOT NULL | Interaction mechanism description |

| `overridden` | Boolean | DEFAULT false | Doctor chose to override || Column | Type | Constraints | Notes ||--------|------|-------------|-------|

| `overrideReason` | String | nullable | Required when overridden = true |

| `createdAt` | DateTime | DEFAULT now() | ||--------|------|-------------|-------|| `id` | String (CUID) | PK | |



---| `id` | String (CUID) | PK | || `patientId` | String | FK → patients | |



### `audit_logs`| `email` | String | UNIQUE NOT NULL | Lowercase enforced || `accessedByDoctorId` | String | nullable | FK → doctors |



> ⚠️ **INSERT-ONLY.** No UPDATE or DELETE is ever permitted on this table.| `passwordHash` | String | NOT NULL | Argon2id output || `accessType` | String | NOT NULL | QR_SCAN, SOS, OVERRIDE, EMERGENCY_CODE |



| Column | Type | Constraints | Notes || `role` | Role | NOT NULL | Enum || `reason` | String | nullable | |

|--------|------|-------------|-------|

| `id` | String (CUID) | PK | || `isEmailVerified` | Boolean | DEFAULT false | || `reasonType` | String | nullable | |

| `action` | AuditAction | NOT NULL | Enum (42 values) |

| `severity` | AuditSeverity | NOT NULL | Enum || `emailVerifyToken` | String | nullable | Redis-backed OTP || `latitude` | Float | nullable | SOS location |

| `actorId` | String | NOT NULL | User who performed the action |

| `actorRole` | Role | NOT NULL | Role at time of action || `isActive` | Boolean | DEFAULT true | Deactivation flag || `longitude` | Float | nullable | SOS location |

| `targetId` | String | nullable | Patient / Record / Claim ID |

| `targetType` | String | nullable | "PATIENT", "RECORD", "CLAIM", etc. || `createdAt` | DateTime | DEFAULT now() | || `emergencyCode` | String | nullable | 6-char code |

| `hospitalId` | String | nullable FK → hospitals | |

| `metadata` | Json | nullable | Contextual data || `updatedAt` | DateTime | auto-update | || `emergencyCodeExpiresAt` | DateTime | nullable | |

| `ipAddress` | String | nullable | |

| `userAgent` | String | nullable | || `expiresAt` | DateTime | NOT NULL | |

| `createdAt` | DateTime | DEFAULT now() | Never updated |

---| `isActive` | Boolean | DEFAULT true | |

---

| `cancelledAt` | DateTime | nullable | |

## 7. Financial Models

### `patients`| `createdAt` | DateTime | DEFAULT now() | |

### `insurance_claims`



| Column | Type | Constraints | Notes |

|--------|------|-------------|-------|| Column | Type | Constraints | Notes |---

| `id` | String (CUID) | PK | |

| `claimNumber` | String | UNIQUE NOT NULL | Auto-generated: `CLM-2026-00001` ||--------|------|-------------|-------|

| `patientId` | String | FK → patients | |

| `insuranceProviderId` | String | FK → insurance_providers | || `id` | String (CUID) | PK | |## 6. AI & Logging Models

| `policyNumber` | String | nullable | |

| `claimType` | ClaimType | NOT NULL | Enum || `userId` | String | UNIQUE FK → users | One-to-one |

| `diagnosis` | String | NOT NULL | |

| `icd10Code` | String | NOT NULL | Validated against regex || `uhid` | String | UNIQUE NOT NULL | Format: `UH-XXXXXX` |### `ai_report_summaries`

| `admissionDate` | DateTime | nullable | |

| `dischargeDate` | DateTime | nullable | || `firstName` | String | NOT NULL | |

| `hospitalName` | String | NOT NULL | |

| `claimedAmount` | Float | NOT NULL | In INR || `lastName` | String | NOT NULL | || Column | Type | Constraints | Notes |

| `approvedAmount` | Float | nullable | Filled on approval |

| `currency` | String | DEFAULT "INR" | || `dateOfBirth` | DateTime | NOT NULL | ||--------|------|-------------|-------|

| `status` | ClaimStatus | DEFAULT SUBMITTED | Enum |

| `fraudScore` | Int | nullable | 0–100 (100 = highest risk) || `gender` | Gender | NOT NULL | Enum || `id` | String (CUID) | PK | |

| `fraudFlags` | Json | nullable | Array of `{ flag, reason, severity }` |

| `notes` | String | nullable | Reviewer notes || `bloodGroup` | BloodGroup | DEFAULT UNKNOWN | Enum || `recordId` | String | nullable | FK → medical_records |

| `settlementDate` | DateTime | nullable | |

| `createdAt` | DateTime | DEFAULT now() | || `phone` | String | nullable | || `patientId` | String | FK → patients | |

| `updatedAt` | DateTime | auto-update | |

| `aadhaarEncrypted` | String | nullable | AES-256-GCM encrypted || `summaryType` | String | NOT NULL | REPORT_DECODER, CLINICAL_SUMMARY |

---

| `photoUrl` | String | nullable | Cloudinary URL || `summaryText` | String | NOT NULL | Main AI text |

### `claim_documents`

| `allergies` | String[] | DEFAULT [] | Drug/food allergy names || `structuredData` | JSON | nullable | Full parsed output |

| Column | Type | Constraints | Notes |

|--------|------|-------------|-------|| `chronicConditions` | String[] | DEFAULT [] | ICD-10 code strings || `riskLevel` | String | nullable | NORMAL/LOW/MODERATE/HIGH/CRITICAL |

| `id` | String (CUID) | PK | |

| `claimId` | String | FK → insurance_claims, CASCADE DELETE | || `address` | String | nullable | || `modelUsed` | String | NOT NULL | gpt-4o, gemini-1.5-pro |

| `documentType` | String | NOT NULL | "DISCHARGE_SUMMARY", "BILL", "PRESCRIPTION" |

| `fileUrl` | String | NOT NULL | Cloudinary URL || `city` | String | nullable | || `tokensUsed` | Int | nullable | For cost tracking |

| `fileHash` | String | NOT NULL | SHA-256 — used for integrity verification |

| `originalRecordId` | String | nullable FK → medical_records | If sourced from patient's UHID || `state` | String | nullable | || `generatedAt` | DateTime | NOT NULL | |

| `isVerified` | Boolean | DEFAULT false | Hash matched with original |

| `verifiedAt` | DateTime | nullable | || `pincode` | String | nullable | || `updatedAt` | DateTime | auto-update | For cache invalidation |

| `uploadedAt` | DateTime | DEFAULT now() | |

| `createdAt` | DateTime | DEFAULT now() | |

---

| `updatedAt` | DateTime | auto-update | |### `pharma_check_logs`

## 8. Telehealth & Notifications Models



### `appointments`

---| Column | Type | Constraints | Notes |

| Column | Type | Constraints | Notes |

|--------|------|-------------|-------||--------|------|-------------|-------|

| `id` | String (CUID) | PK | |

| `patientId` | String | FK → patients | |### `doctors`| `id` | String (CUID) | PK | |

| `doctorId` | String | FK → doctors | |

| `hospitalId` | String | FK → hospitals | || `prescriptionId` | String | FK → prescriptions | |

| `scheduledAt` | DateTime | NOT NULL | |

| `type` | AppointmentType | NOT NULL | Enum || Column | Type | Constraints | Notes || `doctorId` | String | FK → doctors | |

| `status` | AppointmentStatus | DEFAULT SCHEDULED | Enum |

| `chiefComplaint` | String | nullable | ||--------|------|-------------|-------|| `patientId` | String | FK → patients | |

| `notes` | String | nullable | |

| `cancelReason` | String | nullable | || `id` | String (CUID) | PK | || `checkType` | String | NOT NULL | DRUG_INTERACTION, DRUG_ALLERGY, DRUG_CONDITION |

| `cancelledBy` | String | nullable | userId who cancelled |

| `confirmationNumber` | String | UNIQUE NOT NULL | Auto-generated: `APT-YYYY-NNNNN` || `userId` | String | UNIQUE FK → users | || `severity` | InteractionSeverity | NOT NULL | |

| `videoRoomName` | String | nullable | Jitsi room ID (VIDEO type only) |

| `completedAt` | DateTime | nullable | || `hospitalId` | String | FK → hospitals | || `drugs` | String[] | NOT NULL | Drugs involved |

| `createdAt` | DateTime | DEFAULT now() | |

| `updatedAt` | DateTime | auto-update | || `firstName` | String | NOT NULL | || `mechanism` | String | NOT NULL | Interaction description |



**Unique constraint:** `(doctorId, scheduledAt)` — prevents doctor double booking| `lastName` | String | NOT NULL | || `overridden` | Boolean | DEFAULT false | |



---| `specialty` | String | NOT NULL | e.g. "Cardiology" || `overrideReason` | String | nullable | |



### `doctor_availability`| `licenseNumber` | String | UNIQUE NOT NULL | NMC registration || `createdAt` | DateTime | DEFAULT now() | |



> Stores each doctor's weekly working schedule.| `qualifications` | String[] | NOT NULL | e.g. ["MBBS", "MD"] |

> The slot-generation service reads this to compute available 30-min slots for the next 7 days.

| `experienceYears` | Int | DEFAULT 0 | |### `audit_logs`

| Column | Type | Constraints | Notes |

|--------|------|-------------|-------|| `consultationFee` | Float | DEFAULT 0.0 | In INR |

| `id` | String (CUID) | PK | |

| `doctorId` | String | FK → doctors | || `languages` | String[] | DEFAULT ["English"] | Spoken languages || Column | Type | Constraints | Notes |

| `dayOfWeek` | AvailabilityDay | NOT NULL | Enum (MONDAY–SUNDAY) |

| `startTime` | String | NOT NULL | "09:00" (24hr HH:MM format) || `availableForVideo` | Boolean | DEFAULT true | Accepts video appointments ||--------|------|-------------|-------|

| `endTime` | String | NOT NULL | "17:00" (24hr HH:MM format) |

| `isActive` | Boolean | DEFAULT true | Doctor can pause a day || `availableForInPerson` | Boolean | DEFAULT true | Accepts in-person appointments || `id` | String (CUID) | PK | |

| `createdAt` | DateTime | DEFAULT now() | |

| `updatedAt` | DateTime | auto-update | || `slotDurationMinutes` | Int | DEFAULT 30 | Minutes per appointment slot || `action` | AuditAction | NOT NULL | 40+ action types |



**Unique constraint:** `(doctorId, dayOfWeek)` — one row per day per doctor| `isVerified` | Boolean | DEFAULT false | Hospital admin must verify || `severity` | String | NOT NULL | LOW, MEDIUM, HIGH, CRITICAL |



---| `verifiedAt` | DateTime | nullable | || `actorId` | String | NOT NULL | |



### `doctor_reviews`| `verifiedByAdminId` | String | nullable | FK → hospital_admins.id || `actorRole` | Role | NOT NULL | |



> Patients submit 1–5 star rating after a COMPLETED appointment.| `rating` | Float | DEFAULT 0.0 | Computed: avg of doctor_reviews || `targetId` | String | nullable | |

> After each insert/update, a DB trigger (or service layer) recomputes `doctors.rating` and `doctors.totalReviews`.

| `totalReviews` | Int | DEFAULT 0 | Computed count of doctor_reviews || `targetType` | String | nullable | |

| Column | Type | Constraints | Notes |

|--------|------|-------------|-------|| `photoUrl` | String | nullable | Cloudinary URL || `hospitalId` | String | nullable | |

| `id` | String (CUID) | PK | |

| `doctorId` | String | FK → doctors | || `createdAt` | DateTime | DEFAULT now() | || `metadata` | JSON | nullable | |

| `patientId` | String | FK → patients | |

| `appointmentId` | String | UNIQUE FK → appointments | One review per appointment || `updatedAt` | DateTime | auto-update | || `ipAddress` | String | nullable | |

| `rating` | Int | NOT NULL | 1–5 (validated in Zod) |

| `comment` | String | nullable | Optional text review || `userAgent` | String | nullable | |

| `isAnonymous` | Boolean | DEFAULT false | Hides patient name from doctor |

| `createdAt` | DateTime | DEFAULT now() | |---| `createdAt` | DateTime | DEFAULT now() | INSERT ONLY |



**Unique constraint:** `(patientId, appointmentId)` — one review per patient per appointment



---### `hospital_staff`---



### `notifications`



> In-app notification bell storage.| Column | Type | Constraints | Notes |## 7. Financial Models

> A cron job deletes records where `expiresAt < now()` every night at 2:00 AM IST.

> All real-time Socket.io events also write to this table.|--------|------|-------------|-------|



| Column | Type | Constraints | Notes || `id` | String (CUID) | PK | |### `insurance_claims`

|--------|------|-------------|-------|

| `id` | String (CUID) | PK | || `userId` | String | UNIQUE FK → users | |

| `userId` | String | FK → users | Recipient user |

| `type` | NotificationType | NOT NULL | Enum || `hospitalId` | String | FK → hospitals | || Column | Type | Constraints | Notes |

| `title` | String | NOT NULL | e.g. "Access Request" |

| `message` | String | NOT NULL | Human-readable message body || `firstName` | String | NOT NULL | ||--------|------|-------------|-------|

| `link` | String | nullable | Frontend route e.g. `/patient/consent` |

| `isRead` | Boolean | DEFAULT false | || `lastName` | String | NOT NULL | || `id` | String (CUID) | PK | |

| `readAt` | DateTime | nullable | |

| `metadata` | Json | nullable | `{ consentId, appointmentId, claimId }` || `staffType` | StaffType | NOT NULL | Enum || `claimNumber` | String | UNIQUE | System-generated |

| `createdAt` | DateTime | DEFAULT now() | |

| `expiresAt` | DateTime | NOT NULL | `createdAt + 30 days` || `employeeId` | String | nullable | Hospital-issued ID || `patientId` | String | FK → patients | |



---| `isVerified` | Boolean | DEFAULT false | || `insuranceProviderId` | String | FK → insurance_providers | |



## 9. Lookup Data Models| `createdAt` | DateTime | DEFAULT now() | || `policyNumber` | String | nullable | |



### `drug_interactions`| `updatedAt` | DateTime | auto-update | || `claimType` | String | NOT NULL | Enum |



> Reference table seeded from OpenFDA API data.| `diagnosis` | String | NOT NULL | |

> OpenFDA endpoint: `https://api.fda.gov/drug/label.json` — free, no API key, 100k requests/day.

> Seed script fetches common high-risk pairs and populates this table once during setup.---| `icd10Code` | String | NOT NULL | |

> Drug names stored **normalized** (lowercase, trimmed) for consistent lookup.

| `admissionDate` | DateTime | nullable | |

| Column | Type | Constraints | Notes |

|--------|------|-------------|-------|### `hospital_admins`| `dischargeDate` | DateTime | nullable | |

| `id` | String (CUID) | PK | |

| `drug1Name` | String | NOT NULL | Normalized lowercase || `hospitalName` | String | NOT NULL | |

| `drug2Name` | String | NOT NULL | Normalized lowercase |

| `severity` | InteractionSeverity | NOT NULL | Enum || Column | Type | Constraints | Notes || `claimedAmount` | Float | NOT NULL | |

| `mechanism` | String | NOT NULL | Why the interaction occurs |

| `clinicalEffect` | String | NOT NULL | What symptoms / risk occurs ||--------|------|-------------|-------|| `approvedAmount` | Float | nullable | |

| `management` | String | nullable | What to do / alternative drugs |

| `source` | String | DEFAULT "OpenFDA" | Data source label || `id` | String (CUID) | PK | || `currency` | String | DEFAULT "INR" | |

| `createdAt` | DateTime | DEFAULT now() | |

| `updatedAt` | DateTime | auto-update | || `userId` | String | UNIQUE FK → users | || `status` | ClaimStatus | DEFAULT SUBMITTED | |



**Unique constraint:** `(drug1Name, drug2Name)` — always stored in alphabetical order (drug1 < drug2)| `hospitalId` | String | UNIQUE FK → hospitals | One admin per hospital || `fraudScore` | Int | nullable | 0–100 |



---| `firstName` | String | NOT NULL | || `fraudFlags` | JSON | nullable | Array of flag objects |



### `icd10_codes`| `lastName` | String | NOT NULL | || `notes` | String | nullable | |



> Seeded once using the `icd10-codes` npm package (simpletransmit/icd10-codes).| `createdAt` | DateTime | DEFAULT now() | || `settlementDate` | DateTime | nullable | |

> Contains ~70,000 ICD-10-CM codes. Works fully offline — no external API needed.

> Install: `npm install icd10-codes` in the seed script environment.| `createdAt` | DateTime | DEFAULT now() | |



| Column | Type | Constraints | Notes |---| `updatedAt` | DateTime | auto-update | |

|--------|------|-------------|-------|

| `id` | String (CUID) | PK | |

| `code` | String | UNIQUE NOT NULL | e.g. "I20.9" |

| `description` | String | NOT NULL | e.g. "Angina pectoris, unspecified" |### `insurance_providers`### `claim_documents`

| `category` | String | nullable | e.g. "Diseases of the circulatory system" |

| `isActive` | Boolean | DEFAULT true | Can disable deprecated codes |



---| Column | Type | Constraints | Notes || Column | Type | Constraints | Notes |



## 10. Indexes & Performance|--------|------|-------------|-------||--------|------|-------------|-------|



```sql| `id` | String (CUID) | PK | || `id` | String (CUID) | PK | |

-- ─── Users ───────────────────────────────────────────────────────────

CREATE UNIQUE INDEX idx_users_email          ON users(email);| `userId` | String | UNIQUE FK → users | || `claimId` | String | FK → insurance_claims | |



-- ─── Patients ────────────────────────────────────────────────────────| `companyName` | String | NOT NULL | || `documentType` | String | NOT NULL | |

CREATE UNIQUE INDEX idx_patients_uhid        ON patients(uhid);

CREATE        INDEX idx_patients_phone       ON patients(phone);| `licenseNumber` | String | UNIQUE NOT NULL | IRDAI license number || `fileUrl` | String | NOT NULL | |

CREATE        INDEX idx_patients_userId      ON patients(userId);

| `isVerified` | Boolean | DEFAULT false | Super Admin approves || `fileHash` | String | NOT NULL | SHA-256 |

-- ─── Doctors ─────────────────────────────────────────────────────────

CREATE        INDEX idx_doctors_hospital     ON doctors(hospitalId);| `verifiedAt` | DateTime | nullable | || `originalRecordId` | String | nullable | FK → medical_records |

CREATE        INDEX idx_doctors_specialty    ON doctors(specialty);

CREATE        INDEX idx_doctors_verified     ON doctors(isVerified);| `createdAt` | DateTime | DEFAULT now() | || `isVerified` | Boolean | DEFAULT false | |

CREATE        INDEX idx_doctors_rating       ON doctors(rating DESC);

| `verifiedAt` | DateTime | nullable | |

-- ─── Doctor Availability ─────────────────────────────────────────────

CREATE UNIQUE INDEX idx_availability_slot    ON doctor_availability(doctorId, dayOfWeek);---| `uploadedAt` | DateTime | DEFAULT now() | |



-- ─── Doctor Reviews ──────────────────────────────────────────────────

CREATE        INDEX idx_reviews_doctor       ON doctor_reviews(doctorId);

CREATE UNIQUE INDEX idx_review_appt          ON doctor_reviews(appointmentId);### `super_admins`---



-- ─── Medical Records ─────────────────────────────────────────────────

CREATE        INDEX idx_records_patient      ON medical_records(patientId);

CREATE        INDEX idx_records_type         ON medical_records(recordType);| Column | Type | Constraints | Notes |## 8. Indexes & Performance

CREATE        INDEX idx_records_date         ON medical_records(recordDate DESC);

CREATE        INDEX idx_records_deleted      ON medical_records(isDeleted);|--------|------|-------------|-------|



-- ─── Prescriptions ───────────────────────────────────────────────────| `id` | String (CUID) | PK | |```sql

CREATE        INDEX idx_rx_patient           ON prescriptions(patientId);

CREATE        INDEX idx_rx_doctor            ON prescriptions(doctorId);| `userId` | String | UNIQUE FK → users | |-- Users

CREATE        INDEX idx_rx_date              ON prescriptions(createdAt DESC);

| `firstName` | String | NOT NULL | |CREATE UNIQUE INDEX idx_users_email ON users(email);

-- ─── Clinical Notes ──────────────────────────────────────────────────

CREATE        INDEX idx_notes_patient        ON clinical_notes(patientId);| `lastName` | String | NOT NULL | |

CREATE        INDEX idx_notes_doctor         ON clinical_notes(doctorId);

| `createdAt` | DateTime | DEFAULT now() | |-- Patients

-- ─── Consents ────────────────────────────────────────────────────────

CREATE        INDEX idx_consents_patient     ON consents(patientId);CREATE UNIQUE INDEX idx_patients_uhid ON patients(uhid);

CREATE        INDEX idx_consents_status      ON consents(status);

CREATE        INDEX idx_consents_expires     ON consents(expiresAt);---CREATE INDEX idx_patients_phone ON patients(phone);

CREATE        INDEX idx_consents_doctor      ON consents(doctorId);



-- ─── QR Codes ────────────────────────────────────────────────────────

CREATE UNIQUE INDEX idx_qr_jti               ON qr_codes(jti);### `hospitals`-- Records

CREATE        INDEX idx_qr_patient           ON qr_codes(patientId);

CREATE INDEX idx_records_patient ON medical_records(patientId);

-- ─── QR Scan Logs ────────────────────────────────────────────────────

CREATE        INDEX idx_qrscan_patient       ON qr_scan_logs(patientId);| Column | Type | Constraints | Notes |CREATE INDEX idx_records_type ON medical_records(recordType);

CREATE        INDEX idx_qrscan_qrcode        ON qr_scan_logs(qrCodeId);

CREATE        INDEX idx_qrscan_scanner       ON qr_scan_logs(scannedById);|--------|------|-------------|-------|CREATE INDEX idx_records_date ON medical_records(recordDate DESC);

CREATE        INDEX idx_qrscan_at            ON qr_scan_logs(scannedAt DESC);

CREATE        INDEX idx_qrscan_suspicious    ON qr_scan_logs(isSuspicious);| `id` | String (CUID) | PK | |



-- ─── Appointments ────────────────────────────────────────────────────| `name` | String | NOT NULL | |-- Consents

CREATE UNIQUE INDEX idx_appt_slot            ON appointments(doctorId, scheduledAt);

CREATE        INDEX idx_appt_patient         ON appointments(patientId);| `registrationNumber` | String | UNIQUE NOT NULL | |CREATE INDEX idx_consents_patient ON consents(patientId);

CREATE        INDEX idx_appt_status          ON appointments(status);

CREATE        INDEX idx_appt_scheduled       ON appointments(scheduledAt);| `address` | String | NOT NULL | |CREATE INDEX idx_consents_status ON consents(status);



-- ─── Notifications ───────────────────────────────────────────────────| `city` | String | NOT NULL | |CREATE INDEX idx_consents_expires ON consents(expiresAt);

CREATE        INDEX idx_notif_user           ON notifications(userId);

CREATE        INDEX idx_notif_unread         ON notifications(userId, isRead);| `state` | String | NOT NULL | |

CREATE        INDEX idx_notif_expires        ON notifications(expiresAt);

| `pincode` | String | NOT NULL | |-- Prescriptions

-- ─── Audit Logs ──────────────────────────────────────────────────────

CREATE        INDEX idx_audit_actor          ON audit_logs(actorId);| `phone` | String | nullable | |CREATE INDEX idx_rx_patient ON prescriptions(patientId);

CREATE        INDEX idx_audit_target         ON audit_logs(targetId);

CREATE        INDEX idx_audit_hospital       ON audit_logs(hospitalId);| `email` | String | nullable | |CREATE INDEX idx_rx_doctor ON prescriptions(doctorId);

CREATE        INDEX idx_audit_created        ON audit_logs(createdAt DESC);

CREATE        INDEX idx_audit_action         ON audit_logs(action);| `isVerified` | Boolean | DEFAULT false | Super Admin verifies |CREATE INDEX idx_rx_date ON prescriptions(createdAt DESC);



-- ─── Insurance Claims ────────────────────────────────────────────────| `verifiedAt` | DateTime | nullable | |

CREATE        INDEX idx_claims_patient       ON insurance_claims(patientId);

CREATE        INDEX idx_claims_provider      ON insurance_claims(insuranceProviderId);| `isNABH` | Boolean | DEFAULT false | NABH accreditation flag |-- Appointments

CREATE        INDEX idx_claims_status        ON insurance_claims(status);

| `specialties` | String[] | DEFAULT [] | Available specialties |CREATE UNIQUE INDEX idx_appt_slot ON appointments(doctorId, scheduledAt);

-- ─── Drug Interactions ───────────────────────────────────────────────

CREATE        INDEX idx_drug_drug1           ON drug_interactions(drug1Name);| `createdAt` | DateTime | DEFAULT now() | |CREATE INDEX idx_appt_patient ON appointments(patientId);

CREATE        INDEX idx_drug_drug2           ON drug_interactions(drug2Name);

CREATE UNIQUE INDEX idx_drug_pair            ON drug_interactions(drug1Name, drug2Name);| `updatedAt` | DateTime | auto-update | |CREATE INDEX idx_appt_status ON appointments(status);



-- ─── ICD10 Codes ─────────────────────────────────────────────────────

CREATE UNIQUE INDEX idx_icd10_code           ON icd10_codes(code);

CREATE        INDEX idx_icd10_category       ON icd10_codes(category);----- Audit Logs

```

CREATE INDEX idx_audit_actor ON audit_logs(actorId);

---

### `emergency_contacts`CREATE INDEX idx_audit_target ON audit_logs(targetId);

## 11. Naming Conflict Resolutions

CREATE INDEX idx_audit_hospital ON audit_logs(hospitalId);

All conflicts from previous document versions are resolved. This document is the **single source of truth**.

| Column | Type | Constraints | Notes |CREATE INDEX idx_audit_created ON audit_logs(createdAt DESC);

| Conflict | Previous Values | ✅ Final Value | Reason |

|----------|----------------|---------------|--------||--------|------|-------------|-------|```

| File hash column | `blockchainHash` (Phase 2) vs `fileHash` (this doc) | **`fileHash`** | SHA-256 of file bytes; no blockchain in MVP |

| OCR text column | `ocrExtractedText` (Phase 5) vs `extractedText` (this doc) | **`extractedText`** | Shorter, cleaner naming || `id` | String (CUID) | PK | |

| JWT env var | `JWT_SECRET` (Phase 10) vs `JWT_ACCESS_SECRET` (Phase 1) | **`JWT_ACCESS_SECRET` + `JWT_REFRESH_SECRET`** | Two secrets per Phase 1 and SECURITY.md |

| SMS provider | Twilio (Phase 3) vs not in tech stack | **MSG91** | Indian provider, 100 free SMS trial, ₹0.15/SMS || `patientId` | String | FK → patients | |---

| Drug interactions | DrugBank/undefined | **OpenFDA API** | Free, 100k requests/day, no cost |

| ICD-10 source | Undefined | **icd10-codes npm package** | Free, offline, 3-line install || `name` | String | NOT NULL | |

| Notifications table | Missing from previous DB schema | **Added** (Section 8) | Required by Phase 9 bell icon |

| doctor_availability | Missing from previous DB schema | **Added** (Section 8) | Required by Phase 9 slot booking || `relation` | String | NOT NULL | "Mother", "Spouse", etc. |*← Back to [Master Index](./MASTER_INDEX.md)*

| doctor_reviews | Missing from previous DB schema | **Added** (Section 8) | Required by Phase 9 doctor ratings |

| doctors missing fields | consultationFee, experienceYears, languages, rating, totalReviews, availableForVideo, availableForInPerson, slotDurationMinutes | **All added** (Section 3) | Required by Phase 9 doctor search API || `phone` | String | NOT NULL | |

| QR public scan shows allergy names | Old model: allergy names in Tier 1 response | **3-tier model: allergy names hidden in Tier 1** | Phone theft → intentional harm prevention || `isOnUhid` | Boolean | DEFAULT false | Contact also uses UHID |

| qr_scan_logs table | Missing | **Added** (Section 5) | Required by 3-tier QR audit trail || `emergencyContactUhid` | String | nullable | Their UHID if on platform |

| `createdAt` | DateTime | DEFAULT now() | |

---

---

*← Back to [Master Index](./MASTER_INDEX.md)*

### `family_links`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | String (CUID) | PK | |
| `patientId` | String | FK → patients | Child/dependent |
| `linkedToPatientId` | String | FK → patients | Parent/guardian |
| `relation` | String | NOT NULL | "Child", "Parent", "Spouse" |
| `canManage` | Boolean | DEFAULT false | Guardian can manage records |
| `createdAt` | DateTime | DEFAULT now() | |

---

## 4. Medical Data Models

### `medical_records`

> **✅ Resolved:** Column is `fileHash` (SHA-256 of file bytes). `blockchainHash` from Phase 2 doc was an error — removed.  
> **✅ Resolved:** Column is `extractedText` (OCR output). `ocrExtractedText` from Phase 5 doc was an error — removed.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | String (CUID) | PK | |
| `patientId` | String | FK → patients | |
| `uploadedByStaffId` | String | nullable FK → hospital_staff | |
| `hospitalId` | String | nullable FK → hospitals | |
| `recordType` | RecordType | NOT NULL | Enum |
| `subType` | RecordSubType | nullable | Enum |
| `title` | String | NOT NULL | |
| `description` | String | nullable | |
| `fileUrl` | String | NOT NULL | Cloudinary private URL |
| `filePublicId` | String | NOT NULL | Cloudinary public ID |
| `fileHash` | String | NOT NULL | SHA-256 of file content |
| `mimeType` | String | NOT NULL | `image/jpeg`, `application/pdf` |
| `fileSize` | Int | NOT NULL | File size in bytes |
| `extractedText` | String | nullable | OCR-extracted text |
| `recordDate` | DateTime | nullable | Date test was performed |
| `tags` | String[] | DEFAULT [] | Searchable tags |
| `isDeleted` | Boolean | DEFAULT false | Soft delete flag |
| `deletedAt` | DateTime | nullable | |
| `createdAt` | DateTime | DEFAULT now() | |
| `updatedAt` | DateTime | auto-update | |

---

### `prescriptions`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | String (CUID) | PK | |
| `patientId` | String | FK → patients | |
| `doctorId` | String | FK → doctors | |
| `hospitalId` | String | FK → hospitals | |
| `appointmentId` | String | nullable FK → appointments | Linked if from telehealth |
| `diagnosis` | String | NOT NULL | |
| `notes` | String | nullable | |
| `followUpDate` | DateTime | nullable | |
| `validUntil` | DateTime | nullable | Default: 30 days from creation |
| `createdAt` | DateTime | DEFAULT now() | |

---

### `prescription_items`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | String (CUID) | PK | |
| `prescriptionId` | String | FK → prescriptions, CASCADE DELETE | |
| `drugName` | String | NOT NULL | Generic name preferred |
| `dosage` | String | NOT NULL | e.g. "500mg" |
| `form` | DrugForm | NOT NULL | Enum |
| `frequency` | String | NOT NULL | e.g. "Twice daily" |
| `duration` | String | NOT NULL | e.g. "7 days" |
| `route` | DrugRoute | NOT NULL | Enum |
| `instructions` | String | nullable | e.g. "Take after meals" |
| `quantity` | Int | NOT NULL | Units to dispense |

---

### `clinical_notes`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | String (CUID) | PK | |
| `patientId` | String | FK → patients | |
| `doctorId` | String | FK → doctors | |
| `appointmentId` | String | nullable FK → appointments | |
| `chiefComplaint` | String | NOT NULL | |
| `symptoms` | String[] | NOT NULL | |
| `icd10Code` | String | NOT NULL | Format: `A00.0` |
| `icd10Description` | String | NOT NULL | |
| `examinationFindings` | String | nullable | |
| `vitalSigns` | Json | nullable | `{ bp, pulse, temperature, spo2, weight, height }` |
| `diagnosis` | String | NOT NULL | |
| `treatmentPlan` | String | nullable | |
| `visibility` | NoteVisibility | DEFAULT PRIVATE | Enum |
| `createdAt` | DateTime | DEFAULT now() | |
| `updatedAt` | DateTime | auto-update | |

---

## 5. Access Control Models

### `consents`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | String (CUID) | PK | |
| `patientId` | String | FK → patients | |
| `grantedToType` | String | NOT NULL | "DOCTOR" or "INSURANCE_PROVIDER" |
| `doctorId` | String | nullable FK → doctors | |
| `insuranceProviderId` | String | nullable FK → insurance_providers | |
| `scope` | ConsentScope[] | NOT NULL | Array of ConsentScope enums |
| `purpose` | String | NOT NULL | |
| `status` | ConsentStatus | DEFAULT PENDING | Enum |
| `isTemporary` | Boolean | DEFAULT true | |
| `durationHours` | Int | nullable | Null if permanent |
| `expiresAt` | DateTime | nullable | Null if permanent |
| `otpVerified` | Boolean | DEFAULT false | |
| `otpVerifiedAt` | DateTime | nullable | |
| `requestedAt` | DateTime | DEFAULT now() | |
| `grantedAt` | DateTime | nullable | |
| `revokedAt` | DateTime | nullable | |

---

### `qr_codes`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | String (CUID) | PK | |
| `patientId` | String | FK → patients | |
| `jti` | String | UNIQUE NOT NULL | JWT ID — Redis-backed validation |
| `scope` | ConsentScope[] | NOT NULL | Accessible data scopes |
| `tier` | Int | NOT NULL DEFAULT 1 | 1 = public, 2 = doctor, 3 = patient-share |
| `isOneTime` | Boolean | DEFAULT false | Tier 3 always true |
| `isEmergencyCard` | Boolean | DEFAULT false | Permanent static QR auto-generated at registration |
| `label` | String | nullable | Patient-assigned label |
| `expiresAt` | DateTime | NOT NULL | |
| `usedAt` | DateTime | nullable | Timestamp of first scan |
| `usedByDoctorId` | String | nullable | FK → doctors.id |
| `isRevoked` | Boolean | DEFAULT false | |
| `revokedAt` | DateTime | nullable | |
| `revokedReason` | String | nullable | "PHONE_LOST" / "SUSPICIOUS" / "MANUAL" |
| `createdAt` | DateTime | DEFAULT now() | |

---

### `qr_scan_logs` ← NEW TABLE

> **INSERT-ONLY. Never updated or deleted.**
> Every scan of any QR (public, doctor, patient-initiated) creates one row.
> This is the data shown on the patient's "QR Scan History" dashboard section.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | String (CUID) | PK | |
| `qrCodeId` | String | FK → qr_codes | Which QR was scanned |
| `patientId` | String | FK → patients | Whose QR was scanned |
| `tier` | Int | NOT NULL | 1, 2, or 3 |
| `scanType` | QrScanType | NOT NULL | Enum — see values below |
| `scannedById` | String | nullable FK → users | Null if public/anonymous scan |
| `scannerName` | String | nullable | Snapshot of name at scan time |
| `scannerUhidId` | String | nullable | DR-XXXXXX or INS-XXXXXX |
| `organization` | String | nullable | Hospital or insurance company |
| `ipAddress` | String | nullable | Hashed for privacy |
| `location` | String | nullable | City, State (IP geolocation) |
| `isSuspicious` | Boolean | DEFAULT false | Auto-flagged by rate-limit / time / location rules |
| `suspicionReason` | String | nullable | "RATE_LIMIT_EXCEEDED" / "UNUSUAL_TIME" / "LOCATION_MISMATCH" |
| `reportedByPatient` | Boolean | DEFAULT false | Patient manually reported this scan |
| `scannedAt` | DateTime | DEFAULT now() | |

**QrScanType enum values:**
| Value | Meaning |
|-------|---------|
| `PUBLIC_SCAN` | Tier 1 — no login, anyone |
| `DOCTOR_SCAN` | Tier 2 — verified UHID doctor |
| `INSURANCE_SCAN` | Tier 2 — verified insurance user |
| `PATIENT_INITIATED` | Tier 3 — patient generated one-time share |
| `SUSPICIOUS_SCAN` | Auto-flagged rate-limit or anomaly breach |

---

### `emergency_accesses`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | String (CUID) | PK | |
| `patientId` | String | FK → patients | |
| `accessedByDoctorId` | String | nullable FK → doctors | |
| `accessType` | EmergencyAccessType | NOT NULL | Enum |
| `reason` | String | nullable | Doctor-entered reason |
| `reasonType` | String | nullable | e.g. "CRITICAL_CARE" |
| `latitude` | Float | nullable | GPS lat (SOS only) |
| `longitude` | Float | nullable | GPS lng (SOS only) |
| `emergencyCode` | String | nullable | e.g. "EMG-A4X2" |
| `emergencyCodeExpiresAt` | DateTime | nullable | |
| `expiresAt` | DateTime | NOT NULL | Auto-revoked after this |
| `isActive` | Boolean | DEFAULT true | |
| `cancelledAt` | DateTime | nullable | |
| `createdAt` | DateTime | DEFAULT now() | |

---

## 6. AI & Logging Models

### `ai_report_summaries`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | String (CUID) | PK | |
| `recordId` | String | nullable FK → medical_records | Null for clinical summaries |
| `patientId` | String | FK → patients | |
| `summaryType` | SummaryType | NOT NULL | Enum |
| `summaryText` | String | NOT NULL | Main AI-generated explanation |
| `structuredData` | Json | nullable | Full parsed JSON output |
| `riskLevel` | String | nullable | NORMAL / LOW / MODERATE / HIGH / CRITICAL |
| `modelUsed` | String | NOT NULL | "gpt-4o", "gemini-1.5-flash" |
| `tokensUsed` | Int | nullable | For cost tracking |
| `generatedAt` | DateTime | NOT NULL | |
| `updatedAt` | DateTime | auto-update | Used for cache invalidation |

---

### `pharma_check_logs`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | String (CUID) | PK | |
| `prescriptionId` | String | nullable FK → prescriptions | Null if live-check without saving |
| `doctorId` | String | FK → doctors | |
| `patientId` | String | FK → patients | |
| `checkType` | PharmaCheckType | NOT NULL | Enum |
| `severity` | InteractionSeverity | NOT NULL | Enum |
| `drugs` | String[] | NOT NULL | Drug names involved |
| `mechanism` | String | NOT NULL | Interaction mechanism description |
| `overridden` | Boolean | DEFAULT false | Doctor chose to override |
| `overrideReason` | String | nullable | Required when overridden = true |
| `createdAt` | DateTime | DEFAULT now() | |

---

### `audit_logs`

> ⚠️ **INSERT-ONLY.** No UPDATE or DELETE is ever permitted on this table.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | String (CUID) | PK | |
| `action` | AuditAction | NOT NULL | Enum (42 values) |
| `severity` | AuditSeverity | NOT NULL | Enum |
| `actorId` | String | NOT NULL | User who performed the action |
| `actorRole` | Role | NOT NULL | Role at time of action |
| `targetId` | String | nullable | Patient / Record / Claim ID |
| `targetType` | String | nullable | "PATIENT", "RECORD", "CLAIM", etc. |
| `hospitalId` | String | nullable FK → hospitals | |
| `metadata` | Json | nullable | Contextual data |
| `ipAddress` | String | nullable | |
| `userAgent` | String | nullable | |
| `createdAt` | DateTime | DEFAULT now() | Never updated |

---

## 7. Financial Models

### `insurance_claims`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | String (CUID) | PK | |
| `claimNumber` | String | UNIQUE NOT NULL | Auto-generated: `CLM-2026-00001` |
| `patientId` | String | FK → patients | |
| `insuranceProviderId` | String | FK → insurance_providers | |
| `policyNumber` | String | nullable | |
| `claimType` | ClaimType | NOT NULL | Enum |
| `diagnosis` | String | NOT NULL | |
| `icd10Code` | String | NOT NULL | Validated against regex |
| `admissionDate` | DateTime | nullable | |
| `dischargeDate` | DateTime | nullable | |
| `hospitalName` | String | NOT NULL | |
| `claimedAmount` | Float | NOT NULL | In INR |
| `approvedAmount` | Float | nullable | Filled on approval |
| `currency` | String | DEFAULT "INR" | |
| `status` | ClaimStatus | DEFAULT SUBMITTED | Enum |
| `fraudScore` | Int | nullable | 0–100 (100 = highest risk) |
| `fraudFlags` | Json | nullable | Array of `{ flag, reason, severity }` |
| `notes` | String | nullable | Reviewer notes |
| `settlementDate` | DateTime | nullable | |
| `createdAt` | DateTime | DEFAULT now() | |
| `updatedAt` | DateTime | auto-update | |

---

### `claim_documents`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | String (CUID) | PK | |
| `claimId` | String | FK → insurance_claims, CASCADE DELETE | |
| `documentType` | String | NOT NULL | "DISCHARGE_SUMMARY", "BILL", "PRESCRIPTION" |
| `fileUrl` | String | NOT NULL | Cloudinary URL |
| `fileHash` | String | NOT NULL | SHA-256 — used for integrity verification |
| `originalRecordId` | String | nullable FK → medical_records | If sourced from patient's UHID |
| `isVerified` | Boolean | DEFAULT false | Hash matched with original |
| `verifiedAt` | DateTime | nullable | |
| `uploadedAt` | DateTime | DEFAULT now() | |

---

## 8. Telehealth & Notifications Models

### `appointments`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | String (CUID) | PK | |
| `patientId` | String | FK → patients | |
| `doctorId` | String | FK → doctors | |
| `hospitalId` | String | FK → hospitals | |
| `scheduledAt` | DateTime | NOT NULL | |
| `type` | AppointmentType | NOT NULL | Enum |
| `status` | AppointmentStatus | DEFAULT SCHEDULED | Enum |
| `chiefComplaint` | String | nullable | |
| `notes` | String | nullable | |
| `cancelReason` | String | nullable | |
| `cancelledBy` | String | nullable | userId who cancelled |
| `confirmationNumber` | String | UNIQUE NOT NULL | Auto-generated: `APT-YYYY-NNNNN` |
| `videoRoomName` | String | nullable | Jitsi room ID (VIDEO type only) |
| `completedAt` | DateTime | nullable | |
| `createdAt` | DateTime | DEFAULT now() | |
| `updatedAt` | DateTime | auto-update | |

**Unique constraint:** `(doctorId, scheduledAt)` — prevents doctor double booking

---

### `doctor_availability`

> Stores each doctor's weekly working schedule.  
> The slot-generation service reads this to compute available 30-min slots for the next 7 days.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | String (CUID) | PK | |
| `doctorId` | String | FK → doctors | |
| `dayOfWeek` | AvailabilityDay | NOT NULL | Enum (MONDAY–SUNDAY) |
| `startTime` | String | NOT NULL | "09:00" (24hr HH:MM format) |
| `endTime` | String | NOT NULL | "17:00" (24hr HH:MM format) |
| `isActive` | Boolean | DEFAULT true | Doctor can pause a day |
| `createdAt` | DateTime | DEFAULT now() | |
| `updatedAt` | DateTime | auto-update | |

**Unique constraint:** `(doctorId, dayOfWeek)` — one row per day per doctor

---

### `doctor_reviews`

> Patients submit 1–5 star rating after a COMPLETED appointment.  
> After each insert/update, a DB trigger (or service layer) recomputes `doctors.rating` and `doctors.totalReviews`.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | String (CUID) | PK | |
| `doctorId` | String | FK → doctors | |
| `patientId` | String | FK → patients | |
| `appointmentId` | String | UNIQUE FK → appointments | One review per appointment |
| `rating` | Int | NOT NULL | 1–5 (validated in Zod) |
| `comment` | String | nullable | Optional text review |
| `isAnonymous` | Boolean | DEFAULT false | Hides patient name from doctor |
| `createdAt` | DateTime | DEFAULT now() | |

**Unique constraint:** `(patientId, appointmentId)` — one review per patient per appointment

---

### `notifications`

> In-app notification bell storage.  
> A cron job deletes records where `expiresAt < now()` every night at 2:00 AM IST.  
> All real-time Socket.io events also write to this table.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | String (CUID) | PK | |
| `userId` | String | FK → users | Recipient user |
| `type` | NotificationType | NOT NULL | Enum |
| `title` | String | NOT NULL | e.g. "Access Request" |
| `message` | String | NOT NULL | Human-readable message body |
| `link` | String | nullable | Frontend route e.g. `/patient/consent` |
| `isRead` | Boolean | DEFAULT false | |
| `readAt` | DateTime | nullable | |
| `metadata` | Json | nullable | `{ consentId, appointmentId, claimId }` |
| `createdAt` | DateTime | DEFAULT now() | |
| `expiresAt` | DateTime | NOT NULL | `createdAt + 30 days` |

---

## 9. Lookup Data Models

### `drug_interactions`

> Reference table seeded from OpenFDA API data.  
> OpenFDA endpoint: `https://api.fda.gov/drug/label.json` — free, no API key, 100k requests/day.  
> Seed script fetches common high-risk pairs and populates this table once during setup.  
> Drug names stored **normalized** (lowercase, trimmed) for consistent lookup.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | String (CUID) | PK | |
| `drug1Name` | String | NOT NULL | Normalized lowercase |
| `drug2Name` | String | NOT NULL | Normalized lowercase |
| `severity` | InteractionSeverity | NOT NULL | Enum |
| `mechanism` | String | NOT NULL | Why the interaction occurs |
| `clinicalEffect` | String | NOT NULL | What symptoms / risk occurs |
| `management` | String | nullable | What to do / alternative drugs |
| `source` | String | DEFAULT "OpenFDA" | Data source label |
| `createdAt` | DateTime | DEFAULT now() | |
| `updatedAt` | DateTime | auto-update | |

**Unique constraint:** `(drug1Name, drug2Name)` — always stored in alphabetical order (drug1 < drug2)

---

### `icd10_codes`

> Seeded once using the `icd10-codes` npm package (simpletransmit/icd10-codes).  
> Contains ~70,000 ICD-10-CM codes. Works fully offline — no external API needed.  
> Install: `npm install icd10-codes` in the seed script environment.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | String (CUID) | PK | |
| `code` | String | UNIQUE NOT NULL | e.g. "I20.9" |
| `description` | String | NOT NULL | e.g. "Angina pectoris, unspecified" |
| `category` | String | nullable | e.g. "Diseases of the circulatory system" |
| `isActive` | Boolean | DEFAULT true | Can disable deprecated codes |

---

## 10. Indexes & Performance

```sql
-- ─── Users ───────────────────────────────────────────────────────────
CREATE UNIQUE INDEX idx_users_email          ON users(email);

-- ─── Patients ────────────────────────────────────────────────────────
CREATE UNIQUE INDEX idx_patients_uhid        ON patients(uhid);
CREATE        INDEX idx_patients_phone       ON patients(phone);
CREATE        INDEX idx_patients_userId      ON patients(userId);

-- ─── Doctors ─────────────────────────────────────────────────────────
CREATE        INDEX idx_doctors_hospital     ON doctors(hospitalId);
CREATE        INDEX idx_doctors_specialty    ON doctors(specialty);
CREATE        INDEX idx_doctors_verified     ON doctors(isVerified);
CREATE        INDEX idx_doctors_rating       ON doctors(rating DESC);

-- ─── Doctor Availability ─────────────────────────────────────────────
CREATE UNIQUE INDEX idx_availability_slot    ON doctor_availability(doctorId, dayOfWeek);

-- ─── Doctor Reviews ──────────────────────────────────────────────────
CREATE        INDEX idx_reviews_doctor       ON doctor_reviews(doctorId);
CREATE UNIQUE INDEX idx_review_appt          ON doctor_reviews(appointmentId);

-- ─── Medical Records ─────────────────────────────────────────────────
CREATE        INDEX idx_records_patient      ON medical_records(patientId);
CREATE        INDEX idx_records_type         ON medical_records(recordType);
CREATE        INDEX idx_records_date         ON medical_records(recordDate DESC);
CREATE        INDEX idx_records_deleted      ON medical_records(isDeleted);

-- ─── Prescriptions ───────────────────────────────────────────────────
CREATE        INDEX idx_rx_patient           ON prescriptions(patientId);
CREATE        INDEX idx_rx_doctor            ON prescriptions(doctorId);
CREATE        INDEX idx_rx_date              ON prescriptions(createdAt DESC);

-- ─── Clinical Notes ──────────────────────────────────────────────────
CREATE        INDEX idx_notes_patient        ON clinical_notes(patientId);
CREATE        INDEX idx_notes_doctor         ON clinical_notes(doctorId);

-- ─── Consents ────────────────────────────────────────────────────────
CREATE        INDEX idx_consents_patient     ON consents(patientId);
CREATE        INDEX idx_consents_status      ON consents(status);
CREATE        INDEX idx_consents_expires     ON consents(expiresAt);
CREATE        INDEX idx_consents_doctor      ON consents(doctorId);

-- ─── QR Codes ────────────────────────────────────────────────────────
CREATE UNIQUE INDEX idx_qr_jti               ON qr_codes(jti);
CREATE        INDEX idx_qr_patient           ON qr_codes(patientId);

-- ─── Appointments ────────────────────────────────────────────────────
CREATE UNIQUE INDEX idx_appt_slot            ON appointments(doctorId, scheduledAt);
CREATE        INDEX idx_appt_patient         ON appointments(patientId);
CREATE        INDEX idx_appt_status          ON appointments(status);
CREATE        INDEX idx_appt_scheduled       ON appointments(scheduledAt);

-- ─── Notifications ───────────────────────────────────────────────────
CREATE        INDEX idx_notif_user           ON notifications(userId);
CREATE        INDEX idx_notif_unread         ON notifications(userId, isRead);
CREATE        INDEX idx_notif_expires        ON notifications(expiresAt);

-- ─── Audit Logs ──────────────────────────────────────────────────────
CREATE        INDEX idx_audit_actor          ON audit_logs(actorId);
CREATE        INDEX idx_audit_target         ON audit_logs(targetId);
CREATE        INDEX idx_audit_hospital       ON audit_logs(hospitalId);
CREATE        INDEX idx_audit_created        ON audit_logs(createdAt DESC);
CREATE        INDEX idx_audit_action         ON audit_logs(action);

-- ─── Insurance Claims ────────────────────────────────────────────────
CREATE        INDEX idx_claims_patient       ON insurance_claims(patientId);
CREATE        INDEX idx_claims_provider      ON insurance_claims(insuranceProviderId);
CREATE        INDEX idx_claims_status        ON insurance_claims(status);

-- ─── Drug Interactions ───────────────────────────────────────────────
CREATE        INDEX idx_drug_drug1           ON drug_interactions(drug1Name);
CREATE        INDEX idx_drug_drug2           ON drug_interactions(drug2Name);
CREATE UNIQUE INDEX idx_drug_pair            ON drug_interactions(drug1Name, drug2Name);

-- ─── ICD10 Codes ─────────────────────────────────────────────────────
CREATE UNIQUE INDEX idx_icd10_code           ON icd10_codes(code);
CREATE        INDEX idx_icd10_category       ON icd10_codes(category);
```

---

## 11. Naming Conflict Resolutions

All conflicts from previous document versions are resolved. This document is the **single source of truth**.

| Conflict | Previous Values | ✅ Final Value | Reason |
|----------|----------------|---------------|--------|
| File hash column | `blockchainHash` (Phase 2) vs `fileHash` (this doc) | **`fileHash`** | SHA-256 of file bytes; no blockchain in MVP |
| OCR text column | `ocrExtractedText` (Phase 5) vs `extractedText` (this doc) | **`extractedText`** | Shorter, cleaner naming |
| JWT env var | `JWT_SECRET` (Phase 10) vs `JWT_ACCESS_SECRET` (Phase 1) | **`JWT_ACCESS_SECRET` + `JWT_REFRESH_SECRET`** | Two secrets per Phase 1 and SECURITY.md |
| SMS provider | Twilio (Phase 3) vs not in tech stack | **MSG91** | Indian provider, 100 free SMS trial, ₹0.15/SMS |
| Drug interactions | DrugBank/undefined | **OpenFDA API** | Free, 100k requests/day, no cost |
| ICD-10 source | Undefined | **icd10-codes npm package** | Free, offline, 3-line install |
| Notifications table | Missing from previous DB schema | **Added** (Section 8) | Required by Phase 9 bell icon |
| doctor_availability | Missing from previous DB schema | **Added** (Section 8) | Required by Phase 9 slot booking |
| doctor_reviews | Missing from previous DB schema | **Added** (Section 8) | Required by Phase 9 doctor ratings |
| doctors missing fields | consultationFee, experienceYears, languages, rating, totalReviews, availableForVideo, availableForInPerson, slotDurationMinutes | **All added** (Section 3) | Required by Phase 9 doctor search API |

---

*← Back to [Master Index](./MASTER_INDEX.md)*
