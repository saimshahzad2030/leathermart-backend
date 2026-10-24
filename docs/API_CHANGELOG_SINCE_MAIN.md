# Atelier Valenti Milano / LeatherMart — Backend API Changelog

**Document Version:** 1.0.0  
**Generated:** 2026-10-21  
**Target Audience:** Frontend Engineers (`leathermart` Storefront & `leathermart-admin` Dashboard)

---

## 1. Executive Summary

This document details all backend API updates, behavioral enhancements, schema migrations, and route additions implemented since the last baseline commit pushed to `origin/main` (`5f65c9d141bbc93f3ef86734773cddc980d18531`).

### Major Feature Capabilities Added
1. **Customer Concierge & Contact Us System**:
   - Public submission endpoint with rate limiting (`POST /api/v1/contact`).
   - Admin lifecycle management (`GET`, `PATCH`, `DELETE /api/v1/admin/contact-messages`).
   - Automated HTML-escaped email alerts with customer `replyTo` preservation.
2. **Reusable Master Product Sizes**:
   - Centralized size catalog (`/api/v1/sizes` and `/api/v1/admin/sizes`).
   - Product size assignments with delete protection when assigned to active catalogue products.
3. **Reusable Master Product Colors**:
   - Centralized color catalog with HEX swatches (`/api/v1/colors` and `/api/v1/admin/colors`).
   - Product color assignments with delete protection when in use.
4. **Reusable Atelier Policies & Guarantees**:
   - Centralized policy catalog with bullet points (`/api/v1/policies` and `/api/v1/admin/policies`).
   - Reusable across products for shipping, returns, and lifetime craftsmanship guarantees.
5. **Multi-Region Explicit Pricing Engine**:
   - Centralized regional pricing (`ProductPrice` model) supporting `PK` (PKR), `IT` (EUR), and `GLOBAL` (EUR).
   - Market resolution via `?market=...` query param or `x-market` header.
6. **Product-Level Stock Availability & Master Control**:
   - Added `isInStock` boolean master toggle on products.
   - Refactored `ProductVariant.stock` (integer) to `ProductVariant.inStock` (boolean).
   - Public query filters support `in_stock`, `isInStock`, and `is_in_stock`.
7. **Enhanced Authentication & Robust Login**:
   - Fixed payload parsing in `validate` middleware to transparently accept stringified JSON, form-url-encoded JSON, and `{ data: { ... } }` payload envelopes.
   - Added one-time atomic bootstrap endpoint for initial Super Admin creation.
8. **Direct-to-Supabase Cloud Storage**:
   - Direct buffer uploads to Supabase Storage with automatic orphan image cleanup on delete/update.

---

## 2. Git Comparison & Baseline

| Property | Value |
| :--- | :--- |
| **Comparison Baseline Commit** | `5f65c9d141bbc93f3ef86734773cddc980d18531` |
| **Baseline Date & Message** | Thu Oct 8 07:26:38 2026 +0500 (`few changes`) |
| **Active Local Branch** | `staging` |
| **Upstream Remote** | `https://github.com/saimshahzad2030/leathermart-backend.git` |
| **Remote Status** | Local tracking branch `staging` is up to date with `origin/staging` and matches `origin/main` commit head. |

### Working Tree File Status

