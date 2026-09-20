# Atelier Valenti Milano — Complete Backend REST API Documentation
> **Target Audience:** Frontend Engineering Agents & Developers implementing the **Admin Panel** and **Storefront**  
> **Source-of-Truth Contract:** Derived directly from the active Node.js / Express / Prisma / PostgreSQL codebase.  
> **Backend Code State:** Read-only inspection complete. Zero backend code was altered.

---

## 1. Backend Overview & Architecture

Atelier Valenti Milano is a luxury Italian leather outerwear e-commerce backend built with **Node.js (ES Modules)**, **Express 4.21**, **Prisma ORM 6.19**, and **PostgreSQL (hosted on Supabase)**. It provides a headless REST API powering both the luxury public storefront and a comprehensive back-office Admin Panel.

### Architectural Flow
Every incoming request traverses a strict, unidirectional pipeline:
```text
HTTP Request
  │
  ▼
[Express Global Middlewares] (Helmet, CORS, Compression, JSON/URLencoded body parsers, CookieParser, Morgan)
  │
  ▼
[Rate Limiting] (apiRateLimiter / authRateLimiter)
  │
  ▼
[Route Matcher] (src/routes/index.js -> public.routes.js / admin.routes.js)
  │
  ▼
[Security Middlewares] (authenticate -> authorize(allowedRoles))
  │
  ▼
[Validation Middleware] (validate(ZodSchema, 'body' | 'query'))
  │
  ▼
[Controller Layer] (HTTP input extraction, status code selection, standard envelope dispatch)
  │
  ▼
[Service Layer] (Business logic, transactions, normalization, calculations, slug generation)
  │
  ▼
[Prisma ORM / Supabase Client] (PostgreSQL queries, relations, cascade rules)
  │
  ▼
[Response Mapper] (mapper.js snake_case to camelCase conversion, decimal formatting)
  │
  ▼
[Global Error Handler] (Catches PostgreSQL errors 23505/22P02, Multer errors, Zod validation errors, JWT expirations)
  │
  ▼
HTTP JSON Response Envelope
```

---

## 2. Base URL, API Prefixes & Host Configuration

### Base URLs
* **Production Base URL:** `NOT DEFINED IN BACKEND` (Configured via deployment environment variables)
* **Local Development Base URL:** `http://localhost:5000` (Default `PORT=5000` in `src/config/env.js`)
* **Primary API Prefix (Recommended for Admin Panel):** `/api/v1`
* **Compatibility Alias Prefix:** `/api` (Mounts the exact same routers directly)
* **Static Assets URL:** `http://localhost:5000/uploads/:filename` (Served via Express static middleware from local `uploads/` directory)

### Route Mounting Hierarchy
```text
/ (GET)                                 --> Root greeting message & version
/uploads/*                              --> Static file server for local media
/api/health (GET)                       --> System & database connectivity health check
/api/v1/admin/*                         --> Admin panel endpoints (Auth, Products, CMS, etc.)
/api/v1/*                               --> Storefront public endpoints (Catalogue, Content, etc.)
/api/admin/*                            --> Backward compatibility alias for /api/v1/admin/*
/api/*                                  --> Backward compatibility alias for /api/v1/*
```

---

## 3. Authentication System

Authentication is built around **JSON Web Tokens (JWT)** with dual-storage support (Authorization header or HttpOnly Cookies) and persistent database-backed refresh token rotation.

### How It Works
1. **Credentials:** Admin logs in using email and password via `POST /api/v1/admin/auth/login`. Passwords are verified using `bcryptjs` against the `admin_users.password_hash` column.
2. **Access Tokens:** Signed with `JWT_SECRET`, valid for `7d` (configured via `env.JWT_EXPIRES_IN`). Token payload:
   ```json
   {
     "id": "uuid",
     "email": "admin@ateliervalenti.com",
     "role": "super_admin",
     "permissions": ["*"],
     "iat": 1740000000,
     "exp": 1740604800
   }
   ```
3. **Refresh Tokens:** Signed with `JWT_REFRESH_SECRET`, valid for `30d` (configured via `env.JWT_REFRESH_EXPIRES_IN`). Stored in the PostgreSQL `refresh_tokens` table with expiration timestamp.
4. **Cookie & Header Delivery:** On successful login or token refresh, the server sets **both** HttpOnly cookies and returns the raw tokens in the JSON payload:
   * Cookie `token`: Contains `accessToken` (`httpOnly: true`, `secure: production`, `sameSite: 'lax'`, `maxAge: 7 days`)
   * Cookie `refreshToken`: Contains `refreshToken` (`httpOnly: true`, `secure: production`, `sameSite: 'lax'`, `maxAge: 30 days`)
   * JSON Response: `{ accessToken, refreshToken, admin: { ... } }`
5. **How Frontend Must Authenticate:**
   * **Option A (Header - Recommended for SPAs / Axios):** Pass `Authorization: Bearer <accessToken>` header on all protected requests.
   * **Option B (Cookies - Browser Native):** Configure `withCredentials: true` (or `credentials: 'include'` in `fetch`). The backend `authenticate` middleware inspects `req.headers.authorization` first, falling back to `req.cookies.token` or `req.cookies.accessToken`.
6. **Token Expiration Behavior:**
   * If an expired access token is sent, the server responds with HTTP **401 Unauthorized** and `errorCode: "ERR_TOKEN_EXPIRED"`.
   * The frontend should intercept this error, call `POST /api/v1/admin/auth/refresh` (sending the `refreshToken` in request body or via cookie), receive a new access token and rotated refresh token, and replay the original request.
7. **Unauthenticated / Unauthorized Requests:**
   * Missing token: HTTP **401 Unauthorized** (`errorCode: "ERR_UNAUTHORIZED"`).
   * Deactivated account: HTTP **403 Forbidden** (`errorCode: "ERR_FORBIDDEN"`, message: *"Admin account has been deactivated"*).
   * Role lacking required privilege: HTTP **403 Forbidden** (`errorCode: "ERR_FORBIDDEN"`, message: *"You do not have the required permissions to perform this operation"*).

---

## 4. Authorization & Role-Based Access Control (RBAC)

The backend defines four distinct administrative roles in `src/config/constants.js`:

```javascript
export const ROLES = {
  SUPER_ADMIN: 'super_admin',       // Full system access, bypasses all role checks
  STORE_MANAGER: 'store_manager',   // Catalogue, Inventory, Categories, Commissions, Settings
  CONTENT_EDITOR: 'content_editor', // CMS Sections, Testimonials, Social Looks, Mega Menu
  CONCIERGE: 'concierge',           // Bespoke Commissions and Client Dossier management
};
```

### Role Matrix
| Resource / Area | `super_admin` | `store_manager` | `content_editor` | `concierge` |
|---|:---:|:---:|:---:|:---:|
| **Auth & Profile (`/auth/me`, `/change-password`)** | ✅ | ✅ | ✅ | ✅ |
| **Admin Users Management (`/users`)** | ✅ | ❌ | ❌ | ❌ |
| **Products (Create, Edit, Delete, Duplicate, Bulk, Reorder)** | ✅ | ✅ | ❌ | ❌ |
| **Products (Toggle Publish Status)** | ✅ | ✅ | ✅ | ❌ |
| **Review Moderation (Approve / Reject)** | ✅ | ✅ | ✅ | ❌ |
| **Review Deletion** | ✅ | ✅ | ❌ | ❌ |
| **Categories & Collections (Create, Update, Delete, Reorder)** | ✅ | ✅ | ❌ | ❌ |
| **CMS Homepage Sections (Update, Visibility, Reorder)** | ✅ | ❌ | ✅ | ❌ |
| **Testimonials & Social Looks (Create, Update, Delete, Reorder)** | ✅ | ❌ | ✅ | ❌ |
| **Newsletter Subscribers (List)** | ✅ | ✅ | ✅ | ✅ |
| **Commissions (List & View Dossiers)** | ✅ | ✅ | ✅ | ✅ |
| **Commissions (Update Status & Bulk Status)** | ✅ | ✅ | ❌ | ✅ |
| **Bespoke Custom Studio Options CRUD** | ✅ | ✅ | ✅ | ✅ |
| **Global Settings (`/settings` PATCH)** | ✅ | ✅ | ❌ | ❌ |
| **Search Keywords (`/settings/search-keywords` PUT)** | ✅ | ✅ | ✅ | ❌ |
| **Mega Menu (`/navigation/mega-menu/:menuKey` PUT)** | ✅ | ❌ | ✅ | ❌ |
| **Media Upload & Media Listing** | ✅ | ✅ | ✅ | ✅ |
| **Media Asset Deletion** | ✅ | ✅ | ❌ | ❌ |

> **Special Rule:** The `SUPER_ADMIN` role automatically bypasses every authorization check (`if (req.admin.role === ROLES.SUPER_ADMIN) return next()`).

---

## 5. Standard Response & Error Envelopes

Every API response follows a consistent envelope produced by `src/utils/apiResponse.js`.

### 5.1 Success Response Envelopes

#### Standard Object / Action Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

#### Paginated List Response
```json
{
  "success": true,
  "message": "Products retrieved successfully",
  "data": [ ... ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalCount": 58,
    "limit": 12,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```
*(Note: Some endpoints return pagination inside `data.pagination` or alongside `data` depending on controller method; see exact schemas below).*

### 5.2 Error Response Envelopes

#### Standard Error Envelope
```json
{
  "success": false,
  "message": "Error description",
  "errorCode": "ERR_CODE_IDENTIFIER",
  "statusCode": 400
}
```

#### Validation Error Envelope (HTTP 422 Unprocessable Entity)
When Zod schema validation fails via `validate.js`:
```json
{
  "success": false,
  "message": "Validation failed on submitted payload",
  "errors": {
    "name": ["Product name must have at least 2 characters"],
    "price": ["Price must be a positive number in EUR"],
    "sku": ["String must contain at least 3 character(s)"]
  },
  "errorCode": "ERR_VALIDATION_FAILED",
  "statusCode": 422
}
```

### 5.3 Error Codes Reference Table
| Status Code | Error Code (`errorCode`) | Condition / Cause |
|---|---|---|
| **400 Bad Request** | `ERR_NO_FILE` | Upload endpoint called without multipart file |
| **400 Bad Request** | `ERR_INVALID_FILE_TYPE` | Uploaded file MIME type not in permitted list |
| **400 Bad Request** | `ERR_UPLOAD_FAILED` | Multer error (e.g. file exceeds 10MB limit) |
| **400 Bad Request** | `ERR_INVALID_ID` | PostgreSQL 22P02 invalid UUID format in path parameter |
| **400 Bad Request** | `ERR_INCORRECT_PASSWORD` | Current password mismatch in password change |
| **400 Bad Request** | `ERR_REFRESH_TOKEN_REQUIRED` | Missing refresh token on `/admin/auth/refresh` |
| **401 Unauthorized** | `ERR_UNAUTHORIZED` | Missing authentication token or admin revoked |
| **401 Unauthorized** | `ERR_INVALID_TOKEN` | Malformed or unverified JWT access token |
| **401 Unauthorized** | `ERR_TOKEN_EXPIRED` | Expired access token (frontend should call refresh) |
| **401 Unauthorized** | `ERR_INVALID_CREDENTIALS` | Incorrect email or password during login |
| **401 Unauthorized** | `ERR_INVALID_REFRESH_TOKEN` | Refresh token expired, revoked, or not in database |
| **403 Forbidden** | `ERR_FORBIDDEN` | Authenticated user lacks required administrative role |
| **403 Forbidden** | `ERR_ACCOUNT_DEACTIVATED` | User account has `isActive = false` |
| **404 Not Found** | `ERR_ENDPOINT_NOT_FOUND` | URL does not match any registered Express route |
| **404 Not Found** | `ERR_INTERNAL_SERVER` | Requested resource ID/slug not found in PostgreSQL |
| **409 Conflict** | `ERR_DUPLICATE_RECORD` | PostgreSQL 23505 unique constraint violation |
| **409 Conflict** | `ERR_DUPLICATE_EMAIL` | Admin user email already exists |
| **409 Conflict** | `ERR_DUPLICATE_PRODUCT` | Product SKU or slug already exists |
| **409 Conflict** | `ERR_DUPLICATE_SLUG` | Category or Collection slug already exists |
| **422 Unprocessable Entity** | `ERR_VALIDATION_FAILED` | Request payload fails Zod schema validation |
| **429 Too Many Requests** | `ERR_RATE_LIMIT_EXCEEDED` | Exceeded general rate limit (1000 req / 15 min) |
| **429 Too Many Requests** | `ERR_AUTH_RATE_LIMIT` | Exceeded login rate limit (20 attempts / 15 min) |
| **500 Internal Server Error** | `ERR_INTERNAL_SERVER` | Uncaught exception handled by centralized error middleware |

---

## 6. Master API Inventory

