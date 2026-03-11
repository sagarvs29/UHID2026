# Phase 1 — Authentication, UHID Generation & Role-Based Access Control

> **Phase:** 1  
> **Status:** ⬜ PLANNED  
> **Duration:** Weeks 1–3  
> **Goal:** Every role can register, log in, and be directed to their correct dashboard. Patients receive a unique UHID. All API routes are protected by RBAC middleware.

---

## 📋 Table of Contents

1. [Overview](#1-overview)
2. [Authentication System](#2-authentication-system)
3. [UHID Generation](#3-uhid-generation)
4. [Role-Based Access Control](#4-role-based-access-control)
5. [API Endpoints](#5-api-endpoints)
6. [Validation Rules](#6-validation-rules)
7. [Frontend Pages](#7-frontend-pages)
8. [Security Model](#8-security-model)
9. [Database Schema](#9-database-schema)
10. [Testing](#10-testing)
11. [Completed Checklist](#11-completed-checklist)

---

## 1. Overview

Phase 1 establishes the **identity backbone** of the entire platform:

```
Registration Flow:
──────────────────────────────────────────────────────────────────
User fills form → Zod validation → Argon2id hash password →
Create User row → Create role profile row → 
(PATIENT) Generate UHID → Return JWT pair → 
Redirect to role dashboard

Login Flow:
──────────────────────────────────────────────────────────────────
Email + Password → Argon2id verify → Check isActive →
Create access token (15min) + refresh token (7d) →
Store refresh token in Redis → Return both tokens

Token Refresh Flow:
──────────────────────────────────────────────────────────────────
Frontend sends refresh token (silent, auto) →
Validate token + Redis presence → Issue new access token →
Rotate refresh token (new token in Redis, old deleted)
```

---

## 2. Authentication System

### 2.1 Password Security

| Mechanism | Implementation | Why |
|-----------|---------------|-----|
| Hashing Algorithm | **Argon2id** | OWASP #1 recommended, memory-hard |
| Salt | Auto-generated per hash | Prevents rainbow table attacks |
| Work Factor | `memoryCost: 65536, timeCost: 3` | 65MB memory, resistant to GPU cracking |
| Storage | `passwordHash` column in `users` table | Never store plaintext |

### 2.2 JWT Token Architecture

```
ACCESS TOKEN
  ├── Algorithm: HS256
  ├── Payload: { userId, role, hospitalId (if applicable) }
  ├── Expiry: 15 minutes
  ├── Secret: JWT_ACCESS_SECRET (env)
  └── Usage: Sent in every API request header

REFRESH TOKEN
  ├── Algorithm: HS256
  ├── Payload: { userId }
  ├── Expiry: 7 days
  ├── Secret: JWT_REFRESH_SECRET (env)
  ├── Storage: Redis key → refresh:<userId>
  └── Usage: POST /auth/refresh to get new access token

SILENT REFRESH (Frontend)
  ├── Axios interceptor catches 401 responses
  ├── Calls POST /auth/refresh automatically
  ├── Retries original request with new access token
  └── On refresh failure → logout + redirect to /login
```

### 2.3 Email Verification Flow

```
Register → User created (isVerified: false) →
Send email with token (emailVerifyToken, expires 24h) →
User clicks link → POST /auth/verify-email →
User marked as verified (emailVerified: true)
```

### 2.4 Password Reset Flow

```
POST /auth/forgot-password (email) →
Generate passwordResetToken (expires 1h) →
Send email with reset link →
User clicks link → POST /auth/reset-password (token + newPassword) →
Argon2id hash new password → Clear reset token →
Invalidate all existing refresh tokens in Redis
```

---

## 3. UHID Generation

Every patient receives a **unique health ID** at registration time.

### 3.1 Format

```
UH-XXXXXX
   └─────── 6-character alphanumeric (uppercase + digits)

Examples:
  UH-847291
  UH-K3X9M2
  UH-TY4821
```

### 3.2 Generation Algorithm

```typescript
// Pseudocode — actual implementation in auth.service.ts

async function generateUHID(): Promise<string> {
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const LENGTH = 6;
  const MAX_RETRIES = 10;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    let id = 'UH-';
    for (let i = 0; i < LENGTH; i++) {
      id += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
    }

    // Check uniqueness in DB
    const existing = await prisma.patient.findUnique({
      where: { uhid: id }
    });

    if (!existing) return id; // Collision-free → use this ID
  }

  throw new Error('UHID generation failed after max retries');
}
```

### 3.3 Properties

| Property | Value |
|----------|-------|
| Total possible IDs | 36^6 = **2,176,782,336** (2.1 billion) |
| Format | `UH-` + 6 alphanumeric chars |
| Uniqueness check | DB query before assignment |
| Collision strategy | Retry up to 10 times |
| Immutable | Cannot be changed after assignment |

### 3.4 UHID Card

After registration, patients can **print or download** a UHID card containing:
- Full name
- UHID in large format
- Blood group and critical allergies
- Emergency contact phone
- QR code for quick scanning

---

## 4. Role-Based Access Control

### 4.1 Roles

```typescript
enum Role {
  PATIENT
  DOCTOR
  HOSPITAL_STAFF
  HOSPITAL_ADMIN
  INSURANCE_PROVIDER
  SUPER_ADMIN
}
```

### 4.2 RBAC Middleware

```typescript
// middlewares/auth.middleware.ts

// Step 1: Authenticate (verify JWT)
export const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  req.user = decoded; // { userId, role, hospitalId }
  next();
};

// Step 2: Authorize (check role)
export const requireRoles = (...roles: Role[]) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient role' });
    }
    next();
  };
};

// Usage in routes:
router.get('/records/:uhid',
  authenticate,
  requireRoles(Role.PATIENT, Role.DOCTOR),
  recordController.getRecords
);
```

### 4.3 Role-to-Dashboard Mapping

| Role | Dashboard Route | Access After Login |
|------|----------------|-------------------|
| `PATIENT` | `/patient/dashboard` | Own records, consent, QR, SOS |
| `DOCTOR` | `/doctor/dashboard` | Patient lookup, prescriptions |
| `HOSPITAL_STAFF` | `/staff/dashboard` | Upload records, register patients |
| `HOSPITAL_ADMIN` | `/admin/dashboard` | Staff management, analytics |
| `INSURANCE_PROVIDER` | `/insurance/dashboard` | Claims, record verification |
| `SUPER_ADMIN` | `/superadmin/dashboard` | Hospital management, system config |

---

## 5. API Endpoints

**Base URL:** `http://localhost:5000/api/v1/auth`

### POST /auth/register

Register a new user account (all roles).

**Request Body:**
```json
{
  "email": "doctor@example.com",
  "password": "Secure@1234",
  "phone": "+919876543210",
  "role": "DOCTOR",
  "profile": {
    "firstName": "Suresh",
    "lastName": "Menon",
    "licenseNumber": "KA-MED-2015-4521",
    "specialty": "General Medicine",
    "hospitalId": "hosp_cuid_here"
  }
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": "clxxx...",
      "email": "doctor@example.com",
      "role": "DOCTOR"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiJ9..."
  }
}
```

**Patient-specific (includes UHID in response):**
```json
{
  "data": {
    "user": { "id": "...", "role": "PATIENT", "uhid": "UH-847291" },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

---

### POST /auth/login

**Request Body:**
```json
{
  "email": "patient@uhid.dev",
  "password": "Demo@1234"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "patient@uhid.dev",
      "role": "PATIENT",
      "uhid": "UH-847291",
      "profile": { "firstName": "Rajesh", "lastName": "Kumar", ... }
    },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

---

### POST /auth/refresh

**Request Body:**
```json
{ "refreshToken": "eyJhbGciOiJIUzI1NiJ9..." }
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "new_access_token",
    "refreshToken": "new_refresh_token"
  }
}
```

---

### POST /auth/logout

**Headers:** `Authorization: Bearer <accessToken>`

**Response (200):**
```json
{ "success": true, "message": "Logged out successfully" }
```

---

### GET /auth/me

**Headers:** `Authorization: Bearer <accessToken>`

**Response (200) — Patient example:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "email": "patient@uhid.dev",
    "role": "PATIENT",
    "profile": {
      "firstName": "Rajesh",
      "lastName": "Kumar",
      "uhid": "UH-847291",
      "bloodGroup": "B_POS",
      "allergies": ["Penicillin", "Sulfa"],
      "chronicConditions": ["Type 2 Diabetes", "Hypertension"]
    }
  }
}
```

---

## 6. Validation Rules

All inputs are validated with **Zod** before reaching the service layer.

### Registration Validation

| Field | Rules |
|-------|-------|
| `email` | Valid email format, max 255 chars |
| `password` | Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char |
| `phone` | Optional, E.164 format (`+91XXXXXXXXXX`) |
| `role` | Must be one of the valid Role enum values |
| `profile.firstName` | 2–50 chars, letters only, trimmed |
| `profile.lastName` | 2–50 chars, letters only, trimmed |

### Patient-Specific Profile Validation

| Field | Rules |
|-------|-------|
| `dateOfBirth` | Valid ISO date, must be in the past, age 0–120 |
| `gender` | One of: `MALE`, `FEMALE`, `OTHER`, `PREFER_NOT_TO_SAY` |
| `bloodGroup` | One of 9 valid blood groups or `UNKNOWN` |
| `allergies` | Array of strings, max 50 items, each max 100 chars |
| `chronicConditions` | Array of strings, max 50 items |

### Doctor-Specific Validation

| Field | Rules |
|-------|-------|
| `licenseNumber` | Required, unique, 5–50 chars |
| `specialty` | Required, 2–100 chars |
| `hospitalId` | Must be valid CUID of existing hospital |
| `qualifications` | Array of strings, at least 1 required |

### Password Complexity (enforced on all roles)

```
✅ Minimum 8 characters
✅ At least 1 uppercase letter (A-Z)
✅ At least 1 lowercase letter (a-z)
✅ At least 1 digit (0-9)
✅ At least 1 special character (!@#$%^&*)
✅ No spaces allowed
✅ Maximum 128 characters
```

---

## 7. Frontend Pages

### 7.1 Login Page (`/login`)

- Email + Password form with shadcn Input components
- "Demo accounts" quick-fill buttons (one per role for testing)
- Show/hide password toggle
- Error display on invalid credentials
- Loading state during API call
- On success: reads `role` from response → redirects to correct dashboard

### 7.2 Registration Page (`/register`)

**3-step wizard flow:**

```
Step 1: Choose Role
  └── 5 role cards (Patient / Doctor / Staff / Admin / Insurance)

Step 2: Basic Info
  └── Email, phone, password, confirm password

Step 3: Role-Specific Profile
  └── Patient: DOB, gender, blood group, allergies
  └── Doctor: specialty, license, hospital, qualifications
  └── Staff: staff type, department, hospital
  └── Admin: hospital selection
  └── Insurance: company name, agent ID
```

### 7.3 Forgot Password Page (`/forgot-password`)

- Email input → sends reset link via SMTP
- 60-second cooldown before resend allowed
- Success screen with instructions

### 7.4 Reset Password Page (`/reset-password?token=xxx`)

- Token extracted from URL query param
- New password + confirm password fields
- Validates token expiry before showing form
- Redirects to `/login` on success

### 7.5 Role-Specific Dashboards (shells)

Each dashboard shell includes:
- Header with UHID (for patients), name, role badge
- Sidebar with role-specific navigation
- Logout button
- Notification bell (Socket.io connected)

---

## 8. Security Model

| Threat | Mitigation |
|--------|-----------|
| Brute-force login | Rate limit: 5 failed logins → 15-min block per IP |
| JWT theft | Short 15-min expiry, HTTPS only |
| Refresh token replay | Redis rotation — old token deleted on each refresh |
| Credential exposure | Argon2id hashing, no plaintext ever stored |
| CSRF | Tokens in Authorization header (not cookies) |
| Mass registration | Rate limiting on `/register` (10 req/hour per IP) |
| Role escalation | Role stored server-side (DB), not trusting client claim |
| Stale sessions | Logout invalidates Redis refresh token immediately |

---

## 9. Database Schema

### `users` table

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | String (CUID) | PK |
| `email` | String | UNIQUE, NOT NULL |
| `phone` | String | UNIQUE, nullable |
| `passwordHash` | String | NOT NULL |
| `role` | Role (enum) | NOT NULL |
| `isVerified` | Boolean | DEFAULT false |
| `isActive` | Boolean | DEFAULT true |
| `lastLoginAt` | DateTime | nullable |
| `emailVerified` | Boolean | DEFAULT false |
| `emailVerifyToken` | String | UNIQUE, nullable |
| `emailVerifyExpiry` | DateTime | nullable |
| `passwordResetToken` | String | UNIQUE, nullable |
| `passwordResetExpiry` | DateTime | nullable |
| `createdAt` | DateTime | DEFAULT now() |
| `updatedAt` | DateTime | Auto-updated |

### `patients` table (extends users)

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | String (CUID) | PK |
| `uhid` | String | UNIQUE, NOT NULL (format: UH-XXXXXX) |
| `userId` | String | FK → users(id), UNIQUE |
| `firstName` | String | NOT NULL |
| `lastName` | String | NOT NULL |
| `dateOfBirth` | DateTime | NOT NULL |
| `gender` | Gender (enum) | NOT NULL |
| `bloodGroup` | BloodGroup (enum) | DEFAULT UNKNOWN |
| `allergies` | String[] | Array |
| `chronicConditions` | String[] | Array |
| `currentMedications` | String[] | Array |
| `heightCm` | Float | nullable |
| `weightKg` | Float | nullable |
| `aadhaarEncrypted` | String | nullable (AES-256) |
| `isSosActive` | Boolean | DEFAULT false |
| `sosActivatedAt` | DateTime | nullable |

---

## 10. Testing

### Unit Tests (`apps/api/src/__tests__/auth.service.test.ts`)

Tests cover:
- `register()` — creates user + profile + UHID (for patient)
- `login()` — returns tokens on valid credentials
- `login()` — throws on wrong password
- `login()` — throws on deactivated account
- `refreshToken()` — rotates tokens correctly
- `refreshToken()` — throws on invalid/expired refresh token
- `logout()` — removes token from Redis
- UHID generation — no collisions in 10,000 iterations

### Auth Middleware Tests (`auth.middleware.test.ts`)

- `authenticate` — passes with valid JWT
- `authenticate` — rejects with expired JWT
- `authenticate` — rejects with no header
- `requireRoles` — allows correct role
- `requireRoles` — blocks wrong role

---

## 11. Completion Checklist

```
PHASE 1 COMPLETION STATUS
══════════════════════════════════════════════════

Backend
  ⬜  Zod validation schemas (all 5 roles)
  ⬜  validate() middleware (generic)
  ⬜  authenticate JWT middleware
  ⬜  requireRoles() RBAC middleware
  ⬜  Auth service (register, login, refresh, logout, getMe)
  ⬜  Auth controller (5 handlers, typed req/res)
  ⬜  Auth routes (5 endpoints)
  ⬜  UHID generator (UH-XXXXXX, collision-safe)
  ⬜  Argon2id password hashing
  ⬜  Redis refresh token storage (7-day TTL)
  ⬜  AuditLog for every auth action (LOGIN, REGISTER, etc.)
  ⬜  Email verification token generation
  ⬜  Password reset token flow
  ⬜  0 TypeScript errors

Frontend
  ⬜  Axios instance with silent JWT refresh interceptor
  ⬜  Zustand auth store (persisted to localStorage)
  ⬜  React Query hooks (useLogin, useRegister, useLogout, useMe)
  ⬜  shadcn/ui components configured
  ⬜  ProtectedRoute with role-based redirects
  ⬜  Login page with quick-fill demo buttons
  ⬜  3-step registration wizard (all 5 roles)
  ⬜  Forgot Password page
  ⬜  Reset Password page
  ⬜  5 role-specific dashboard shells
  ⬜  App.tsx: full routing with protected routes
  ⬜  0 TypeScript errors
```

---

*Previous Phase: [Phase 0 — Setup](./PHASE_0_SETUP.md)  
Next Phase: [Phase 2 — Medical Records & File Upload →](./PHASE_2_RECORDS.md)*
