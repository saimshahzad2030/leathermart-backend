# Atelier Valenti Milano — Backend REST API Server

Production-ready, high-performance Node.js & Express REST API server powered by **Prisma ORM**, **Supabase PostgreSQL**, and **Supabase Storage** for **Atelier Valenti Milano**, European luxury leather outerwear e-commerce and bespoke atelier.

---

## Architecture & Technology Stack

* **Runtime:** Node.js (ES Modules)
* **Framework:** Express.js 4
* **ORM:** Prisma ORM (`@prisma/client` & `prisma`)
* **Database:** Supabase PostgreSQL (Normalized relational tables, UUID primary keys, foreign keys, triggers, and indexes)
* **Storage:** Supabase Storage (with fallback to local disk uploads)
* **Authentication:** JWT (JSON Web Tokens) + HttpOnly Secure Cookies + Bcrypt password hashing
* **Role-Based Access Control (RBAC):** `super_admin`, `store_manager`, `content_editor`, `concierge`
* **Validation:** Zod 3 schemas on all requests (body, query, params)
* **Security:** Helmet, CORS, Express Rate Limiting, Row Level Security (RLS) SQL policies
* **Media Uploads:** Multer with file type & size limit validation, Supabase Storage integration with CDN path abstraction
* **Testing:** Vitest + Supertest (100% automated test execution)

### Architecture Flow
```text
Express.js Controllers
       ↓
Services Layer
       ↓
Prisma ORM (@prisma/client)
       ↓
Supabase PostgreSQL
(Supabase Storage for media files)
```

---

## Directory Structure

```text
leathermart-server/
├── prisma/
│   └── schema.prisma        # Complete Prisma schema with 21 normalized models
├── src/
│   ├── config/              # Environment config, constants, Supabase storage
│   ├── controllers/         # Thin request/response handlers
│   ├── lib/                 # Prisma client singleton & connection health check
│   ├── middlewares/         # Auth, validation, rate limiting, error handling, upload
│   ├── routes/              # Public (/v1/*) & Admin (/v1/admin/*) endpoints
│   ├── scripts/             # Database seed script via Prisma (npm run seed)
│   ├── services/            # Core business logic powered by Prisma ORM
│   ├── utils/               # ApiResponse envelope, safe logger, camelCase mapper
│   ├── validators/          # Zod schema definitions
│   ├── app.js               # Express application configuration
│   └── server.js            # Server entrypoint with graceful shutdown
├── supabase/
│   ├── migrations/          # PostgreSQL migrations
│   └── seed.sql             # Pure SQL database seed
├── tests/                   # Vitest automated integration test suite (20 tests)
├── uploads/                 # Local fallback storage for media assets
├── .env.example             # Environment variable template
├── API_DOCUMENTATION.md     # Complete REST API reference
└── README.md
```

---

## Quick Start

### 1. Installation
```bash
cd leathermart-server
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Configure your PostgreSQL database and Supabase credentials in `.env`:
```env
# Database connection (Supabase PostgreSQL via Prisma)
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres?sslmode=require"
DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres?sslmode=require"

# Supabase Storage (for media asset uploads)
SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key-here
SUPABASE_STORAGE_BUCKET=media

# JWT & Server
PORT=5000
JWT_SECRET=super_secret_jwt_key_at_least_32_characters_long
```

### 3. Generate Prisma Client
```bash
npm run prisma:generate
```

### 4. Seed Database
Seed the database with initial luxury garments, categories, CMS sections, bespoke options, and super-admin:
```bash
npm run seed
```

**Default Admin Credentials:**
* **Email:** `admin@ateliervalenti.com`
* **Password:** `AtelierValenti2026!`

### 5. Run Development Server
```bash
npm run dev
```

Server starts at: `http://localhost:5000`  
Health check endpoint: `http://localhost:5000/api/health`

### 6. Run Automated Tests
```bash
npm test
```

### 7. Prisma Studio (Visual DB Browser)
```bash
npm run prisma:studio
```

---

## Core Features

1. **Public Storefront APIs:**
   * Filtered & paginated catalogue with text search, facet attribute counts, and sorting.
   * Single product PDP with full variants, care instructions, and customer reviews.
   * Homepage single-roundtrip aggregation (`GET /api/v1/content/homepage`).
   * Bespoke Configurator & Studio commission registration with automated dossier numbering (`AV-2026-C001`).
   * Dynamic SEO & OpenGraph metadata generation for all routes (`GET /api/v1/seo/metadata`).

2. **Protected Admin Management:**
   * Role-Based Access Control for Store Managers, Content Editors, and Atelier Concierges.
   * Garment specification CRUD, duplicate-to-draft, reordering, and bulk publishing.
   * Category hierarchy & capsule lookbook management.
   * Modular Homepage CMS Builder: customize copy, CTAs, macro photography, and toggle section visibility.
   * Review moderation queue (approve/reject).
   * Media asset upload dropzone and asset management with Supabase Storage.
   * Bespoke commission pipeline: transition statuses (`pending` -> `contacted` -> `in_tailoring` -> `completed`).

---

## License

Private and proprietary to Atelier Valenti Milano.
