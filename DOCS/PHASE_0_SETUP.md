# Phase 0 — Project Setup & Infrastructure

> **Phase:** 0  
> **Status:** ⬜ PLANNED  
> **Completed:** Not Started  
> **Duration:** 1 day  
> **Goal:** Initialize the monorepo, configure all cloud services, scaffold all three apps, and ensure every team member can run the full project locally with a single command.

---

## 📋 Table of Contents

1. [Objectives](#1-objectives)
2. [Folder Structure](#2-folder-structure)
3. [Cloud Services](#3-cloud-services)
4. [Environment Variables](#4-environment-variables)
5. [Database Initialization](#5-database-initialization)
6. [Scripts & Commands](#6-scripts--commands)
7. [Completion Checklist](#7-completion-checklist)
8. [Known Issues & Resolutions](#8-known-issues--resolutions)

---

## 1. Objectives

| # | Objective | Status |
|---|-----------|--------|
| 1 | Create monorepo with npm workspaces (`api`, `web`, `ai`) | ⬜ |
| 2 | Configure `concurrently` — one command starts all 3 services | ⬜ |
| 3 | Scaffold Express API (`apps/api`) with TypeScript | ⬜ |
| 4 | Scaffold React frontend (`apps/web`) with Vite + TypeScript | ⬜ |
| 5 | Scaffold Python AI service (`apps/ai`) with FastAPI | ⬜ |
| 6 | Write Prisma schema (28 models, 24 enums) | ⬜ |
| 7 | Run first migration on Supabase PostgreSQL | ⬜ |
| 8 | Seed 5 demo accounts (all roles) | ⬜ |
| 9 | Connect Upstash Redis, Cloudinary, OpenAI | ⬜ |
| 10 | Configure `.gitignore`, `.env.example`, `README.md` | ⬜ |

---

## 2. Folder Structure

```
UHID/                              ← Root workspace
├── package.json                   ← npm workspaces + concurrently scripts
├── .env.example                   ← Template for all secrets (safe to commit)
├── .gitignore                     ← Ignores: .env, node_modules, dist, __pycache__
├── README.md                      ← Local setup guide + demo credentials
│
├── apps/
│   │
│   ├── api/                       ← Node.js Backend
│   │   ├── package.json           ← 15 dependencies (Express, Prisma, JWT, Argon2...)
│   │   ├── tsconfig.json          ← ES2022, CommonJS, strict mode
│   │   ├── prisma/
│   │   │   ├── schema.prisma      ← 22 models, 14 enums
│   │   │   └── migrations/        ← Migration history
│   │   └── src/
│   │       ├── index.ts           ← Server entry: DB connect → listen
│   │       ├── app.ts             ← Express setup: CORS, Helmet, rate limit, routes
│   │       ├── lib/
│   │       │   ├── prisma.ts      ← Prisma singleton
│   │       │   ├── redis.ts       ← Upstash Redis client
│   │       │   ├── cloudinary.ts  ← Cloudinary v2 config
│   │       │   ├── email.ts       ← Nodemailer SMTP config
│   │       │   └── socket.ts      ← Socket.io setup
│   │       ├── routes/            ← Route definitions (10 route files)
│   │       ├── controllers/       ← Request handlers (10 controller files)
│   │       ├── services/          ← Business logic (10 service files)
│   │       ├── middlewares/       ← auth, upload, validate
│   │       ├── validators/        ← Zod schemas for all request bodies
│   │       ├── types/             ← TypeScript type augmentations
│   │       └── prisma/
│   │           └── seed.ts        ← 5 demo accounts + demo hospital
│   │
│   ├── web/                       ← React Frontend
│   │   ├── package.json           ← 20+ dependencies (React, Tailwind, Zustand...)
│   │   ├── vite.config.ts         ← Port 5173, API proxy to port 5000
│   │   ├── tailwind.config.ts     ← UHID brand colors + shadcn theme
│   │   ├── index.html
│   │   └── src/
│   │       ├── main.tsx           ← React root + React Query provider
│   │       ├── App.tsx            ← All routes + role-based protection
│   │       ├── index.css          ← Tailwind base + shadcn CSS variables
│   │       ├── components/        ← Reusable UI (shadcn + custom)
│   │       ├── pages/             ← Role-specific page directories
│   │       │   ├── auth/          ← Login, Register, ForgotPassword
│   │       │   ├── patient/       ← Patient dashboard, records, consent
│   │       │   ├── doctor/        ← Doctor dashboard, patient lookup
│   │       │   ├── staff/         ← Upload, register patient
│   │       │   ├── admin/         ← Staff management, analytics
│   │       │   └── insurance/     ← Claims, verification
│   │       ├── stores/            ← Zustand state stores
│   │       ├── hooks/             ← React Query hooks
│   │       ├── lib/               ← Axios instance, utilities
│   │       └── __tests__/         ← Vitest test files
│   │
│   └── ai/                        ← Python AI Microservice
│       ├── requirements.txt       ← FastAPI, OpenAI, pytesseract, Pillow...
│       ├── main.py                ← FastAPI app + CORS + router registration
│       └── routers/
│           ├── __init__.py
│           ├── report_decoder.py  ← GPT-4o report explanation endpoint
│           ├── clinical_summary.py← Doctor-facing AI summary endpoint
│           └── ocr.py             ← Tesseract OCR endpoint
│
└── docs/                          ← All documentation (YOU ARE HERE)
```

---

## 3. Cloud Services

### 3.1 Supabase (PostgreSQL)

| Property | Value |
|----------|-------|
| **Service** | Supabase (managed PostgreSQL 15) |
| **Why Supabase?** | Free tier, no Docker needed, always-on, connection pooling |
| **Access** | `DATABASE_URL` (pooled) + `DIRECT_URL` (for migrations) |
| **Tables Created** | 28 tables via Prisma migration |
| **Region** | Asia South (Mumbai) for low latency |

**Tables Created on First Migration:**
```
users               patients              doctors
hospital_staff      hospital_admins       insurance_providers
super_admins        hospitals             emergency_contacts
medical_records     prescriptions         prescription_items
clinical_notes      consents              qr_codes
qr_scan_logs        emergency_accesses    pharma_check_logs
ai_report_summaries insurance_claims      claim_documents
audit_logs          appointments          family_links
doctor_availability doctor_reviews        notifications
drug_interactions   icd10_codes
```

**Total: 28 tables**

### 3.2 Upstash Redis

| Property | Value |
|----------|-------|
| **Service** | Upstash (serverless Redis) |
| **Why Upstash?** | Free tier, REST API (no local Redis install needed), TLS |
| **Uses** | JWT refresh tokens, OTP storage, consent sessions, rate limiting |
| **Key Schema** | See table below |

**Redis Key Schema:**

| Key Pattern | Value | TTL | Purpose |
|-------------|-------|-----|---------|
| `refresh:<userId>` | refresh token string | 7 days | JWT rotation |
| `otp:<phone/email>` | 6-digit code | 10 min | Phone/email verification |
| `consent_session:<consentId>` | consent metadata | Variable | Active consent tracking |
| `qr:<accessCode>` | QR metadata JSON | Until expiry | QR validation |
| `sos:<patientId>` | SOS metadata | 2 hours | Emergency access |

### 3.3 Cloudinary

| Property | Value |
|----------|-------|
| **Service** | Cloudinary (managed media storage) |
| **Why Cloudinary?** | CDN, auto-optimization, secure URLs, no MinIO DevOps overhead |
| **Used For** | Medical record PDFs, images, profile photos, QR code images |
| **Folder Structure** | `uhid/records/`, `uhid/profiles/`, `uhid/qr/` |
| **Security** | Signed URLs for medical documents (private access) |

### 3.4 OpenAI

| Property | Value |
|----------|-------|
| **Model** | GPT-4o (primary), GPT-4o-mini (fallback for cost) |
| **Usage** | Report Decoder, Clinical Summary |
| **Cost Guard** | Per-user caching (AI summaries stored in DB, not regenerated) |
| **Fallback** | Google Gemini Pro (if OpenAI quota exceeded) |

---

## 4. Environment Variables

**File:** `apps/api/.env` (never commit this file)  
**Template:** `.env.example` (safe to commit)

```env
# ─── Database ──────────────────────────────────────────────────
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

# ─── Server ────────────────────────────────────────────────────
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# ─── JWT (two secrets — never use a single JWT_SECRET) ─────────
JWT_ACCESS_SECRET=your-very-long-random-access-secret-min-64-chars
JWT_REFRESH_SECRET=another-very-long-random-refresh-secret-min-64-chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ─── Redis (Upstash) ───────────────────────────────────────────
REDIS_URL=rediss://default:[PASSWORD]@[HOST].upstash.io:6379

# ─── Cloudinary ────────────────────────────────────────────────
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# ─── Email (SMTP — Gmail App Password) ─────────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@uhid.in
SMTP_PASS=your-gmail-app-password

# ─── SMS / OTP (MSG91) — https://msg91.com (100 free SMS trial) ─
MSG91_AUTH_KEY=your-msg91-auth-key
MSG91_SENDER_ID=UHIDOT
MSG91_TEMPLATE_ID=your-otp-template-id

# ─── AI Service ────────────────────────────────────────────────
AI_SERVICE_URL=http://localhost:8000
INTERNAL_SERVICE_SECRET=random-secret-shared-between-api-and-ai
OPENAI_API_KEY=sk-...

# ─── Video Consultations (Jitsi) — REQUIRED, not optional ──────
JITSI_APP_ID=your-jitsi-app-id
JITSI_SECRET=your-jitsi-app-secret

# ─── Encryption (Aadhaar AES-256-GCM) ──────────────────────────
ENCRYPTION_KEY=64-char-hex-string-for-aes-256-gcm

# ─── Emergency QR JWT signing (separate from main JWT) ─────────
EMERGENCY_SECRET=random-secret-for-emergency-qr-jwt
```

**AI Service** (`apps/ai/.env`):
```env
OPENAI_API_KEY=sk-...
BACKEND_URL=http://localhost:5000
INTERNAL_SERVICE_SECRET=same-value-as-api-env
AI_PORT=8000
```

---

## 5. Database Initialization

### Step-by-Step

```bash
# 1. Navigate to API directory
cd apps/api

# 2. Run Prisma migration (creates all 28 tables)
npx prisma migrate dev --name init

# 3. Generate Prisma client
npx prisma generate

# 4. Seed demo data
npx ts-node prisma/seed.ts
```

### What the Seed Creates

| Account | Email | Password | UHID |
|---------|-------|----------|------|
| Patient (Rajesh Kumar) | `patient@uhid.dev` | `Demo@1234` | `UH-847291` |
| Doctor (Dr. Suresh Menon) | `doctor@uhid.dev` | `Demo@1234` | — |
| Hospital Staff (Nurse Lakshmi) | `staff@uhid.dev` | `Demo@1234` | — |
| Hospital Admin | `admin@uhid.dev` | `Demo@1234` | — |
| Insurance Agent | `insurance@uhid.dev` | `Demo@1234` | — |
| Hospital (Apollo Hospital) | — | — | — |

The seed also creates:
- Sample medical records (CBC, Lipid Profile, Chest X-Ray)
- Sample prescriptions with drug interaction data
- Sample consent records
- Sample insurance claim

---

## 6. Scripts & Commands

**Root `package.json` scripts:**

| Command | What it does |
|---------|--------------|
| `npm run dev` | Starts all 3 services in parallel (concurrently) |
| `npm run dev:api` | Backend only (port 5000) |
| `npm run dev:web` | Frontend only (port 5173) |
| `npm run dev:ai` | AI service only (port 8000) |
| `npm run build` | Build all services for production |
| `npm run test` | Run all tests (Vitest + Jest) |

**API-specific (`apps/api`):**

| Command | What it does |
|---------|--------------|
| `npx prisma migrate dev` | Apply new migrations |
| `npx prisma studio` | Open DB visual browser |
| `npx prisma db seed` | Re-seed demo data |
| `npx prisma generate` | Regenerate Prisma client |

**AI Service (`apps/ai`):**

```bash
cd apps/ai
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

---

## 7. Completion Checklist

```
PHASE 0 COMPLETION STATUS
══════════════════════════════════════════════════

Infrastructure
  ⬜  Monorepo initialized (npm workspaces)
  ⬜  concurrently configured (1-command start)
  ⬜  Git repository initialized
  ⬜  .gitignore protecting secrets

Backend (apps/api)
  ⬜  Express + TypeScript scaffolded
  ⬜  Prisma schema (22 models, 14 enums)
  ⬜  First migration applied to Supabase
  ⬜  Seed file with demo accounts
  ⬜  All dependencies installed
  ⬜  lib/ directory (Prisma, Redis, Cloudinary, Email, Socket)
  ⬜  0 TypeScript errors

Frontend (apps/web)
  ⬜  React + Vite + TypeScript scaffolded
  ⬜  Tailwind CSS configured
  ⬜  shadcn/ui installed
  ⬜  API proxy configured (→ port 5000)
  ⬜  0 TypeScript errors

AI Service (apps/ai)
  ⬜  FastAPI scaffolded
  ⬜  requirements.txt complete
  ⬜  Router structure created

Cloud Services
  ⬜  Supabase PostgreSQL connected
  ⬜  Upstash Redis connected
  ⬜  Cloudinary configured
  ⬜  OpenAI API key configured
```

---

## 8. Known Issues & Resolutions

| Issue | Resolution |
|-------|------------|
| Vite `client` type errors | Added `"types": ["vite/client"]` to `tsconfig.json` |
| Prisma connection pooling error | Use `pgbouncer=true` in `DATABASE_URL` |
| Redis SSL handshake on Windows | Use `REDIS_URL=rediss://` (double s) for TLS |
| Tailwind not detecting shadcn classes | Added `"./src/**/*.{ts,tsx}"` glob in `tailwind.config.ts` |
| `concurrently` killing one service crashes all | Used `--kill-others-on-fail false` flag |

---

*Next Phase: [Phase 1 — Authentication, UHID & RBAC →](./PHASE_1_AUTH.md)*
