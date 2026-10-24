# Atelier Valenti Milano / LeatherMart — Complete Staging Backend API Reference

**Document Version:** 2.0.0  
**Target Branch:** `staging`  
**Comparison Baseline:** `origin/main` (commit `5f65c9d` / `few changes`)  
**Active Staging Head:** `98d3d69` (`few changes`)  
**Target Audience:** Senior Backend Engineers, Full-Stack Architects, and Frontend Integration Agents  
**Environment:** Node.js (ESM), Express.js 4, Prisma ORM, Supabase PostgreSQL, Supabase Storage  

---

## 1. Branch Comparison & Audit Summary

A full code audit and Git comparison between `main` and `staging` confirms that branch `staging` contains **2 commits** (`ffaede1` and `98d3d69`) ahead of `main` with **62 changed/added files** and **111 passing tests** across 7 automated test suites.

### 1.1 Git Audit Overview

```bash
git log --oneline main..staging
# 98d3d69 few changes
# ffaede1 Apply staging backend updates
```

- **Added Source Controllers & Services:**
  - `src/controllers/size.controller.js` & `src/services/size.service.js`
  - `src/controllers/color.controller.js` & `src/services/color.service.js`
  - `src/controllers/policy.controller.js` & `src/services/policy.service.js`
  - `src/controllers/contact.controller.js` & `src/services/contact.service.js`
  - `src/services/pricing.service.js`
  - `src/services/email.service.js`
  - `src/services/storage.service.js`
- **Added Validators:**
  - `src/validators/size.validator.js`
  - `src/validators/color.validator.js`
  - `src/validators/policy.validator.js`
  - `src/validators/contact.validator.js`
- **Modified Core Modules:**
  - `prisma/schema.prisma` & 5 database migrations in `prisma/migrations/`
  - `src/app.js` (Route mounting, CORS origin handling)
  - `src/routes/index.js` (Dual routing `/api/v1` and direct fallback `/api`)
  - `src/routes/public.routes.js` (Added branding, sizes, colors, policies, contact)
  - `src/routes/admin.routes.js` (Added branding, sizes, colors, policies, contact-messages, image upload)
  - `src/controllers/product.controller.js` & `src/services/product.service.js`
  - `src/controllers/settings.controller.js` & `src/services/settings.service.js`
  - `src/utils/mapper.js` (`mapProduct` updated with stock, regional pricing, relational attributes)
  - `src/validators/product.validator.js` & `src/validators/settings.validator.js`
  - `src/middlewares/validate.js` (Resilient JSON, urlencoded, and envelope parsing)
  - `src/middlewares/upload.js` (Memory buffering and MIME validation)
  - `src/middlewares/errorHandler.js` (Standardized PostgreSQL/Prisma error codes)
  - `src/middlewares/rateLimiter.js` (Added `contactRateLimiter`)
  - `src/services/auth.service.js` (Added `bootstrapSuperAdmin`)

### 1.2 Uncommitted Working Tree Audit
`git status` reports: `nothing to commit, working tree clean`. There are no uncommitted or untracked changes on `staging`.

---

## 2. API Architecture, Route Prefixes & Conventions

### 2.1 Route Prefix Mapping

Routes are configured in `src/app.js` and `src/routes/index.js`:
- Entry point: `app.use('/api', routes)`
- Version 1 router:
  - `router.use('/v1/admin', adminRoutes)`
  - `router.use('/v1', publicRoutes)`
- Root fallback router:
  - `router.use('/admin', adminRoutes)`
  - `router.use('/', publicRoutes)`

> **Standard Convention:** Frontend clients SHOULD prefix all requests with `/api/v1`. While direct `/api/...` fallbacks are supported by the server, `/api/v1/...` is the canonical versioned contract.

| Endpoint Category | Full Canonical URL Path | Fallback Path |
|---|---|---|
| Server Health | `GET /health` | `GET /api/health` |
| Public Storefront APIs | `/api/v1/{resource}` | `/api/{resource}` |
| Admin Dashboard APIs | `/api/v1/admin/{resource}` | `/api/admin/{resource}` |

### 2.2 Standard Success Envelope

All successful responses are returned via `ApiResponse.success` or `ApiResponse.created`:

```typescript
interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
```

