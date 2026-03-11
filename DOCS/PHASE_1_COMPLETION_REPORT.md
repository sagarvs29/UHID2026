# Phase 1 — Authentication & User Management
## Completion Report

> **Status:** ✅ COMPLETE  
> **Completed:** March 11, 2026  
> **Commit:** `aa59e3d`  
> **Branch:** `main`

---

## 1. What Was Built

Full backend authentication system supporting **5 user roles** — Patient, Doctor, Hospital Staff, Insurance Provider, and Admin — with production-grade security.

---

## 2. Endpoints Delivered

### Base URL: `http://localhost:5000/api/v1/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| `POST` | `/register/patient` | ❌ | Register patient — creates User + Patient profile, generates UHID, sends verification email |
| `POST` | `/register/doctor` | ❌ | Register doctor — creates User + Doctor profile, validates hospital exists + verified |
| `POST` | `/register/staff` | ❌ | Register hospital staff — creates User + HospitalStaff profile |
| `POST` | `/register/insurance` | ❌ | Register insurance provider — creates User + InsuranceProvider profile |
| `POST` | `/login` | ❌ | Login for all roles — returns access token + refresh token + full role profile |
| `POST` | `/refresh` | ❌ | Rotate refresh token — issues new access + refresh token pair |
| `GET` | `/verify-email` | ❌ | Verify email via token from email link |
| `POST` | `/forgot-password` | ❌ | Request password reset — sends email with 1-hour reset link |
| `POST` | `/reset-password` | ❌ | Reset password using token — invalidates all sessions |
| `GET` | `/me` | ✅ | Get current user + full role-specific profile |
| `POST` | `/change-password` | ✅ | Change password — verifies current password first |
| `POST` | `/logout` | ✅ | Logout — blacklists access token, deletes refresh from Redis, writes audit log |

### Base URL: `http://localhost:5000/api/v1/hospitals`

| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| `GET` | `/` | ❌ | List verified hospitals — for Doctor/Staff registration dropdowns |

---

## 3. Test Results

All 13 endpoints tested with real data. Results:

| # | Endpoint | Result | Notes |
|---|----------|:------:|-------|
| 1 | `POST /register/patient` | ✅ | UHID `UHID-HBCW-QRCQ-SXDE` generated, email sent |
| 2 | `GET /verify-email?token=...` | ✅ | Email verified, `isEmailVerified: true` |
| 3 | `POST /login` | ✅ | JWT access + refresh tokens issued, full profile returned |
| 4 | `GET /me` | ✅ | Full patient profile with UHID, bloodGroup, allergies etc. |
| 5 | `POST /refresh` | ✅ | Old token rotated, new pair issued |
| 6 | `POST /change-password` | ✅ | Password changed, argon2 verified |
| 7 | `POST /forgot-password` | ✅ | Reset email delivered to inbox |
| 8 | `POST /reset-password` | ✅ | Password reset, all sessions invalidated |
| 9 | `POST /logout` | ✅ | Token blacklisted in Redis, audit log written |
| 10 | `GET /hospitals` | ✅ | Returns seeded hospital with specialties |
| 11 | `POST /register/doctor` | ✅ | Validates hospital + licenseNumber uniqueness |
| 12 | `POST /register/staff` | ✅ | Validates hospital exists |
| 13 | `POST /register/insurance` | ✅ | Validates licenseNumber uniqueness |

**Email delivery confirmed** — both verification email and password reset email received in `sagarvs614@gmail.com` inbox.

---

## 4. Files Written / Modified

| File | Status | Description |
|------|:------:|-------------|
| `apps/api/src/validators/auth.validator.ts` | 🆕 Rewritten | Zod schemas for all 5 roles + all flows |
| `apps/api/src/services/auth.service.ts` | 🆕 Rewritten | All business logic — ~960 lines |
| `apps/api/src/controllers/auth.controller.ts` | 🆕 Rewritten | 12 HTTP handlers |
| `apps/api/src/routes/auth.routes.ts` | 🆕 Rewritten | All 12 routes with middleware |
| `apps/api/src/routes/hospitals.routes.ts` | 🆕 Created | Public hospital listing endpoint |
| `apps/api/src/lib/email.ts` | ✏️ Modified | Added 4 new email functions |
| `apps/api/src/app.ts` | ✏️ Modified | Route prefix `/api/v1/auth`, added hospitals router |

---

## 5. Security Implementation

