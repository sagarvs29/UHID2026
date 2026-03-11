# Security Model — UHID

> Comprehensive security architecture, threat model, and OWASP compliance reference for the UniHealth ID platform.

---

## 📋 Table of Contents

1. [Security Philosophy](#1-security-philosophy)
2. [Authentication Security](#2-authentication-security)
3. [Authorization & RBAC](#3-authorization--rbac)
4. [Data Privacy](#4-data-privacy)
5. [API Security](#5-api-security)
6. [File Storage Security](#6-file-storage-security)
7. [Transport Security](#7-transport-security)
8. [Audit & Compliance](#8-audit--compliance)
9. [OWASP Top 10 Checklist](#9-owasp-top-10-checklist)
10. [Incident Response](#10-incident-response)

---

## 1. Security Philosophy

UHID handles India's most sensitive personal data — health records, Aadhaar numbers, and medical history. Every design decision prioritizes **privacy by default**:

- **Minimum necessary access:** Consent scopes limit data exposure
- **Zero trust:** Every request re-validates identity and authorization
- **Audit everything:** No sensitive action happens without a log entry
- **Patient control:** Patients can revoke access at any time

---

## 2. Authentication Security

### 2.1 Password Storage

| Property | Value |
|----------|-------|
| Algorithm | Argon2id (OWASP recommended) |
| Memory | 64 MB |
| Iterations | 3 |
| Parallelism | 1 |
| Salt | Auto-generated per hash (not reusable) |
| Output | 97-char string stored in `passwordHash` column |

**Why Argon2id?** Winner of the Password Hashing Competition (PHC). Resistant to GPU cracking and side-channel attacks. Superior to bcrypt and scrypt for new systems.

### 2.2 JWT Architecture

```
Access Token (short-lived):
  - Algorithm: HS256
  - Expiry: 15 minutes
  - Contains: userId, role, email
  - Stored: Client memory only (never localStorage)
  - Transmission: Authorization: Bearer header

Refresh Token (long-lived):
  - Algorithm: HS256 (separate secret: JWT_REFRESH_SECRET)
  - Expiry: 7 days
  - Contains: userId, jti (unique token ID)
  - Stored: Redis → refresh:<userId>:<jti> → TTL 7d
             + HttpOnly secure cookie (optional)
  - Rotation: New refresh token issued on every /auth/refresh call
  - Invalidation: All tokens for a user cleared on logout, password change, deactivation
```

### 2.3 Token Refresh Flow (Silent Refresh)

```
Access token expires (15 min) →
Frontend detects 401 response →
Auto-sends POST /auth/refresh with refresh token →
Server validates against Redis →
New access token + new refresh token returned →
Old refresh token deleted from Redis (rotation) →
Frontend retries original request with new access token
```

### 2.4 Rate Limiting on Auth

| Endpoint | Limit | Lockout |
|----------|-------|---------|
| POST /auth/login | 5 attempts / 15 min / IP | 15 min lockout |
| POST /auth/register | 10 / hour / IP | — |
| POST /auth/forgot-password | 3 / hour / IP + email | — |
| OTP verification | 3 attempts / OTP | 5 min per OTP |
| QR scan | 20 / min / doctor | — |

---

## 3. Authorization & RBAC

### 3.1 Role Permissions Matrix

| Action | PATIENT | DOCTOR | STAFF | HOSPITAL_ADMIN | INSURANCE | SUPER_ADMIN |
|--------|---------|--------|-------|----------------|-----------|-------------|
| View own records | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| View patient records | ❌ | ✅ (consent) | ✅ (upload) | ❌ | ✅ (consent) | ✅ |
| Upload records | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Write prescriptions | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Request consent | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Approve consent | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Verify staff | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| View audit logs | ❌ | ❌ | ❌ | ✅ (own hospital) | ❌ | ✅ (all) |
| Submit claims | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Emergency override | ❌ | ✅ (logged) | ❌ | ❌ | ❌ | ❌ |
| Platform analytics | ❌ | ❌ | ❌ | ✅ (hospital) | ❌ | ✅ (all) |

### 3.2 Middleware Stack (per request)

```
Request
  → Helmet (security headers)
  → Rate Limiter
  → CORS check
  → Body parser (10MB limit)
  → authenticate() — verifies JWT, attaches req.user
  → authorize(roles[]) — checks role
  → requireVerifiedHospital() — if DOCTOR/STAFF/HOSPITAL_ADMIN
  → requireConsent(scope) — if accessing patient data as DOCTOR/INSURANCE
  → Controller handler
```

### 3.3 Hospital Admin Scoping

Every `HOSPITAL_ADMIN` request is scoped to their own hospital:
```typescript
// Automatically injected in requireHospitalAdmin middleware
const { hospitalId } = req.user.hospitalAdmin;
// All queries filtered: WHERE hospitalId = hospitalId
```

---

## 4. Data Privacy

### 4.1 Aadhaar Encryption

Aadhaar numbers are PII under India's IT Act and must never be stored in plain text.

```
Encrypt (on save):
  key = Buffer.from(process.env.AADHAAR_ENCRYPTION_KEY, 'hex')  // 32 bytes
  iv = crypto.randomBytes(16)
  cipher = createCipheriv('aes-256-gcm', key, iv)
  encrypted = cipher.update(aadhaar, 'utf8', 'hex') + cipher.final('hex')
  authTag = cipher.getAuthTag()
  stored = iv.hex + ':' + authTag.hex + ':' + encrypted

Decrypt (on display):
  [iv, authTag, encrypted] = stored.split(':')
  decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)
  plain = decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8')
```

**Aadhaar is only displayed when:**
- Patient views their own profile
- Emergency QR card (masked: XXXX-XXXX-1234)

**Aadhaar is never sent to:**
- AI service
- Insurance providers
- Doctors (even with consent)

### 4.2 What Data Is Never Exposed in APIs

| Data | Never Exposed To |
|------|-----------------|
| `passwordHash` | Anyone (stripped from all API responses) |
| Full Aadhaar number | Doctors, insurance, staff, other patients |
| `filePublicId` (Cloudinary) | API responses use signed URLs only |
| JWT secrets | Client-side (server-only env vars) |
| Redis keys / cache internals | Any external party |
| Other patients' data | Any patient (strict userId check) |

### 4.3 Cloudinary File Access

All medical records in Cloudinary are stored as **private** (not public):
```typescript
// Upload with private access control
cloudinary.uploader.upload(file, {
  folder: `uhid/records/${patientId}`,
  type: 'private',
  resource_type: 'auto',
});

// Access via signed URL (1-hour expiry)
cloudinary.utils.private_download_url(publicId, format, {
  expires_at: Math.floor(Date.now() / 1000) + 3600,
});
```

---

## 5. API Security

### 5.1 Input Validation (Zod)

Every API endpoint has a Zod schema validation middleware. No request data is used until validated:

```typescript
// validate.middleware.ts
export const validate = (schema: ZodSchema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      errors: result.error.flatten().fieldErrors
    });
  }
  req.body = result.data;  // Use sanitized data only
  next();
};
```

### 5.2 SQL Injection Prevention

UHID uses **Prisma ORM** exclusively. Prisma uses parameterized queries at the driver level — raw SQL injection is structurally impossible through the standard API.

For the one case of raw SQL (custom queries): `prisma.$queryRaw` uses tagged template literals which auto-escape parameters.

### 5.3 HTTP Security Headers (Helmet)

```
Content-Security-Policy
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Referrer-Policy: no-referrer
```

### 5.4 CORS Configuration

```typescript
cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://uhid.health',
    'https://app.uhid.health',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
})
```

---

## 6. File Storage Security

| Layer | Mechanism |
|-------|----------|
| Storage access type | Private (not public) |
| URL delivery | Signed URLs with 1-hour TTL |
| File type validation | Allowlist: `image/jpeg`, `image/png`, `image/webp`, `application/pdf` |
| File size limit | 10MB per file |
| Virus scanning | Cloudinary auto-scan (on paid plan) |
| Content hash | SHA-256 computed and stored for tamper detection |
| Folder isolation | Per-patient folder (`uhid/records/<patientId>/`) |

---

## 7. Transport Security

- **HTTPS only** in production — Nginx + Let's Encrypt SSL
- **TLS 1.2 minimum** (TLS 1.3 preferred), SSLv3/TLS 1.0/1.1 disabled
- **HSTS header** enforces HTTPS for 1 year
- **Supabase DB** — TLS connection enforced
- **Upstash Redis** — TLS (rediss://) enforced
- **Socket.io** — Runs over WSS (secure WebSocket)

---

## 8. Audit & Compliance

### 8.1 Audit Log Coverage

All 40+ audit actions are logged with:
- Actor identity (userId, role)
- Target (patient UHID, record ID, claim ID)
- Hospital context
- IP address
- User agent
- Timestamp (UTC)

### 8.2 QR Scan Audit Log (Patient-Visible)

Every QR scan — regardless of tier — creates a permanent row in `qr_scan_logs`. This log is:
- **Visible to the patient** on their dashboard ("QR Scan History")
- **INSERT-ONLY** — no updates or deletes ever
- **Sent as real-time SMS + push** to patient on every scan

| Scan Type | Patient Sees |
|-----------|-------------|
| Public (Tier 1) | Timestamp + approximate location + "Anonymous" |
| Doctor (Tier 2) | Doctor name + UHID ID + hospital + timestamp + location |
| Patient-initiated (Tier 3) | Who scanned + timestamp |
| Suspicious | ⚠️ Badge + reason + "Report Abuse" button |

### 8.3 Log Immutability

The `audit_logs` table has:
- No `UPDATE` operations allowed on it (application-enforced)
- No `DELETE` operations allowed (application-enforced)
- Future: PostgreSQL row-level security policy to block UPDATE/DELETE

### 8.3 Data Retention

| Data Type | Retention |
|-----------|---------|
| Audit logs | 7 years (regulatory) |
| Medical records | Permanent (unless patient deletes) |
| Expired consents | 2 years |
| Redis OTPs | Auto-expire (10 min TTL) |
| Refresh tokens | Auto-expire (7 day TTL) |

---

## 9. OWASP Top 10 Checklist

| # | Vulnerability | UHID Mitigation | Status |
|---|--------------|----------------|--------|
| A01 | Broken Access Control | RBAC middleware + consent gates on every patient data endpoint | ✅ |
| A02 | Cryptographic Failures | Argon2id passwords, AES-256 Aadhaar, HTTPS, private Cloudinary | ✅ |
| A03 | Injection | Prisma ORM (parameterized), Zod validation (no raw concatenation) | ✅ |
| A04 | Insecure Design | Consent-first architecture, audit logs, privacy by default, **3-tier QR model (allergy type hidden in public tier)** | ✅ |
| A05 | Security Misconfiguration | Helmet headers, CORS allowlist, no default credentials in prod | ✅ |
| A06 | Vulnerable Components | `npm audit` in CI, Dependabot alerts enabled | ✅ |
| A07 | Identity & Auth Failures | JWT rotation, rate limiting, Argon2id, OTP 2FA for sensitive ops | ✅ |
| A08 | Software & Data Integrity | SHA-256 file hashing, signed QR JWTs, CI pipeline | ✅ |
| A09 | Logging & Monitoring | AuditLog on all sensitive actions, Sentry errors, Uptime Robot | ✅ |
| A10 | Server-Side Request Forgery | AI service only reachable internally, no user-supplied URLs in HTTP calls | ✅ |

---

## 10. Incident Response

### 10.1 Compromised JWT Secret

```
1. Rotate JWT_SECRET and JWT_REFRESH_SECRET in environment
2. Flush all Redis keys matching refresh:* (forces all users to re-login)
3. All active sessions invalidated immediately
4. Notify team via Sentry alert
5. Review audit logs for anomalous access in preceding 24h
```

### 10.2 Data Breach (Unauthorized DB Access)

```
1. Revoke all Supabase DB credentials immediately
2. Rotate DATABASE_URL with new credentials
3. Assess scope: which tables, which rows, what time range
4. Notify affected users within 72h (GDPR / IT Act requirement)
5. Generate breach report from audit_logs
6. Review and patch the vulnerability
```

### 10.3 Compromised Admin Account

```
1. Deactivate the admin account (POST /admin/deactivate-staff/:userId)
2. Flush all refresh tokens for that user (Redis)
3. Review audit_logs for all actions by that actorId in last 30 days
4. Determine blast radius (which patients/records were accessed)
5. Notify affected patients
```

### 10.4 Emergency Override Abuse

```
Auto-detected: admin dashboard flags unreviewable overrides within 48h →
1. Audit trail already exists (audit_logs entry)
2. Hospital Admin reviews: patient UHID, doctor, reason, timestamp
3. If illegitimate: Deactivate doctor, report to Medical Council
4. Patient notified with full override details
5. UHID team alerted if pattern of abuse
```

---

*← Back to [Master Index](./MASTER_INDEX.md)*