Example JSON:
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {}
}
```

### 2.3 Standard Error Envelope & Status Codes

All errors are handled centrally via `errorHandler` (`src/middlewares/errorHandler.js`) and `ApiResponse.error`:

```typescript
interface ApiErrorResponse {
  success: false;
  message: string;
  errorCode: string;
  statusCode: number;
  errors?: Record<string, string[]>; // Populated on 422 Validation failures
  details?: any;                     // Populated on specific business conflicts
}
```

#### Status Code Conventions:
- `200 OK`: Request completed successfully.
- `201 Created`: Resource successfully created.
- `400 Bad Request` (`ERR_INVALID_ID`, `ERR_EMPTY_FILE`, `ERR_FILE_TOO_LARGE`, `ERR_INVALID_FILE_TYPE`, `ERR_SIZE_IN_USE`, `ERR_COLOR_IN_USE`, `ERR_POLICY_IN_USE`, `ERR_SIZE_REQUIRED`, `ERR_COLOR_REQUIRED`, `ERR_INVALID_CATEGORY`): Malformed input, business constraint violation, or missing required attributes.
- `401 Unauthorized` (`ERR_UNAUTHORIZED`, `ERR_TOKEN_EXPIRED`, `ERR_INVALID_TOKEN`): Missing or invalid JWT.
- `403 Forbidden` (`ERR_FORBIDDEN`): Insufficient role or deactivated account.
- `404 Not Found` (`ERR_ENDPOINT_NOT_FOUND`, `CATEGORY_NOT_FOUND`): Nonexistent resource.
- `409 Conflict` (`ERR_DUPLICATE_RECORD`, `CATEGORY_IN_USE`, `ERR_BOOTSTRAP_NOT_ALLOWED`): Duplicate unique field or foreign key conflict.
- `422 Unprocessable Entity` (`ERR_VALIDATION_FAILED`): Zod schema validation failure.
- `429 Too Many Requests` (`ERR_RATE_LIMIT_EXCEEDED`, `ERR_AUTH_RATE_LIMIT`, `ERR_CONTACT_RATE_LIMIT`): Exceeded rate limiter window.
- `500 Internal Server Error` (`ERR_INTERNAL_SERVER`, `ERR_SERVER_ERROR`): Uncaught exception.

#### 422 Schema Validation Example:
```json
{
  "success": false,
  "message": "Validation failed on submitted payload",
  "errorCode": "ERR_VALIDATION_FAILED",
  "statusCode": 422,
  "errors": {
    "sizes": ["Every product must have at least one available size selected"],
    "colors": ["Every product must have at least one available color selected"]
  }
}
```

### 2.4 Authentication & Authorization

- **Header:** `Authorization: Bearer <accessToken>`
- **Cookie Fallback:** Reads `req.cookies.token` or `req.cookies.accessToken`.
- **JWT Lifespan:** Access Token: 7 days (`JWT_EXPIRES_IN`), Refresh Token: 30 days (`JWT_REFRESH_EXPIRES_IN`).
- **Roles Defined:**
  - `super_admin`: Full system access, bypasses all permission checks.
  - `store_manager`: Catalog, pricing, inventory, policies, settings.
  - `content_editor`: CMS sections, reviews moderation, testimonials.
  - `concierge`: Contact inquiries, bespoke commissions.

### 2.5 Resilient Payload Parsing (`validate` middleware)

The backend `validate` middleware transparently handles:
1. Standard JSON bodies (`Content-Type: application/json`).
2. Stringified JSON payloads.
3. Raw JSON sent under `application/x-www-form-urlencoded` without headers.
4. Enveloped requests wrapped in `{ "data": { ... } }`.

---

## 3. Database Schema & Migration Audit

Five migrations have been introduced in `prisma/migrations/`:

| Migration | Purpose | Status |
|---|---|---|
| `20261020113543_init` | Initial baseline database schema | Applied |
| `20261021083029_add_sizes_colors_regional_pricing_policies` | Adds `product_sizes`, `product_colors`, `product_policies`, `product_prices`, their join tables, and replaces `ProductVariant.stock` with `in_stock` boolean | Applied |
| `20261021115100_add_product_level_is_in_stock` | Adds `is_in_stock` boolean column and index to `products` table | Applied |
| `20261021140000_add_contact_messages` | Creates `contact_messages` table with indexes on `status`, `email`, and `created_at` | Applied |
| `20261022162000_add_platform_branding_fields` | Adds `platform_name`, `platform_short_name`, `logo_url`, `logo_dark_url`, `logo_light_url`, `favicon_url`, `browser_title`, `meta_description` to `site_settings` | Applied |

### 3.1 New Database Models

#### 1. `ProductSize` (`product_sizes`)
- `id` (UUID, PK)
- `name` (VarChar 50, Unique)
- `slug` (VarChar 50, Unique)
- `sortOrder` (`sort_order`, Int, Default: 0)
- `isActive` (`is_active`, Boolean, Default: true)
- `createdAt`, `updatedAt` (Timestamptz)

#### 2. `ProductSizeAssignment` (`product_size_assignments`)
- `id` (UUID, PK)
- `productId` (`product_id`, UUID -> `Product.id` CASCADE)
- `sizeId` (`size_id`, UUID -> `ProductSize.id` RESTRICT)
- Unique: `[productId, sizeId]`

#### 3. `ProductColor` (`product_colors`)
- `id` (UUID, PK)
- `name` (VarChar 50, Unique)
- `slug` (VarChar 50, Unique)
- `hex` (VarChar 10, HEX string e.g. `#11100F`)
- `sortOrder` (`sort_order`, Int, Default: 0)
- `isActive` (`is_active`, Boolean, Default: true)
- `createdAt`, `updatedAt` (Timestamptz)

#### 4. `ProductColorAssignment` (`product_color_assignments`)
- `id` (UUID, PK)
- `productId` (`product_id`, UUID -> `Product.id` CASCADE)
- `colorId` (`color_id`, UUID -> `ProductColor.id` RESTRICT)
- Unique: `[productId, colorId]`

#### 5. `ProductPrice` (`product_prices`)
- `id` (UUID, PK)
- `productId` (`product_id`, UUID -> `Product.id` CASCADE)
- `regionCode` (`region_code`, VarChar 10, Enum: `PK`, `IT`, `GLOBAL`)
- `currency` (VarChar 10, `PKR` or `EUR`)
- `price` (Decimal 10, 2)
- `salePrice` (`sale_price`, Decimal 10, 2, Nullable)
- `isActive` (`is_active`, Boolean, Default: true)
- Unique: `[productId, regionCode]`

#### 6. `ProductPolicy` (`product_policies`)
- `id` (UUID, PK)
- `name` (VarChar 150)
- `slug` (VarChar 100, Unique)
- `description` (Text)
- `bulletPoints` (`bullet_points`, Text[], Default: `[]`)
- `sortOrder` (`sort_order`, Int, Default: 0)
- `isActive` (`is_active`, Boolean, Default: true)

#### 7. `ProductPolicyAssignment` (`product_policy_assignments`)
- `id` (UUID, PK)
- `productId` (`product_id`, UUID -> `Product.id` CASCADE)
- `policyId` (`policy_id`, UUID -> `ProductPolicy.id` RESTRICT)
- `sortOrder` (`sort_order`, Int, Default: 0)
- Unique: `[productId, policyId]`