| Feature | Implementation |
|---------|---------------|
| **Password hashing** | Argon2id — `memoryCost: 65536, timeCost: 3, parallelism: 1` |
| **Access tokens** | JWT HS256 — 15 min expiry, signed with `JWT_ACCESS_SECRET` |
| **Refresh tokens** | JWT HS256 — 7 day expiry, stored in Redis as `refresh:{userId}:{sessionId}` |
| **Token rotation** | On every `/refresh` call — old token deleted, new pair issued |
| **Token blacklist** | On logout — access token stored in Redis as `blacklist:{token}` until expiry |
| **Email verification** | 32-byte hex token — stored on User, consumed on verify, 24hr window |
| **Password reset** | 32-byte hex token — stored in Redis as `reset:{token}`, 1hr TTL |
| **Session invalidation** | On reset — all `refresh:{userId}:*` keys deleted (logout all devices) |
| **Audit logging** | LOGIN, LOGOUT, EMAIL_VERIFIED, FORGOT_PASSWORD, PASSWORD_RESET — all logged to `AuditLog` table |
| **Rate limiting** | `express-rate-limit` on all auth routes (inherited from `app.ts`) |
| **Input validation** | Zod on every endpoint — 422 with field-level errors on invalid input |

---

## 6. UHID Format

Patient UHID is generated as: `UHID-{4chars}-{4chars}-{4chars}` using `crypto.randomBytes` with uppercase alphanumeric characters. Collision-safe with retry loop (max 5 attempts).

Example: `UHID-HBCW-QRCQ-SXDE`

---

## 7. Role-Specific Registration Flows

### Patient
```
POST /register/patient
→ Creates User (role: PATIENT) + Patient profile in $transaction
→ Generates unique UHID
→ Sends: Verification email
→ Returns: tokens + profile + requiresEmailVerification: true
```

### Doctor
```
POST /register/doctor
→ Validates: hospitalId exists + hospital.isVerified = true
→ Validates: licenseNumber unique across all doctors
→ Creates User (role: DOCTOR) + Doctor profile in $transaction
→ Sends: Verification email + Approval pending email
→ Returns: tokens + profile + requiresApproval: true (until admin verifies)
```

### Hospital Staff
```
POST /register/staff
→ Validates: hospitalId exists
→ Creates User (role: HOSPITAL_STAFF) + HospitalStaff profile in $transaction
→ Sends: Verification email + Approval pending email
→ Returns: tokens + profile + requiresApproval: true
```

### Insurance Provider
```
POST /register/insurance
→ Validates: licenseNumber unique
→ Creates User (role: INSURANCE_PROVIDER) + InsuranceProvider profile in $transaction
→ Sends: Verification email + Approval pending email
→ Returns: tokens + profile + requiresApproval: true
```

---

## 8. Email Functions

| Function | Trigger | Content |
|----------|---------|---------|
| `sendEmailVerificationEmail()` | Registration | Verify button + token link, 24hr expiry |
| `sendWelcomePatientEmail()` | After email verified | Shows UHID |
| `sendApprovalPendingEmail()` | Doctor/Staff/Insurance registration | Informs admin review needed |
| `sendPasswordResetEmail()` | Forgot password | Reset button + token link, 1hr expiry |

**SMTP:** Gmail SMTP via `nodemailer` using `sagarvs614@gmail.com`  
**From:** `UHID Health <sagarvs614@gmail.com>`

---

## 9. Known Limitations / Next Phase Dependencies

| Item | Notes |
|------|-------|
| Doctor/Staff/Insurance approval | `isVerified` set by Admin — Phase 8 (Admin Panel) |
| OTP / phone verification | Phase 3 (Consent) or standalone |
| Supabase RLS | Not yet enabled — application-level auth only for now |
| `cleanup-test-user.mjs` | Dev-only script — do not commit to production |

---

## 10. How to Run

```powershell
# Start API server (from apps/api directory)
cd E:\Desktop\UHID2026\apps\api
npm run dev

# Server runs on:
# http://localhost:5000
# http://localhost:5000/health
# http://localhost:5000/api/v1/auth/*
# http://localhost:5000/api/v1/hospitals
```

---

## 11. Environment Variables Required

```env
DATABASE_URL=          # Supabase PostgreSQL connection string
DIRECT_URL=            # Supabase direct URL (for migrations)
REDIS_URL=             # Upstash Redis TLS URL
JWT_ACCESS_SECRET=     # Min 32 chars
JWT_REFRESH_SECRET=    # Min 32 chars
SMTP_USER=             # Gmail address
SMTP_PASS=             # Gmail App Password
CLIENT_URL=            # Frontend URL (default: http://localhost:5173)
```

---

*Phase 1 complete. Next: Phase 2 — Medical Records Management*