#### A. Modified Tracked Files (18 files):
- `.gitignore`: Added local scratch & environment exclusions.
- `package.json`: Updated build & vitest dependencies.
- `prisma/schema.prisma`: Added `ContactMessage`, `ProductSize`, `ProductColor`, `ProductPrice`, `ProductPolicy`, and `isInStock` to `Product`.
- `src/app.js`: Registered enhanced public and admin routes.
- `src/controllers/product.controller.js`: Market resolution and product stock toggles.
- `src/middlewares/errorHandler.js`: Normalized error codes and stack isolation.
- `src/middlewares/rateLimiter.js`: Added `contactRateLimiter` (10 per 15 min per IP).
- `src/middlewares/upload.js`: Added memory storage buffering.
- `src/middlewares/validate.js`: Added nested JSON unwrapping and stringified payload parsing.
- `src/routes/admin.routes.js`: Registered size, color, policy, media upload, and contact message admin routes.
- `src/routes/public.routes.js`: Registered sizes, colors, policies, and contact submission routes.
- `src/scripts/seed.js`: Seed data updated for sizes, colors, regional prices, and in-stock flags.
- `src/services/auth.service.js`: Added `bootstrapSuperAdmin` and login parsing guards.
- `src/services/media.service.js`: Refactored to use `StorageService`.
- `src/services/product.service.js`: Integrated relational sizes, colors, policies, regional pricing, and in-stock management.
- `src/utils/mapper.js`: Updated `mapProduct` with `resolvedPrice`, `regionalPrices`, `sizes`, `colors`, `policies`, and `isInStock`.
- `src/validators/product.validator.js`: Updated with `regionalPriceSchema`, `isInStock`, boolean query filters, and size/color requirements.
- `tests/api.test.js`: Updated mock database with sizes, colors, policies, and prices.

#### B. New Untracked Source Files (14 files):
- `src/controllers/size.controller.js`
- `src/controllers/color.controller.js`
- `src/controllers/policy.controller.js`
- `src/controllers/contact.controller.js`
- `src/services/size.service.js`
- `src/services/color.service.js`
- `src/services/policy.service.js`
- `src/services/pricing.service.js`
- `src/services/contact.service.js`
- `src/services/email.service.js`
- `src/services/storage.service.js`
- `src/validators/size.validator.js`
- `src/validators/color.validator.js`
- `src/validators/policy.validator.js`
- `src/validators/contact.validator.js`

---

## 3. Complete API Endpoint Changelog

### Summary Matrix