#### 8. `ContactMessage` (`contact_messages`)
- `id` (UUID, PK)
- `name` (VarChar 150)
- `email` (VarChar 255)
- `phone` (VarChar 50, Default: `""`)
- `subject` (VarChar 150)
- `message` (Text)
- `status` (VarChar 30, Default: `'new'`, Enum: `new`, `in_progress`, `resolved`, `spam`)
- `adminNotes` (`admin_notes`, Text, Default: `""`)
- `createdAt`, `updatedAt` (Timestamptz)

### 3.2 Modified Models

#### 1. `Product` (`products`)
- **Added:** `isInStock` (`is_in_stock`, Boolean, Default: true) + Index
- **Added Relations:** `prices`, `sizeAssignments`, `colorAssignments`, `policyAssignments`

#### 2. `ProductVariant` (`product_variants`)
- **BREAKING CHANGE:** Dropped `stock` (Int) column; replaced with `inStock` (`in_stock`, Boolean, Default: true).

#### 3. `SiteSetting` (`site_settings`)
- **Added:** `platformName` (`platform_name`, VarChar 150, Default: `'Atelier Valenti Milano'`)
- **Added:** `platformShortName` (`platform_short_name`, VarChar 50, Default: `'AVM'`)
- **Added:** `logoUrl` (`logo_url`, Text, Nullable)
- **Added:** `logoDarkUrl` (`logo_dark_url`, Text, Nullable)
- **Added:** `logoLightUrl` (`logo_light_url`, Text, Nullable)
- **Added:** `faviconUrl` (`favicon_url`, Text, Nullable)
- **Added:** `browserTitle` (`browser_title`, VarChar 200, Default: `'Atelier Valenti Milano — Handcrafted European Leather Outerwear'`)
- **Added:** `metaDescription` (`meta_description`, Text, Default: `'Luxury Italian calfskin and lambskin outerwear crafted by hand in our Milanese atelier. AZO-free certified leather with European express delivery.'`)

---

## 4. Multi-Region Pricing Engine (`PricingService`)

The backend introduces explicit multi-market pricing without automatic currency conversions.

### Supported Markets & Currencies:
- `PK`: Pakistani Rupee (`PKR`), Symbol: `Rs.`
- `IT`: Euro (`EUR`), Symbol: `€`
- `GLOBAL`: Euro (`EUR`), Symbol: `€` (Default)

### Market Request Resolution:
The active market is resolved from:
1. Query parameter: `?market=PK` or `?market=IT` or `?market=GLOBAL`
2. Request Header: `x-market: PK`
3. Fallback: `GLOBAL`

### Resolution Cascade:
1. Active regional price configured for the requested market in `product_prices`.
2. Fallback to `GLOBAL` regional price.
3. Fallback to root `product.price` and `product.salePrice` (interpreted as Global EUR).

### Resolved Price Response Object:
When querying products, the product envelope contains `resolvedPrice`:
```typescript
interface ResolvedPrice {
  market: 'PK' | 'IT' | 'GLOBAL';
  requestedMarket?: string;
  currency: 'PKR' | 'EUR';
  symbol: 'Rs.' | '€';
  price: number;
  salePrice: number | null;
  effectivePrice: number;
  isSale: boolean;
  formattedPrice: string;       // e.g. "€1.450" or "Rs. 420,000"
  formattedSalePrice: string | null;
  isFallback: boolean;
}
```

---

## 5. Public Storefront API Reference

All endpoints below require no authentication.

### 5.1 Platform Branding & Global Settings

#### `GET /api/v1/settings/branding`
- **Status:** **NEW** (Commit `98d3d69`)
- **Purpose:** Fetches global store branding, brand logos (light/dark/standard), favicon, and default SEO tags for dynamic layout rendering.
- **Request Headers:** None
- **Response Body (200 OK):**
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    "platformName": "Atelier Valenti Milano",
    "platformShortName": "AVM",
    "logoUrl": "https://your-project.supabase.co/storage/v1/object/public/media/branding/logo.svg",
    "logoDarkUrl": "https://your-project.supabase.co/storage/v1/object/public/media/branding/logo-dark.svg",
    "logoLightUrl": "https://your-project.supabase.co/storage/v1/object/public/media/branding/logo-light.svg",
    "faviconUrl": "https://your-project.supabase.co/storage/v1/object/public/media/branding/favicon.ico",
    "browserTitle": "Atelier Valenti Milano — Handcrafted European Leather Outerwear",
    "metaDescription": "Luxury Italian calfskin and lambskin outerwear crafted by hand in our Milanese atelier. AZO-free certified leather with European express delivery.",
    "updatedAt": "2026-10-22T19:00:00.000Z"
  }
}
```

#### `GET /api/v1/settings/announcement`
- **Purpose:** Fetches the top-banner announcement settings.
- **Response Body (200 OK):**
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    "enabled": true,
    "badge": "Milano Atelier",
    "message": "Complimentary Express European Delivery on All Orders Over €250",
    "linkText": "EXPLORE BESPOKE",
    "linkHref": "/customize",
    "countryNotice": "IT • DE • FR • CH • UK"
  }
}
```

#### `GET /api/v1/settings/shipping`
- **Purpose:** Fetches shipping cost calculations, free shipping thresholds, and country delivery rates.
- **Response Body (200 OK):**
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    "freeShippingThreshold": 250,
    "standardShippingCost": 15,
    "countries": [
      { "code": "IT", "name": "Italy", "rate": 0, "days": "1–2 business days" },
      { "code": "DE", "name": "Germany", "rate": 15, "days": "2–3 business days" },
      { "code": "FR", "name": "France", "rate": 15, "days": "2–3 business days" }
    ]
  }
}
```

#### `GET /api/v1/settings/footer`
- **Purpose:** Fetches footer addresses, certification stamps, social handles, and copyright notice.
- **Response Body (200 OK):**
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    "certificationLine": "✔️ AZO-Free Leather · ✔️ EU REACH Compliant",
    "atelierAddress": "Via Montenapoleone, 27, 20121 Milano, Italy",
    "instagramHandle": "@ATELIERVALENTI",
    "copyrightText": "© 2026 Atelier Valenti Milano. All rights reserved.",
    "cities": ["MILANO", "PARIS", "ZURICH", "MUNICH"]
  }
}
```