| # | Method | Path | Resource Group | Auth Required | Allowed Roles | Usability Status |
|:---:|:---:|---|---|:---:|:---:|:---:|
| 1 | `GET` | `/` | Root Greeting | Public | None | Operational |
| 2 | `GET` | `/api/health` | System Health | Public | None | Operational |
| 3 | `GET` | `/api/v1/content/homepage` | Storefront CMS | Public | None | Operational |
| 4 | `GET` | `/api/v1/content/navigation` | Storefront Navigation | Public | None | Operational |
| 5 | `GET` | `/api/v1/settings/footer` | Storefront Settings | Public | None | Operational |
| 6 | `GET` | `/api/v1/settings/announcement` | Storefront Settings | Public | None | Operational |
| 7 | `GET` | `/api/v1/settings/shipping` | Storefront Settings | Public | None | Operational |
| 8 | `GET` | `/api/v1/settings/search-keywords` | Storefront Settings | Public | None | Operational |
| 9 | `GET` | `/api/v1/seo/metadata` | Storefront SEO | Public | None | Operational |
| 10 | `GET` | `/api/v1/products` | Products | Public | None | Operational |
| 11 | `GET` | `/api/v1/products/facets` | Products | Public | None | Operational |
| 12 | `GET` | `/api/v1/products/search` | Products | Public | None | Operational |
| 13 | `GET` | `/api/v1/products/:slug` | Products | Public | None | Operational |
| 14 | `GET` | `/api/v1/products/:slug/reviews` | Products | Public | None | Operational |
| 15 | `POST` | `/api/v1/products/:id/reviews` | Products | Public | None | Operational |
| 16 | `GET` | `/api/v1/products/:slug/related` | Products | Public | None | Operational |
| 17 | `GET` | `/api/v1/categories` | Categories | Public | None | Operational |
| 18 | `GET` | `/api/v1/categories/:slug` | Categories | Public | None | Operational |
| 19 | `GET` | `/api/v1/collections` | Collections | Public | None | Operational |
| 20 | `GET` | `/api/v1/customization/options` | Bespoke Studio | Public | None | Operational |
| 21 | `POST` | `/api/v1/customization/commissions` | Bespoke Studio | Public | None | Operational |
| 22 | `POST` | `/api/v1/newsletter/subscribe` | Newsletter | Public | None | Operational |
| 23 | `GET` | `/api/v1/testimonials` | Social Proof | Public | None | Operational |
| 24 | `GET` | `/api/v1/social-looks` | Social Proof | Public | None | Operational |
| 25 | `POST` | `/api/v1/admin/auth/login` | Admin Auth | Public | None | Operational (Rate limited) |
| 26 | `POST` | `/api/v1/admin/auth/refresh` | Admin Auth | Public | None | Operational |
| 27 | `POST` | `/api/v1/admin/auth/logout` | Admin Auth | Public | None | Operational |
| 28 | `GET` | `/api/v1/admin/auth/me` | Admin Auth | JWT Required | All Admin Roles | Operational |
| 29 | `POST` | `/api/v1/admin/auth/change-password` | Admin Auth | JWT Required | All Admin Roles | Operational |
| 30 | `GET` | `/api/v1/admin/users` | Admin Users | JWT Required | `super_admin` | Operational |
| 31 | `POST` | `/api/v1/admin/users` | Admin Users | JWT Required | `super_admin` | Operational |
| 32 | `PUT` | `/api/v1/admin/users/:id` | Admin Users | JWT Required | `super_admin` | Operational |
| 33 | `DELETE` | `/api/v1/admin/users/:id` | Admin Users | JWT Required | `super_admin` | Operational |
| 34 | `GET` | `/api/v1/admin/products` | Admin Catalogue | JWT Required | All Admin Roles | Operational |
| 35 | `POST` | `/api/v1/admin/products` | Admin Catalogue | JWT Required | `super_admin`, `store_manager` | Operational |
| 36 | `GET` | `/api/v1/admin/products/:id` | Admin Catalogue | JWT Required | All Admin Roles | Operational |
| 37 | `PUT` | `/api/v1/admin/products/:id` | Admin Catalogue | JWT Required | `super_admin`, `store_manager` | Operational |
| 38 | `PATCH` | `/api/v1/admin/products/:id` | Admin Catalogue | JWT Required | `super_admin`, `store_manager` | Operational |
| 39 | `DELETE` | `/api/v1/admin/products/:id` | Admin Catalogue | JWT Required | `super_admin`, `store_manager` | Operational |
| 40 | `POST` | `/api/v1/admin/products/:id/publish` | Admin Catalogue | JWT Required | `super_admin`, `store_manager`, `content_editor` | Operational |
| 41 | `POST` | `/api/v1/admin/products/:id/duplicate` | Admin Catalogue | JWT Required | `super_admin`, `store_manager` | Operational |
| 42 | `POST` | `/api/v1/admin/products/bulk` | Admin Catalogue | JWT Required | `super_admin`, `store_manager` | Operational |
| 43 | `PUT` | `/api/v1/admin/products/reorder` | Admin Catalogue | JWT Required | `super_admin`, `store_manager` | Operational |
| 44 | `GET` | `/api/v1/admin/reviews` | Review Moderation | JWT Required | All Admin Roles | Operational |
| 45 | `PATCH` | `/api/v1/admin/reviews/:id/approve` | Review Moderation | JWT Required | `super_admin`, `store_manager`, `content_editor` | Operational |
| 46 | `DELETE` | `/api/v1/admin/reviews/:id` | Review Moderation | JWT Required | `super_admin`, `store_manager` | Operational |
| 47 | `GET` | `/api/v1/admin/categories` | Categories | JWT Required | All Admin Roles | Operational |
| 48 | `POST` | `/api/v1/admin/categories` | Categories | JWT Required | `super_admin`, `store_manager` | Operational |
| 49 | `PUT` | `/api/v1/admin/categories/:id` | Categories | JWT Required | `super_admin`, `store_manager` | Operational |
| 50 | `DELETE` | `/api/v1/admin/categories/:id` | Categories | JWT Required | `super_admin`, `store_manager` | Operational |
| 51 | `PUT` | `/api/v1/admin/categories/reorder` | Categories | JWT Required | `super_admin`, `store_manager` | Operational |
| 52 | `GET` | `/api/v1/admin/collections` | Collections | JWT Required | All Admin Roles | Operational |
| 53 | `POST` | `/api/v1/admin/collections` | Collections | JWT Required | `super_admin`, `store_manager` | Operational |
| 54 | `PUT` | `/api/v1/admin/collections/:id` | Collections | JWT Required | `super_admin`, `store_manager` | Operational |
| 55 | `DELETE` | `/api/v1/admin/collections/:id` | Collections | JWT Required | `super_admin`, `store_manager` | Operational |
| 56 | `GET` | `/api/v1/admin/cms/sections` | CMS Sections | JWT Required | All Admin Roles | Operational |
| 57 | `GET` | `/api/v1/admin/cms/sections/:sectionKey` | CMS Sections | JWT Required | All Admin Roles | Operational |
| 58 | `PUT` | `/api/v1/admin/cms/sections/:sectionKey` | CMS Sections | JWT Required | `super_admin`, `content_editor` | Operational |
| 59 | `PATCH` | `/api/v1/admin/cms/sections/:sectionKey/visibility` | CMS Sections | JWT Required | `super_admin`, `content_editor` | Operational |
| 60 | `PUT` | `/api/v1/admin/cms/sections/reorder` | CMS Sections | JWT Required | `super_admin`, `content_editor` | Operational |
| 61 | `GET` | `/api/v1/admin/testimonials` | Testimonials | JWT Required | All Admin Roles | Operational |
| 62 | `POST` | `/api/v1/admin/testimonials` | Testimonials | JWT Required | `super_admin`, `content_editor` | Operational |
| 63 | `PUT` | `/api/v1/admin/testimonials/:id` | Testimonials | JWT Required | `super_admin`, `content_editor` | Operational |
| 64 | `DELETE` | `/api/v1/admin/testimonials/:id` | Testimonials | JWT Required | `super_admin`, `content_editor` | Operational |
| 65 | `PUT` | `/api/v1/admin/testimonials/reorder` | Testimonials | JWT Required | `super_admin`, `content_editor` | Operational |
| 66 | `GET` | `/api/v1/admin/social-looks` | Social Looks | JWT Required | All Admin Roles | Operational |
| 67 | `POST` | `/api/v1/admin/social-looks` | Social Looks | JWT Required | `super_admin`, `content_editor` | Operational |
| 68 | `PUT` | `/api/v1/admin/social-looks/:id` | Social Looks | JWT Required | `super_admin`, `content_editor` | Operational |
| 69 | `DELETE` | `/api/v1/admin/social-looks/:id` | Social Looks | JWT Required | `super_admin`, `content_editor` | Operational |
| 70 | `PUT` | `/api/v1/admin/social-looks/reorder` | Social Looks | JWT Required | `super_admin`, `content_editor` | Operational |
| 71 | `GET` | `/api/v1/admin/subscribers` | Subscribers | JWT Required | All Admin Roles | Operational |
| 72 | `GET` | `/api/v1/admin/commissions` | Commissions | JWT Required | All Admin Roles | Operational |
| 73 | `GET` | `/api/v1/admin/commissions/:id` | Commissions | JWT Required | All Admin Roles | Operational |
| 74 | `PATCH` | `/api/v1/admin/commissions/:id/status` | Commissions | JWT Required | `super_admin`, `store_manager`, `concierge` | Operational |
| 75 | `POST` | `/api/v1/admin/commissions/bulk-status` | Commissions | JWT Required | `super_admin`, `store_manager`, `concierge` | Operational |
| 76 | `POST` | `/api/v1/admin/customization/silhouettes` | Bespoke Studio Options | JWT Required | All Admin Roles | Operational |
| 77 | `PUT` | `/api/v1/admin/customization/silhouettes/:id` | Bespoke Studio Options | JWT Required | All Admin Roles | Operational |
| 78 | `DELETE` | `/api/v1/admin/customization/silhouettes/:id` | Bespoke Studio Options | JWT Required | All Admin Roles | Operational |
| 79 | `POST` | `/api/v1/admin/customization/leathers` | Bespoke Studio Options | JWT Required | All Admin Roles | Operational |
| 80 | `PUT` | `/api/v1/admin/customization/leathers/:id` | Bespoke Studio Options | JWT Required | All Admin Roles | Operational |
| 81 | `DELETE` | `/api/v1/admin/customization/leathers/:id` | Bespoke Studio Options | JWT Required | All Admin Roles | Operational |
| 82 | `POST` | `/api/v1/admin/customization/colors` | Bespoke Studio Options | JWT Required | All Admin Roles | Operational |
| 83 | `PUT` | `/api/v1/admin/customization/colors/:id` | Bespoke Studio Options | JWT Required | All Admin Roles | Operational |
| 84 | `DELETE` | `/api/v1/admin/customization/colors/:id` | Bespoke Studio Options | JWT Required | All Admin Roles | Operational |
| 85 | `POST` | `/api/v1/admin/customization/linings` | Bespoke Studio Options | JWT Required | All Admin Roles | Operational |
| 86 | `PUT` | `/api/v1/admin/customization/linings/:id` | Bespoke Studio Options | JWT Required | All Admin Roles | Operational |
| 87 | `DELETE` | `/api/v1/admin/customization/linings/:id` | Bespoke Studio Options | JWT Required | All Admin Roles | Operational |
| 88 | `POST` | `/api/v1/admin/customization/hardware` | Bespoke Studio Options | JWT Required | All Admin Roles | Operational |
| 89 | `PUT` | `/api/v1/admin/customization/hardware/:id` | Bespoke Studio Options | JWT Required | All Admin Roles | Operational |
| 90 | `DELETE` | `/api/v1/admin/customization/hardware/:id` | Bespoke Studio Options | JWT Required | All Admin Roles | Operational |
| 91 | `GET` | `/api/v1/admin/settings` | Settings | JWT Required | All Admin Roles | Operational |
| 92 | `PATCH` | `/api/v1/admin/settings` | Settings | JWT Required | `super_admin`, `store_manager` | Operational |
| 93 | `PUT` | `/api/v1/admin/settings/search-keywords` | Settings | JWT Required | `super_admin`, `store_manager`, `content_editor` | Operational |
| 94 | `GET` | `/api/v1/admin/navigation/mega-menu` | Navigation Menus | JWT Required | All Admin Roles | Operational |
| 95 | `PUT` | `/api/v1/admin/navigation/mega-menu/:menuKey` | Navigation Menus | JWT Required | `super_admin`, `content_editor` | Operational |
| 96 | `POST` | `/api/v1/admin/media/upload` | Media Library | JWT Required | All Admin Roles | Operational (Multipart) |
| 97 | `GET` | `/api/v1/admin/media` | Media Library | JWT Required | All Admin Roles | Operational |
| 98 | `DELETE` | `/api/v1/admin/media/:id` | Media Library | JWT Required | `super_admin`, `store_manager` | Operational |

---

## 7. Detailed Endpoint Documentation

Each endpoint below traces:  
**Route → Middlewares → Controller → Service → Database Model → Response**

---

### 7.1 Authentication & Profile APIs

