# UniHealth ID (UHID) - Tech Stack Documentation

> **Version:** 1.0  
> **Last Updated:** March 11, 2026  
> **Status:** ⬜ Planning Phase — No Code Written Yet

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Frontend Stack](#1-frontend-stack)
3. [Backend Stack](#2-backend-stack)
4. [Database Stack](#3-database-stack)
4. [AI/ML Stack](#4-aiml-stack)
5. [Infrastructure Stack](#5-infrastructure-stack)
6. [Security Stack](#6-security-stack)
7. [Platform Decision - Web vs Mobile](#7-platform-decision)
8. [Tech Stack Summary](#tech-stack-summary)
9. [Validation Checklist](#validation-checklist)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    UHID SYSTEM ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   FRONTEND LAYER                         │   │
│  │         React.js + TypeScript + Tailwind CSS             │   │
│  │    (Hospital Staff | Doctor | Admin | Insurance | Patient)│   │
│  └────────────────────────┬────────────────────────────────┘   │
│                            │ HTTPS / REST API                    │
│                            ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    NGINX (Reverse Proxy)                  │   │
│  │               SSL Termination + Load Balancing           │   │
│  └──────────┬───────────────────────────┬──────────────────┘   │
│             │                           │                        │
│             ▼                           ▼                        │
│  ┌────────────────────┐     ┌────────────────────────────┐     │
│  │   Node.js Backend  │     │   Python AI Service        │     │
│  │   Express.js API   │◄───►│   FastAPI                  │     │
│  │   TypeScript       │     │   OCR + LLM + Drug Check   │     │
│  └────────┬───────────┘     └────────────────────────────┘     │
│           │                                                       │
│    ┌──────┼──────────────────────────┐                          │
│    ▼      ▼                          ▼                          │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐                 │
│  │PostgreSQL│  │  Redis   │  │   Cloudinary   │                 │
│  │ Primary  │  │ Cache/   │  │  File Storage  │                 │
│  │   DB     │  │ Sessions │  │  (cloud CDN)   │                 │
│  └──────────┘  └──────────┘  └───────────────┘                 │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. Frontend Stack

### Technologies

| Technology | Version | Purpose | Why Chosen |
|------------|---------|---------|------------|
| **React.js** | 18.x | UI Framework | Component-based, large ecosystem |
| **TypeScript** | 5.x | Type Safety | Medical data integrity |
| **Tailwind CSS** | 3.x | Styling | Rapid development, responsive |
| **shadcn/ui** | Latest | UI Components | Accessible, customizable |
| **React Router** | 6.x | Navigation | Client-side routing |
| **Zustand** | 4.x | State Management | Lightweight, simple |
| **React Query** | 5.x | Server State | Caching, sync, background updates |
| **React Hook Form** | 7.x | Form Handling | Performance, validation |
| **Zod** | 3.x | Schema Validation | Type-safe validation |
| **Socket.io Client** | 4.x | Real-time | Notifications, telehealth |

---

### Why React.js?

**Validation:**

```
✅ COMPONENT-BASED ARCHITECTURE
   └── Reusable components across 5 different role dashboards
   └── Patient card, Report viewer, Pharma-check alert = reusable
   └── Easy maintenance and feature updates

✅ LARGE ECOSYSTEM
   └── QR code generators: react-qr-code
   └── Chart libraries: recharts (health data graphs)
   └── PDF viewer: react-pdf
   └── Video calls: Daily.co / Agora SDK

✅ PERFORMANCE
   └── Virtual DOM = fast UI updates
   └── Code splitting = faster initial load
   └── Critical for patients on slow rural connections

✅ FULL-STACK JAVASCRIPT
   └── Same language as backend (Node.js)
   └── Shared TypeScript types between client and server
   └── Faster development, less context switching

❌ ALTERNATIVES REJECTED
   Vue.js    → Smaller ecosystem, fewer medical UI libraries
   Angular   → Steeper learning curve, heavier bundle size
   Svelte    → Too new for enterprise healthcare application
```

---

### Why TypeScript?

**Validation:**

```
✅ TYPE SAFETY FOR HEALTHCARE - CRITICAL REQUIREMENT

   Without TypeScript (Runtime Error):
   ─────────────────────────────────────────
   patient.bloodGroup = 123;    // No error caught!
   prescription.dosage = "abc"; // Dangerous in healthcare!

   With TypeScript (Compile Time Error):
   ─────────────────────────────────────────
   type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'O+' | 'O-' | 'AB+' | 'AB-';

   interface Patient {
     uhid: string;
     bloodGroup: BloodGroup;   // Only valid blood groups!
     allergies: string[];
   }

   patient.bloodGroup = 123;   // Error caught at compile time ✅

✅ MEDICAL DATA INTEGRITY
   └── Correct data types for lab values (number not string)
   └── Validates UHID format before sending to server
   └── Prevents medication dosage errors

✅ BETTER DEVELOPER EXPERIENCE
   └── IntelliSense / autocomplete in VS Code
   └── Self-documenting code
   └── Catch bugs before deployment
```

---

### Why Tailwind CSS + shadcn/ui?

**Validation:**

```
✅ TAILWIND CSS
   └── Utility-first = no separate CSS files
   └── Responsive design built-in (sm: md: lg: breakpoints)
   └── Small bundle (PurgeCSS removes unused styles)
   └── Consistent spacing, colors across application

✅ SHADCN/UI
   └── WCAG Accessible (important for healthcare users)
   └── Keyboard navigation support
   └── Screen reader compatible
   └── Full control - no heavy dependency
   └── Professional, clean medical UI

❌ ALTERNATIVES REJECTED
   Bootstrap    → Dated look, larger bundle size
   Material UI  → Heavy, Google-style looks out of place
   Chakra UI    → Good but heavier than shadcn/ui
```

---

### Why Zustand over Redux?

**Validation:**

```
✅ ZUSTAND
   └── Only 1KB gzipped (Redux Toolkit = 10KB+)
   └── No boilerplate (actions, reducers, selectors)
   └── Simple API, easy for team to learn
   └── Redux DevTools compatible

   Example - Auth Store:
   ─────────────────────────────────────────
   const useAuthStore = create((set) => ({
     user: null,
     role: null,      // 'patient' | 'doctor' | 'hospital_staff' | 'admin' | 'insurance'
     uhid: null,
     login: (userData) => set({ user: userData, role: userData.role }),
     logout: () => set({ user: null, role: null, uhid: null })
   }));

❌ ALTERNATIVES REJECTED
   Redux Toolkit → Too much boilerplate for our project size
   Context API   → Performance issues with frequent updates
   Jotai         → Smaller community, less resources
```

---

## 2. Backend Stack

### Technologies

| Technology | Version | Purpose | Why Chosen |
|------------|---------|---------|------------|
| **Node.js** | 20 LTS | Runtime | Non-blocking I/O, JS ecosystem |
| **Express.js** | 4.x | Web Framework | Minimal, flexible, fast |
| **TypeScript** | 5.x | Type Safety | Shared types with frontend |
| **Prisma** | 5.x | ORM | Type-safe DB access |
| **JWT** | - | Access Tokens | Stateless authentication |
| **Argon2** | - | Password Hashing | More secure than bcrypt |
| **Multer** | - | File Upload | Handle medical document uploads |
| **Socket.io** | 4.x | Real-time | Notifications, consent alerts |
| **Node-cron** | - | Scheduled Tasks | Token cleanup, reminders |
| **Winston** | - | Logging | Audit trail logging |
| **Helmet.js** | - | Security Headers | HTTP security |
| **express-rate-limit** | - | Rate Limiting | Brute force prevention |

---

### Why Node.js + Express.js?

**Validation:**

```
✅ NON-BLOCKING I/O
   └── Handle multiple concurrent requests efficiently
   └── Multiple doctors accessing patient records simultaneously
   └── Real-time consent notifications without blocking
   └── File upload + DB write + AI call = concurrent

✅ JAVASCRIPT FULL STACK
   └── Same language frontend and backend
   └── Shared TypeScript interfaces:

   // Defined once in packages/shared/types.ts
   // Used in BOTH React frontend AND Express backend
   export interface MedicalRecord {
     id: string;
     uhid: string;
     type: 'lab_report' | 'imaging' | 'prescription' | 'discharge';
     uploadedBy: string;
     hospitalId: string;
     createdAt: Date;
   }

✅ PERFORMANCE
   └── ~15,000 requests/second (simple JSON)
   └── Fast enough for hospital-scale load

✅ NPM ECOSYSTEM
   └── QR generation: qrcode
   └── PDF creation: pdfkit
   └── File processing: sharp
   └── Email/SMS: nodemailer, @msg91/msg91-sdk

❌ ALTERNATIVES REJECTED
   Django (Python)     → Different language, slower I/O
   Spring Boot (Java)  → Heavy, long development time
   FastAPI (Python)    → Used for AI service specifically
```

---

### Why Prisma ORM?

**Validation:**

```
✅ TYPE-SAFE DATABASE ACCESS

   schema.prisma:
   ─────────────────────────────────────────
   model Patient {
     id          String         @id @default(uuid())
     uhid        String         @unique @db.Char(6)
     name        String
     bloodGroup  BloodGroup
     records     MedicalRecord[]
     consents    Consent[]
     createdAt   DateTime       @default(now())
   }

   Auto-generated TypeScript (fully typed):
   ─────────────────────────────────────────
   const patient = await prisma.patient.findUnique({
     where: { uhid: '847291' },
     include: {
       records: {
         where: { type: 'lab_report' },
         orderBy: { createdAt: 'desc' }
       }
     }
   });
   // patient.records[0].type → autocomplete works! ✅

✅ MIGRATION MANAGEMENT
   └── Version control for database schema
   └── prisma migrate dev → auto-generates SQL
   └── Easy rollback, team collaboration

✅ RELATION HANDLING
   └── Patient → MedicalRecords → LabValues
   └── Doctor → Prescriptions → Drugs
   └── Consent → Patient + Doctor + AccessScope

❌ ALTERNATIVES REJECTED
   TypeORM    → Inconsistent API, frequent bugs
   Sequelize  → Weak TypeScript support
   Raw SQL    → Error-prone, no type safety
```

---

## 3. Database Stack

### Technologies

| Technology | Version | Purpose | Data Stored |
|------------|---------|---------|-------------|
| **PostgreSQL** | 15.x | Primary Database | All structured data |
| **Redis** | 7.x | Cache + Sessions | Temporary, fast-access data |
| **Cloudinary** | Latest | File Storage | Medical documents, images (signed private URLs) |

---

### Why PostgreSQL?

**Validation:**

```
✅ ACID COMPLIANCE - CRITICAL FOR HEALTHCARE
   └── Atomicity:   Prescription saved fully or not at all
   └── Consistency: Data always valid, no partial writes
   └── Isolation:   2 doctors writing simultaneously = safe
   └── Durability:  Medical records survive server crashes

✅ JSONB SUPPORT
   └── Store flexible lab report extracted data:

   CREATE TABLE lab_reports (
     id           UUID PRIMARY KEY,
     patient_uhid CHAR(6) REFERENCES patients(uhid),
     report_type  VARCHAR(50),
     extracted    JSONB,    -- flexible structure per test type
     created_at   TIMESTAMP DEFAULT NOW()
   );

   -- Query specific values inside JSON:
   SELECT * FROM lab_reports
   WHERE extracted->>'hemoglobin' < '12.0';

✅ ROW-LEVEL SECURITY (RLS)
   └── Patients can only SELECT their own rows
   └── Database-level access control
   └── Extra security layer beyond application code

✅ FULL-TEXT SEARCH
   └── Search clinical notes
   └── Find records by diagnosis
   └── No need for Elasticsearch at this scale

✅ ENCRYPTION
   └── pgcrypto extension for field-level encryption
   └── Sensitive fields: Aadhaar, phone numbers
   └── HIPAA/DISHA compliance support

❌ ALTERNATIVES REJECTED
   MySQL       → Weaker JSONB, no row-level security
   MongoDB     → No ACID by default, schema-less = data risk
   SQL Server  → Expensive licensing, not open-source
```

---

### Why Redis?

**Validation:**

```
✅ USE CASES IN UHID

   1. DOCTOR-PATIENT SESSION (2-hour consultation window)
      ─────────────────────────────────────────
      Key:   session:doctor:DR-1234:patient:847291
      Value: { "access": "full", "grantedAt": "...", "expiresAt": "..." }
      TTL:   7200 seconds (2 hours)

   2. CONSENT OTP (5-minute validity)
      ─────────────────────────────────────────
      Key:   otp:consent:847291
      Value: "482910"
      TTL:   300 seconds (5 minutes)

   3. RATE LIMITING (Brute force on UHID lookup)
      ─────────────────────────────────────────
      Key:   rate:lookup:ip:192.168.1.1
      Value: 7  (request count)
      TTL:   60 seconds (reset every minute)
      Rule:  Block if > 10 requests/minute

   4. DRUG INTERACTION CACHE (Frequently accessed)
      ─────────────────────────────────────────
      Key:   drug:interactions:warfarin:aspirin
      Value: { "severity": "HIGH", "description": "..." }
      TTL:   86400 seconds (24 hours)

   5. EMERGENCY SOS NOTIFICATIONS
      ─────────────────────────────────────────
      Channel: sos:emergency:847291
      Pub/Sub for instant alert to nearby hospitals

✅ PERFORMANCE
   └── 100,000+ operations/second
   └── Sub-millisecond latency
   └── In-memory = instant access
```

---

### Why Cloudinary?

**Validation:**

```
✅ MEDICAL FILE STORAGE NEEDS
   Files we store:
   └── Lab Reports (PDF):      1 - 5 MB each
   └── X-Ray Images (JPEG):    5 - 20 MB each
   └── MRI/CT Scans (DICOM):   50 - 500 MB each
   └── Prescriptions (PDF):    100KB - 1MB each
   └── ECG Reports:            500KB - 2MB each

✅ FREE TIER SUFFICIENT FOR MVP
   └── 25 GB storage free
   └── 25 GB bandwidth free per month
   └── Sufficient for demo and initial patients

✅ PRIVATE SIGNED URLS (key requirement)
   └── All medical records stored as private assets
   └── Time-limited signed URLs (1-hour expiry)
   └── No direct public access to any medical file
   └── Access logged via Cloudinary analytics

✅ ZERO INFRASTRUCTURE TO MANAGE
   └── No MinIO binary to run and maintain
   └── No local port (9000) to worry about
   └── No S3 bucket policies to configure
   └── Works from day 1 with just 3 env vars

✅ FOLDER STRUCTURE (same logical layout)
   uhid-medical-storage/
   ├── lab-reports/{uhid}/{date}_{type}_{id}
   ├── imaging/{uhid}/{date}_{type}_{id}
   ├── prescriptions/{uhid}/{date}_rx_{doctor_id}
   ├── ecg/{uhid}/{date}_ecg
   └── profile-photos/{uhid}

✅ SECURITY
   └── Private uploads by default (type: "authenticated")
   └── Signed URLs for time-limited access
   └── HTTPS always enforced
   └── SDK handles multipart upload

❌ ALTERNATIVES REJECTED
   MinIO           → Requires running a local server binary (overhead for demo)
   AWS S3          → Requires AWS account, IAM roles, bucket policies
   Local FileSystem → No API, no replication, fails on deploy
```

---

## 4. AI/ML Stack

### Technologies

| Technology | Purpose | Why Chosen |
|------------|---------|------------|
| **Python 3.11+** | AI Service Runtime | Best AI/ML ecosystem |
| **FastAPI** | AI API Framework | Async, fast, auto docs |
| **OpenAI GPT-4o** | Report Decoder, Summaries | Best medical understanding |
| **Google Gemini 1.5** | Backup LLM | Cost-effective fallback |
| **Tesseract OCR** | Text from images | Free, good accuracy |
| **Google Vision API** | Premium OCR | Handwritten/poor quality |
| **spaCy / scispaCy** | Medical NLP | Medical entity extraction |
| **OpenFDA API** | Drug Interactions | Free, 100k req/day, no API key needed |
| **icd10-codes (npm)** | ICD-10 Code Lookup | Free, offline, ~70k codes |
| **MSG91** | OTP/SMS Delivery | Indian provider, 100 free SMS trial |

---

### Why Separate Python AI Service?

**Validation:**

```
✅ ARCHITECTURE
   ┌─────────────┐     REST API     ┌─────────────────────┐
   │  Node.js    │ ◄──────────────► │  Python FastAPI      │
   │  Backend    │                  │  AI Service          │
   └─────────────┘                  └─────────────────────┘

✅ PYTHON AI ECOSYSTEM
   └── OpenAI, LangChain, Transformers = Python-first
   └── Tesseract OCR = best Python bindings
   └── scispaCy = medical NLP, only in Python
   └── No equivalent libraries in Node.js

✅ INDEPENDENT SCALING
   └── AI tasks are CPU/GPU heavy
   └── Scale AI service independently
   └── Deploy on GPU instance only AI containers

✅ ISOLATION
   └── AI failures don't crash main application
   └── Update AI models without touching backend
   └── A/B test different LLM providers easily

✅ ASYNC PROCESSING
   └── OCR + AI summary = 5-10 seconds
   └── Queue-based processing (don't block user)
   └── Celery worker for background AI tasks
```

---

### AI Provider Strategy

```
REPORT DECODER & CLINICAL SUMMARY:
┌──────────────────────────────────────────────────────────────────┐
│  Provider        │ Cost/1K tokens │ Quality  │ Role             │
├──────────────────────────────────────────────────────────────────┤
│  OpenAI GPT-4o   │ $0.005         │ ⭐⭐⭐⭐⭐ │ Primary          │
│  Google Gemini   │ $0.001         │ ⭐⭐⭐⭐  │ Fallback/Cost    │
│  Local Llama 3   │ GPU cost       │ ⭐⭐⭐   │ Future (privacy) │
└──────────────────────────────────────────────────────────────────┘

OCR SERVICE:
┌──────────────────────────────────────────────────────────────────┐
│  Provider        │ Cost           │ Accuracy │ Use When         │
├──────────────────────────────────────────────────────────────────┤
│  Tesseract OCR   │ Free           │ ⭐⭐⭐   │ Default (printed)│
│  Google Vision   │ $1.5/1K images │ ⭐⭐⭐⭐⭐ │ Handwritten/poor │
└──────────────────────────────────────────────────────────────────┘

DRUG INTERACTION DATABASE:
┌──────────────────────────────────────────────────────────────────┐
│  Source          │ Cost           │ Coverage │ Role             │
├──────────────────────────────────────────────────────────────────┤
│  OpenFDA API     │ Free (100k/day)│ ⭐⭐⭐⭐⭐ │ Primary (chosen) │
│  icd10-codes npm │ Free, offline  │ ⭐⭐⭐⭐⭐ │ ICD-10 lookup    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 5. Infrastructure Stack

### Technologies

| Technology | Purpose | Why Chosen |
|------------|---------|------------|
| **GitHub** | Version Control + Backup | Free, industry standard |
| **GitHub Actions** | CI/CD (optional) | Auto-run tests on push |
| **concurrently** | Run all services locally | Single terminal command |
| **dotenv** | Environment variables | Manage API keys cleanly |

> ⚠️ **Note:** Docker is intentionally excluded from this project.  
> This is a college final year project demo presented to faculty evaluators.  
> Running services directly on the local machine is simpler, faster to set up,  
> and has no disadvantages for a single-machine demo environment.

---

### Local Development Setup

```
WHY NO DOCKER?
─────────────────────────────────────────────────────────────
❌ Docker adds complexity with zero demo benefit
❌ Evaluators don't care about containers
❌ Requires Docker Desktop installation on every machine
❌ Port conflicts, volume mounts, network debugging overhead
❌ Slower startup during live demo
❌ Overkill for single-machine college presentation

✅ WHAT WE DO INSTEAD
   Install once, run directly:

   PostgreSQL  → Install locally (Windows/Mac installer)
   Redis       → Install locally or use Memurai (Windows)
   Cloudinary  → No local install needed (cloud service)
   Node.js     → npm run dev  (in apps/api)
   Python      → uvicorn main:app  (in apps/ai-service)
   React       → npm run dev  (in apps/web)

✅ ONE COMMAND TO RUN EVERYTHING
   ─────────────────────────────────────────
   In root package.json (using concurrently):

   "dev": "concurrently
     \"npm run dev --workspace=apps/web\"
     \"npm run dev --workspace=apps/api\"
     \"python -m uvicorn main:app --reload\""

   Just run:  npm run dev
   ─────────────────────────────────────────

✅ SERVICES RUN ON:
   React Frontend    → http://localhost:5173
   Node.js Backend   → http://localhost:5000
   Python AI Service → http://localhost:8000
   PostgreSQL        → localhost:5432
   Redis             → localhost:6379
   Cloudinary        → cloud (no local port)
```

---

### Environment Variables

```
All API keys and config in a single .env file:
─────────────────────────────────────────────────────────────
.env (at project root, never committed to GitHub)

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/uhid_db
DIRECT_URL=postgresql://postgres:password@localhost:5432/uhid_db

# Redis
REDIS_URL=redis://localhost:6379

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# JWT (two separate secrets)
JWT_ACCESS_SECRET=your_access_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here

# SMS/OTP (MSG91)
MSG91_AUTH_KEY=your-msg91-auth-key
MSG91_SENDER_ID=UHIDOT
MSG91_TEMPLATE_ID=your-template-id

# Jitsi Video (REQUIRED)
JITSI_APP_ID=your-jitsi-app-id
JITSI_SECRET=your-jitsi-secret

# OpenAI
OPENAI_API_KEY=sk-...

# Google Vision (optional)
GOOGLE_VISION_KEY=...

# AI Internal Auth
INTERNAL_SERVICE_SECRET=random-shared-secret

# Encryption
ENCRYPTION_KEY=64-char-hex-for-aes-256-gcm
EMERGENCY_SECRET=random-secret-for-qr-jwt

.env.example → committed (shows what keys are needed, no values)
─────────────────────────────────────────────────────────────
```

---

## 6. Security Stack

### Technologies

| Technology | Purpose |
|------------|---------|
| **JWT (Access Token)** | 15-minute access tokens |
| **Refresh Tokens** | 7-day tokens stored in Redis |
| **Argon2** | Password hashing (stronger than bcrypt) |
| **AES-256-GCM** | Data encryption at rest |
| **TLS 1.3** | Encryption in transit |
| **Helmet.js** | HTTP security headers |
| **CORS** | Cross-origin request protection |
| **express-rate-limit** | API rate limiting |
| **Zod** | Input validation and sanitization |

---

### Security Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                    5-LAYER SECURITY MODEL                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  LAYER 1: TRANSPORT SECURITY                                     │
│  ├── TLS 1.3 enforced on all connections                        │
│  ├── HTTPS-only (HTTP redirected to HTTPS)                      │
│  ├── HSTS header (browser caches HTTPS requirement)             │
│  └── Certificate: Let's Encrypt (auto-renew)                   │
│                              │                                   │
│                              ▼                                   │
│  LAYER 2: APPLICATION SECURITY                                   │
│  ├── Helmet.js: CSP, X-Frame-Options, HSTS headers             │
│  ├── CORS: Whitelist only known frontend origins               │
│  ├── Rate Limiting: 100 requests/minute per IP                 │
│  ├── Input Validation: Zod schema on every endpoint            │
│  ├── SQL Injection: Prisma parameterized queries               │
│  └── XSS Protection: DOMPurify on frontend                     │
│                              │                                   │
│                              ▼                                   │
│  LAYER 3: AUTHENTICATION                                         │
│  ├── JWT access tokens (15 min expiry)                         │
│  ├── Refresh tokens (7 days, Redis-stored, rotated)            │
│  ├── Password: Argon2id hashing (memory-hard)                  │
│  ├── OTP: 6-digit, 5-minute TTL via Redis                     │
│  └── MFA: OTP required for sensitive actions                   │
│                              │                                   │
│                              ▼                                   │
│  LAYER 4: AUTHORIZATION                                          │
│  ├── RBAC: Role checked on every protected route               │
│  ├── Consent: Doctor access verified before record access      │
│  ├── Session: Doctor-patient session stored in Redis           │
│  └── Audit: Every access/modification logged                   │
│                              │                                   │
│                              ▼                                   │
│  LAYER 5: DATA SECURITY                                          │
│  ├── AES-256-GCM: Sensitive DB fields (Aadhaar, phone)        │
│  ├── Cloudinary: Private signed URLs for all medical files    │
│  ├── Pre-signed URLs: Time-limited file access (15 min)        │
│  └── Backup: Encrypted database snapshots                      │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

### Authentication Flow

```
LOGIN FLOW:
─────────────────────────────────────────────────────────────
1. User submits credentials
2. Server validates + checks Argon2 hash
3. Server issues:
   • Access Token  (JWT, 15 min, stored in memory)
   • Refresh Token (UUID, 7 days, HttpOnly cookie)
4. Access token stored in Zustand (NOT localStorage)
5. On expiry → Refresh token used to get new access token
6. On logout → Refresh token deleted from Redis

SENSITIVE ACTION FLOW (e.g. grant doctor access):
─────────────────────────────────────────────────────────────
1. Patient clicks "Approve Access"
2. Server sends OTP to patient's phone/email
3. OTP stored in Redis with 5-minute TTL
4. Patient enters OTP
5. Server validates OTP → grants consent
6. OTP deleted from Redis immediately after use
```

---

## 7. Platform Decision

### Web App vs Mobile App

```
┌─────────────────────────────────────────────────────────────────┐
│                    PLATFORM ANALYSIS                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ROLE              │ PRIMARY DEVICE    │ BEST PLATFORM          │
│  ─────────────────────────────────────────────────────────────  │
│  Hospital Staff    │ Desktop/Laptop    │ ✅ Web App             │
│  Doctor            │ Desktop + Tablet  │ ✅ Web App             │
│  Hospital Admin    │ Desktop           │ ✅ Web App             │
│  Insurance Agent   │ Desktop           │ ✅ Web App             │
│  Patient           │ Mobile Phone      │ 🔶 Web (PWA) now,     │
│                    │                   │    Native app later    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Decision: React.js (Web) Now, React Native Later

```
PHASE 1 - REACT.JS WEB APP (Final Year Project)
─────────────────────────────────────────────────────────────
✅ Covers all 5 user roles
✅ Responsive design works on mobile browser
✅ PWA (Progressive Web App) features:
   └── Installable on phone home screen
   └── Basic offline support
   └── Web push notifications
✅ Faster development (single codebase)
✅ Meets all core feature requirements

PHASE 2 - REACT NATIVE (Post Submission / Future Scope)
─────────────────────────────────────────────────────────────
🎯 Patient-only mobile app
✅ Emergency SOS with background GPS
✅ Native push notifications (even when app closed)
✅ QR scanning with native camera
✅ Lock screen emergency health card
✅ Works offline completely
✅ Same backend API (zero additional backend work)

WHY NOT REACT NATIVE NOW?
─────────────────────────────────────────────────────────────
❌ Hospital staff/admin/insurance need desktop experience
❌ Complex dashboards poor on small screen
❌ File uploads from mobile are complex
❌ Doubles development time for final year deadline
❌ Adds iOS/Android build complexity
```

---

## Tech Stack Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                    COMPLETE TECH STACK                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  FRONTEND                          BACKEND                       │
│  ├── React.js 18                   ├── Node.js 20 LTS            │
│  ├── TypeScript 5                  ├── Express.js 4              │
│  ├── Tailwind CSS 3                ├── TypeScript 5              │
│  ├── shadcn/ui                     ├── Prisma ORM 5              │
│  ├── Zustand (State)               ├── JWT + Argon2              │
│  ├── React Query (Server State)    ├── Socket.io 4               │
│  ├── React Hook Form + Zod         ├── Multer (Uploads)          │
│  └── React Router v6               └── Winston (Logging)         │
│                                                                   │
│  AI SERVICE                        DATABASES                     │
│  ├── Python 3.11                   ├── PostgreSQL 15             │
│  ├── FastAPI                       ├── Redis 7                   │
│  ├── OpenAI GPT-4o (Primary)       └── Cloudinary (Files)        │
│  ├── Google Gemini (Fallback)                                     │
│  ├── Tesseract OCR                 INFRASTRUCTURE                │
│  ├── Google Vision API             ├── Docker + Compose          │
│  ├── scispaCy (Medical NLP)        ├── Nginx                     │
│  ├── OpenFDA API (Drug Check)      ├── GitHub Actions (CI/CD)    │
│  ├── icd10-codes npm (ICD-10)      └── Let's Encrypt (SSL)       │
│  └── MSG91 (OTP/SMS)                                              │
│                                                                   │
│  SECURITY                          FUTURE (Post-Submission)      │
│  ├── TLS 1.3 (prod only)           ├── React Native (Patients)   │
│  ├── JWT + Refresh Tokens          ├── Docker + Nginx (deploy)   │
│  ├── Argon2 (Passwords)            ├── Local Llama (Privacy AI)  │
│  ├── AES-256-GCM (Encryption)      ├── Kubernetes (Scaling)      │
│  ├── Helmet.js + CORS              └── HL7/FHIR (Interop)        │
│  └── Rate Limiting + Zod                                          │
│                                                                   │
│  LOCAL DEV (No Docker needed)                                     │
│  ├── PostgreSQL (local install)                                   │
│  ├── Redis (local install or Memurai)                             │
│  ├── Cloudinary (cloud — no local binary)                         │
│  └── concurrently (run all 3 apps)                                │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Validation Checklist

| Requirement | Solution | Status |
|-------------|----------|:------:|
| Type-safe frontend | React + TypeScript | ✅ |
| Type-safe backend | Node.js + TypeScript + Prisma | ✅ |
| Medical data integrity | PostgreSQL ACID compliance | ✅ |
| Secure file storage | Cloudinary private signed URLs | ✅ |
| Fast caching & sessions | Redis | ✅ |
| AI report decoding | OpenAI GPT-4o + FastAPI | ✅ |
| OCR extraction | Tesseract + Google Vision | ✅ |
| Drug interaction check | OpenFDA API (free, 100k req/day) | ✅ |
| ICD-10 code lookup | icd10-codes npm (free, offline) | ✅ |
| OTP/SMS delivery | MSG91 (Indian provider, free trial) | ✅ |
| Real-time notifications | Socket.io + Redis Pub/Sub | ✅ |
| Multi-role access control | JWT + RBAC middleware | ✅ |
| Password security | Argon2id hashing | ✅ |
| Data encryption at rest | AES-256-GCM + pgcrypto | ✅ |
| Encryption in transit | TLS 1.3 via Nginx | ✅ |
| Brute force protection | Rate limiting + OTP | ✅ |
| Audit logging | Winston + PostgreSQL logs | ✅ |
| Easy local setup | Direct install + concurrently | ✅ |
| CI/CD pipeline | GitHub Actions (optional) | ✅ |
| Cost-effective | Open-source stack | ✅ |
| Scalable architecture | Microservices (Docker post-submission) | ✅ |
| Mobile accessibility | Responsive + PWA | ✅ |

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Feb 26, 2026 | Project Team | Initial tech stack documentation |

---

*This document covers all technology decisions for UniHealth ID. Implementation and phase planning documented in phases.md*