#### `GET /api/v1/settings/search-keywords`
- **Purpose:** Fetches trending keywords for search suggestions.
- **Response Body (200 OK):**
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": ["Biker", "Bomber", "Shearling", "Suede", "Calfskin", "Nappa", "Trench"]
}
```

#### `GET /api/v1/seo/metadata`
- **Purpose:** Resolves dynamic OpenGraph, Title, Meta, and JSON-LD schema for any given frontend path.
- **Query Parameters:** `path` (string, e.g. `/products/milano-biker-jacket`)
- **Response Body (200 OK):**
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    "title": "Milano Biker Jacket in Full-Grain Italian Calfskin | ATELIER VALENTI MILANO",
    "description": "Handcrafted in Milan. Double asymmetrical front closure...",
    "canonical": "https://ateliervalenti.com/products/milano-biker-jacket",
    "openGraph": {
      "title": "Milano Biker Jacket | ATELIER VALENTI",
      "description": "Double asymmetrical front closure with antique brass hardware.",
      "image": "https://your-project.supabase.co/storage/v1/object/public/media/products/milano-biker-jacket/1.webp",
      "type": "product"
    },
    "jsonLd": {
      "@context": "https://schema.org/",
      "@type": "Product",
      "name": "Milano Biker Jacket",
      "image": "https://your-project.supabase.co/storage/v1/object/public/media/products/milano-biker-jacket/1.webp"
    }
  }
}
```

---

### 5.2 Products & Catalogue APIs

#### `GET /api/v1/products`
- **Status:** **UPDATED**
- **Purpose:** Paginated list of published products with regional pricing and stock filtering.
- **Headers:** `x-market` (optional: `PK`, `IT`, `GLOBAL`)
- **Query Parameters:**
  - `page` (number, default: 1)
  - `limit` (number, min: 1, max: 48, default: 12)
  - `category` (string, slug e.g. `biker`, `bomber`, `aviator`, `leather-coats`)
  - `gender` (enum: `men`, `women`, `unisex`, `all`)
  - `style` (string)
  - `leatherType` / `leather_type` / `leatherFamily` (string: `suede`, `shearling`, `calfskin`, `lambskin`)
  - `market` (string: `PK`, `IT`, `GLOBAL`)
  - `minPrice` / `min_price` (number)
  - `maxPrice` / `max_price` (number)
  - `is_new` (boolean: `true`/`false`)
  - `is_bestseller` (boolean: `true`/`false`)
  - `is_featured` (boolean: `true`/`false`)
  - `in_stock` / `isInStock` / `is_in_stock` (boolean: `true`/`false`)
  - `sort` (enum: `price-asc`, `price-desc`, `newest`, `rating`, `featured`)
  - `q` / `search` (string)