#### `POST /api/v1/admin/auth/login`
* **Route File:** `src/routes/admin.routes.js`
* **Controller:** `AuthController.login`
* **Service:** `AuthService.login`
* **Model:** `AdminUser`, `RefreshToken`
* **Purpose:** Authenticates an administrator with email and password, generates JWT token pair, records login timestamp, persists refresh token, and sets secure HttpOnly cookies.
* **Authentication:** Public (Protected by `authRateLimiter` - 20 attempts / 15 min).
* **Role:** None.
* **Headers:** `Content-Type: application/json`
* **Request Body:**
  | Field | Type | Required | Allowed Values / Validation | Example |
  |---|---|---|---|---|
  | `email` | String | Yes | Valid email format, non-empty | `"admin@ateliervalenti.com"` |
  | `password` | String | Yes | Min length 1 | `"AtelierValenti2026!"` |
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Admin authenticated successfully",
    "data": {
      "admin": {
        "id": "a1111111-1111-1111-1111-111111111111",
        "_id": "a1111111-1111-1111-1111-111111111111",
        "email": "admin@ateliervalenti.com",
        "firstName": "Alessandro",
        "lastName": "Valenti",
        "role": "super_admin",
        "permissions": ["*"],
        "lastLoginAt": "2026-09-20T14:30:00.000Z"
      },
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
  ```
* **Set-Cookie Headers:**
  * `token=<accessToken>; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`
  * `refreshToken=<refreshToken>; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`
* **Error Responses:**
  * `401 Unauthorized` (`errorCode: "ERR_INVALID_CREDENTIALS"`) when password or email is incorrect.
  * `403 Forbidden` (`errorCode: "ERR_ACCOUNT_DEACTIVATED"`) when `isActive: false`.
  * `422 Unprocessable Entity` (`errorCode: "ERR_VALIDATION_FAILED"`) when schema validation fails.
  * `429 Too Many Requests` (`errorCode: "ERR_AUTH_RATE_LIMIT"`) when exceeding 20 attempts in 15 mins.
* **Frontend Usage:** Login form page. Save `accessToken` in auth store (e.g. Pinia, Redux, Zustand) and set default Authorization header for Axios/Fetch.

---

#### `POST /api/v1/admin/auth/refresh`
* **Route File:** `src/routes/admin.routes.js`
* **Controller:** `AuthController.refresh`
* **Service:** `AuthService.refresh`
* **Model:** `RefreshToken`, `AdminUser`
* **Purpose:** Rotates refresh token and generates a new access token when the current access token expires.
* **Authentication:** Public (token passed in body or cookie).
* **Headers:** `Content-Type: application/json`
* **Request Body (Optional if Cookie is present):**
  | Field | Type | Required | Description | Example |
  |---|---|---|---|---|
  | `refreshToken` | String | Optional* | Refresh token string (*Required if not in cookie) | `"eyJhbGciOiJIUzI1NiIsInR5cCI6..."` |
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Token refreshed successfully",
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "admin": {
        "id": "a1111111-1111-1111-1111-111111111111",
        "_id": "a1111111-1111-1111-1111-111111111111",
        "email": "admin@ateliervalenti.com",
        "firstName": "Alessandro",
        "lastName": "Valenti",
        "role": "super_admin"
      }
    }
  }
  ```
* **Frontend Usage:** Attach to HTTP client response interceptor. When receiving HTTP 401 with `errorCode: "ERR_TOKEN_EXPIRED"`, invoke this endpoint and replay failed request.

---

#### `POST /api/v1/admin/auth/logout`
* **Route File:** `src/routes/admin.routes.js`
* **Controller:** `AuthController.logout`
* **Service:** `AuthService.logout`
* **Model:** `RefreshToken`
* **Purpose:** Clears session cookies (`token` and `refreshToken`).
* **Authentication:** Public.
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Logged out successfully",
    "data": null
  }
  ```
* **Frontend Usage:** Call upon user logout, then clear local auth store and redirect to login page.

---

#### `GET /api/v1/admin/auth/me`
* **Route File:** `src/routes/admin.routes.js`
* **Controller:** `AuthController.getMe`
* **Service:** `AuthService.getProfile`
* **Model:** `AdminUser`
* **Purpose:** Returns the profile and permissions of the currently authenticated administrator.
* **Authentication:** Authenticated (`Bearer <token>` or `token` cookie).
* **Required Role:** Any authenticated admin role.
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Operation completed successfully",
    "data": {
      "id": "a1111111-1111-1111-1111-111111111111",
      "_id": "a1111111-1111-1111-1111-111111111111",
      "email": "admin@ateliervalenti.com",
      "firstName": "Alessandro",
      "lastName": "Valenti",
      "role": "super_admin",
      "permissions": ["*"],
      "isActive": true,
      "lastLoginAt": "2026-09-20T14:30:00.000Z",
      "createdAt": "2026-09-19T23:55:00.000Z"
    }
  }
  ```
* **Frontend Usage:** Call on initial app boot / page refresh to verify session validity and populate sidebar user profile and role-guarded routes.

---

#### `POST /api/v1/admin/auth/change-password`
* **Route File:** `src/routes/admin.routes.js`
* **Controller:** `AuthController.changePassword`
* **Service:** `AuthService.changePassword`
* **Model:** `AdminUser`
* **Purpose:** Allows an admin to change their own password.
* **Authentication:** Authenticated (`Bearer <token>`).
* **Required Role:** Any authenticated admin role.
* **Request Body:**
  | Field | Type | Required | Validation Rules | Example |
  |---|---|---|---|---|
  | `currentPassword` | String | Yes | Non-empty string | `"OldPassword123!"` |
  | `newPassword` | String | Yes | Minimum 8 characters | `"NewSecurePassword2026!"` |
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Password changed successfully",
    "data": null
  }
  ```
* **Error Responses:**
  * `400 Bad Request` (`errorCode: "ERR_INCORRECT_PASSWORD"`) if current password does not match.

---

### 7.2 Admin User Management APIs (`super_admin` Only)

#### `GET /api/v1/admin/users`
* **Route File:** `src/routes/admin.routes.js`
* **Controller:** `AuthController.listUsers`
* **Service:** `AuthService.listUsers`
* **Model:** `AdminUser`
* **Purpose:** Lists all administrative users ordered by creation date descending.
* **Authentication:** Authenticated.
* **Required Role:** `super_admin`.
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Operation completed successfully",
    "data": [
      {
        "id": "a1111111-1111-1111-1111-111111111111",
        "_id": "a1111111-1111-1111-1111-111111111111",
        "email": "admin@ateliervalenti.com",
        "firstName": "Alessandro",
        "lastName": "Valenti",
        "role": "super_admin",
        "permissions": ["*"],
        "isActive": true,
        "lastLoginAt": "2026-09-20T14:30:00.000Z",
        "createdAt": "2026-09-19T23:55:00.000Z"
      }
    ]
  }
  ```

---

#### `POST /api/v1/admin/users`
* **Route File:** `src/routes/admin.routes.js`
* **Controller:** `AuthController.createUser`
* **Service:** `AuthService.createUser`
* **Model:** `AdminUser`
* **Purpose:** Creates a new administrator account.
* **Authentication:** Authenticated.
* **Required Role:** `super_admin`.
* **Request Body:**
  | Field | Type | Required | Allowed Values / Validation | Example |
  |---|---|---|---|---|
  | `email` | String | Yes | Valid email format | `"marco.m@ateliervalenti.com"` |
  | `password` | String | Yes | Min 8 characters | `"MilanAtelier#2026"` |
  | `firstName` | String | Yes | Min 1 char | `"Marco"` |
  | `lastName` | String | Yes | Min 1 char | `"Mancini"` |
  | `role` | String | No | Enum: `'super_admin'`, `'store_manager'`, `'content_editor'`, `'concierge'` (Default: `'store_manager'`) | `"store_manager"` |
  | `permissions` | Array<String> | No | List of permission strings | `["products.write", "orders.read"]` |
* **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Admin user created successfully",
    "data": {
      "id": "u2222222-2222-2222-2222-222222222222",
      "_id": "u2222222-2222-2222-2222-222222222222",
      "email": "marco.m@ateliervalenti.com",
      "firstName": "Marco",
      "lastName": "Mancini",
      "role": "store_manager",
      "permissions": ["products.write", "orders.read"],
      "isActive": true
    }
  }
  ```
* **Error Response:** `409 Conflict` (`errorCode: "ERR_DUPLICATE_EMAIL"`) if email is already taken.

---

#### `PUT /api/v1/admin/users/:id`
* **Route File:** `src/routes/admin.routes.js`
* **Controller:** `AuthController.updateUser`
* **Service:** `AuthService.updateUser`
* **Model:** `AdminUser`
* **Path Parameters:**
  | Parameter | Type | Required | Description | Example |
  |---|---|---|---|---|
  | `id` | UUID | Yes | Target Admin User UUID | `"u2222222-2222-2222-2222-222222222222"` |
* **Request Body (Partial):**
  | Field | Type | Required | Description | Example |
  |---|---|---|---|---|
  | `firstName` | String | No | Min 1 char | `"Marco"` |
  | `lastName` | String | No | Min 1 char | `"Moretti"` |
  | `role` | String | No | Valid role enum | `"store_manager"` |
  | `permissions` | Array<String>| No | Updated permissions | `["products.*"]` |
  | `isActive` | Boolean | No | Activate or deactivate account | `true` |
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Admin user updated successfully",
    "data": {
      "id": "u2222222-2222-2222-2222-222222222222",
      "_id": "u2222222-2222-2222-2222-222222222222",
      "email": "marco.m@ateliervalenti.com",
      "firstName": "Marco",
      "lastName": "Moretti",
      "role": "store_manager",
      "permissions": ["products.*"],
      "isActive": true
    }
  }
  ```

---

#### `DELETE /api/v1/admin/users/:id`
* **Route File:** `src/routes/admin.routes.js`
* **Controller:** `AuthController.deleteUser`
* **Service:** `AuthService.deleteUser`
* **Model:** `AdminUser` (Cascades to `RefreshToken`)
* **Purpose:** Permanently deletes an admin account.
* **Authentication:** Authenticated (`super_admin` only).
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Admin user deleted successfully",
    "data": null
  }
  ```

---

### 7.3 Products & Catalogue Management APIs

#### `GET /api/v1/admin/products`
* **Route File:** `src/routes/admin.routes.js`
* **Controller:** `ProductController.listProductsAdmin`
* **Service:** `ProductService.listProducts(query, false)`
* **Model:** `Product`, `ProductImage`, `ProductVariant`
* **Purpose:** Paginated product inventory for Admin Table view. Includes both published and draft items.
* **Authentication:** Authenticated.
* **Required Role:** Any admin role.
* **Query Parameters:**
  | Parameter | Type | Required | Default | Allowed Values / Behavior | Example |
  |---|---|---|---|---|---|
  | `page` | Integer | No | `1` | Min 1 | `page=1` |
  | `limit` | Integer | No | `12` | Min 1, Max 48 | `limit=20` |
  | `status` | String | No | None | `'published'`, `'draft'`, `'all'` | `status=draft` |
  | `category` | String | No | None | Category slug or alias (`biker`, `bomber`, `aviator`, `trench`, `suede`, `accessories`, `jackets`) | `category=bomber` |
  | `gender` | String | No | None | `'men'`, `'women'`, `'unisex'`, `'all'` | `gender=men` |
  | `search` / `q` | String | No | None | Full-text query across name, tagline, description, leatherType, sku | `search=bomber` |
  | `sort` / `sortBy`| String | No | `sortOrder: asc` | `'featured'`, `'newest'`, `'price-asc'`, `'price-desc'`, `'rating'` | `sort=newest` |
  | `min_price` | Number | No | None | Minimum price in EUR | `min_price=300` |
  | `max_price` | Number | No | None | Maximum price in EUR | `max_price=900` |
  | `is_featured`| Boolean | No | None | Filter featured garments | `is_featured=true` |
  | `is_bestseller`| Boolean | No | None | Filter bestsellers | `is_bestseller=true` |
  | `is_new` | Boolean | No | None | Filter new arrivals | `is_new=true` |
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Operation completed successfully",
    "data": [
      {
        "id": "p1111111-1111-1111-1111-111111111111",
        "_id": "p1111111-1111-1111-1111-111111111111",
        "sku": "MLB-001",
        "slug": "montreal-leather-bomber",
        "name": "Montreal Leather Bomber",
        "tagline": "Full-grain calfskin with Italian antiqued brass hardware",
        "category": "bomber",
        "categoryLabel": "Bomber Jackets",
        "collectionId": "c1111111-1111-1111-1111-111111111111",
        "gender": "men",
        "styles": ["classic", "minimal"],
        "price": 385,
        "salePrice": null,
        "isFeatured": true,
        "isBestseller": true,
        "isNewArrival": true,
        "isPublished": true,
        "leatherType": "Full-Grain Italian Calfskin",
        "hardware": "Custom Brushed Brass YKK Excella®",
        "lining": "100% Breathable Japanese Cupro Twill",
        "description": "A masterclass in modern European proportion tailored in Milan.",
        "editorialQuote": "The benchmark of modern leather tailoring.",
        "specifications": ["1.2mm premium calfskin", "Double-needle tonal stitching"],
        "careInstructions": ["Specialist leather dry-clean only"],
        "modelInfo": "Model is 187cm wearing size 48 (EU M)",
        "images": [
          {
            "url": "https://images.unsplash.com/photo-1551028719-00167b16eac5",
            "alt": "Front view",
            "isPrimary": true,
            "isHover": false,
            "type": "perspective",
            "sortOrder": 1
          }
        ],
        "variants": [
          {
            "id": "v1111111-1111-1111-1111-111111111111",
            "sku": "MLB-001-48-BLACK",
            "size": "48 (EU M)",
            "color": "Obsidian Black",
            "colorHex": "#11100F",
            "stock": 8,
            "priceOverride": null
          }
        ],
        "availableColors": [{ "name": "Obsidian Black", "hex": "#11100F" }],
        "availableSizes": ["48 (EU M)", "50 (EU L)"],
        "rating": 4.95,
        "reviewCount": 1,
        "reviews": [],
        "seoTitle": "Montreal Leather Bomber | ATELIER VALENTI MILANO",
        "seoDescription": "Handcrafted luxury calfskin bomber jacket.",
        "createdAt": "2026-09-19T23:55:00.000Z",
        "updatedAt": "2026-09-19T23:55:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalCount": 28,
      "limit": 12,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
  ```

---

