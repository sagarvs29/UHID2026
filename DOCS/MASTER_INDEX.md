# UniHealth ID (UHID) — Master Documentatio| **15** | [`API_REFERENCE.md`](./API_REFERENCE.md) | All REST API endpoints documented | Backend + Frontend |
| **16** | [`DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md) | Full database schema with relationships | Backend + DBA |
| **17** | [`SECURITY.md`](./SECURITY.md) | Security model, threat matrix, hardening | Security + Engineering |
| **18** | [`SUGGESTIONS_AND_IMPROVEMENTS.md`](./SUGGESTIONS_AND_IMPROVEMENTS.md) | Tech stack suggestions, new features, AI model recommendations | Engineering Lead |ndex

> **Version:** 2.0 — Production-Grade Documentation  
> **Last Updated:** March 11, 2026  
> **Status:** ⬜ Planning Phase — No Code Written Yet  
> **Platform:** Web (React + Node.js + Python AI)  
> **Scale Target:** 10,000+ concurrent users  
> **Author:** UNIHEALTH Engineering Team

---

## 🏥 What is UniHealth ID?

UniHealth ID (UHID) is a **centralized digital health identity platform** that assigns every patient a **unique 6-digit health ID (e.g., UH-847291)** that serves as their lifetime medical identity across all hospitals, doctors, pharmacies, and insurance providers in India.

The system enables:
- Patients to **own and control** their complete medical history
- Doctors to **access verified records** with patient consent
- Hospital staff to **upload** lab reports, imaging, prescriptions securely
- Insurance providers to **verify claims** using authenticated records
- Emergency responders to **access critical info** without login in emergencies
- AI to **decode complex medical reports** into plain language for patients

---

## 📚 Documentation Files

| # | Document | Description | Audience |
|---|----------|-------------|----------|
| **THIS FILE** | `MASTER_INDEX.md` | Project overview & navigation guide | Everyone |
| **01** | [`ARCHITECTURE.md`](./ARCHITECTURE.md) | System architecture, data flow, tech decisions | Engineering |
| **02** | [`FEATURES.md`](./features.md) | Complete feature specification with UI mockups | Product + Engineering |
| **03** | [`PHASE_0_SETUP.md`](./PHASE_0_SETUP.md) | Project setup, infrastructure, environment | DevOps + Engineering |
| **04** | [`PHASE_1_AUTH.md`](./PHASE_1_AUTH.md) | Authentication, UHID, RBAC | Backend + Frontend |
| **05** | [`PHASE_2_RECORDS.md`](./PHASE_2_RECORDS.md) | Medical records, file upload, OCR | Backend + Frontend |
| **06** | [`PHASE_3_CONSENT.md`](./PHASE_3_CONSENT.md) | Consent system, real-time notifications | Backend + Frontend |
| **07** | [`PHASE_4_CLINICAL.md`](./PHASE_4_CLINICAL.md) | Doctor portal, prescriptions, Pharma-Check | Backend + Frontend |
| **08** | [`PHASE_5_AI.md`](./PHASE_5_AI.md) | AI Report Decoder, Clinical Summary, OCR | AI + Backend |
| **09** | [`PHASE_6_QR_EMERGENCY.md`](./PHASE_6_QR_EMERGENCY.md) | QR codes, SOS system, emergency access | Full Stack |
| **10** | [`PHASE_7_INSURANCE.md`](./PHASE_7_INSURANCE.md) | Insurance portal, claims, fraud detection | Backend + Frontend |
| **11** | [`PHASE_8_ADMIN.md`](./PHASE_8_ADMIN.md) | Hospital admin, staff management, audit logs | Backend + Frontend |
| **12** | [`PHASE_9_TELEHEALTH.md`](./PHASE_9_TELEHEALTH.md) | Appointments, video calls, notifications | Full Stack |
| **13** | [`PHASE_10_TESTING_DEPLOY.md`](./PHASE_10_TESTING_DEPLOY.md) | Testing strategy, CI/CD, deployment | DevOps + QA |
| **14** | [`API_REFERENCE.md`](./API_REFERENCE.md) | All REST API endpoints documented | Backend + Frontend |
| **15** | [`DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md) | Full database schema with relationships | Backend + DBA |
| **16** | [`SECURITY.md`](./SECURITY.md) | Security model, threat matrix, hardening | Security + Engineering |

---

## 🏗️ System Architecture (Quick View)