- **Response Body (200 OK):**
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": [
    {
      "id": "c1f7b8d0-e123-4567-89ab-cdef01234567",
      "_id": "c1f7b8d0-e123-4567-89ab-cdef01234567",
      "sku": "AVM-BIKER-01",
      "slug": "milano-biker-jacket",
      "name": "Milano Biker Jacket",
      "tagline": "Handcrafted asymmetrical motorcycle jacket in vegetable-tanned calfskin",
      "category": "biker",
      "categoryLabel": "Biker Jackets",
      "collectionId": null,
      "gender": "men",
      "styles": ["biker", "cafe-racer"],
      "price": 1450,
      "salePrice": 1290,
      "resolvedPrice": {
        "market": "GLOBAL",
        "currency": "EUR",
        "symbol": "€",
        "price": 1450,
        "salePrice": 1290,
        "effectivePrice": 1290,
        "isSale": true,
        "formattedPrice": "€1.450",
        "formattedSalePrice": "€1.290",
        "isFallback": false
      },
      "regionalPrices": [
        {
          "id": "e9b7a111-2222-3333-4444-555566667777",
          "regionCode": "GLOBAL",
          "currency": "EUR",
          "price": 1450,
          "salePrice": 1290,
          "isActive": true
        },
        {
          "id": "f8a6b222-3333-4444-5555-666677778888",
          "regionCode": "PK",
          "currency": "PKR",
          "price": 420000,
          "salePrice": 375000,
          "isActive": true
        }
      ],
      "currency": "EUR",
      "currencySymbol": "€",
      "isFeatured": true,
      "isBestseller": true,
      "isNewArrival": false,
      "isPublished": true,
      "isInStock": true,
      "inStock": true,
      "leatherType": "Full-Grain Italian Calfskin",
      "hardware": "Antique Brass YKK Excella",
      "lining": "100% Cupro Bemberg",
      "description": "Cut from 1.2mm vegetable-tanned Italian calfskin...",
      "editorialQuote": "The quintessential Milanese silhouette.",
      "specifications": [
        "1.2mm vegetable-tanned calfskin",
        "Hand-waxed patina finish",
        "Two internal welt pockets"
      ],
      "careInstructions": [
        "Specialist leather dry clean only",
        "Store on wide wooden hanger"
      ],
      "modelInfo": "Model is 188cm / 6'2\" wearing size 50 (M)",
      "images": [
        {
          "url": "https://your-project.supabase.co/storage/v1/object/public/media/products/milano-biker-jacket/front.webp",
          "alt": "Milano Biker Jacket Front",
          "isPrimary": true,
          "isHover": false,
          "type": "front",
          "sortOrder": 1
        },
        {
          "url": "https://your-project.supabase.co/storage/v1/object/public/media/products/milano-biker-jacket/back.webp",
          "alt": "Milano Biker Jacket Back",
          "isPrimary": false,
          "isHover": true,
          "type": "back",
          "sortOrder": 2
        }
      ],
      "variants": [
        {
          "id": "v1111111-2222-3333-4444-555566667777",
          "sku": "AVM-BIKER-01-BLK-M",
          "size": "M",
          "color": "Nero Milano",
          "colorHex": "#11100F",
          "inStock": true,
          "priceOverride": undefined
        }
      ],
      "sizes": [
        {
          "id": "s1111111-1111-1111-1111-111111111111",
          "name": "M",
          "slug": "m",
          "sortOrder": 3,
          "isActive": true
        }
      ],
      "colors": [
        {
          "id": "c1111111-1111-1111-1111-111111111111",
          "name": "Nero Milano",
          "slug": "nero-milano",
          "hex": "#11100F",
          "sortOrder": 1,
          "isActive": true
        }
      ],
      "policies": [
        {
          "id": "p1111111-1111-1111-1111-111111111111",
          "name": "Complimentary European Express Shipping",
          "slug": "shipping-guarantee",
          "description": "Shipped via DHL Express Courier with end-to-end insurance.",
          "bulletPoints": ["Dispatched in 24–48 hours", "Full transit insurance"],
          "sortOrder": 1,
          "isActive": true
        }
      ],
      "availableColors": [{ "name": "Nero Milano", "hex": "#11100F" }],
      "availableSizes": ["M"],
      "rating": 5,
      "reviewCount": 12,
      "reviews": [],
      "seoTitle": "Milano Biker Jacket | ATELIER VALENTI MILANO",
      "seoDescription": "Handcrafted vegetable-tanned calfskin biker jacket.",
      "createdAt": "2026-10-21T10:00:00.000Z",
      "updatedAt": "2026-10-22T12:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalCount": 1,
    "limit": 12,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

#### `GET /api/v1/products/:slug`
- **Status:** **UPDATED**
- **Purpose:** Full PDP detail object with approved reviews and 4 related products mapped to the requested market.
- **Path Parameter:** `slug` (e.g. `milano-biker-jacket`)
- **Query Parameter / Header:** `market` / `x-market`
- **Response Body (200 OK):**
```json
{
  "success": true,
  "message": "Product retrieved successfully",
  "data": {
    "...": "(Full product object as documented above)",
    "relatedProducts": [
      { "...": "(Product card object)" }
    ]
  }
}
```

#### `GET /api/v1/products/facets`
- **Purpose:** Returns unique aggregation counts for filtering drawers (categories, leather types, colors, sizes, price range).
- **Response Body (200 OK):**
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    "categories": ["biker", "bomber", "aviator", "leather-coats"],
    "leatherTypes": ["Full-Grain Italian Calfskin", "Spanish Merino Shearling", "French Lambskin Nappa"],
    "colors": ["Nero Milano", "Cognac", "Espresso", "Oxblood"],
    "sizes": ["XS", "S", "M", "L", "XL", "XXL"],
    "priceRange": {
      "min": 850,
      "max": 3200
    }
  }
}
```

#### `GET /api/v1/products/search`
- **Purpose:** Instant search query against title, sku, leather type, and description.
- **Query Parameter:** `q` or `query` (string)
- **Response Body (200 OK):**
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": [
    { "...": "(Mapped product item)" }
  ]
}
```