#### `POST /api/v1/admin/products`
* **Route File:** `src/routes/admin.routes.js`
* **Controller:** `ProductController.createProduct`
* **Service:** `ProductService.createProduct`
* **Model:** `Product`, `ProductImage`, `ProductVariant`
* **Purpose:** Creates a new garment specification with nested images and variants in a single call.
* **Authentication:** Authenticated (`super_admin`, `store_manager`).
* **Request Body Specification:**
  ```json
  {
    "sku": "MLB-002",
    "slug": "firenze-suede-overshirt",
    "name": "Firenze Suede Overshirt",
    "tagline": "Tuscan split suede with genuine horn buttons",
    "category": "suede",
    "categoryLabel": "Suede Outerwear",
    "collectionId": "c1111111-1111-1111-1111-111111111111",
    "gender": "men",
    "styles": ["classic", "minimal"],
    "leatherType": "0.8mm Tuscan Calfskin Suede",
    "hardware": "Genuine Polished Horn Buttons",
    "lining": "Unlined Sartorial Edge",
    "modelInfo": "Model is 188cm wearing EU 50",
    "description": "Exquisite transitional tailoring showcasing the tactile warmth of Florentine suede.",
    "editorialQuote": "Understated European sophistication.",
    "price": 420.00,
    "salePrice": null,
    "isFeatured": false,
    "isBestseller": false,
    "isNewArrival": true,
    "isPublished": true,
    "sortOrder": 0,
    "specifications": [
      "0.8mm lightweight split suede",
      "Hand-finished French seams"
    ],
    "careInstructions": [
      "Brush gently with crepe suede brush",
      "Keep away from direct heat"
    ],
    "availableColors": [
      { "name": "Espresso Brown", "hex": "#2B1E16" }
    ],
    "availableSizes": ["48 (EU M)", "50 (EU L)", "52 (EU XL)"],
    "images": [
      {
        "url": "https://images.unsplash.com/photo-1509551388413-e18d0ac5d495",
        "alt": "Front view",
        "isPrimary": true,
        "isHover": false,
        "type": "perspective",
        "sortOrder": 1
      }
    ],
    "variants": [
      {
        "sku": "MLB-002-48-BRN",
        "size": "48 (EU M)",
        "color": "Espresso Brown",
        "colorHex": "#2B1E16",
        "stock": 5,
        "priceOverride": null
      }
    ],
    "seoTitle": "Firenze Suede Overshirt | ATELIER VALENTI MILANO",
    "seoDescription": "Luxury Italian suede overshirt handcrafted in Milan."
  }
  ```
* **Validation Rules:**
  * `sku`: String, 3 to 50 chars, required.
  * `name`: String, min 2 chars, required.
  * `slug`: String, 3 to 150 chars, optional (auto-generated from `name` if omitted).
  * `category`: String, min 1 char, required (must correspond to an active category slug).
  * `leatherType`: String, min 1 char, required.
  * `description`: String, min 10 chars, required.
  * `price`: Number, strictly positive, required.
  * `salePrice`: Number, positive, nullable, optional.
  * `gender`: Enum (`'men'`, `'women'`, `'unisex'`), default `'unisex'`.
  * `images`: Array of `{ url, alt, isPrimary, isHover, type, sortOrder }`.
  * `variants`: Array of `{ sku, size, color, colorHex, stock, priceOverride }`.
* **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Garment specification created successfully",
    "data": { /* Complete mapped product object */ }
  }
  ```
* **Error Responses:**
  * `409 Conflict` (`errorCode: "ERR_DUPLICATE_PRODUCT"`) if SKU or slug already exists.
  * `422 Unprocessable Entity` (`errorCode: "ERR_VALIDATION_FAILED"`) for missing or malformed fields.

---

#### `GET /api/v1/admin/products/:id`
* **Route File:** `src/routes/admin.routes.js`
* **Controller:** `ProductController.getProductById`
* **Service:** `ProductService.getProductById`
* **Model:** `Product`, `ProductImage`, `ProductVariant`, `ProductReview`
* **Purpose:** Retrieves full product state for the product edit screen, including unapproved reviews, all variants with stock, and all images.
* **Authentication:** Authenticated.
* **Path Parameter:** `id` (UUID).
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Operation completed successfully",
    "data": { /* Complete product object */ }
  }
  ```

---

#### `PUT /api/v1/admin/products/:id` and `PATCH /api/v1/admin/products/:id`
* **Route File:** `src/routes/admin.routes.js`
* **Controller:** `ProductController.updateProduct`
* **Service:** `ProductService.updateProduct`
* **Model:** `Product`, `ProductImage`, `ProductVariant`
* **Purpose:** Updates garment specifications. If `images` or `variants` arrays are provided, the backend performs a transactional replacement (`prisma.$transaction` deletes existing children and creates the new set).
* **Authentication:** Authenticated (`super_admin`, `store_manager`).
* **Path Parameter:** `id` (UUID).
* **Request Body:** Partial or complete product object.
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Product updated successfully",
    "data": { /* Updated product object */ }
  }
  ```

---

#### `DELETE /api/v1/admin/products/:id`
* **Route File:** `src/routes/admin.routes.js`
* **Controller:** `ProductController.deleteProduct`
* **Service:** `ProductService.deleteProduct`
* **Model:** `Product` (Cascade deletes images, variants, and reviews)
* **Purpose:** Permanently deletes a garment from the database (**Hard delete**).
* **Authentication:** Authenticated (`super_admin`, `store_manager`).
* **Path Parameter:** `id` (UUID).
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Product removed from collection successfully",
    "data": null
  }
  ```

---

#### `POST /api/v1/admin/products/:id/publish`
* **Route File:** `src/routes/admin.routes.js`
* **Controller:** `ProductController.togglePublish`
* **Service:** `ProductService.togglePublish`
* **Model:** `Product`
* **Purpose:** Inverts `isPublished` boolean flag (switches between Published and Draft).
* **Authentication:** Authenticated (`super_admin`, `store_manager`, `content_editor`).
* **Path Parameter:** `id` (UUID).
* **Request Body:** None required.
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Product is now draft",
    "data": {
      "id": "p1111111-1111-1111-1111-111111111111",
      "isPublished": false
    }
  }
  ```

---

#### `POST /api/v1/admin/products/:id/duplicate`
* **Route File:** `src/routes/admin.routes.js`
* **Controller:** `ProductController.duplicateProduct`
* **Service:** `ProductService.duplicateProduct`
* **Model:** `Product`, `ProductImage`, `ProductVariant`
* **Purpose:** Clones an existing product with all specifications, images, and variants. The cloned item is assigned SKU `${sku}-COPY-${timestamp}`, slug `${slug}-copy-${timestamp}`, and is initialized as `isPublished: false`.
* **Authentication:** Authenticated (`super_admin`, `store_manager`).
* **Path Parameter:** `id` (UUID).
* **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Product duplicated successfully as draft",
    "data": { /* Cloned product object */ }
  }
  ```

---

#### `POST /api/v1/admin/products/bulk`
* **Route File:** `src/routes/admin.routes.js`
* **Controller:** `ProductController.bulkAction`
* **Service:** `ProductService.bulkAction`
* **Model:** `Product`
* **Purpose:** Executes batch operations across multiple selected products.
* **Authentication:** Authenticated (`super_admin`, `store_manager`).
* **Request Body:**
  | Field | Type | Required | Allowed Values | Example |
  |---|---|---|---|---|
  | `action` | String | Yes | Enum: `'publish'`, `'unpublish'`, `'delete'` | `"publish"` |
  | `ids` | Array<UUID> | Yes | Min 1 UUID string | `["p111...", "p222..."]` |
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "2 products published successfully",
    "data": null
  }
  ```

---

#### `PUT /api/v1/admin/products/reorder`
* **Route File:** `src/routes/admin.routes.js`
* **Controller:** `ProductController.reorder`
* **Service:** `ProductService.reorderProducts`
* **Model:** `Product`
* **Purpose:** Updates the `sortOrder` integer for drag-and-drop catalog sorting.
* **Authentication:** Authenticated (`super_admin`, `store_manager`).
* **Request Body:**
  ```json
  {
    "items": [
      { "id": "p1111111-1111-1111-1111-111111111111", "order": 1 },
      { "id": "p2222222-2222-2222-2222-222222222222", "order": 2 }
    ]
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Products reordered successfully",
    "data": null
  }
  ```

---

### 7.4 Review Moderation Queue APIs

#### `GET /api/v1/admin/reviews`
* **Route File:** `src/routes/admin.routes.js`
* **Controller:** `ProductController.listAllReviews`
* **Service:** `ProductService.listAllReviewsForAdmin`
* **Model:** `ProductReview`, `Product`
* **Purpose:** Moderation queue showing customer product reviews.
* **Authentication:** Authenticated.
* **Query Parameters:**
  * `isApproved` (Optional, Boolean): Filter by approval status (`true` / `false`).
  * `productId` (Optional, UUID): Filter by product.
  * `page` (Optional, Integer, default 1).
  * `limit` (Optional, Integer, default 20).
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Operation completed successfully",
    "data": {
      "reviews": [
        {
          "id": "r1111111-1111-1111-1111-111111111111",
          "_id": "r1111111-1111-1111-1111-111111111111",
          "product": {
            "id": "p1111111-1111-1111-1111-111111111111",
            "name": "Montreal Leather Bomber",
            "slug": "montreal-leather-bomber"
          },
          "author": "Julien D.",
          "location": "Paris, France",
          "rating": 5,
          "title": "Masterpiece in leather",
          "comment": "Sublime cut through the shoulders.",
          "verified": true,
          "isApproved": false,
          "createdAt": "2026-09-20T10:00:00.000Z"
        }
      ],
      "pagination": {
        "currentPage": 1,
        "totalPages": 1,
        "totalCount": 1,
        "limit": 20
      }
    }
  }
  ```

---

#### `PATCH /api/v1/admin/reviews/:id/approve`
* **Route File:** `src/routes/admin.routes.js`
* **Controller:** `ProductController.moderateReview`
* **Service:** `ProductService.moderateReview`
* **Model:** `ProductReview`, `Product`
* **Purpose:** Approves or rejects a customer review. **Automatically triggers rating recalculation:** recalculates average `rating` and `reviewCount` on the parent `Product` record.
* **Authentication:** Authenticated (`super_admin`, `store_manager`, `content_editor`).
* **Path Parameter:** `id` (UUID).
* **Request Body:**
  ```json
  {
    "isApproved": true
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Review approved successfully",
    "data": {
      "id": "r1111111-1111-1111-1111-111111111111",
      "_id": "r1111111-1111-1111-1111-111111111111",
      "productId": "p1111111-1111-1111-1111-111111111111",
      "isApproved": true
    }
  }
  ```

---

#### `DELETE /api/v1/admin/reviews/:id`
* **Route File:** `src/routes/admin.routes.js`
* **Controller:** `ProductController.deleteReview`
* **Service:** `ProductService.deleteReview`
* **Model:** `ProductReview`
* **Purpose:** Permanently deletes a customer review.
* **Authentication:** Authenticated (`super_admin`, `store_manager`).
* **Path Parameter:** `id` (UUID).
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Review deleted successfully",
    "data": null
  }
  ```

---

### 7.5 Category & Collection Management APIs

#### `GET /api/v1/admin/categories`
* **Route File:** `src/routes/admin.routes.js`
* **Controller:** `CategoryController.listCategoriesAdmin`
* **Service:** `CategoryService.getAllCategories(false)`
* **Model:** `Category`
* **Purpose:** Returns all categories (published and draft) with live `itemCount` (total product count).
* **Authentication:** Authenticated.
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Operation completed successfully",
    "data": [
      {
        "id": "c1111111-1111-1111-1111-111111111111",
        "slug": "bomber",
        "name": "Bomber Jackets",
        "subtitle": "Architectural drop shoulders",
        "description": "Clean proportions cut from Tuscan drum-dyed calfskin.",
        "heroImage": "https://images.unsplash.com/photo-1551028719-00167b16eac5",
        "itemCount": 12,
        "featuredOrder": 1,
        "highlightSpecs": ["Full-Grain Calfskin", "Japanese Cupro Lining"],
        "seoTitle": "Bomber Jackets | ATELIER VALENTI MILANO",
        "seoDescription": "Explore luxury leather bomber jackets.",
        "isPublished": true
      }
    ]
  }
  ```

---

#### `POST /api/v1/admin/categories`
* **Route File:** `src/routes/admin.routes.js`
* **Controller:** `CategoryController.createCategory`
* **Service:** `CategoryService.createCategory`
* **Model:** `Category`
* **Authentication:** Authenticated (`super_admin`, `store_manager`).
* **Request Body:**
  | Field | Type | Required | Default | Validation | Example |
  |---|---|---|---|---|---|
  | `slug` | String | Yes | - | 2 to 100 chars, unique | `"shearling"` |
  | `name` | String | Yes | - | Min 2 chars | `"Shearling Jackets"` |
  | `subtitle` | String | No | `""` | Optional description line | `"Whole-pelt thermal defense"` |
  | `description` | String | No | `""` | Detailed description | `"Cold-weather luxury armor."` |
  | `heroImage` | String | No | `""` | URL string | `"https://..."` |
  | `featuredOrder`| Integer | No | `0` | Sort index | `3` |
  | `isPublished` | Boolean | No | `true` | Visibility flag | `true` |
  | `highlightSpecs`| Array<String> | No | `[]` | Bullet badges | `["Merino Wool", "Brass"]` |
  | `seoTitle` | String | No | `null` | Meta title | `"Shearling Outerwear"` |
  | `seoDescription`| String | No | `null` | Meta description | `"Handcrafted in Milan."` |
* **Success Response (201 Created):** Mapped category object.
* **Error Response:** `409 Conflict` (`errorCode: "ERR_DUPLICATE_SLUG"`).

