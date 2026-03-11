# Phase 9 — Telehealth, Appointments & Notifications

> **Phase:** 9  
> **Status:** ⬜ PLANNED  
> **Duration:** Week 13–14  
> **Goal:** Patients can book appointments with any UHID-registered doctor, join video consultations, and receive real-time notifications across all key events in the platform.

---

## 📋 Table of Contents

1. [Overview](#1-overview)
2. [Appointment Booking Flow](#2-appointment-booking-flow)
3. [Video Consultation](#3-video-consultation)
4. [Real-Time Notification System](#4-real-time-notification-system)
5. [Email Notifications](#5-email-notifications)
6. [Socket.io Event Reference](#6-socketio-event-reference)
7. [API Endpoints](#7-api-endpoints)
8. [Validation Rules](#8-validation-rules)
9. [Frontend Pages](#9-frontend-pages)
10. [Database Schema](#10-database-schema)
11. [Security Model](#11-security-model)
12. [Testing](#12-testing)

---

## 1. Overview

```
APPOINTMENT + TELEHEALTH FLOW:
────────────────────────────────────────────────────────────────────
Patient browses doctors →
Filters by specialty, hospital, rating, availability →
Selects time slot →
Books appointment (type: IN_PERSON or VIDEO) →
  → Confirmation email sent to patient + doctor
  → In-app notification

15 minutes before appointment:
  → Reminder notification (push + email)

At appointment time (VIDEO type):
  → "Join Call" button activates
  → Jitsi Meet room generated (based on appointmentId)
  → Both patient and doctor join same room

After appointment:
  → Doctor writes clinical note (auto-linked to appointment)
  → Doctor can issue prescription (auto-linked to appointment)
  → Patient asked to rate the consultation
```

---

## 2. Appointment Booking Flow

### 2.1 Doctor Discovery

- Patients search for doctors by:
  - Specialty (Cardiology, Dermatology, General Medicine, etc.)
  - Hospital name or city
  - Doctor name
  - Rating (4+ stars filter)
  - Availability (next 7 days)

- Each doctor card shows:
  - Name, specialty, hospital
  - Experience (years)
  - Next available slot
  - Consultation fee (INR)
  - Average rating (from previous consultations)
  - Languages spoken

### 2.2 Slot Selection

- Doctor's available slots fetched for next 7 days
- Slots are 30 minutes each (configurable per doctor)
- Already booked slots shown as unavailable
- Patient selects slot → sees appointment details → confirms

### 2.3 Appointment Types

| Type | Description |
|------|-------------|
| `IN_PERSON` | Physical visit at the hospital |
| `VIDEO` | Video call via Jitsi (embedded in UHID app) |
| `PHONE` | Phone call (patient's registered number) |

### 2.4 Status Flow

```
SCHEDULED → CONFIRMED → IN_PROGRESS → COMPLETED
    │                        │
    └── (cancelled) → CANCELLED
                             └── (patient no-show) → NO_SHOW
```

---

## 3. Video Consultation

### 3.1 Jitsi Meet Integration

- **Why Jitsi?** Open-source, self-hostable, no per-minute cost, end-to-end encrypted
- **Room ID:** `uhid-appointment-<appointmentId>` (unique per appointment)
- **Password protected:** Room JWT generated from `JITSI_SECRET` env var
- **Embedded:** Jitsi iFrame embedded in UHID web app

### 3.2 Video Room Flow

```
15 minutes before appointment:
  "Join Call" button becomes active →

Patient / Doctor clicks "Join Call" →
  Backend verifies:
    - Appointment is CONFIRMED
    - Current time is within 15 min before to 1 hour after scheduled time
    - User is the patient OR the doctor for this appointment →
  Backend generates Jitsi JWT with:
    - room: "uhid-appointment-<appointmentId>"
    - user: { name, email, role }
    - expiresAt: appointment end time + 30 minutes →
  Frontend loads Jitsi iFrame with JWT →
  Both join same room
```

### 3.3 Video Call Security

- Room name is not guessable (CUID-based appointment ID)
- Only the specific patient and doctor for that appointment can get the room JWT
- JWT expires after the appointment window
- Admin can terminate rooms (Jitsi REST API call)

---

## 4. Real-Time Notification System

UHID uses **Socket.io** for real-time events. Every authenticated user connects to the Socket.io server on login and joins their personal room (`user:<userId>`).

### 4.1 Connection

```typescript
// Client connects with auth token
socket.connect({
  auth: { token: accessToken }
});

// Server verifies token and joins user to personal room
socket.join(`user:${userId}`);
```

### 4.2 Notification Bell (In-App)

All events also create a `Notification` record in the database for the in-app bell icon:
- Badge count shows unread notifications
- Click bell → dropdown list of recent notifications
- Mark as read / mark all as read
- Notification types have distinct icons

---

## 5. Email Notifications

All emails use **Nodemailer** + **SMTP (Gmail / Zoho)**.

### 5.1 Email Templates

| Trigger | Recipient | Subject |
|---------|-----------|---------|
| Registration | Patient/Doctor/Staff | "Welcome to UniHealth ID — Verify your email" |
| Email verification | User | "Your UHID email verification code" |
| Password reset | User | "Reset your UHID password" |
| Appointment booked | Patient + Doctor | "Appointment confirmed — [date, time]" |
| Appointment reminder | Patient + Doctor | "Reminder: Your appointment is in 15 minutes" |
| Appointment cancelled | Patient + Doctor | "Appointment cancelled — [date, time]" |
| Consent request | Patient | "Dr. [name] is requesting access to your records" |
| Consent approved | Doctor/Insurance | "Patient has approved your record access request" |
| Emergency override | Patient | "Emergency access was used on your records — [details]" |
| SOS activated | Emergency contacts | "EMERGENCY: [patient name] has activated SOS" |
| New prescription | Patient | "New prescription issued by Dr. [name]" |
| Claim decision | Patient | "Your insurance claim has been [approved/rejected]" |

---

## 6. Socket.io Event Reference

| Event Name | Direction | Trigger |
|------------|-----------|---------|
| `consent:request` | Server → Patient | Doctor/Insurer requests access |
| `consent:approved` | Server → Doctor/Insurer | Patient approves |
| `consent:denied` | Server → Doctor/Insurer | Patient denies |
| `consent:revoked` | Server → Doctor/Insurer | Patient revokes |
| `consent:expired` | Server → Doctor/Insurer | Time-limited consent expires |
| `record:uploaded` | Server → Patient | Hospital staff uploads a record |
| `prescription:created` | Server → Patient | Doctor issues a prescription |
| `appointment:booked` | Server → Doctor | Patient books with this doctor |
| `appointment:cancelled` | Server → Patient + Doctor | Either party cancels |
| `appointment:reminder` | Server → Patient + Doctor | 15 min before appointment |
| `appointment:started` | Server → Patient | Doctor joins video room |
| `emergency:sos` | Server → Emergency contacts | Patient activates SOS |
| `emergency:override` | Server → Hospital Admin | Doctor uses emergency override |
| `claim:decision` | Server → Patient | Insurance makes claim decision |
| `notification:new` | Server → User | Generic new notification bell trigger |

---

## 7. API Endpoints

**Base URL:** `http://localhost:5000/api/v1`

### GET /hospital/doctors

Search and browse doctors.

**Auth:** `PATIENT`

**Query Params:** `?specialty=Cardiology&city=Mumbai&rating=4&available=true`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "cldoc...",
      "name": "Dr. Anita Desai",
      "specialty": "Cardiology",
      "hospital": "Fortis Hospital, Mumbai",
      "experience": 12,
      "consultationFee": 800,
      "rating": 4.7,
      "totalReviews": 243,
      "languages": ["English", "Hindi", "Gujarati"],
      "nextAvailableSlot": "2026-02-27T10:00:00.000Z",
      "appointmentTypes": ["IN_PERSON", "VIDEO"]
    }
  ]
}
```

---

### GET /hospital/doctors/:id/slots

Get available appointment slots.

**Auth:** `PATIENT`

**Query Params:** `?from=2026-02-26&to=2026-03-04`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "doctorId": "cldoc...",
    "slots": [
      {
        "date": "2026-02-27",
        "available": [
          "09:00", "09:30", "10:00", "11:00", "14:30", "15:00"
        ],
        "booked": ["10:30", "11:30"]
      }
    ]
  }
}
```

---

### POST /hospital/appointments

Book an appointment.

**Auth:** `PATIENT`

**Request Body:**
```json
{
  "doctorId": "cldoc...",
  "scheduledAt": "2026-02-27T10:00:00.000Z",
  "type": "VIDEO",
  "chiefComplaint": "Chest pain on exertion",
  "notes": "First visit, referred by GP"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "appointmentId": "clapp...",
    "status": "CONFIRMED",
    "scheduledAt": "2026-02-27T10:00:00.000Z",
    "type": "VIDEO",
    "confirmationNumber": "APT-2026-00182",
    "doctor": {
      "name": "Dr. Anita Desai",
      "hospital": "Fortis Hospital, Mumbai"
    }
  }
}
```

---

### GET /hospital/appointments/join/:id

Get Jitsi JWT for video appointment.

**Auth:** `PATIENT` | `DOCTOR` (must be the specific patient/doctor for this appointment)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "roomName": "uhid-appointment-clapp...",
    "jitsiToken": "eyJhbGci...",
    "domain": "meet.jit.si",
    "expiresAt": "2026-02-27T11:30:00.000Z"
  }
}
```

---

### PATCH /hospital/appointments/:id/cancel

Cancel an appointment.

**Auth:** `PATIENT` | `DOCTOR`

**Request Body:**
```json
{ "reason": "Scheduling conflict" }
```

---

### GET /hospital/appointments

List appointments.

**Auth:** `PATIENT` (own) | `DOCTOR` (own)

**Query Params:** `?status=SCHEDULED&from=2026-02-26`

---

### GET /notifications

Get in-app notifications.

**Auth:** Any authenticated user

**Query Params:** `?unreadOnly=true&limit=20`

---

### PATCH /notifications/read-all

Mark all notifications as read.

**Auth:** Any authenticated user

---

## 8. Validation Rules

| Field | Rule |
|-------|------|
| `scheduledAt` | Must be a future datetime |
| `scheduledAt` | Must align with doctor's available slot (15-min precision check) |
| `scheduledAt` | Cannot book slot already taken by another appointment |
| `type` | Must be one the doctor supports |
| `chiefComplaint` | 5–500 chars |
| Cancel reason | 5–500 chars |
| Jitsi room access | Only accessible within 15 min before to 60 min after scheduled time |
| Double booking prevention | Patient cannot book two appointments at overlapping times |

---

## 9. Frontend Pages

### 9.1 Find a Doctor (`/patient/find-doctor`)

- Search/filter bar
- Doctor cards grid
- Map view toggle (show hospitals on Google Maps)
- Click doctor → Doctor profile page
- Doctor profile: full bio, qualifications, slot calendar, "Book Appointment" CTA

### 9.2 Book Appointment Modal / Page

- Date picker calendar showing available days (greyed-out if no slots)
- Time slot grid for selected day
- Appointment type selector (in-person / video)
- Chief complaint textarea
- Summary card: doctor, hospital, date, time, fee
- "Confirm Booking" button

### 9.3 My Appointments (`/patient/appointments`)

- Upcoming appointments (sorted by date)
- Past appointments with completion status
- Each card: doctor name, type badge, date/time, status
- **For VIDEO appointments:** "Join Call" button (activates 15 min before)
- Cancel button (for future appointments)

### 9.4 Video Call Page (`/appointment/:id/call`)

- Full-screen Jitsi iFrame
- Controls: mute, camera, screen share, end call
- Chat sidebar (from Jitsi)
- Patient health info drawer (pulls from UHID records if consent exists)
- "After Call" panel: doctor can start new clinical note from same screen

### 9.5 Notification Bell (Global Component)

- Appears in all page headers
- Badge count (unread)
- Dropdown: list of notifications with icons, relative timestamps
- "Mark all as read" link
- Click notification → navigates to relevant page

---

## 10. Database Schema

### `appointments` table

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | String (CUID) | PK |
| `patientId` | String | FK → patients |
| `doctorId` | String | FK → doctors |
| `hospitalId` | String | FK → hospitals |
| `scheduledAt` | DateTime | NOT NULL |
| `type` | AppointmentType | NOT NULL |
| `status` | AppointmentStatus | DEFAULT SCHEDULED |
| `chiefComplaint` | String | nullable |
| `notes` | String | nullable |
| `cancelReason` | String | nullable |
| `cancelledBy` | String | nullable |
| `confirmationNumber` | String | UNIQUE |
| `videoRoomName` | String | nullable |
| `completedAt` | DateTime | nullable |
| `createdAt` | DateTime | DEFAULT now() |

### Indexes

```sql
CREATE INDEX idx_appt_patient    ON appointments(patientId);
CREATE INDEX idx_appt_doctor     ON appointments(doctorId);
CREATE INDEX idx_appt_scheduled  ON appointments(scheduledAt);
CREATE INDEX idx_appt_status     ON appointments(status);
```

---

## 11. Security Model

| Threat | Mitigation |
|--------|-----------|
| Patient joining another patient's video call | Jitsi JWT only generated for the patient on the appointment |
| Doctor joining a random room | `roomName` based on CUID — not guessable |
| Notification injection | All notification content generated server-side, never user-input |
| Socket.io unauthorized events | Socket auth middleware verifies JWT on every connection |
| Appointment slot race condition | DB unique constraint on `(doctorId, scheduledAt)` prevents double booking |

---

## 12. Testing

| Test Scenario | Expected Result |
|---------------|----------------|
| Patient books available slot | 201, appointment confirmed, email sent |
| Patient books already-taken slot | 409 Conflict |
| Patient books slot in the past | 400 Validation error |
| Patient joins video call 20 min before | 200, Jitsi JWT returned |
| Another patient tries to join same call | 403 Forbidden |
| Doctor cancels appointment → patient notified | Patient receives in-app + email notification |
| Socket.io consent:request event | Patient receives in-app notification within 1 second |
| Patient marks all notifications as read | 200, badge count → 0 |

---

*Previous Phase: [Phase 8 — Admin Portal](./PHASE_8_ADMIN.md)  
Next Phase: [Phase 10 — Testing & Deployment →](./PHASE_10_TESTING_DEPLOY.md)*