#### `GET /api/v1/products/:slug/reviews`
- **Purpose:** Lists approved client reviews for a product.
- **Response Body (200 OK):**
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": [
    {
      "id": "r1111111-2222-3333-4444-555566667777",
      "author": "Matteo Rossi",
      "location": "Milano, IT",
      "rating": 5,
      "date": "18 Oct 2026",
      "title": "Exceptional craftsmanship",
      "comment": "The calfskin patina is even richer in person.",
      "verified": true
    }
  ]
}
```

#### `POST /api/v1/products/:id/reviews`
- **Purpose:** Client review submission. Reviews enter moderation queue (`isApproved: false`).
- **Validation:** `createReviewSchema`
- **Request Body:**
```json
{
  "author": "Elena Conti",
  "location": "Zurich, CH",
  "rating": 5,
  "title": "Sublime Leather",
  "comment": "The cut and leather feel extraordinary.",
  "verified": true
}
```
- **Response Body (201 Created):**
```json
{
  "success": true,
  "message": "Review submitted successfully and awaiting moderation",
  "data": {
    "id": "r2222222-3333-4444-5555-666677778888"
  }
}
```

---

### 5.3 Public Master Sizes, Colors & Policies

#### `GET /api/v1/sizes`
- **Status:** **NEW**
- **Purpose:** Retrieve all active master garment sizes configured across the atelier.
- **Response Body (200 OK):**
```json
{
  "success": true,
  "message": "Active sizes retrieved successfully",
  "data": [
    {
      "id": "s1111111-1111-1111-1111-111111111111",
      "name": "XS",
      "slug": "xs",
      "sortOrder": 1,
      "isActive": true,
      "productCount": 8,
      "createdAt": "2026-10-21T08:30:00.000Z",
      "updatedAt": "2026-10-21T08:30:00.000Z"
    },
    {
      "id": "s2222222-2222-2222-2222-222222222222",
      "name": "S",
      "slug": "s",
      "sortOrder": 2,
      "isActive": true,
      "productCount": 14,
      "createdAt": "2026-10-21T08:30:00.000Z",
      "updatedAt": "2026-10-21T08:30:00.000Z"
    }
  ]
}
```

#### `GET /api/v1/colors`
- **Status:** **NEW**
- **Purpose:** Retrieve all active master colors with exact HEX values.
- **Response Body (200 OK):**
```json
{
  "success": true,
  "message": "Active colors retrieved successfully",
  "data": [
    {
      "id": "c1111111-1111-1111-1111-111111111111",
      "name": "Nero Milano",
      "slug": "nero-milano",
      "hex": "#11100F",
      "sortOrder": 1,
      "isActive": true,
      "productCount": 18,
      "createdAt": "2026-10-21T08:30:00.000Z",
      "updatedAt": "2026-10-21T08:30:00.000Z"
    },
    {
      "id": "c2222222-2222-2222-2222-222222222222",
      "name": "Cognac",
      "slug": "cognac",
      "hex": "#8B4513",
      "sortOrder": 2,
      "isActive": true,
      "productCount": 12,
      "createdAt": "2026-10-21T08:30:00.000Z",
      "updatedAt": "2026-10-21T08:30:00.000Z"
    }
  ]
}
```

#### `GET /api/v1/policies`
- **Status:** **NEW**
- **Purpose:** Retrieve all active reusable atelier policies, guarantees, and care guidelines.
- **Response Body (200 OK):**
```json
{
  "success": true,
  "message": "Active policies retrieved successfully",
  "data": [
    {
      "id": "p1111111-1111-1111-1111-111111111111",
      "name": "Complimentary European Express Shipping",
      "slug": "shipping-guarantee",
      "description": "Shipped via DHL Express Courier with end-to-end insurance.",
      "bulletPoints": [
        "Dispatched in 24–48 hours",
        "Full transit insurance",
        "Signature required upon delivery"
      ],
      "sortOrder": 1,
      "isActive": true,
      "productCount": 24,
      "createdAt": "2026-10-21T08:30:00.000Z",
      "updatedAt": "2026-10-21T08:30:00.000Z"
    }
  ]
}
```

---

### 5.4 Contact Us & Concierge Inquiries

#### `POST /api/v1/contact`
- **Status:** **NEW**
- **Purpose:** Submit customer concierge inquiries. Persists record to database and fires HTML-sanitized email notification to business concierge (`concierge@ateliervalenti.com`).
- **Rate Limit:** 10 requests per 15 minutes per IP (`contactRateLimiter`).
- **Validation:** `createContactMessageSchema`
- **Request Body:**
```json
{
  "name": "Matteo Rossi",
  "email": "matteo.rossi@milano.it",
  "phone": "+39 02 1234 5678",
  "subject": "Bespoke Fitting Appointment",
  "message": "I would like to schedule an atelier appointment in Milan to review shearling outerwear options."
}
```
- **Validation Rules:**
  - `name`: string, min 2, max 150 (required)
  - `email`: valid email string, max 255 (required)
  - `phone`: string, max 50 (optional, default `""`)
  - `subject`: string, min 2, max 150 (required)
  - `message`: string, min 10, max 5000 (required)
- **Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Your inquiry has been received. Our atelier concierge will contact you shortly.",
  "data": {
    "id": "m1111111-2222-3333-4444-555566667777",
    "name": "Matteo Rossi",
    "email": "matteo.rossi@milano.it",
    "phone": "+39 02 1234 5678",
    "subject": "Bespoke Fitting Appointment",
    "status": "new",
    "createdAt": "2026-10-22T14:30:00.000Z"
  }
}
```
- **Error Responses:**
  - `422 Unprocessable Entity`: Validation failure on input fields.
  - `429 Too Many Requests`: `ERR_CONTACT_RATE_LIMIT` when IP exceeds 10 submissions in 15 minutes.

---

### 5.5 Other Public Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/v1/content/homepage` | Homepage CMS hero, featured collections, banner blocks |
| `GET` | `/api/v1/content/navigation` | Mega-menu navigation JSON |
| `GET` | `/api/v1/categories` | Active product categories with product counts |
| `GET` | `/api/v1/categories/:slug` | Single category detail |
| `GET` | `/api/v1/collections` | Curated editorial seasonal collections |
| `GET` | `/api/v1/customization/options` | Silhouettes, leathers, colors, linings, hardware for bespoke studio |
| `POST` | `/api/v1/customization/commissions` | Submit bespoke tailoring commission request |
| `POST` | `/api/v1/newsletter/subscribe` | Email newsletter subscription |
| `GET` | `/api/v1/testimonials` | Curated client testimonials |
| `GET` | `/api/v1/social-looks` | "Seen On" social lookbook gallery |

---

## 6. Admin API Reference

All routes below require `Authorization: Bearer <accessToken>` header unless specified.

### 6.1 Admin Authentication

#### `POST /api/v1/admin/auth/login`
- **Status:** **UPDATED** (Accepts stringified, urlencoded, and wrapped payloads)
- **Auth:** Public Admin (Rate Limit: 20 attempts / 15 min)
- **Request Body:**
```json
{
  "email": "admin@leathermart.local",
  "password": "ChangeMe_Admin_2026!"
}
```
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "u1111111-2222-3333-4444-555566667777",
      "email": "admin@leathermart.local",
      "firstName": "Alessandro",
      "lastName": "Valenti",
      "role": "super_admin",
      "permissions": ["*"]
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
    }
  }
}
```

#### `POST /api/v1/admin/auth/refresh`
- **Request Body:** `{ "refreshToken": "..." }`
- **Success Response (200 OK):** `{ "success": true, "data": { "accessToken": "..." } }`

#### `GET /api/v1/admin/auth/me`
- **Auth:** Any authenticated admin.
- **Success Response (200 OK):** `{ "success": true, "data": { "user": { ... } } }`

---

### 6.2 Admin Platform Branding & Settings

#### `GET /api/v1/admin/settings/branding`
- **Status:** **NEW**
- **Auth:** Any authenticated admin.
- **Success Response (200 OK):** Returns current branding configuration.

#### `PATCH /api/v1/admin/settings/branding`
- **Status:** **NEW**
- **Auth:** `super_admin`, `store_manager`
- **Validation:** `updateBrandingSchema`
- **Request Body:**
```json
{
  "platformName": "Atelier Valenti Milano",
  "platformShortName": "AVM",
  "logoUrl": "https://your-project.supabase.co/storage/v1/object/public/media/branding/logo.svg",
  "logoDarkUrl": "https://your-project.supabase.co/storage/v1/object/public/media/branding/logo-dark.svg",
  "logoLightUrl": "https://your-project.supabase.co/storage/v1/object/public/media/branding/logo-light.svg",
  "faviconUrl": "https://your-project.supabase.co/storage/v1/object/public/media/branding/favicon.ico",
  "browserTitle": "Atelier Valenti Milano — Handcrafted European Leather Outerwear",
  "metaDescription": "Luxury Italian calfskin and lambskin outerwear crafted by hand in our Milanese atelier."
}
```
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Platform branding updated successfully",
  "data": { "...": "Updated branding fields" }
}
```