---

#### `PUT /api/v1/admin/categories/:id`
* **Route File:** `src/routes/admin.routes.js`
* **Controller:** `CategoryController.updateCategory`
* **Service:** `CategoryService.updateCategory`
* **Model:** `Category`
* **Path Parameter:** `id` (UUID).
* **Request Body:** Partial category object.
* **Success Response (200 OK):** Mapped category object.

---

#### `DELETE /api/v1/admin/categories/:id`
* **Route File:** `src/routes/admin.routes.js`
* **Controller:** `CategoryController.deleteCategory`
* **Service:** `CategoryService.deleteCategory`
* **Model:** `Category`
* **Purpose:** Permanently deletes category (**Hard delete**). Note: If products reference this category slug, database foreign key constraints apply.
* **Authentication:** Authenticated (`super_admin`, `store_manager`).
* **Path Parameter:** `id` (UUID).
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Category deleted successfully",
    "data": null
  }
  ```

---

#### `PUT /api/v1/admin/categories/reorder`
* **Route File:** `src/routes/admin.routes.js`
* **Controller:** `CategoryController.reorderCategories`
* **Service:** `CategoryService.reorderCategories`
* **Model:** `Category`
* **Purpose:** Updates `featuredOrder` for categories.
* **Request Body:**
  ```json
  {
    "items": [
      { "id": "c1111111-1111-1111-1111-111111111111", "order": 1 },
      { "id": "c2222222-2222-2222-2222-222222222222", "order": 2 }
    ]
  }
  ```

---

#### `GET /api/v1/admin/collections`
* **Route File:** `src/routes/admin.routes.js`
* **Controller:** `CategoryController.listCollectionsAdmin`
* **Service:** `CategoryService.getCollections(false)`
* **Model:** `Collection`
* **Purpose:** Lists seasonal capsule collections (both active and inactive).
* **Authentication:** Authenticated.
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Operation completed successfully",
    "data": [
      {
        "id": "col-1111-1111",
        "_id": "col-1111-1111",
        "slug": "inverno-26",
        "title": "Inverno 2026 Lookbook",
        "season": "Autumn / Winter 2026",
        "subtitle": "Sculpted Silhouettes in Heavy Calfskin",
        "description": "Debuted during Milan Men's Fashion Week.",
        "heroImage": "https://images.unsplash.com/photo-1520975954732-35dd22299614",
        "badge": "Capsule Collection",
        "isActive": true
      }
    ]
  }
  ```

---

#### `POST /api/v1/admin/collections`
* **Route File:** `src/routes/admin.routes.js`
* **Controller:** `CategoryController.createCollection`
* **Service:** `CategoryService.createCollection`
* **Model:** `Collection`
* **Request Body:**
  | Field | Type | Required | Allowed Values / Validation | Example |
  |---|---|---|---|---|
  | `slug` | String | Yes | 2 to 100 chars, unique | `"primavera-26"` |
  | `title` | String | Yes | Min 2 chars | `"Primavera 2026"` |
  | `season` | String | Yes | Min 1 char | `"Spring / Summer 2026"` |
  | `subtitle` | String | No | Optional string | `"Featherweight Plonge"` |
  | `description`| String | No | Optional string | `"Unlined lambskin styles"` |
  | `heroImage` | String | No | Image URL | `"https://..."` |
  | `badge` | String | No | Max 50 chars | `"Limited Edition"` |
  | `isActive` | Boolean | No | Default `true` | `true` |
* **Success Response (201 Created):** Mapped collection object.

---

#### `PUT /api/v1/admin/collections/:id` and `DELETE /api/v1/admin/collections/:id`
* **PUT:** Partial update for collection (`super_admin`, `store_manager`).
* **DELETE:** Hard delete of collection. Associated products have their `collectionId` set to `null` via `onDelete: SetNull`.

---

### 7.6 Homepage & Modular CMS Builder APIs

The homepage is composed of customizable modular sections stored in `cms_sections`.

#### `GET /api/v1/admin/cms/sections`
* **Route File:** `src/routes/admin.routes.js`
* **Controller:** `CmsController.getAllSections`
* **Service:** `CmsService.getAllSections`
* **Model:** `CmsSection`
* **Purpose:** Returns all CMS homepage sections ordered by `sortOrder: asc`.
* **Authentication:** Authenticated.
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Operation completed successfully",
    "data": [
      {
        "id": "s1111111-1111-1111-1111-111111111111",
        "_id": "s1111111-1111-1111-1111-111111111111",
        "sectionKey": "hero",
        "title": "ARCHITECTURAL LEATHER OUTERWEAR",
        "subtitle": "Handcrafted in Milan using vegetable-tanned Tuscan calfskin.",
        "eyebrow": "AUTUMN / WINTER 2026",
        "body": null,
        "primaryCta": { "label": "EXPLORE COLLECTION", "href": "/shop" },
        "secondaryCta": { "label": "BESPOKE ATELIER", "href": "/customize" },
        "mediaUrl": "https://images.unsplash.com/photo-1520975954732-35dd22299614",
        "secondaryMediaUrl": "",
        "extraPayload": {},
        "isVisible": true,
        "sortOrder": 1
      }
    ]
  }
  ```

---

#### `GET /api/v1/admin/cms/sections/:sectionKey`
* **Route File:** `src/routes/admin.routes.js`
* **Controller:** `CmsController.getSection`
* **Service:** `CmsService.getSection`
* **Model:** `CmsSection`
* **Path Parameter:** `sectionKey` (e.g. `'hero'`, `'editorial'`, `'craftsmanship'`, `'macro_detail'`, `'signature_banner'`, `'brand_story'`, `'trust_quality'`).

---

#### `PUT /api/v1/admin/cms/sections/:sectionKey`
* **Route File:** `src/routes/admin.routes.js`
* **Controller:** `CmsController.updateSection`
* **Service:** `CmsService.updateSection`
* **Model:** `CmsSection` (Uses Prisma `upsert`)
* **Purpose:** Saves edits for a specific homepage section block.
* **Authentication:** Authenticated (`super_admin`, `content_editor`).
* **Request Body:**
  | Field | Type | Required | Description | Example |
  |---|---|---|---|---|
  | `title` | String | No | Main heading | `"MASTERY IN LEATHER"` |
  | `subtitle` | String | No | Subtitle / description | `"Sublime cuts from Milan"` |
  | `eyebrow` | String | No | Small upper kicker | `"THE ATELIER HERITAGE"` |
  | `body` | Any / JSON | No | Rich paragraphs / text blocks | `["Paragraph 1", "Paragraph 2"]` |
  | `primaryCta` | Object | No | `{ "label": "...", "href": "..." }` | `{ "label": "SHOP", "href": "/shop" }` |
  | `secondaryCta`| Object | No | `{ "label": "...", "href": "..." }` | `{ "label": "CUSTOM", "href": "/customize" }` |
  | `mediaUrl` | String | No | Primary image / banner | `"https://..."` |
  | `secondaryMediaUrl` | String | No | Secondary detail image / video | `"https://..."` |
  | `extraPayload` | Object | No | Section-specific JSON structure (e.g. `principles`, `perks`, `quote`) | `{ "quote": "Heritage speaks." }` |
  | `isVisible` | Boolean | No | Section toggle | `true` |
  | `sortOrder` | Integer | No | Display position | `2` |
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Section 'editorial' updated successfully",
    "data": { /* Updated section object */ }
  }
  ```

---

#### `PATCH /api/v1/admin/cms/sections/:sectionKey/visibility`
* **Route File:** `src/routes/admin.routes.js`
* **Controller:** `CmsController.toggleVisibility`
* **Service:** `CmsService.toggleVisibility`
* **Model:** `CmsSection`
* **Request Body:** `{ "isVisible": true }` (or `false`).

---

#### `PUT /api/v1/admin/cms/sections/reorder`
* **Route File:** `src/routes/admin.routes.js`
* **Controller:** `CmsController.reorderSections`
* **Service:** `CmsService.reorderSections`
* **Request Body:**
  ```json
  {
    "items": [
      { "id": "hero", "order": 1 },
      { "id": "editorial", "order": 2 },
      { "id": "craftsmanship", "order": 3 }
    ]
  }
  ```

---

### 7.7 Testimonials & Social Proof Management APIs

#### `GET /api/v1/admin/testimonials` and `POST /api/v1/admin/testimonials`
* **Controller:** `CmsController.listTestimonialsAdmin` / `CmsController.createTestimonial`
* **Service:** `CmsService.listTestimonials(false)` / `CmsService.createTestimonial`
* **Model:** `Testimonial`
* **Create Request Body:**
  | Field | Type | Required | Allowed Values / Validation | Example |
  |---|---|---|---|---|
  | `quote` | String | Yes | Min 5 chars | `"The leather quality is unmatched in modern Europe."` |
  | `author` | String | Yes | Min 2 chars | `"Julian De Vries"` |
  | `city` | String | Yes | Min 2 chars | `"Amsterdam"` |
  | `country` | String | Yes | Min 2 chars | `"Netherlands"` |
  | `verifiedGarment`| String | Yes | Min 2 chars | `"Montreal Leather Bomber"` |
  | `rating` | Integer | No | Integer 1 to 5 (Default 5) | `5` |
  | `sortOrder` | Integer | No | Default 0 | `1` |
  | `isPublished` | Boolean | No | Default `true` | `true` |
* **Success Response (201 Created):** Created testimonial object.

---

#### `PUT /api/v1/admin/testimonials/:id`, `DELETE /api/v1/admin/testimonials/:id`, `PUT /api/v1/admin/testimonials/reorder`
* **PUT:** Partial update for testimonial.
* **DELETE:** Hard delete of testimonial.
* **PUT reorder:** `{ "items": [{ "id": "uuid", "order": 1 }] }`.

---

### 7.8 Editorial Social Looks (Instagram Feed) APIs

#### `GET /api/v1/admin/social-looks` and `POST /api/v1/admin/social-looks`
* **Controller:** `CmsController.listSocialLooksAdmin` / `CmsController.createSocialLook`
* **Service:** `CmsService.listSocialLooks(false)` / `CmsService.createSocialLook`
* **Model:** `SocialLook`
* **Create Request Body:**
  | Field | Type | Required | Allowed Values / Validation | Example |
  |---|---|---|---|---|
  | `imageUrl` | String | Yes | Valid URL | `"https://images.unsplash.com/..."` |
  | `caption` | String | Yes | Min 2 chars | `"Spotted in Milan Fashion Week wearing custom Biker"` |
  | `tag` | String | No | Default `'@ATELIERVALENTI'` | `"@ATELIERVALENTI"` |
  | `instagramUrl` | String | No | Valid URL or null | `"https://instagram.com/p/..."` |
  | `sortOrder` | Integer | No | Default 0 | `1` |
  | `isPublished` | Boolean | No | Default `true` | `true` |
* **Success Response (201 Created):** Created social look object.

---

#### `PUT /api/v1/admin/social-looks/:id`, `DELETE /api/v1/admin/social-looks/:id`, `PUT /api/v1/admin/social-looks/reorder`
* Standard CRUD operations matching testimonials pattern.

---

### 7.9 Newsletter Subscribers API

#### `GET /api/v1/admin/subscribers`
* **Route File:** `src/routes/admin.routes.js`
* **Controller:** `CmsController.listSubscribers`
* **Service:** `CmsService.listSubscribers`
* **Model:** `NewsletterSubscriber`
* **Purpose:** Lists all newsletter subscribers with subscription dates.
* **Authentication:** Authenticated.
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Operation completed successfully",
    "data": [
      {
        "id": "s1111111-1111-1111-1111-111111111111",
        "_id": "s1111111-1111-1111-1111-111111111111",
        "email": "client@example.it",
        "locale": "en",
        "isActive": true,
        "subscribedAt": "2026-09-20T12:00:00.000Z"
      }
    ]
  }
  ```

---

### 7.10 Bespoke Custom Commission Dossiers APIs

The bespoke custom studio allows clients to commission tailored outerwear. Each submission creates a tracking **dossier** (`AV-YYYY-C###`).