| Method | Endpoint | Module | Change Type | Auth Required | Roles |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/contact` | Contact | **NEW** | No | Public |
| `GET` | `/api/v1/admin/contact-messages` | Contact | **NEW** | Yes | All Authenticated Admin |
| `GET` | `/api/v1/admin/contact-messages/:id` | Contact | **NEW** | Yes | All Authenticated Admin |
| `PATCH` | `/api/v1/admin/contact-messages/:id` | Contact | **NEW** | Yes | All Authenticated Admin |
| `DELETE` | `/api/v1/admin/contact-messages/:id` | Contact | **NEW** | Yes | `super_admin`, `store_manager` |
| `GET` | `/api/v1/sizes` | Sizes | **NEW** | No | Public |
| `GET` | `/api/v1/admin/sizes` | Sizes | **NEW** | Yes | All Authenticated Admin |
| `GET` | `/api/v1/admin/sizes/:id` | Sizes | **NEW** | Yes | All Authenticated Admin |
| `POST` | `/api/v1/admin/sizes` | Sizes | **NEW** | Yes | `super_admin`, `store_manager` |
| `PUT` | `/api/v1/admin/sizes/:id` | Sizes | **NEW** | Yes | `super_admin`, `store_manager` |
| `POST` | `/api/v1/admin/sizes/:id/toggle-active` | Sizes | **NEW** | Yes | `super_admin`, `store_manager` |
| `DELETE` | `/api/v1/admin/sizes/:id` | Sizes | **NEW** | Yes | `super_admin`, `store_manager` |
| `GET` | `/api/v1/colors` | Colors | **NEW** | No | Public |
| `GET` | `/api/v1/admin/colors` | Colors | **NEW** | Yes | All Authenticated Admin |
| `GET` | `/api/v1/admin/colors/:id` | Colors | **NEW** | Yes | All Authenticated Admin |
| `POST` | `/api/v1/admin/colors` | Colors | **NEW** | Yes | `super_admin`, `store_manager` |
| `PUT` | `/api/v1/admin/colors/:id` | Colors | **NEW** | Yes | `super_admin`, `store_manager` |
| `POST` | `/api/v1/admin/colors/:id/toggle-active` | Colors | **NEW** | Yes | `super_admin`, `store_manager` |
| `DELETE` | `/api/v1/admin/colors/:id` | Colors | **NEW** | Yes | `super_admin`, `store_manager` |
| `GET` | `/api/v1/policies` | Policies | **NEW** | No | Public |
| `GET` | `/api/v1/admin/policies` | Policies | **NEW** | Yes | All Authenticated Admin |
| `GET` | `/api/v1/admin/policies/:id` | Policies | **NEW** | Yes | All Authenticated Admin |
| `POST` | `/api/v1/admin/policies` | Policies | **NEW** | Yes | `super_admin`, `store_manager` |
| `PUT` | `/api/v1/admin/policies/:id` | Policies | **NEW** | Yes | `super_admin`, `store_manager` |
| `POST` | `/api/v1/admin/policies/:id/toggle-active` | Policies | **NEW** | Yes | `super_admin`, `store_manager` |
| `DELETE` | `/api/v1/admin/policies/:id` | Policies | **NEW** | Yes | `super_admin`, `store_manager` |
| `POST` | `/api/v1/admin/products/images/upload` | Products | **NEW** | Yes | All Authenticated Admin |
| `GET` | `/api/v1/products` | Products | **UPDATED** | No | Public |
| `GET` | `/api/v1/products/:slug` | Products | **UPDATED** | No | Public |
| `GET` | `/api/v1/products/search` | Products | **UPDATED** | No | Public |
| `POST` | `/api/v1/admin/products` | Products | **UPDATED** | Yes | `super_admin`, `store_manager` |
| `PUT` | `/api/v1/admin/products/:id` | Products | **UPDATED** | Yes | `super_admin`, `store_manager` |
| `PATCH` | `/api/v1/admin/products/:id` | Products | **UPDATED** | Yes | `super_admin`, `store_manager` |
| `DELETE` | `/api/v1/admin/products/:id` | Products | **UPDATED** | Yes | `super_admin`, `store_manager` |
| `POST` | `/api/v1/admin/products/:id/duplicate` | Products | **UPDATED** | Yes | `super_admin`, `store_manager` |
| `POST` | `/api/v1/admin/auth/login` | Auth | **UPDATED** | No | Public Admin |

---

## 4. Exact Before-and-After Differences

### 1. `POST /api/v1/contact` (NEW)
- **Before:** No contact endpoint existed. Frontends lacked a backend persistence mechanism for client inquiries.
- **After:** Fully validated public endpoint with IP rate limiting (10 req / 15 min). Persists inquiry into `contact_messages` table and sends email notification via SMTP or structured log.
- **Payload:**
  ```json
  {
    "name": "Matteo Rossi",
    "email": "matteo.rossi@milano.it",
    "phone": "+39 02 1234 5678",
    "subject": "Product Inquiry",
    "message": "I would like to inquire about bespoke sizing for the shearling jacket."
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Thank you for contacting Atelier Valenti Milano. Your message has been received.",
    "data": {
      "id": "e83f3e1a-5b12-4d2c-9a28-92fc9e3a7491",
      "name": "Matteo Rossi",
      "email": "matteo.rossi@milano.it",
      "subject": "Product Inquiry",
      "status": "new",
      "createdAt": "2026-10-21T14:46:32.120Z"
    }
  }
  ```

---

### 2. `GET /api/v1/products` & `GET /api/v1/products/:slug` (UPDATED)
- **Before:**
  - Returned only single EUR price (`price` and `salePrice`).
  - No regional currency support.
  - Variant stock was an integer (`stock: 5`).
  - No product-level master in-stock toggle.
  - No relational sizes, colors, or policy assignments.
- **After:**
  - Accepts `market` query param (`?market=PK`, `?market=IT`, `?market=GLOBAL`) or `x-market` header.
  - Returns `currency` (`EUR`, `PKR`), `currencySymbol` (`€`, `Rs.`), and `resolvedPrice`:
    ```json
    "resolvedPrice": {
      "regionCode": "PK",
      "currency": "PKR",
      "symbol": "Rs.",
      "price": 85000,
      "salePrice": 75000,
      "formattedPrice": "Rs. 85,000",
      "formattedSalePrice": "Rs. 75,000",
      "isSale": true,
      "discountPercentage": 12
    }
    ```
  - Returns `isInStock: boolean` (product-level master toggle) and `inStock: boolean` (overall availability).
  - Variant objects now contain `inStock: boolean` instead of integer `stock`.
  - Returns structured `sizes: ProductSize[]`, `colors: ProductColor[]`, and `policies: ProductPolicy[]`.
  - Supports query filters: `in_stock=true|false`, `isInStock=true|false`, and `is_in_stock=true|false`.
- **Frontend Impact:**
  - Storefront product grids and detail pages should read `product.isInStock` (or `product.inStock`) to display luxury "Out of Stock" / "Available" badges.
  - Variant selectors should check `variant.inStock` boolean instead of `variant.stock > 0`.
  - Use `product.currencySymbol` and `product.price` or `product.resolvedPrice` for price rendering.

---

### 3. `POST /api/v1/admin/products` & `PUT /api/v1/admin/products/:id` (UPDATED)
- **Before:**
  - Accepted only flat `availableSizes: string[]` and `availableColors: { name, hex }[]`.
  - Variants required integer `stock`.
  - Did not support regional pricing or reusable policies.
  - Required JSON body only; multipart/form-data required manual custom handling.
- **After:**
  - Accepts both `application/json` and `multipart/form-data` with automatic stringified field deserialization.
  - Accepts `isInStock: boolean` (defaults to `true`).
  - Accepts `regionalPrices: Array<{ regionCode: 'PK'|'IT'|'GLOBAL', currency: 'PKR'|'EUR', price: number, salePrice?: number|null, isActive?: boolean }>`
  - Accepts `sizes: string[]` (array of size IDs or size names).
  - Accepts `colors: string[]` (array of color IDs or color names).
  - Accepts `policies: string[]` (array of policy IDs to associate).
  - Automatic cleanup: When updating or deleting products, orphaned image assets hosted on Supabase Storage are automatically deleted to prevent cloud storage bloat.
- **Frontend Impact:**
  - Product creation and edit forms in the admin panel can now assign reusable sizes, colors, regional pricing, and policies.
  - Form field `isInStock` toggle can be included on product details.

---

### 4. Admin Management for Sizes, Colors, and Policies (NEW)
- **Before:** No dedicated size, color, or policy endpoints existed. Admins could only type ad-hoc string values inside each product.
- **After:** Full suite of CRUD endpoints under `/api/v1/admin/sizes`, `/api/v1/admin/colors`, and `/api/v1/admin/policies`.
- **Delete Protection:**
  - If an admin attempts to delete a size, color, or policy that is currently assigned to one or more products, the API returns HTTP 400 with a clear error:
    ```json
    {
      "success": false,
      "message": "Cannot delete size '48 (EU M)' because it is currently assigned to 4 product(s). Please unassign this size from all products before deleting, or deactivate it instead.",
      "errorCode": "ERR_SIZE_IN_USE"
    }
    ```
- **Toggle Active:**
  - `POST /api/v1/admin/sizes/:id/toggle-active`
  - `POST /api/v1/admin/colors/:id/toggle-active`
  - `POST /api/v1/admin/policies/:id/toggle-active`

---

## 5. Database Schema & Migration Changes

### Models Added to `schema.prisma`:
1. `ProductSize` (`product_sizes`): Reusable master garment sizes.
2. `ProductSizeAssignment` (`product_size_assignments`): Many-to-many join table between `Product` and `ProductSize`.
3. `ProductColor` (`product_colors`): Reusable master leather colors with HEX codes.
4. `ProductColorAssignment` (`product_color_assignments`): Many-to-many join table between `Product` and `ProductColor`.
5. `ProductPrice` (`product_prices`): Regional market pricing overrides per product.
6. `ProductPolicy` (`product_policies`): Reusable client care, shipping, and guarantee policies.
7. `ProductPolicyAssignment` (`product_policy_assignments`): Many-to-many join table between `Product` and `ProductPolicy`.
8. `ContactMessage` (`contact_messages`): Persisted customer concierge inquiries.

### Modifications to Existing Models:
- `Product`:
  - Added `isInStock Boolean @default(true) @map("is_in_stock")`.
  - Added index `@@index([isInStock])`.
  - Added relation fields: `prices`, `sizeAssignments`, `colorAssignments`, `policyAssignments`.
- `ProductVariant`:
  - Changed `stock Int? @default(0)` to `inStock Boolean @default(true) @map("in_stock")`.

---

## 6. Environment Variables and Integrations

| Variable | Required | Service | Purpose | Frontend Safe? |
| :--- | :--- | :--- | :--- | :--- |
| `DATABASE_URL` | **Yes** | PostgreSQL / Supabase | Primary database connection string | **NO** (Backend only) |
| `JWT_SECRET` | **Yes** | Authentication | Signing and validating JWT access tokens | **NO** (Backend only) |
| `JWT_REFRESH_SECRET`| **Yes** | Authentication | Signing and validating refresh tokens | **NO** (Backend only) |
| `SUPABASE_URL` | **Yes** | Supabase | Storage and Supabase API access | Yes (Public URL) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Supabase | Storage administrative operations | **NO** (Secret) |
| `SUPABASE_STORAGE_BUCKET` | Optional | Supabase Storage | Target media bucket (default: `media`) | Yes |
| `SMTP_HOST` | Optional | Email Service | Hostname for outgoing mail server | **NO** (Backend only) |
| `SMTP_PORT` | Optional | Email Service | Port for outgoing mail (default: 587) | **NO** (Backend only) |
| `SMTP_USER` | Optional | Email Service | SMTP authentication username | **NO** (Backend only) |
| `SMTP_PASS` | Optional | Email Service | SMTP authentication password | **NO** (Backend only) |
| `SMTP_FROM` | Optional | Email Service | Sender address for emails | **NO** (Backend only) |
| `CONTACT_NOTIFICATION_EMAIL`| Optional | Email Service | Recipient for concierge inquiries | **NO** (Backend only) |

*(Note: If SMTP credentials are not configured, the backend logs simulated email dispatches without erroring).*

---

## 7. Verification Status

| Suite | Status | Passed | Duration |
| :--- | :--- | :--- | :--- |
| **Contact Us Feature Suite** (`tests/contact.test.js`) | **PASSED** | 21 / 21 | 51ms |
| **Product-Level Stock Availability** (`tests/product-stock.test.js`) | **PASSED** | 12 / 12 | 44ms |
| **Admin Login & Regression** (`tests/login-regression.test.js`) | **PASSED** | 6 / 6 | 1106ms |
| **Storage & Supabase Service** (`tests/storage.test.js`) | **PASSED** | 13 / 13 | 96ms |
| **Category Relationship & Deletion** (`tests/product-category-relationship.test.js`)| **PASSED** | 9 / 9 | 95ms |
| **Core API Test Suite** (`tests/api.test.js`) | **PASSED** | 32 / 32 | 1009ms |
| **Bootstrap Test Suite** (`tests/bootstrap.test.js`) | **PASSED** | 12 / 12 | 40ms |
| **Total Test Runs** | **PASSED** | **105 / 105** | **5.14s** |
| **Admin Panel Build** (`tsc && vite build`) | **PASSED** | 0 errors | 4.74s |
| **Storefront Typecheck** (`npx tsc --noEmit`) | **PASSED** | 0 errors | 2.10s |