#### `PATCH /api/v1/admin/settings`
- **Status:** **UPDATED**
- **Auth:** `super_admin`, `store_manager`
- **Purpose:** Updates announcement, shipping, footer, search keywords, and/or branding fields simultaneously.

---

### 6.3 Admin Product Catalogue Management

#### `POST /api/v1/admin/products`
- **Status:** **UPDATED**
- **Auth:** `super_admin`, `store_manager`
- **Content-Type:** `application/json` or `multipart/form-data`
- **Validation:** `createProductSchema` (Mandatory: at least one size in `sizes`, at least one color in `colors`, valid category in `category`).
- **Request Body (JSON):**
```json
{
  "sku": "AVM-BOMBER-02",
  "name": "Verona Suede Bomber",
  "category": "bomber",
  "gender": "men",
  "price": 1250,
  "salePrice": null,
  "isInStock": true,
  "isPublished": true,
  "isFeatured": false,
  "leatherType": "Italian Goat Suede",
  "hardware": "Gunmetal YKK",
  "lining": "100% Cupro",
  "description": "Supple Italian goat suede treated with water-resistant fluorocarbon finish.",
  "sizes": ["S", "M", "L", "XL"],
  "colors": [
    { "name": "Espresso", "hex": "#3D2314" },
    { "name": "Cognac", "hex": "#8B4513" }
  ],
  "regionalPrices": [
    { "regionCode": "GLOBAL", "currency": "EUR", "price": 1250, "salePrice": null },
    { "regionCode": "PK", "currency": "PKR", "price": 365000, "salePrice": null }
  ],
  "policies": ["shipping-guarantee"],
  "images": [
    {
      "url": "https://your-project.supabase.co/storage/v1/object/public/media/products/verona-bomber/1.webp",
      "alt": "Verona Bomber Front",
      "isPrimary": true,
      "type": "perspective"
    }
  ],
  "variants": [
    {
      "sku": "AVM-BOMBER-02-ESP-M",
      "size": "M",
      "color": "Espresso",
      "colorHex": "#3D2314",
      "inStock": true
    }
  ]
}
```
- **Multipart Upload Support:** Accepts files under `upload.any()` with accompanying stringified `data` JSON or field values.
- **Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Garment specification created successfully",
  "data": { "...": "Complete mapped product object" }
}
```

#### `PUT /api/v1/admin/products/:id` & `PATCH /api/v1/admin/products/:id`
- **Status:** **UPDATED**
- **Auth:** `super_admin`, `store_manager`
- **Purpose:** Full or partial product update. Accepts JSON or multipart upload.

#### `DELETE /api/v1/admin/products/:id`
- **Auth:** `super_admin`, `store_manager`
- **Side Effects:** Automatically deletes all uploaded product images from Supabase Storage bucket before cascading deletion to variants, reviews, assignments, and prices.

#### `POST /api/v1/admin/products/:id/publish`
- **Auth:** `super_admin`, `store_manager`, `content_editor`
- **Purpose:** Toggles product `isPublished` boolean.

#### `POST /api/v1/admin/products/:id/duplicate`
- **Auth:** `super_admin`, `store_manager`
- **Purpose:** Clones an existing garment with new auto-generated SKU (`{SKU}-COPY-{timestamp}`) and slug.

#### `POST /api/v1/admin/products/bulk`
- **Auth:** `super_admin`, `store_manager`
- **Payload:** `{ "action": "publish" | "unpublish" | "delete", "ids": ["uuid-1", "uuid-2"] }`

---

### 6.4 Admin Master Sizes Management

- `GET /api/v1/admin/sizes`: Lists all sizes with `productCount`. Filterable via `?status=active|inactive` and `?search=...`.
- `GET /api/v1/admin/sizes/:id`: Single size detail.
- `POST /api/v1/admin/sizes`: Create size.
  - Payload: `{ "name": "3XL", "slug": "3xl", "sortOrder": 7, "isActive": true }`
- `PUT /api/v1/admin/sizes/:id`: Update size.
- `POST /api/v1/admin/sizes/:id/toggle-active`: Toggle active state.
- `DELETE /api/v1/admin/sizes/:id`: Delete size.
  - **Delete Protection:** Rejects with `400 Bad Request` (`ERR_SIZE_IN_USE`) if assigned to any product. Must unassign from all products before deletion.

---

### 6.5 Admin Master Colors Management

- `GET /api/v1/admin/colors`: Lists all colors with `productCount`.
- `GET /api/v1/admin/colors/:id`: Single color detail.
- `POST /api/v1/admin/colors`: Create color.
  - Payload: `{ "name": "British Racing Green", "slug": "racing-green", "hex": "#004225", "sortOrder": 5, "isActive": true }`
- `PUT /api/v1/admin/colors/:id`: Update color name, slug, hex, sortOrder, isActive.
- `POST /api/v1/admin/colors/:id/toggle-active`: Toggle active state.
- `DELETE /api/v1/admin/colors/:id`: Delete color.
  - **Delete Protection:** Rejects with `400 Bad Request` (`ERR_COLOR_IN_USE`) if assigned to any product.

---

### 6.6 Admin Master Policies Management

- `GET /api/v1/admin/policies`: Lists all policies with `productCount`.
- `GET /api/v1/admin/policies/:id`: Single policy detail.
- `POST /api/v1/admin/policies`: Create policy.
  - Payload:
    ```json
    {
      "name": "Lifetime Hardware Warranty",
      "slug": "lifetime-hardware",
      "description": "All Excella zippers and brass buckles are guaranteed for the life of the garment.",
      "bulletPoints": ["Complimentary zipper repair", "Genuine Italian replacement hardware"],
      "sortOrder": 3,
      "isActive": true
    }
    ```
- `PUT /api/v1/admin/policies/:id`: Update policy.
- `POST /api/v1/admin/policies/:id/toggle-active`: Toggle active state.
- `DELETE /api/v1/admin/policies/:id`: Delete policy.
  - **Delete Protection:** Rejects with `400 Bad Request` (`ERR_POLICY_IN_USE`) if assigned to any product.

---

### 6.7 Admin Contact Inquiries Management

- `GET /api/v1/admin/contact-messages`
  - **Status:** **NEW**
  - **Auth:** All authenticated admin roles.
  - **Query Parameters:** `page`, `limit`, `status` (`new`, `in_progress`, `resolved`, `spam`, `all`), `search`, `startDate`, `endDate`.
  - **Response (200 OK):**
    ```json
    {
      "success": true,
      "message": "Contact messages retrieved successfully",
      "data": [
        {
          "id": "m1111111-2222-3333-4444-555566667777",
          "name": "Matteo Rossi",
          "email": "matteo.rossi@milano.it",
          "phone": "+39 02 1234 5678",
          "subject": "Bespoke Fitting Appointment",
          "message": "I would like to schedule an atelier appointment...",
          "status": "new",
          "adminNotes": "",
          "createdAt": "2026-10-22T14:30:00.000Z",
          "updatedAt": "2026-10-22T14:30:00.000Z"
        }
      ],
      "pagination": { "currentPage": 1, "totalPages": 1, "totalCount": 1, "limit": 15, "hasNextPage": false, "hasPrevPage": false }
    }
    ```
- `GET /api/v1/admin/contact-messages/:id`: Single message detail.
- `PATCH /api/v1/admin/contact-messages/:id`:
  - **Payload:** `{ "status": "in_progress" | "resolved" | "spam", "adminNotes": "Client called back on 22 Oct." }`
- `DELETE /api/v1/admin/contact-messages/:id`:
  - **Auth:** `super_admin`, `store_manager`

---

### 6.8 Admin Media & Storage Uploads

#### `POST /api/v1/admin/media/upload` and `POST /api/v1/admin/products/images/upload`
- **Status:** **UPDATED** (Streams in-memory buffer directly to Supabase Storage)
- **Auth:** Any authenticated admin.
- **Content-Type:** `multipart/form-data`
- **Form Fields:**
  - `file`: Binary file (JPEG, PNG, WebP, AVIF, GIF, SVG, ICO, MP4, WebM; max 10MB)
  - `folder`: string (e.g. `branding`, `products/milano-biker`, `general`)
  - `altText` / `alt_text`: string (optional)
- **Response (201 Created):**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "id": "a1111111-2222-3333-4444-555566667777",
    "filename": "branding-1729600000000-a1b2c3d4.svg",
    "originalName": "logo.svg",
    "mimeType": "image/svg+xml",
    "size": "4210",
    "url": "https://your-project.supabase.co/storage/v1/object/public/media/branding/branding-1729600000000-a1b2c3d4.svg",
    "path": "branding/branding-1729600000000-a1b2c3d4.svg",
    "folder": "branding",
    "altText": "Atelier Valenti Logo"
  }
}
```