#### `GET /api/v1/admin/commissions`
* **Route File:** `src/routes/admin.routes.js`
* **Controller:** `CommissionController.listCommissions`
* **Service:** `CommissionService.listCommissions`
* **Model:** `CustomCommission`
* **Purpose:** Paginated list of bespoke dossiers for atelier concierges and managers.
* **Authentication:** Authenticated.
* **Query Parameters:**
  | Parameter | Type | Required | Description | Example |
  |---|---|---|---|---|
  | `status` | String | No | Filter by status: `'pending'`, `'contacted'`, `'in_tailoring'`, `'completed'`, `'cancelled'` | `status=pending` |
  | `search` | String | No | Search across `dossierNumber`, `customerName`, `customerEmail` | `search=AV-2026` |
  | `page` | Integer | No | Page number (Default: 1) | `page=1` |
  | `limit` | Integer | No | Items per page (Default: 20) | `limit=20` |
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Operation completed successfully",
    "data": [
      {
        "id": "c1111111-1111-1111-1111-111111111111",
        "_id": "c1111111-1111-1111-1111-111111111111",
        "dossierNumber": "AV-2026-C001",
        "silhouetteId": "biker",
        "silhouetteName": "Biker Jacket",
        "leatherId": "calfskin",
        "leatherName": "Full-Grain Tuscan Calfskin",
        "colorId": "obsidian",
        "colorName": "Obsidian Black",
        "liningId": "cupro",
        "liningName": "Japanese Cupro Twill",
        "hardwareId": "brass",
        "hardwareName": "Antiqued Brushed Brass",
        "monogramText": "AV",
        "monogramPlacement": "Internal Chest Pocket Tag",
        "measurements": {
          "unit": "cm",
          "chest": 102,
          "waist": 88,
          "shoulders": 48,
          "sleeve": 66,
          "backLength": 64
        },
        "customer": {
          "name": "Alessandro Moretti",
          "email": "alessandro@example.it",
          "phone": "+39 02 555 1234"
        },
        "status": "pending",
        "estimatedPrice": 620.00,
        "currency": "EUR",
        "estimatedDelivery": "4–6 weeks",
        "notes": "Client requested extra room through chest.",
        "createdAt": "2026-09-20T11:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalCount": 1,
      "limit": 20
    }
  }
  ```

---

#### `GET /api/v1/admin/commissions/:id`
* **Route File:** `src/routes/admin.routes.js`
* **Controller:** `CommissionController.getCommissionById`
* **Service:** `CommissionService.getCommissionById`
* **Model:** `CustomCommission`
* **Path Parameter:** `id` (UUID).
* **Success Response (200 OK):** Detailed dossier object as shown above.

---

#### `PATCH /api/v1/admin/commissions/:id/status`
* **Route File:** `src/routes/admin.routes.js`
* **Controller:** `CommissionController.updateStatus`
* **Service:** `CommissionService.updateStatus`
* **Model:** `CustomCommission`
* **Purpose:** Advances the bespoke garment workflow status in the atelier.
* **Authentication:** Authenticated (`super_admin`, `store_manager`, `concierge`).
* **Path Parameter:** `id` (UUID).
* **Request Body:**
  | Field | Type | Required | Allowed Values | Example |
  |---|---|---|---|---|
  | `status` | String | Yes | Enum: `'pending'`, `'contacted'`, `'in_tailoring'`, `'completed'`, `'cancelled'` | `"in_tailoring"` |
  | `notes` | String | No | Internal atelier notes | `"Master tailor assigned. Calfskin cut."` |
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Commission dossier status updated to 'in_tailoring'",
    "data": { /* Updated commission object */ }
  }
  ```

---

#### `POST /api/v1/admin/commissions/bulk-status`
* **Route File:** `src/routes/admin.routes.js`
* **Controller:** `CommissionController.bulkUpdateStatus`
* **Service:** `CommissionService.bulkUpdateStatus`
* **Model:** `CustomCommission`
* **Purpose:** Bulk advances status for multiple commission dossiers.
* **Authentication:** Authenticated (`super_admin`, `store_manager`, `concierge`).
* **Request Body:**
  ```json
  {
    "status": "contacted",
    "ids": ["c1111111-...", "c2222222-..."]
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Updated status to 'contacted' for 2 commissions",
    "data": null
  }
  ```

---

### 7.11 Bespoke Studio Options CRUD APIs

Admins can configure the silhouettes, leathers, colors, linings, and hardware choices offered in the interactive bespoke studio.

| Resource | Create Endpoint (`POST`) | Update Endpoint (`PUT`) | Delete Endpoint (`DELETE`) | Key Body Fields |
|---|---|---|---|---|
| **Silhouettes** | `/api/v1/admin/customization/silhouettes` | `.../silhouettes/:id` | `.../silhouettes/:id` | `slug`, `name`, `description`, `basePrice`, `imageUrl`, `sortOrder`, `isActive` |
| **Leathers** | `/api/v1/admin/customization/leathers` | `.../leathers/:id` | `.../leathers/:id` | `slug`, `name`, `weight`, `origin`, `description`, `extraPrice`, `sortOrder`, `isActive` |
| **Colors** | `/api/v1/admin/customization/colors` | `.../colors/:id` | `.../colors/:id` | `slug`, `name`, `hex`, `sortOrder`, `isActive` |
| **Linings** | `/api/v1/admin/customization/linings` | `.../linings/:id` | `.../linings/:id` | `slug`, `name`, `description`, `extraPrice`, `sortOrder`, `isActive` |
| **Hardware** | `/api/v1/admin/customization/hardware` | `.../hardware/:id` | `.../hardware/:id` | `slug`, `name`, `finish`, `extraPrice`, `sortOrder`, `isActive` |

* **Authentication:** Authenticated (All admin roles).
* **Responses:** `201 Created` for POST, `200 OK` for PUT, `200 OK` (`{ "message": "... deleted" }`) for DELETE.

---

### 7.12 Global Settings & Navigation Menus APIs

#### `GET /api/v1/admin/settings`
* **Route File:** `src/routes/admin.routes.js`
* **Controller:** `SettingsController.getSettings`
* **Service:** `SettingsService.getSettings`
* **Model:** `SiteSetting` (Singleton row keyed by `singletonKey: 'global'`)
* **Purpose:** Retrieves global store configuration. If no record exists, seeds and returns the default configuration automatically.
* **Authentication:** Authenticated.
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Operation completed successfully",
    "data": {
      "id": "s1111111-1111-1111-1111-111111111111",
      "_id": "s1111111-1111-1111-1111-111111111111",
      "announcement": {
        "enabled": true,
        "badge": "Milano Atelier",
        "message": "Complimentary Express European Delivery on All Orders Over €250",
        "linkText": "EXPLORE BESPOKE",
        "linkHref": "/customize",
        "countryNotice": "IT • DE • FR • CH • UK"
      },
      "shipping": {
        "freeShippingThreshold": 250,
        "standardShippingCost": 15,
        "countries": [
          { "code": "IT", "name": "Italy", "rate": 0, "days": "1–2 business days" },
          { "code": "DE", "name": "Germany", "rate": 15, "days": "2–3 business days" },
          { "code": "FR", "name": "France", "rate": 15, "days": "2–3 business days" }
        ]
      },
      "footer": {
        "certificationLine": "✔️ AZO-Free Leather · ✔️ EU REACH Compliant",
        "atelierAddress": "Via Montenapoleone, 27, 20121 Milano, Italy",
        "instagramHandle": "@ATELIERVALENTI",
        "copyrightText": "© 2026 Atelier Valenti Milano. All rights reserved.",
        "cities": ["MILANO", "PARIS", "ZURICH", "MUNICH"],
        "columns": [
          {
            "title": "COLLECTIONS",
            "links": [
              { "label": "Biker Jackets", "href": "/shop?category=biker" },
              { "label": "Bomber Jackets", "href": "/shop?category=bomber" }
            ]
          }
        ]
      },
      "searchKeywords": ["Biker", "Bomber", "Shearling", "Suede", "Calfskin", "Nappa", "Trench"]
    }
  }
  ```

---

#### `PATCH /api/v1/admin/settings`
* **Route File:** `src/routes/admin.routes.js`
* **Controller:** `SettingsController.updateSettings`
* **Service:** `SettingsService.updateSettings`
* **Model:** `SiteSetting`
* **Purpose:** Updates announcement banner, European shipping zones and thresholds, footer details, or search chips.
* **Authentication:** Authenticated (`super_admin`, `store_manager`).
* **Request Body:** Partial update matching the structure returned by `GET /api/v1/admin/settings`.
* **Success Response (200 OK):** Updated settings object.

---

#### `PUT /api/v1/admin/settings/search-keywords`
* **Route File:** `src/routes/admin.routes.js`
* **Controller:** `SettingsController.updateSearchKeywords`
* **Service:** `SettingsService.updateSearchKeywords`
* **Model:** `SiteSetting`
* **Request Body:**
  ```json
  {
    "keywords": ["Biker", "Bomber", "Aviator", "Shearling", "Calfskin", "Nappa"]
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Search keywords updated successfully",
    "data": ["Biker", "Bomber", "Aviator", "Shearling", "Calfskin", "Nappa"]
  }
  ```

---

#### `GET /api/v1/admin/navigation/mega-menu`
* **Route File:** `src/routes/admin.routes.js`
* **Controller:** `SettingsController.getNavigation`
* **Service:** `SettingsService.getNavigationMenu`
* **Model:** `NavigationMenu`
* **Purpose:** Retrieves all mega-menu category trees (`men`, `women`, `customize`).
* **Authentication:** Authenticated.
* **Success Response (200 OK):** Returns key-value dictionary `{ men: { ... }, women: { ... }, customize: { ... } }`.

---

#### `PUT /api/v1/admin/navigation/mega-menu/:menuKey`
* **Route File:** `src/routes/admin.routes.js`
* **Controller:** `SettingsController.updateNavigationMenu`
* **Service:** `SettingsService.updateNavigationMenu`
* **Model:** `NavigationMenu`
* **Purpose:** Updates the full JSON category tree for a specific top-level navigation dropdown (`men`, `women`, or `customize`).
* **Authentication:** Authenticated (`super_admin`, `content_editor`).
* **Path Parameter:** `menuKey` (`"men"` | `"women"` | `"customize"`).
* **Request Body:**
  ```json
  {
    "payload": {
      "categories": [
        { "name": "Biker Jackets", "href": "/men/biker", "tag": "Iconic" }
      ],
      "featuredCard": {
        "title": "Inverno 2026 Lookbook",
        "image": "https://...",
        "href": "/collections/inverno-26"
      }
    }
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Navigation menu 'men' updated successfully",
    "data": { /* Updated payload */ }
  }
  ```

---

### 7.13 Media & File Upload APIs

#### `POST /api/v1/admin/media/upload`
* **Route File:** `src/routes/admin.routes.js`
* **Controller:** `MediaController.uploadFile`
* **Service:** `MediaService.saveAsset`
* **Model:** `MediaAsset`
* **Purpose:** Uploads garment photography or video assets. Automatically tries uploading to Supabase Storage bucket (`media`), falling back gracefully to local disk storage (`uploads/`) with absolute URL generation.
* **Authentication:** Authenticated.
* **Headers:** `Content-Type: multipart/form-data`
* **Form-Data Fields:**
  | Field | Type | Required | Description |
  |---|---|---|---|
  | `file` | Binary File | Yes | File binary (Max 10MB). Permitted MIME: `image/jpeg`, `image/png`, `image/webp`, `image/avif`, `video/mp4`, `video/webm` |
  | `folder` | String (Text) | No | Destination category: `'products'`, `'editorial'`, `'lookbook'`, `'general'` (Default: `'general'`) |
  | `altText` / `alt_text` | String (Text) | No | Accessibility alt description |
* **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "File uploaded successfully",
    "data": {
      "id": "m1111111-1111-1111-1111-111111111111",
      "filename": "leather-jacket-front-1740000000000-123456.webp",
      "originalName": "leather-jacket-front.webp",
      "mimeType": "image/webp",
      "size": 412500,
      "url": "http://localhost:5000/uploads/leather-jacket-front-1740000000000-123456.webp",
      "path": "C:\\...\\uploads\\leather-jacket-front-1740000000000-123456.webp",
      "folder": "products",
      "altText": "Front view of Italian leather jacket",
      "createdAt": "2026-09-20T15:00:00.000Z"
    }
  }
  ```
* **Error Responses:**
  * `400 Bad Request` (`errorCode: "ERR_NO_FILE"`) when no file is passed under form key `file`.
  * `400 Bad Request` (`errorCode: "ERR_INVALID_FILE_TYPE"`) for unsupported file types (e.g. PDF, SVG, GIF).
  * `400 Bad Request` (`errorCode: "ERR_UPLOAD_FAILED"`) if file exceeds 10MB limit (`LIMIT_FILE_SIZE`).

---

#### `GET /api/v1/admin/media`
* **Route File:** `src/routes/admin.routes.js`
* **Controller:** `MediaController.listMedia`
* **Service:** `MediaService.listAssets`
* **Model:** `MediaAsset`
* **Purpose:** Paginated media browser with folder filtering and filename search.
* **Authentication:** Authenticated.
* **Query Parameters:**
  * `folder` (Optional, String): Filter by folder name (`'products'`, `'editorial'`, etc.).
  * `search` (Optional, String): Search against `originalName`.
  * `page` (Optional, Integer, default 1).
  * `limit` (Optional, Integer, default 24).
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Operation completed successfully",
    "data": [ /* Array of MediaAsset objects */ ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 2,
      "totalCount": 42,
      "limit": 24
    }
  }
  ```

---

#### `DELETE /api/v1/admin/media/:id`
* **Route File:** `src/routes/admin.routes.js`
* **Controller:** `MediaController.deleteMedia`
* **Service:** `MediaService.deleteAsset`
* **Model:** `MediaAsset`
* **Purpose:** Deletes media asset record from PostgreSQL, removes file from Supabase Storage bucket, and unlinks file from local disk.
* **Authentication:** Authenticated (`super_admin`, `store_manager`).
* **Path Parameter:** `id` (UUID).
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Media asset deleted successfully",
    "data": null
  }
  ```

---

### 7.14 Public Storefront APIs

#### `GET /api/v1/content/homepage`
* **Route File:** `src/routes/public.routes.js`
* **Controller:** `CmsController.getHomepageContent`
* **Service:** `CmsService.getHomepageContent`
* **Purpose:** Aggregates all modular homepage sections in a single request: `announcement`, `hero`, `editorial`, `craftsmanship`, `macroTexture`, `signatureBanner`, `story`, `trustPerks`, `testimonials`, `socialLooks`.
* **Authentication:** None.

#### `GET /api/v1/content/navigation`
* **Route File:** `src/routes/public.routes.js`
* **Controller:** `SettingsController.getNavigation`
* **Query Parameters:** `menu` (Optional: `'men'`, `'women'`, `'customize'`). If omitted, returns all menus.
* **Authentication:** None.

#### `GET /api/v1/settings/footer`
* **Returns:** Footer navigation columns, European certifications (`✔️ AZO-Free Leather · ✔️ EU REACH Compliant`), atelier Milan address, and copyright text.