```
┌──────────────────────────────────────────────────────────────────────┐
│                          UHID PLATFORM                               │
├──────────────────────────────────────────────────────────────────────┤
│                                                                        │
│    FRONTEND (React + TypeScript + Tailwind)  — Port 5173             │
│    ┌─────────┐ ┌────────┐ ┌───────┐ ┌───────┐ ┌───────────┐        │
│    │ Patient │ │ Doctor │ │ Staff │ │ Admin │ │ Insurance │        │
│    └────┬────┘ └───┬────┘ └───┬───┘ └───┬───┘ └─────┬─────┘        │
│         └──────────┴──────────┴─────────┴───────────┘               │
│                              │ HTTPS + JWT                            │
│                              ▼                                        │
│    BACKEND (Node.js + Express + TypeScript)  — Port 5000             │
│    ┌────────────────────────────────────────────────────┐           │
│    │  Routes → Controllers → Services → Prisma ORM      │           │
│    │  Auth | Records | Consent | Prescription | QR       │           │
│    │  AI | Emergency | Insurance | Admin | Hospital      │           │
│    └──────────┬─────────────────────────┬───────────────┘           │
│               │                         │ Internal HTTP              │
│               │                         ▼                            │
│               │        AI SERVICE (Python + FastAPI) — Port 8000    │
│               │        ┌──────────────────────────────┐             │
│               │        │  OCR | Report Decoder | LLM  │             │
│               │        │  Clinical Summary | Pharma    │             │
│               │        └──────────────────────────────┘             │
│               ▼                                                       │
│    ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐      │
│    │  Supabase    │  │   Upstash    │  │    Cloudinary      │      │
│    │  PostgreSQL  │  │    Redis     │  │   (Files + QR)     │      │
│    │  (Primary DB)│  │ (Cache/OTP)  │  │  (Secure Storage)  │      │
│    └──────────────┘  └──────────────┘  └────────────────────┘      │
│                                                                        │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 👥 User Roles

| Role | Access Level | Primary Responsibility |
|------|-------------|------------------------|
| **Patient** | Own data only | View records, manage consent, emergency SOS |
| **Doctor** | Consented patient data | Diagnose, prescribe, clinical notes |
| **Hospital Staff** | Upload only | Register patients, upload medical records |
| **Hospital Admin** | Hospital scope | Staff management, analytics, audit logs |
| **Insurance Provider** | Consented records only | Claims verification, fraud detection |
| **Super Admin** | Full system | Hospital registration, system management |

---

## 📦 Monorepo Structure

```
UHID/
├── apps/
│   ├── web/          ← React.js frontend (Vite + TypeScript)
│   ├── api/          ← Node.js backend (Express + TypeScript)
│   └── ai/           ← Python AI microservice (FastAPI)
├── docs/             ← All documentation (YOU ARE HERE)
├── package.json      ← Root workspace (npm workspaces)
└── .env.example      ← Environment template
```

---

## ⚡ Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Setup .env (copy from .env.example, fill values)
cp .env.example .env

# 3. Run database migrations
cd apps/api && npx prisma migrate dev

# 4. Seed demo data
npx prisma db seed

# 5. Start all services (frontend + backend + AI)
npm run dev
```

**Demo Accounts:**

| Role | Email | Password |
|------|-------|----------|
| Patient | `patient@uhid.dev` | `Demo@1234` |
| Doctor | `doctor@uhid.dev` | `Demo@1234` |
| Hospital Staff | `staff@uhid.dev` | `Demo@1234` |
| Hospital Admin | `admin@uhid.dev` | `Demo@1234` |
| Insurance | `insurance@uhid.dev` | `Demo@1234` |

---

## 🗓️ Implementation Timeline (10 Phases)

| Phase | Name | Status | Duration |
|-------|------|--------|----------|
| **Phase 0** | Project Setup & Infrastructure | ⬜ Planned | Week 0 |
| **Phase 1** | Authentication, UHID & RBAC | ⬜ Planned | Weeks 1–3 |
| **Phase 2** | Medical Records & File Upload | ⬜ Planned | Weeks 4–5 |
| **Phase 3** | Consent Management System | ⬜ Planned | Week 6 |
| **Phase 4** | Doctor Portal & Pharma-Check | ⬜ Planned | Weeks 7–8 |
| **Phase 5** | AI Features (Decoder + Summary) | ⬜ Planned | Weeks 9–10 |
| **Phase 6** | QR Codes & Emergency Access | ⬜ Planned | Week 11 |
| **Phase 7** | Insurance Portal | ⬜ Planned | Week 12 |
| **Phase 8** | Hospital Admin & Audit Logs | ⬜ Planned | Week 13 |
| **Phase 9** | Telehealth & Notifications | ⬜ Planned | Week 14 |
| **Phase 10** | Testing, Security & Deployment | ⬜ Planned | Weeks 15–16 |

---

## 🔑 Key Technical Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Language (Backend) | TypeScript | Medical data type safety |
| Language (AI) | Python | ML ecosystem dominance |
| Database | PostgreSQL (Supabase) | ACID compliance for medical records |
| ORM | Prisma | Type-safe queries, migrations |
| Cache/Sessions | Redis (Upstash) | JWT blacklist, OTP, consent sessions |
| File Storage | Cloudinary | Auto-optimization, CDN, no DevOps overhead |
| Auth | JWT + Argon2id | Industry standard, secure password hashing |
| OTP/SMS | MSG91 | Indian provider, free trial, ₹0.15/SMS |
| Drug Interactions | OpenFDA API | Free, 100k req/day, no key required |
| ICD-10 Codes | icd10-codes npm | Free, offline, ~70k codes |
| State Management | Zustand | Lightweight (1KB), no Redux boilerplate |
| AI | OpenAI GPT-4o | Best medical text understanding |
| OCR | Tesseract + Google Vision | Free tier + accuracy fallback |

---

## 🔒 Security Highlights

- **JWT** access tokens (15-min) + refresh tokens (7-day, Redis-backed)
- **Argon2id** password hashing (OWASP recommended)
- **Role-Based Access Control** on every endpoint
- **Consent gates** before any patient data access
- **Full audit log** of every CREATE/READ/UPDATE action
- **Rate limiting** (100 req/15min per IP)
- **Helmet.js** HTTP security headers
- **Input validation** via Zod on all API endpoints
- **AES-256** encryption for sensitive fields (Aadhaar)

---

*Navigate to specific phase documents using the table above for detailed implementation guides.*