---

## 7. Storage, Security & Environment Configuration

### 7.1 Storage Pipeline
- Files are parsed into memory buffers using `multer.memoryStorage()`.
- Verified against MIME types and file signature magic bytes (`StorageService.validateFile`).
- Uploaded directly via Supabase JavaScript Client to bucket specified by `SUPABASE_STORAGE_BUCKET` (default: `media`).
- Automatic cleanup of orphan storage files occurs when products or media assets are deleted.

### 7.2 Non-Exposed Environment Variables Required

| Variable Name | Required | Purpose |
|---|---|---|
| `PORT` | Optional | Port for the Express server (Default: `5000`) |
| `NODE_ENV` | Yes | `development`, `test`, or `production` |
| `DATABASE_URL` | Yes | Supabase PostgreSQL connection pooler (port 6543, `?pgbouncer=true`) |
| `DIRECT_URL` | Yes | Supabase PostgreSQL direct port 5432 for Prisma migrations |
| `SUPABASE_URL` | Yes | Supabase project URL (`https://<project>.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key for bypass RLS storage operations |
| `SUPABASE_STORAGE_BUCKET` | Optional | Supabase bucket name (Default: `media`) |
| `JWT_SECRET` | Yes | Signing key for Access Tokens |
| `JWT_EXPIRES_IN` | Optional | Lifespan of Access Token (Default: `7d`) |
| `JWT_REFRESH_SECRET` | Yes | Signing key for Refresh Tokens |
| `JWT_REFRESH_EXPIRES_IN` | Optional | Lifespan of Refresh Token (Default: `30d`) |
| `FRONTEND_URL` | Yes | Storefront origin for CORS (Default: `http://localhost:3000`) |
| `ADMIN_URL` | Yes | Admin panel origin for CORS (Default: `http://localhost:3001`) |
| `MAX_FILE_SIZE_MB` | Optional | Maximum upload size in megabytes (Default: `10`) |
| `CONTACT_NOTIFICATION_EMAIL`| Optional | Destination for contact form alert emails |
| `SMTP_FROM` | Optional | Sender address for system transactional emails |
