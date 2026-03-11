# Phase 10 — Testing, Security Hardening & Deployment

> **Phase:** 10  
> **Status:** ⬜ PLANNED  
> **Duration:** Week 15–16  
> **Goal:** Production-ready platform. Full test coverage for critical paths. Security hardened against OWASP Top 10. Deployed behind Nginx with SSL. CI/CD pipeline in place. Performance benchmarks met for 10,000+ concurrent users.

---

## 📋 Table of Contents

1. [Overview](#1-overview)
2. [Unit Tests](#2-unit-tests)
3. [Integration Tests](#3-integration-tests)
4. [Security Tests](#4-security-tests)
5. [Performance Benchmarks](#5-performance-benchmarks)
6. [Security Hardening Checklist](#6-security-hardening-checklist)
7. [Production Deployment](#7-production-deployment)
8. [CI/CD Pipeline](#8-cicd-pipeline)
9. [Monitoring & Alerting](#9-monitoring--alerting)
10. [Environment Variables Reference](#10-environment-variables-reference)
11. [Seed Data](#11-seed-data)

---

## 1. Overview

```
TESTING PYRAMID:
────────────────────────────────────────────────────────────────────
           ┌──────────────────┐
           │   E2E Tests (5)  │  Playwright (critical user journeys)
           ├──────────────────┤
           │ Integration (30+)│  Supertest (API endpoint integration)
           ├──────────────────┤
           │   Unit (50+)     │  Vitest/Jest (services, validators)
           └──────────────────┘

COVERAGE TARGETS:
  Services:     ≥ 80%
  Validators:   100%
  Middlewares:  100%
  Controllers:  ≥ 70%
```

---

## 2. Unit Tests

### 2.1 API Unit Tests (Vitest + Supertest)

**Location:** `apps/api/src/__tests__/`

#### auth.service.test.ts

| Test | Description |
|------|-------------|
| `register()` | Creates user, sends verification email |
| `register()` duplicate email | Throws 409 ConflictError |
| `login()` correct creds | Returns access + refresh tokens |
| `login()` wrong password | Throws 401 UnauthorizedError |
| `login()` unverified email | Throws 403 with `EMAIL_NOT_VERIFIED` |
| `refreshToken()` valid | Returns new access token |
| `refreshToken()` expired | Throws 401 |
| `forgotPassword()` | Sends reset email, stores OTP in Redis |
| `resetPassword()` valid OTP | Updates password, invalidates all refresh tokens |
| `resetPassword()` wrong OTP | Throws 400 |
| UHID generation | Format matches `/^UH-[A-Z0-9]{6}$/` |
| UHID uniqueness | No duplicates in 10,000 iterations |

#### auth.middleware.test.ts

| Test | Description |
|------|-------------|
| Valid Bearer token | Sets `req.user`, calls `next()` |
| No token | Returns 401 |
| Expired token | Returns 401 |
| Wrong role | Returns 403 |
| `HOSPITAL_ADMIN` requires verified hospital | Returns 403 if hospital unverified |

#### prescription.service.test.ts

| Test | Description |
|------|-------------|
| Create prescription | Stores prescription + items |
| Pharma-check drug-drug | Returns correct severity flags |
| Pharma-check drug-allergy | Returns CRITICAL flag |
| Pharma-check no issues | Returns `passed: true` |
| Override HIGH severity | Logs to pharma_check_logs |

#### insurance.service.test.ts

| Test | Description |
|------|-------------|
| Submit claim | Creates claim, runs fraud detection |
| Duplicate claim detection | Sets fraudFlag DUPLICATE_CLAIM |
| Record hash verification match | Returns `isAuthentic: true` |
| Record hash verification mismatch | Returns `isAuthentic: false` |
| Claim status transition valid | Updates status |
| Claim status transition invalid | Throws 409 |

#### admin.service.test.ts

| Test | Description |
|------|-------------|
| Verify staff | Sets `isVerified: true`, creates AuditLog |
| Reject staff | Creates rejection AuditLog |
| Deactivate staff | Invalidates all active refresh tokens |
| Audit log pagination | Returns correct page/limit |
| Hospital admin cross-hospital access | Throws 403 |

#### smart-pharma-check.test.ts

| Test | Description |
|------|-------------|
| Warfarin + Aspirin | HIGH interaction detected |
| Aspirin allergy + Aspirin prescribed | CRITICAL drug-allergy flag |
| Metformin + eGFR <60 | MODERATE drug-condition flag |
| 3 unrelated drugs | `passed: true`, no flags |

### 2.2 Frontend Unit Tests (Vitest + React Testing Library)

**Location:** `apps/web/src/__tests__/`

| Test File | What It Tests |
|-----------|---------------|
| `authStore.test.ts` | Zustand auth store: login, logout, token persistence |
| `components.test.tsx` | Core reusable components render correctly |
| `validators.test.ts` | Zod schema validation on frontend forms |

---

## 3. Integration Tests

Run with `npm run test:integration` — uses a test Postgres database (Supabase test branch).

### 3.1 Auth Flow Integration

```
1. POST /auth/register → 201
2. Verify email (mock email service in test) → 200
3. POST /auth/login → 200, get tokens
4. GET /auth/me → 200, correct user data
5. POST /auth/refresh → 200, new token
6. POST /auth/logout → 200, refresh token deleted from Redis
```

### 3.2 Record Upload Integration

```
1. Login as HOSPITAL_STAFF
2. POST /records/upload (multipart file) → 201
3. File stored in Cloudinary (test bucket)
4. OCR triggered (mocked in tests)
5. GET /records?patientUhid=... → 200, includes new record
6. GET /records/:id/download → 302 redirect to signed URL
```

### 3.3 Consent Flow Integration

```
1. Doctor requests consent → patient notified (Socket.io mock)
2. Patient receives OTP (mocked)
3. Patient approves with OTP → consent ACTIVE
4. Doctor reads patient records → 200
5. Patient revokes consent
6. Doctor reads patient records → 403
```

### 3.4 Pharma-Check Integration

```
1. Login as DOCTOR with active consent
2. POST /prescriptions/pharma-check with conflicting drugs → flags returned
3. POST /prescriptions with HIGH conflict, no override → 422
4. POST /prescriptions with HIGH conflict + override reason → 201
5. PharmaCheckLog created → verify in DB
```

---

## 4. Security Tests

### 4.1 Authentication Attacks

| Attack | Test | Expected |
|--------|------|----------|
| JWT tampering | Modify JWT payload, send request | 401 |
| JWT from another user | Use valid JWT of User A to access User B's data | 403 |
| Expired JWT | Send access token after 15 min | 401 |
| Replay attack (refresh token) | Use refresh token twice | Second use: 401 |
| Brute force login | 10 rapid POST /auth/login with wrong password | 429 after 5 attempts |
| OTP brute force | 4 consecutive wrong OTPs | 429 after 3 attempts |

### 4.2 Authorization (RBAC) Tests

| Test | Expected |
|------|---------|
| Patient attempts POST /prescriptions | 403 |
| Doctor attempts GET /admin/audit-logs | 403 |
| HospitalAdmin attempts access another hospital's staff | 403 |
| Doctor without consent reads patient records | 403 |
| Insurance reads records without consent | 403 |

### 4.3 Input Validation / Injection Tests

| Attack | Expected |
|--------|---------|
| SQL injection in UHID field `UH-'; DROP TABLE users;--` | 400 validation error (Zod rejects non-alphanumeric) |
| XSS in `chiefComplaint` field `<script>alert(1)</script>` | String sanitized by Helmet, stored as plaintext |
| Oversized file upload (>10MB) | 413 Payload Too Large |
| Malformed JSON body | 400 Bad Request |
| Negative `claimedAmount` | 400 Zod validation error |

### 4.4 OWASP Top 10 Coverage

| Vulnerability | Mitigation | Tested |
|---------------|-----------|--------|
| A01 Broken Access Control | RBAC middleware + consent gates | ✅ |
| A02 Cryptographic Failures | Argon2id, AES-256 for Aadhaar, HTTPS only | ✅ |
| A03 Injection | Prisma parameterized queries, Zod input validation | ✅ |
| A05 Security Misconfiguration | Helmet headers, CORS allowlist | ✅ |
| A06 Vulnerable Components | `npm audit` in CI pipeline | ✅ |
| A07 Identity Auth Failures | JWT + refresh token rotation, rate limiting | ✅ |
| A08 Software Integrity Failures | File hash verification for uploaded records | ✅ |
| A09 Logging Failures | AuditLog on all sensitive actions | ✅ |

---

## 5. Performance Benchmarks

### 5.1 API Response Time Targets

| Endpoint | Target | Tool |
|----------|--------|------|
| GET /auth/me | < 50ms | k6 |
| GET /records (list) | < 200ms | k6 |
| POST /records/upload (5MB file) | < 3s | k6 |
| POST /prescriptions/pharma-check | < 500ms | k6 |
| POST /ai/decode | < 8s (cold), < 100ms (cached) | k6 |
| GET /notifications | < 100ms | k6 |

### 5.2 Load Test Targets

| Scenario | Target |
|----------|--------|
| 1,000 concurrent users | All API responses < 500ms (p95) |
| 10,000 concurrent users | API degraded but not down; queue handling |
| File upload spike (100 simultaneous) | All succeed within 10s |
| Socket.io connections | 5,000 concurrent without dropped messages |

### 5.3 k6 Load Test Script (Example)

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 1000,
  duration: '60s',
};

export default function () {
  const res = http.get('https://api.uhid.health/api/v1/auth/me', {
    headers: { Authorization: `Bearer ${__ENV.TEST_TOKEN}` },
  });
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
```

---

## 6. Security Hardening Checklist

### 6.1 HTTP Security Headers (Helmet.js)

```
Content-Security-Policy: default-src 'self'; img-src 'self' data: https://res.cloudinary.com;
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Referrer-Policy: no-referrer
Permissions-Policy: geolocation=(self)
```

### 6.2 Rate Limiting Strategy

| Endpoint Group | Limit |
|----------------|-------|
| All API endpoints (general) | 100 req/15min per IP |
| POST /auth/login | 5 req/15min per IP |
| POST /auth/register | 10 req/hour per IP |
| POST /auth/forgot-password | 3 req/hour per IP |
| POST /qr/sos | 1 req/10min per user |
| POST /ai/decode | 20 req/day per user |
| POST /ai/clinical-summary | 30 req/day per user |

### 6.3 Data Encryption

| Data | Encryption |
|------|-----------|
| Passwords | Argon2id (memory: 64MB, iterations: 3, parallelism: 1) |
| Aadhaar numbers | AES-256-GCM (encrypted in DB, decrypted only for display) |
| JWT signing | HS256 with 512-bit secret |
| QR signing | HS256 with separate EMERGENCY_SECRET |
| File storage | Cloudinary private signed URLs (1-hour TTL) |
| DB connection | TLS/SSL (Supabase enforced) |
| Redis connection | TLS (Upstash enforced) |

---

## 7. Production Deployment

### 7.1 Architecture

```
Internet → Cloudflare (DDoS protection, CDN for frontend)
  ↓
Nginx (SSL termination, reverse proxy, gzip)
  ├── / → Serve React SPA (static files)
  ├── /api/v1/* → Node.js Express (port 5000)
  └── /ai/* → Python FastAPI (port 8000)

Database → Supabase PostgreSQL (cloud-managed)
Cache → Upstash Redis (cloud-managed)
Files → Cloudinary (cloud-managed)
AI → OpenAI API (cloud)
```

### 7.2 Nginx Configuration (Key Points)

```nginx
server {
    listen 443 ssl http2;
    server_name api.uhid.health;

    ssl_certificate     /etc/letsencrypt/live/uhid.health/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/uhid.health/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;

    # API proxy
    location /api/v1/ {
        proxy_pass http://localhost:5000;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";  # For Socket.io
    }

    # AI service proxy (internal only, not exposed as /ai/)
    # Call from Express backend to localhost:8000
}
```

### 7.3 Process Management (PM2)

```json
// ecosystem.config.js
{
  "apps": [
    {
      "name": "uhid-api",
      "script": "apps/api/dist/index.js",
      "instances": "max",
      "exec_mode": "cluster",
      "env_production": { "NODE_ENV": "production" }
    },
    {
      "name": "uhid-ai",
      "script": "uvicorn",
      "args": "apps.ai.main:app --host 127.0.0.1 --port 8000",
      "interpreter": "python3"
    }
  ]
}
```

### 7.4 Deployment Steps

```bash
# 1. Build API
npm run build --workspace=apps/api

# 2. Run DB migrations
npm run db:migrate --workspace=apps/api

# 3. Build Frontend
npm run build --workspace=apps/web

# 4. Copy frontend build to Nginx web root
cp -r apps/web/dist /var/www/uhid/

# 5. Start/Restart services
pm2 start ecosystem.config.js --env production
pm2 save
```

---

## 8. CI/CD Pipeline

### 8.1 GitHub Actions Workflow

**Trigger:** Push to `main` or PR to `main`

```yaml
name: UHID CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run type-check --workspace=apps/api
      - run: npm run type-check --workspace=apps/web
      - run: npm test --workspace=apps/api
      - run: npm test --workspace=apps/web
      - run: npm audit --audit-level=high

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to production
        run: |
          ssh ${{ secrets.PROD_USER }}@${{ secrets.PROD_HOST }} '
            cd /app/uhid &&
            git pull origin main &&
            npm ci &&
            npm run build --workspace=apps/api &&
            npm run build --workspace=apps/web &&
            npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma &&
            pm2 reload uhid-api
          '
```

---

## 9. Monitoring & Alerting

| Tool | Purpose |
|------|---------|
| **PM2 Monitoring** | CPU/memory per process, restart counts |
| **Sentry** | Error tracking — captures uncaught exceptions with stack traces |
| **Uptime Robot** | Ping `/api/v1/health` every 5 minutes, alert if down |
| **Supabase Dashboard** | DB query performance, slow query log |
| **Upstash Console** | Redis memory usage, command stats |
| **Cloudinary Analytics** | Storage usage, bandwidth, transformation counts |
| **Custom /health endpoint** | Returns DB, Redis, AI service status |

### Health Check Endpoint Response

```json
{
  "status": "ok",
  "timestamp": "2026-02-26T09:15:00.000Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "ai": "connected",
    "cloudinary": "connected"
  },
  "version": "1.0.0"
}
```

---

## 10. Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | ✅ | Supabase PostgreSQL connection string | `postgresql://...` |
| `DIRECT_URL` | ✅ | Supabase direct connection (migrations) | `postgresql://...` |
| `JWT_SECRET` | ✅ | Secret for access token signing (512-bit) | Random 64-char string |
| `JWT_REFRESH_SECRET` | ✅ | Secret for refresh token signing | Random 64-char string |
| `JWT_ACCESS_EXPIRES` | ✅ | Access token TTL | `15m` |
| `JWT_REFRESH_EXPIRES` | ✅ | Refresh token TTL | `7d` |
| `REDIS_URL` | ✅ | Upstash Redis URL | `rediss://...` |
| `CLOUDINARY_CLOUD_NAME` | ✅ | Cloudinary cloud identifier | `uhid-prod` |
| `CLOUDINARY_API_KEY` | ✅ | Cloudinary API key | `847291...` |
| `CLOUDINARY_API_SECRET` | ✅ | Cloudinary API secret | `abc123...` |
| `OPENAI_API_KEY` | ✅ | OpenAI API key | `sk-...` |
| `GEMINI_API_KEY` | ✅ | Google Gemini API key (fallback) | `AIza...` |
| `GOOGLE_VISION_API_KEY` | ✅ | Google Vision for OCR | `AIza...` |
| `EMAIL_HOST` | ✅ | SMTP host | `smtp.gmail.com` |
| `EMAIL_PORT` | ✅ | SMTP port | `587` |
| `EMAIL_USER` | ✅ | SMTP user | `noreply@uhid.health` |
| `EMAIL_PASS` | ✅ | SMTP password | App password |
| `EMERGENCY_SECRET` | ✅ | For QR + emergency JWT signing | Random 64-char string |
| `INTERNAL_SERVICE_SECRET` | ✅ | Express → AI service auth header | Random 32-char string |
| `JITSI_APP_ID` | Optional | Jitsi Meet app ID for JWT | `uhid-telehealth` |
| `JITSI_SECRET` | Optional | Jitsi JWT signing secret | Random string |
| `AADHAAR_ENCRYPTION_KEY` | ✅ | AES-256 key for Aadhaar encryption | Random 32-byte hex |
| `NODE_ENV` | ✅ | Runtime environment | `production` |
| `PORT` | Optional | Express port | `5000` |
| `FRONTEND_URL` | ✅ | Frontend origin for CORS | `https://uhid.health` |

---

## 11. Seed Data

The seed script (`apps/api/prisma/seed.ts`) creates demo accounts for testing:

| Account | Email | Password | Role |
|---------|-------|----------|------|
| Super Admin | `superadmin@uhid.health` | `Admin@12345` | SUPER_ADMIN |
| Hospital Admin | `hospitaladmin@apollomumbai.com` | `Admin@12345` | HOSPITAL_ADMIN |
| Doctor | `doctor@apollomumbai.com` | `Doctor@12345` | DOCTOR |
| Hospital Staff | `staff@apollomumbai.com` | `Staff@12345` | HOSPITAL_STAFF |
| Patient | `patient@test.com` | `Patient@12345` | PATIENT |
| Insurance | `insurance@maxbupa.com` | `Insurance@12345` | INSURANCE_PROVIDER |

**Seed also creates:**
- Apollo Hospital Mumbai (verified)
- Max Bupa Insurance Provider (verified)
- 10 sample medical records for the test patient
- 3 sample prescriptions
- 2 sample clinical notes

**Run:** `npm run db:seed --workspace=apps/api`

---

*Previous Phase: [Phase 9 — Telehealth](./PHASE_9_TELEHEALTH.md)  
← Back to: [Master Index](./MASTER_INDEX.md)*
