# Atelier Valenti Milano / LeatherMart — Complete API Reference

**API Base URL (Local):** `http://localhost:5000/api/v1`  
**API Protocol:** REST / JSON  
**Authentication Header:** `Authorization: Bearer <accessToken>`  
**Regional Market Header:** `x-market: PK | IT | GLOBAL` (Defaults to `GLOBAL`)

---

## Table of Contents
1. [Standard Response Envelopes & Error Handling](#standard-response-envelopes)
2. [Module 1: Authentication & Staff Users](#module-1-authentication)
3. [Module 2: Products & Catalogue Management](#module-2-products)
4. [Module 3: Master Product Sizes](#module-3-sizes)
5. [Module 4: Master Product Colors](#module-4-colors)
6. [Module 5: Master Product Policies](#module-5-policies)
7. [Module 6: Categories & Curated Collections](#module-6-categories)
8. [Module 7: Homepage & CMS Sections](#module-7-cms)
9. [Module 8: Bespoke Commissions & Custom Studio](#module-8-commissions)
10. [Module 9: Store Settings & Navigation Menus](#module-9-settings)
11. [Module 10: Media & Asset Storage](#module-10-media)
12. [Module 11: Contact Us & Client Concierge](#module-11-contact)

---

<a name="standard-response-envelopes"></a>
## Standard Response Envelopes & Error Handling

All API endpoints follow standardized JSON envelope responses:

### Standard Success Envelope
```typescript
interface ApiResponse<T> {
  success: true;
  message?: string;
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

### Standard Error Envelope
```typescript
interface ApiErrorResponse {
  success: false;
  message: string;
  errorCode?: string;
  errors?: Array<{
    field?: string;
    message: string;
  }>;
}
```

Common HTTP Status Codes:
- `200 OK`: Request succeeded.
- `201 Created`: Resource successfully created.
- `400 Bad Request`: Validation failure or business constraint violation (e.g. deleting an in-use size).
- `401 Unauthorized`: Missing, expired, or invalid JWT access token.
- `403 Forbidden`: Insufficient role or permissions.
- `404 Not Found`: Target record ID or slug does not exist.
- `409 Conflict`: Unique constraint violation (duplicate slug, SKU, or email).
- `422 Unprocessable Entity`: Request body schema validation failed.
- `429 Too Many Requests`: Rate limit exceeded.

---

<a name="module-1-authentication"></a>
## Module 1: Authentication & Staff Users

### 1.1 Admin Login
- **Method:** `POST`
- **Endpoint:** `/api/v1/admin/auth/login`
- **Auth Required:** No (Public Admin)
- **Rate Limit:** 10 attempts / 15 minutes per IP
- **Content-Type:** `application/json`

**Request Example:**
```json
{
  "email": "admin@leathermart.local",
  "password": "ChangeMe_Admin_2026!"
}
```

**Response Example (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "7a35e406-8d19-48fe-9833-289562723653",
      "email": "admin@leathermart.local",
      "firstName": "Alessandro",
      "lastName": "Valenti",
      "role": "super_admin",
      "permissions": ["*"],
      "isActive": true
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

**TypeScript Types:**
```typescript
interface AdminLoginRequest {
  email: string;
  password: string;
}

interface AdminAuthResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'super_admin' | 'store_manager' | 'content_editor' | 'concierge';
    permissions: string[];
    isActive: boolean;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}
```

---

### 1.2 Refresh Access Token
- **Method:** `POST`
- **Endpoint:** `/api/v1/admin/auth/refresh`
- **Auth Required:** No (Uses refresh token)
- **Request Body:**
  ```json
  { "refreshToken": "eyJhbGciOiJIUzI1Ni..." }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1Ni...",
      "refreshToken": "eyJhbGciOiJIUzI1Ni..."
    }
  }
  ```

---

### 1.3 Get Current Admin Profile
- **Method:** `GET`
- **Endpoint:** `/api/v1/admin/auth/me`
- **Auth Required:** Yes (`Bearer <accessToken>`)
- **Response (200 OK):** Returns current user object.

---

### 1.4 Change Admin Password
- **Method:** `POST`
- **Endpoint:** `/api/v1/admin/auth/change-password`
- **Auth Required:** Yes
- **Request Body:**
  ```json
  {
    "currentPassword": "OldPassword123!",
    "newPassword": "NewSecurePassword456!"
  }
  ```

---

### 1.5 List Staff Users
- **Method:** `GET`
- **Endpoint:** `/api/v1/admin/users`
- **Auth Required:** Yes (`super_admin` only)
- **Response (200 OK):** Array of staff user profiles.

---

<a name="module-2-products"></a>
## Module 2: Products & Catalogue Management

### 2.1 Public Product Listing
- **Method:** `GET`
- **Endpoint:** `/api/v1/products`
- **Auth Required:** No (Public Storefront)
- **Headers:** Optional `x-market: PK | IT | GLOBAL`
- **Query Parameters:**
  - `market` (string): `PK`, `IT`, or `GLOBAL`. Overrides `x-market` header.
  - `category` (string): Category slug (e.g. `biker`, `bomber`, `aviator`).
  - `gender` (string): `men`, `women`, or `unisex`.
  - `size` (string): Size filter (e.g. `48 (EU M)`).
  - `color` (string): Color filter (e.g. `Nero Black`).
  - `min_price` / `max_price` (number): Price range in resolved currency.
  - `in_stock` / `isInStock` (boolean): `true` or `false`.
  - `is_featured` / `is_bestseller` / `is_new` (boolean): `true` or `false`.
  - `sort` (string): `price_asc`, `price_desc`, `newest`, `rating`, `featured`.
  - `page` (number): Default `1`.
  - `limit` (number): Default `12`, max `100`.

**Response Example (200 OK):**
```json
{
  "success": true,
  "message": "Products retrieved successfully",
  "data": [
    {
      "id": "b3e94411-cf95-46a2-a8c9-7d04f7b2210a",
      "sku": "AVM-BIK-001",
      "name": "Milano Nappa Biker Jacket",
      "slug": "milano-nappa-biker-jacket",
      "categorySlug": "biker",
      "categoryLabel": "Biker Jackets",
      "gender": "men",
      "price": 1250,
      "salePrice": null,
      "currency": "EUR",
      "currencySymbol": "€",
      "resolvedPrice": {
        "regionCode": "GLOBAL",
        "currency": "EUR",
        "symbol": "€",
        "price": 1250,
        "salePrice": null,
        "formattedPrice": "€1.250",
        "formattedSalePrice": null,
        "isSale": false,
        "discountPercentage": 0
      },
      "isInStock": true,
      "inStock": true,
      "isFeatured": true,
      "isBestseller": true,
      "isNewArrival": false,
      "isPublished": true,
      "leatherType": "Full-Grain Italian Calfskin",
      "rating": 5.0,
      "reviewCount": 14,
      "images": [
        {
          "id": "img-01",
          "url": "https://xyz.supabase.co/storage/v1/object/public/media/biker-front.jpg",
          "alt": "Front view of Milano Nappa Biker",
          "isPrimary": true,
          "isHover": false
        }
      ],
      "sizes": [
        { "id": "s-48", "name": "48 (EU M)", "slug": "48-eu-m" }
      ],
      "colors": [
        { "id": "c-blk", "name": "Nero Black", "hex": "#0D0C0B" }
      ],
      "variants": [
        {
          "id": "var-01",
          "sku": "AVM-BIK-001-48-BLK",
          "size": "48 (EU M)",
          "color": "Nero Black",
          "colorHex": "#0D0C0B",
          "inStock": true,
          "priceOverride": null
        }
      ]
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

### 2.2 Public Single Product by Slug
- **Method:** `GET`
- **Endpoint:** `/api/v1/products/:slug`
- **Auth Required:** No
- **Headers:** Optional `x-market: PK | IT | GLOBAL`
- **Response (200 OK):** Returns detailed product object including `resolvedPrice`, `regionalPrices`, `policies`, `images`, `sizes`, `colors`, `variants`, and approved `reviews`.

---

### 2.3 Create Product (Admin)
- **Method:** `POST`
- **Endpoint:** `/api/v1/admin/products`
- **Auth Required:** Yes (`super_admin`, `store_manager`)
- **Content-Type:** `application/json` or `multipart/form-data`

**Request Example (JSON):**
```json
{
  "sku": "AVM-SHR-004",
  "name": "Cortina Merino Shearling Aviator",
  "category": "aviator",
  "leatherType": "Spanish Merino Shearling",
  "description": "Double-faced Spanish shearling aviator jacket crafted in Milan.",
  "price": 2850,
  "salePrice": null,
  "isInStock": true,
  "isFeatured": true,
  "sizes": ["48 (EU M)", "50 (EU L)", "52 (EU XL)"],
  "colors": [
    { "name": "Espresso Brown", "hex": "#2B1D14" }
  ],
  "regionalPrices": [
    { "regionCode": "GLOBAL", "currency": "EUR", "price": 2850, "salePrice": null },
    { "regionCode": "PK", "currency": "PKR", "price": 850000, "salePrice": null }
  ],
  "policies": [
    "lifetime-atelier-guarantee",
    "complimentary-eu-delivery"
  ],
  "variants": [
    {
      "sku": "AVM-SHR-004-48-ESP",
      "size": "48 (EU M)",
      "color": "Espresso Brown",
      "colorHex": "#2B1D14",
      "inStock": true
    }
  ]
}
```

**TypeScript Product Types:**
```typescript
interface CreateProductPayload {
  sku: string;
  name: string;
  category: string;
  leatherType: string;
  description: string;
  price: number;
  salePrice?: number | null;
  isInStock?: boolean;
  isFeatured?: boolean;
  isBestseller?: boolean;
  isNewArrival?: boolean;
  isPublished?: boolean;
  sizes: string[];
  colors: Array<string | { name: string; hex: string }>;
  regionalPrices?: Array<{
    regionCode: 'PK' | 'IT' | 'GLOBAL';
    currency: 'PKR' | 'EUR';
    price: number;
    salePrice?: number | null;
    isActive?: boolean;
  }>;
  policies?: string[];
  variants?: Array<{
    sku: string;
    size: string;
    color: string;
    colorHex: string;
    inStock?: boolean;
    priceOverride?: number | null;
  }>;
  images?: Array<{
    url: string;
    alt?: string;
    isPrimary?: boolean;
    isHover?: boolean;
    sortOrder?: number;
  }>;
}
```

---

<a name="module-3-sizes"></a>
## Module 3: Master Product Sizes

### 3.1 List Sizes (Public)
- **Method:** `GET`
- **Endpoint:** `/api/v1/sizes`
- **Auth Required:** No
- **Response (200 OK):** Returns active sizes ordered by `sortOrder`.

### 3.2 List Sizes (Admin)
- **Method:** `GET`
- **Endpoint:** `/api/v1/admin/sizes`
- **Auth Required:** Yes
- **Query Params:** `status=active|inactive|all`, `search=string`
- **Response Example (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "e3a8972e-13c5-4a62-8418-74431f692019",
      "name": "48 (EU M)",
      "slug": "48-eu-m",
      "sortOrder": 2,
      "isActive": true,
      "productCount": 8,
      "createdAt": "2026-10-21T10:00:00.000Z"
    }
  ]
}
```

### 3.3 Create Size (Admin)
- **Method:** `POST`
- **Endpoint:** `/api/v1/admin/sizes`
- **Auth Required:** Yes (`super_admin`, `store_manager`)
- **Request Body:**
  ```json
  {
    "name": "56 (EU 3XL)",
    "slug": "56-eu-3xl",
    "sortOrder": 6,
    "isActive": true
  }
  ```

### 3.4 Toggle Active (Admin)
- **Method:** `POST`
- **Endpoint:** `/api/v1/admin/sizes/:id/toggle-active`
- **Auth Required:** Yes (`super_admin`, `store_manager`)

### 3.5 Delete Size (Admin)
- **Method:** `DELETE`
- **Endpoint:** `/api/v1/admin/sizes/:id`
- **Auth Required:** Yes (`super_admin`, `store_manager`)
- **Safeguard:** Blocked with HTTP 400 (`ERR_SIZE_IN_USE`) if assigned to any product.

---

<a name="module-4-colors"></a>
## Module 4: Master Product Colors

### 4.1 List Colors (Public & Admin)
- **Public:** `GET /api/v1/colors`
- **Admin:** `GET /api/v1/admin/colors`
- **Response Example (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "c1f71234-ab12-4c56-8d78-9e0123456789",
      "name": "British Racing Green",
      "slug": "british-racing-green",
      "hex": "#1B3B2B",
      "sortOrder": 5,
      "isActive": true,
      "productCount": 3
    }
  ]
}
```

### 4.2 Create Color (Admin)
- **Method:** `POST`
- **Endpoint:** `/api/v1/admin/colors`
- **Request Body:**
  ```json
  {
    "name": "Cognac Tan",
    "hex": "#9E4714",
    "sortOrder": 4,
    "isActive": true
  }
  ```

---

<a name="module-5-policies"></a>
## Module 5: Master Product Policies

### 5.1 List Policies (Public & Admin)
- **Public:** `GET /api/v1/policies`
- **Admin:** `GET /api/v1/admin/policies`
- **Response Example (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "pol-01",
      "name": "Lifetime Atelier Guarantee",
      "slug": "lifetime-atelier-guarantee",
      "description": "Every Atelier Valenti outerwear piece is guaranteed for life against hardware and stitching defects.",
      "bulletPoints": [
        "Complimentary lining restoration after 5 years",
        "Free lifetime zipper & hardware replacement",
        "Hand-inspected by master artisans in Milan"
      ],
      "sortOrder": 1,
      "isActive": true,
      "productCount": 12
    }
  ]
}
```

---

<a name="module-10-media"></a>
## Module 10: Media & Asset Storage

### 10.1 Upload Single Image
- **Method:** `POST`
- **Endpoints:**
  - `/api/v1/admin/media/upload`
  - `/api/v1/admin/products/images/upload`
- **Auth Required:** Yes (`Bearer <accessToken>`)
- **Content-Type:** `multipart/form-data`
- **Form Field:** `file` (Binary image buffer, max 10MB, jpeg/png/webp/avif). Optional metadata field: `folder` (default `products` or `general`).
- **Response Example (200 OK):**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "id": "asset-uuid-1234",
    "url": "https://xyz.supabase.co/storage/v1/object/public/media/products/1730000000-jacket.webp",
    "filename": "1730000000-jacket.webp",
    "originalName": "jacket.webp",
    "mimeType": "image/webp",
    "size": 245100,
    "folder": "products"
  }
}
```

---

<a name="module-11-contact"></a>
## Module 11: Contact Us & Client Concierge

### 11.1 Submit Contact Message (Public)
- **Method:** `POST`
- **Endpoint:** `/api/v1/contact`
- **Auth Required:** No
- **Rate Limit:** 10 requests / 15 minutes per IP
- **Content-Type:** `application/json`

**Request Example:**
```json
{
  "name": "Sofia Laurent",
  "email": "sofia.laurent@paris.fr",
  "phone": "+33 1 42 68 55 00",
  "subject": "Bespoke Commission",
  "message": "I would like to commission a custom tailored shearling aviator jacket in espresso suede."
}
```

**Response Example (201 Created):**
```json
{
  "success": true,
  "message": "Thank you for contacting Atelier Valenti Milano. Your message has been received.",
  "data": {
    "id": "cm-9128374a-4b12-4cf0-88b1-39a01f82bc71",
    "name": "Sofia Laurent",
    "email": "sofia.laurent@paris.fr",
    "subject": "Bespoke Commission",
    "status": "new",
    "createdAt": "2026-10-21T15:20:00.000Z"
  }
}
```

**Validation Constraints:**
- `name`: string, required, min 2, max 150 characters.
- `email`: string, required, valid email format, max 255 characters.
- `phone`: string, optional, max 50 characters.
- `subject`: string, required, min 2, max 150 characters.
- `message`: string, required, min 10, max 5,000 characters.

**TypeScript Types:**
```typescript
interface ContactSubmissionPayload {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

interface ContactSubmissionResponse {
  id: string;
  name: string;
  email: string;
  subject: string;
  status: 'new' | 'in_progress' | 'resolved' | 'spam';
  createdAt: string;
}
```

---

### 11.2 List Contact Messages (Admin)
- **Method:** `GET`
- **Endpoint:** `/api/v1/admin/contact-messages`
- **Auth Required:** Yes (`Bearer <accessToken>`)
- **Query Parameters:**
  - `status` (string): `new`, `in_progress`, `resolved`, `spam`, or `all`.
  - `search` (string): Search client name, email, or subject.
  - `startDate` (string): `YYYY-MM-DD`.
  - `endDate` (string): `YYYY-MM-DD`.
  - `page` (number): Default `1`.
  - `limit` (number): Default `15`, max `100`.

**Response Example (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "cm-9128374a-4b12-4cf0-88b1-39a01f82bc71",
      "name": "Sofia Laurent",
      "email": "sofia.laurent@paris.fr",
      "phone": "+33 1 42 68 55 00",
      "subject": "Bespoke Commission",
      "message": "I would like to commission a custom tailored shearling aviator jacket...",
      "status": "new",
      "adminNotes": "",
      "createdAt": "2026-10-21T15:20:00.000Z",
      "updatedAt": "2026-10-21T15:20:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalCount": 1,
    "limit": 15,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

---

### 11.3 Get Message Detail (Admin)
- **Method:** `GET`
- **Endpoint:** `/api/v1/admin/contact-messages/:id`
- **Auth Required:** Yes
- **Response (200 OK):** Full contact inquiry object.

---

### 11.4 Update Message Status & Internal Notes (Admin)
- **Method:** `PATCH`
- **Endpoint:** `/api/v1/admin/contact-messages/:id`
- **Auth Required:** Yes
- **Request Body:**
  ```json
  {
    "status": "in_progress",
    "adminNotes": "Spoke via phone. Swatch kit sent to Paris address."
  }
  ```
- **Response (200 OK):** Updated contact inquiry object.

---

### 11.5 Delete Contact Message (Admin)
- **Method:** `DELETE`
- **Endpoint:** `/api/v1/admin/contact-messages/:id`
- **Auth Required:** Yes (`super_admin`, `store_manager` only)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Contact message deleted successfully",
    "data": { "id": "cm-9128374a-4b12-4cf0-88b1-39a01f82bc71" }
  }
  ```