#### `GET /api/v1/settings/announcement`
* **Returns:** Top announcement banner configuration (`enabled`, `badge`, `message`, `linkText`, `linkHref`, `countryNotice`).

#### `GET /api/v1/settings/shipping`
* **Returns:** Free shipping threshold (€250), standard shipping cost (€15), and European delivery zones with delivery days.

#### `GET /api/v1/settings/search-keywords`
* **Returns:** Array of search suggestion chips (e.g. `["Biker", "Bomber", "Shearling", "Suede", "Calfskin"]`).

#### `GET /api/v1/seo/metadata`
* **Query Parameters:** `path` (e.g. `?path=/products/montreal-leather-bomber` or `?path=/men/biker`).
* **Returns:** Dynamic `title`, `description`, `canonical`, `openGraph` card, and Schema.org `jsonLd` for the given route.

#### `GET /api/v1/products`
* **Route File:** `src/routes/public.routes.js`
* **Controller:** `ProductController.listProducts`
* **Purpose:** Public catalogue with filtering, sorting, and pagination. Excludes draft products (`isPublished = true` enforced).
* **Query Parameters:**
  * `category`: Category slug (`biker`, `bomber`, `aviator`, `suede`, `trench`, `accessories`, `jackets`, `new-arrivals`, `best-sellers`).
  * `gender`: `'men'`, `'women'`, `'unisex'`, `'all'`.
  * `style`: `'classic'`, `'vintage'`, `'biker'`, `'minimal'`, `'luxury'`, `'shearling'`.
  * `leatherType` / `leather_type`: Substring match on leather type.
  * `leatherFamily`: `'suede'`, `'shearling'`, `'premium'`.
  * `min_price` / `max_price`: Numeric EUR range.
  * `is_new`: Boolean.
  * `is_bestseller`: Boolean.
  * `is_featured`: Boolean.
  * `sort`: `'featured'`, `'newest'`, `'price-asc'`, `'price-desc'`.
  * `search` / `q`: Full-text search term.
  * `page`: Integer (Default 1).
  * `limit`: Integer (Default 12, Max 48).
* **Response (200 OK):** Paginated array of mapped products.

#### `GET /api/v1/products/facets`
* **Returns:** Distinct attribute counts for building filter sidebars: `{ categories: [...], leatherTypes: [...], colors: [...], sizes: [...], priceRange: { min: 0, max: 2000 } }`.

#### `GET /api/v1/products/search`
* **Query Parameters:** `q` or `query` (Search string).
* **Returns:** Fast array of matching product objects (up to 20 results) for header search overlays.

#### `GET /api/v1/products/:slug`
* **Returns:** Full garment specification, images, variants, approved client reviews, and related products for Product Detail Page (PDP).

#### `GET /api/v1/products/:slug/reviews`
* **Returns:** Approved customer reviews for a given product slug.

#### `POST /api/v1/products/:id/reviews`
* **Path Parameter:** `id` (Product UUID).
* **Request Body:** `{ "author": "...", "location": "...", "rating": 5, "title": "...", "comment": "..." }`.
* **Response (201 Created):** `{ "message": "Your review has been submitted and is pending atelier moderation." }`. Review is stored with `isApproved: false`.

#### `GET /api/v1/products/:slug/related`
* **Returns:** Up to 4 related products in the same category.

#### `GET /api/v1/categories` and `GET /api/v1/categories/:slug`
* **Returns:** Published categories with active product count.

#### `GET /api/v1/collections`
* **Returns:** Active seasonal capsules lookbooks.

#### `GET /api/v1/customization/options`
* **Returns:** All active silhouettes, leathers, colors, linings, and hardware options with prices, weights, and origins for the interactive studio.

#### `POST /api/v1/customization/commissions`
* **Request Body:** `{ silhouetteId, leatherId, colorId, liningId, hardwareId, monogramText, monogramPlacement, measurements: { unit, chest, waist, shoulders, sleeve, backLength }, customer: { name, email, phone }, notes }`.
* **Response (201 Created):** Generated dossier number (e.g. `"AV-2026-C001"`), estimated price in EUR, delivery timeframe (`"4–6 weeks"`), and pending status.

#### `POST /api/v1/newsletter/subscribe`
* **Request Body:** `{ "email": "client@example.com", "locale": "en" }`.
* **Response (200 OK):** Confirmation message. Handles idempotency and re-subscription.

#### `GET /api/v1/testimonials`
* **Returns:** Published client reviews with 5-star ratings and verified garment names.

#### `GET /api/v1/social-looks`
* **Returns:** Published Instagram editorial gallery photos.

---

### 7.15 System & Health Check APIs

#### `GET /api/health`
* **Route File:** `src/routes/index.js`
* **Purpose:** Validates server runtime and checks live database connectivity via `prisma.$queryRaw\`SELECT 1\``.
* **Authentication:** None.
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Atelier Valenti Milano API is operational and healthy",
    "data": {
      "status": "healthy",
      "timestamp": "2026-09-20T14:32:00.000Z",
      "uptime": 1420.55,
      "database": "connected",
      "orm": "Prisma",
      "databaseType": "Supabase PostgreSQL",
      "environment": "development"
    }
  }
  ```

#### `GET /`
* **Route File:** `src/app.js`
* **Purpose:** Server root greeting.
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Welcome to the Atelier Valenti Milano Luxury Leather REST API server.",
    "data": {
      "documentation": "/api/health",
      "version": "1.0.0"
    }
  }
  ```

---

## 8. Database Relationships Relevant to APIs

Prisma ORM models mirror the relational PostgreSQL schema:

```text
Category (slug) ◄────────┐ (category_slug)
                         │
Collection (id) ◄────────┼ (collection_id: SetNull)
                         │
                      Product (id)
                         │
                         ├── ProductImage (product_id: Cascade Delete)
                         ├── ProductVariant (product_id: Cascade Delete)
                         └── ProductReview (product_id: Cascade Delete)

AdminUser (id) ◄────────── RefreshToken (admin_id: Cascade Delete)

SiteSetting (singleton_key = "global")
NavigationMenu (menu_key)
CmsSection (section_key)
Testimonial (id)
SocialLook (id)
NewsletterSubscriber (email: unique)
MediaAsset (id)
CustomCommission (dossier_number: unique)
CustomSilhouette, CustomLeather, CustomColor, CustomLining, CustomHardware (id)
```

### Relational Behaviors Frontend Must Know
1. **Product Category Link:** A product references `Category` by `categorySlug` (not UUID). When creating/updating a product, send the category slug (e.g. `"bomber"`). If the slug changes, Prisma cascade-updates foreign keys.
2. **Product Collection Link:** A product optionally references `Collection` by UUID (`collectionId`). If a collection is deleted, products remain intact and have `collectionId` set to `null`.
3. **Atomic Images & Variants Updates:** When updating a product via `PUT` or `PATCH`, sending an `images` or `variants` array triggers a complete transactional replacement. Ensure the frontend sends the complete list of desired images/variants, not just newly added ones.
4. **Hard Deletion Cascades:** Deleting a product automatically hard-deletes all its child `images`, `variants`, and `reviews`. Deleting an admin user deletes all associated `refresh_tokens`.

---

## 9. File & Image Upload Handling

The backend implements a dedicated media service with hybrid cloud and local storage fallback:

* **Upload Endpoint:** `POST /api/v1/admin/media/upload`
* **Authentication:** Required (`authenticate` middleware)
* **Form Field Name:** `file` (Single file upload via Multer)
* **Metadata Fields (Body):**
  * `folder`: Text string (e.g. `'products'`, `'editorial'`, `'lookbook'`, `'general'`). Used to partition storage paths.
  * `altText` / `alt_text`: Text description.
* **Accepted File Formats:** `image/jpeg`, `image/png`, `image/webp`, `image/avif`, `video/mp4`, `video/webm`.
* **File Size Limit:** **10 Megabytes** (`env.MAX_FILE_SIZE_MB = 10`).
* **Storage Logic:**
  1. Multer saves file to local disk under `uploads/` directory with cleaned filename: `${originalBasename}-${timestamp}-${random}.${ext}`.
  2. The service attempts to stream the buffer to the Supabase Storage bucket (`media/${folder}/${timestamp}-${filename}`).
  3. If Supabase is connected and succeeds, it returns the public CDN URL.
  4. If Supabase is offline or not configured, it generates the absolute URL using the server origin: `http://localhost:5000/uploads/${filename}`.
  5. The asset metadata is saved in PostgreSQL table `media_assets`.
* **Media Deletion:** `DELETE /api/v1/admin/media/:id` deletes the database row, removes the file from Supabase Storage (if present), and removes the file from local disk via `fs.unlinkSync`.

---

## 10. Pagination, Search, Filtering & Sorting Conventions

The backend applies standardized query parsing in its service layer:

### Pagination
* **Page Parameter:** `page` (1-indexed integer, minimum `1`, default `1`).
* **Limit Parameter:** `limit` (Integer, default `12` for public catalog, `20` for admin tables, `24` for media grid).
* **Maximum Limit:** `48` items per page (enforced via `Math.min(MAX_LIMIT, ...)` in `product.service.js`).
* **Pagination Metadata Envelope:**
  ```json
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalCount": 58,
    "limit": 12,
    "hasNextPage": true,
    "hasPrevPage": false
  }
  ```

### Search Syntax
* **Parameters:** `search` or `q`
* **Case Sensitivity:** Case-insensitive search via PostgreSQL `mode: 'insensitive'`.
* **Product Search Fields:** Searches `name`, `tagline`, `description`, `leatherType`, and `sku` simultaneously using `OR` logic.
* **Commission Search Fields:** Searches `dossierNumber`, `customerName`, and `customerEmail`.
* **Media Search Fields:** Searches `originalName`.

### Sorting
* **Parameters:** `sort` or `sortBy`
* **Allowed Values:**
  * `price-asc`: Order by price ascending (€ → €€€)
  * `price-desc`: Order by price descending (€€€ → €)
  * `newest`: Order by `createdAt: desc`
  * `featured`: Order by `isFeatured: desc`
  * `rating`: Order by average customer `rating: desc`
  * Default: `sortOrder: asc` (manual drag-and-drop merchandising order)

---

## 11. Admin Panel CRUD Summary

| Entity | Primary Key | List Endpoint | Read Endpoint | Create Endpoint | Update Endpoint | Delete Endpoint | Delete Type |
|---|---|---|---|---|---|---|---|
| **Products** | UUID (`id`) | `GET /admin/products` | `GET /admin/products/:id` | `POST /admin/products` | `PUT` / `PATCH /admin/products/:id` | `DELETE /admin/products/:id` | **Hard Delete** |
| **Reviews** | UUID (`id`) | `GET /admin/reviews` | - | - | `PATCH /admin/reviews/:id/approve` | `DELETE /admin/reviews/:id` | **Hard Delete** |
| **Categories** | UUID (`id`) | `GET /admin/categories` | - | `POST /admin/categories` | `PUT /admin/categories/:id` | `DELETE /admin/categories/:id` | **Hard Delete** |
| **Collections** | UUID (`id`) | `GET /admin/collections`| - | `POST /admin/collections` | `PUT /admin/collections/:id` | `DELETE /admin/collections/:id` | **Hard Delete** |
| **CMS Sections** | Key (`sectionKey`) | `GET /admin/cms/sections` | `GET /admin/cms/sections/:key` | - | `PUT /admin/cms/sections/:key` | - | - |
| **Testimonials** | UUID (`id`) | `GET /admin/testimonials`| - | `POST /admin/testimonials` | `PUT /admin/testimonials/:id` | `DELETE /admin/testimonials/:id`| **Hard Delete** |
| **Social Looks** | UUID (`id`) | `GET /admin/social-looks` | - | `POST /admin/social-looks` | `PUT /admin/social-looks/:id` | `DELETE /admin/social-looks/:id` | **Hard Delete** |
| **Commissions** | UUID (`id`) | `GET /admin/commissions` | `GET /admin/commissions/:id` | - | `PATCH /admin/commissions/:id/status`| - | - |
| **Media Assets** | UUID (`id`) | `GET /admin/media` | - | `POST /admin/media/upload` | - | `DELETE /admin/media/:id` | **Hard Delete** |
| **Settings** | Key (`"global"`) | `GET /admin/settings` | - | - | `PATCH /admin/settings` | - | - |
| **Mega Menus** | Key (`menuKey`) | `GET /admin/navigation/mega-menu` | - | - | `PUT /admin/navigation/mega-menu/:key` | - | - |
| **Admin Users** | UUID (`id`) | `GET /admin/users` | - | `POST /admin/users` | `PUT /admin/users/:id` | `DELETE /admin/users/:id` | **Hard Delete** |

---

## 12. Admin Dashboard APIs — Available vs Missing Metrics

### Available Metrics in Existing Backend
The Admin Panel frontend can calculate the following metrics using live endpoints:
1. **Total Products Count:** Available from `GET /api/v1/admin/products` (`pagination.totalCount`).
2. **Draft vs Published Count:** Query `GET /api/v1/admin/products?status=published` and `?status=draft`.
3. **Pending Review Moderation Count:** Query `GET /api/v1/admin/reviews?isApproved=false` (`pagination.totalCount`).
4. **Bespoke Commission Dossiers Count:** Query `GET /api/v1/admin/commissions` (`pagination.totalCount`).
5. **Pending Bespoke Dossiers Count:** Query `GET /api/v1/admin/commissions?status=pending` (`pagination.totalCount`).
6. **Newsletter Subscribers Count:** Length of array returned by `GET /api/v1/admin/subscribers`.
7. **Media Library Storage Count:** Available from `GET /api/v1/admin/media` (`pagination.totalCount`).
8. **Live Server & Database Health:** `GET /api/health` (`database: "connected"`, `uptime`).

### Metrics NOT AVAILABLE FROM BACKEND
> [!IMPORTANT]
> The backend does NOT currently have an `/admin/dashboard` analytics aggregation endpoint or e-commerce transaction models. The following metrics are:
> **NOT AVAILABLE FROM BACKEND**
> * Total Revenue / Sales (€)
> * Daily / Weekly / Monthly Sales Charts
> * Order Processing Statuses (Pending, Shipped, Delivered)
> * Customer Checkout Transactions
> * Payment Processing Gateway Webhooks / Logs
> * Refund / Return Requests
> * Inventory Low-Stock Aggregation Alerts (Must be computed client-side by inspecting `variants[].stock`)
> 
> *Frontend Agent Instruction:* Do NOT attempt to call non-existent `/analytics` or `/orders` endpoints. Build dashboard summary cards utilizing the available counts listed above.

---

## 13. Critical API Workflows & Dependency Mapping

### Workflow 1: Create New Product with Images & Variants
```text
Step 1: Upload Images
  POST /api/v1/admin/media/upload (multipart form-data: file, folder="products")
  ──► Collect returned public URLs: ["http://.../img1.webp", "http://.../img2.webp"]

Step 2: Fetch Categories
  GET /api/v1/admin/categories
  ──► User selects Category (e.g. slug: "bomber")

Step 3: Create Product Specification
  POST /api/v1/admin/products
  ──► Send JSON payload including:
      - Primary fields (sku, name, price, leatherType, description, category="bomber")
      - Nested images: [{ url: "...", isPrimary: true }, { url: "...", isHover: true }]
      - Nested variants: [{ sku: "MLB-48-BLK", size: "48 (EU M)", color: "Black", stock: 10 }]
```

### Workflow 2: Customer Review Moderation
```text
Step 1: Client Submits Review (Public)
  POST /api/v1/products/:id/reviews
  ──► Saved with isApproved = false

Step 2: Admin Reviews Moderation Queue
  GET /api/v1/admin/reviews?isApproved=false
  ──► Displays author, rating, title, and comment

Step 3: Admin Approves Review
  PATCH /api/v1/admin/reviews/:id/approve { "isApproved": true }
  ──► Backend updates review and automatically recalculates parent product rating & reviewCount
```

### Workflow 3: Bespoke Commission Processing
```text
Step 1: Client Designs Garment (Storefront Studio)
  GET /api/v1/customization/options (Fetch silhouettes, leathers, colors, linings, hardware)
  POST /api/v1/customization/commissions (Submit custom design & body measurements)
  ──► Assigned dossierNumber: "AV-2026-C001" (status: "pending")

Step 2: Atelier Concierge Reviews Dossier
  GET /api/v1/admin/commissions/:id
  ──► Review client measurements and specifications

Step 3: Advance Atelier Workflow Status
  PATCH /api/v1/admin/commissions/:id/status { "status": "contacted", "notes": "Called client for shoulder check." }
  PATCH /api/v1/admin/commissions/:id/status { "status": "in_tailoring", "notes": "Pattern cut in Milan workshop." }
  PATCH /api/v1/admin/commissions/:id/status { "status": "completed" }
```

### Workflow 4: Drag-and-Drop Catalog Merchandising
```text
Step 1: Admin reorders product rows in UI table
Step 2: Dispatch Reorder Array
  PUT /api/v1/admin/products/reorder
  Payload: { "items": [{ "id": "p1", "order": 1 }, { "id": "p2", "order": 2 }] }
Step 3: Invalidate & Refetch Products List
```

---

## 14. Frontend Integration Notes for Admin Panel

When developing the Admin Panel frontend:

1. **HTTP Client Setup:**
   * Configure base URL to `/api/v1`.
   * Attach request interceptor injecting `Authorization: Bearer <token>`.
   * Set `withCredentials: true` so refresh cookies are transmitted.
   * Attach response interceptor checking for status `401` and `errorCode: "ERR_TOKEN_EXPIRED"`. Call `/admin/auth/refresh` and retry the original request.
2. **Data Mutation & Table Invalidation:**
   * After calling `POST /admin/products`, `PUT /admin/products/:id`, `DELETE /admin/products/:id`, or `POST /admin/products/bulk`, invalidate table state and re-fetch `GET /admin/products`.
   * For `POST /admin/products/:id/publish`, use optimistic UI updates (toggle the badge immediately, rollback if request fails).
3. **Form Submissions:**
   * Send all numeric fields (`price`, `salePrice`, `stock`, `rating`, `order`, `featuredOrder`) as actual JavaScript numbers, not strings.
   * Send boolean switches (`isFeatured`, `isBestseller`, `isNewArrival`, `isPublished`, `isActive`, `isVisible`) as genuine booleans (`true`/`false`).
4. **File Uploads:**
   * Must use `FormData` object with header `Content-Type: multipart/form-data`.
   * Append the binary file to key `file`.
   * Do not send base64 data to product endpoints. Upload file to `/admin/media/upload` first, obtain the URL, and embed the URL into the product's `images` array.
5. **Role Guarding (UI Permissions):**
   * Use the `admin.role` object from `/admin/auth/me` to disable or hide buttons (e.g. Hide `Delete` buttons if role is `content_editor`; hide `/admin/users` menu if role is not `super_admin`).

---

## 15. Admin Panel API Map

```text
ADMIN PANEL FRONTEND
│
├── Authentication
│   ├── POST   /admin/auth/login                  (Login form)
│   ├── POST   /admin/auth/refresh                (Silent token refresher)
│   ├── POST   /admin/auth/logout                 (Sign out button)
│   ├── GET    /admin/auth/me                     (User profile & permissions on boot)
│   └── POST   /admin/auth/change-password        (Profile settings modal)
│
├── Admin User Management (Super Admin only)
│   ├── GET    /admin/users                       (Staff list table)
│   ├── POST   /admin/users                       (Invite / Create staff modal)
│   ├── PUT    /admin/users/:id                   (Edit role / permissions modal)
│   └── DELETE /admin/users/:id                   (Revoke staff access)
│
├── Product Catalogue Management
│   ├── GET    /admin/products                    (Product inventory table)
│   ├── POST   /admin/products                    (Create garment wizard)
│   ├── GET    /admin/products/:id                (Edit garment view)
│   ├── PUT    /admin/products/:id                (Save garment changes)
│   ├── PATCH  /admin/products/:id                (Quick partial update)
│   ├── DELETE /admin/products/:id                (Delete garment modal)
│   ├── POST   /admin/products/:id/publish        (Toggle publish status switch)
│   ├── POST   /admin/products/:id/duplicate      (Clone garment action)
│   ├── POST   /admin/products/bulk               (Bulk publish/unpublish/delete)
│   └── PUT    /admin/products/reorder            (Drag-and-drop sort order)
│
├── Customer Review Moderation
│   ├── GET    /admin/reviews                     (Reviews moderation queue)
│   ├── PATCH  /admin/reviews/:id/approve         (Approve / Reject review button)
│   └── DELETE /admin/reviews/:id                 (Delete spam review)
│
├── Category & Capsule Management
│   ├── GET    /admin/categories                  (Categories list table)
│   ├── POST   /admin/categories                  (Create category modal)
│   ├── PUT    /admin/categories/:id              (Edit category modal)
│   ├── DELETE /admin/categories/:id              (Delete category modal)
│   ├── PUT    /admin/categories/reorder          (Category sort order)
│   ├── GET    /admin/collections                 (Seasonal lookbooks table)
│   ├── POST   /admin/collections                 (Create capsule modal)
│   ├── PUT    /admin/collections/:id             (Edit capsule modal)
│   └── DELETE /admin/collections/:id             (Delete capsule modal)
│
├── Bespoke Commission Dossiers
│   ├── GET    /admin/commissions                 (Commission dossiers table)
│   ├── GET    /admin/commissions/:id             (Client measurement dossier sheet)
│   ├── PATCH  /admin/commissions/:id/status      (Advance atelier status dropdown)
│   ├── POST   /admin/commissions/bulk-status     (Bulk status advance)
│   └── CRUD   /admin/customization/*             (Configure Silhouettes, Leathers, Colors, Linings, Hardware)
│
├── Modular CMS & Homepage Builder
│   ├── GET    /admin/cms/sections                (Sections layout manager)
│   ├── GET    /admin/cms/sections/:sectionKey    (Section editor sheet)
│   ├── PUT    /admin/cms/sections/:sectionKey    (Save section title/media/CTAs)
│   ├── PATCH  /admin/cms/sections/:key/visibility(Show/hide section toggle)
│   ├── PUT    /admin/cms/sections/reorder        (Section block ordering)
│   ├── CRUD   /admin/testimonials                (Client quotes manager)
│   ├── CRUD   /admin/social-looks                (Instagram feed grid manager)
│   └── GET    /admin/subscribers                 (Newsletter mailing list export)
│
├── Media Asset Library
│   ├── POST   /admin/media/upload                (Drag-and-drop file uploader)
│   ├── GET    /admin/media                       (Visual media picker modal)
│   └── DELETE /admin/media/:id                   (Delete asset file)
│
└── Site Settings & Navigation
    ├── GET    /admin/settings                    (Global settings form)
    ├── PATCH  /admin/settings                    (Save announcement / shipping / footer)
    ├── PUT    /admin/settings/search-keywords    (Search suggestion chips editor)
    ├── GET    /admin/navigation/mega-menu        (Mega menu navigation manager)
    └── PUT    /admin/navigation/mega-menu/:key   (Save menu category tree)
```

---

## 16. Backend Capabilities Missing for Admin Panel

The following features might typically be expected in an e-commerce back office, but are **NOT currently implemented in this backend**:

1. **Orders & Checkout Processing**
   * *Status:* **NOT AVAILABLE FROM BACKEND**
   * *Reason:* No `Order`, `OrderItem`, or `Payment` models exist in Prisma schema.
   * *Existing related API:* Bespoke commissions (`CustomCommission`) handles made-to-order inquiries.
   * *What would be required:* New database tables (`orders`, `order_items`), Stripe/PayPal webhooks, and `/admin/orders` CRUD endpoints.
2. **Customer Accounts & Profiles**
   * *Status:* **NOT AVAILABLE FROM BACKEND**
   * *Reason:* Backend currently only features `AdminUser`. Storefront customers do not have account login or password tables.
   * *Existing related API:* Customers exist only as contact details on `CustomCommission` and emails on `NewsletterSubscriber`.
   * *What would be required:* Customer auth routes (`/auth/register`, `/auth/customer-login`), customer profile table, and `/admin/customers` list.
3. **Aggregated Analytics & Revenue Reporting**
   * *Status:* **NOT AVAILABLE FROM BACKEND**
   * *Reason:* No dedicated analytics service or sales tables exist.
   * *Existing related API:* Basic counts available across products, reviews, commissions, and subscribers.
   * *What would be required:* Analytics aggregation endpoints (`/admin/analytics/overview`) computing metrics across sales and visitor logs.
4. **Audit Logs & Activity History**
   * *Status:* **NOT AVAILABLE FROM BACKEND**
   * *Reason:* No audit logging table exists in PostgreSQL schema.
   * *What would be required:* An `audit_logs` table tracking admin actions (who edited what product, when).
5. **Batch Product Import / Export (CSV / Excel)**
   * *Status:* **NOT AVAILABLE FROM BACKEND**
   * *Reason:* Only JSON CRUD and bulk publish/delete endpoints exist.
   * *What would be required:* Multi-part CSV parsing and export stream endpoints.
6. **Automated Transactional Emails**
   * *Status:* **NOT AVAILABLE FROM BACKEND**
   * *Reason:* No Nodemailer, SendGrid, or Resend mailer transport is installed in `package.json`.
   * *What would be required:* Email service integration to dispatch commission confirmations and review approvals.

---

## 17. Verification & Metrics

```text
Total route files analyzed: 3 (src/routes/index.js, src/routes/public.routes.js, src/routes/admin.routes.js) + app.js
Total API endpoints documented: 98 (96 API endpoints + 2 Root/Health system endpoints)
Public endpoints: 27 (24 Storefront public + 3 Public Admin Auth)
Authenticated endpoints: 71 (All protected under /api/v1/admin/*)
Admin endpoints total: 74 (3 Public Admin Auth + 71 Protected Admin)
Role-specific endpoints:
  - super_admin only: 4 (/admin/users CRUD)
  - super_admin & store_manager: 17 (Products CRUD/dup/bulk/reorder, Categories/Collections CRUD, Settings PATCH, Media DELETE)
  - super_admin, store_manager & content_editor: 3 (Products publish toggle, Review approve, Search-keywords PUT)
  - super_admin & content_editor: 12 (CMS sections PUT/visibility/reorder, Testimonials CRUD/reorder, Social looks CRUD/reorder, Mega menu PUT)
  - super_admin, store_manager & concierge: 2 (Commissions status PATCH & bulk-status POST)
  - Any authenticated admin role: 33 (Admin GET endpoints, /auth/me, /change-password, Custom Studio options CRUD, Media upload & list)
Upload endpoints: 1 (POST /api/v1/admin/media/upload)
Endpoints requiring special workflows: 18 (Multi-step product creations, review moderations, token refreshes, dossier lifecycles)
Endpoints with incomplete/uncertain behavior: 0 (All 98 endpoints verified against active controller, service, and Prisma definitions)
```
