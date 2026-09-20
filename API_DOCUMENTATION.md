# Atelier Valenti Milano — Backend API Documentation

**Version:** 1.0.0  
**Base URL:** `/api/v1` (with `/api` compatibility aliases)  
**Standard Response Envelope:**
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {}
}
```

**Standard Error Envelope:**
```json
{
  "success": false,
  "message": "Error description",
  "errorCode": "ERR_CODE",
  "statusCode": 400,
  "errors": {}
}
```

---

## 1. System & Health Check

### `GET /api/health`
Checks server and Supabase PostgreSQL connectivity.
* **Authentication:** None
* **Response (200 OK):**
```json
{
  "success": true,
  "message": "Atelier Valenti Milano API is operational and healthy",
  "data": {
    "status": "healthy",
    "timestamp": "2026-09-19T23:55:00.000Z",
    "uptime": 12.34,
    "database": "connected",
    "environment": "development"
  }
}
```

---

## 2. Public Storefront APIs

### 2.1 Content & Layout

#### `GET /api/v1/content/homepage`
Retrieves all structured modular homepage sections in a single round-trip.
* **Authentication:** None
* **Response (200 OK):**
  - `announcement`: Top bar configuration
  - `hero`: Title, subtitle, eyebrow, CTAs, media
  - `editorial`: Heritage story and zoom photography
  - `craftsmanship`: 4 tailoring principles
  - `macroTexture`: Tuscan calfskin specs and macro visual
  - `signatureBanner`: Capsule lookbook banner
  - `story`: Workshop history and master tailor signature
  - `trustPerks`: AZO-free certification, express delivery, warranty, exchanges
  - `testimonials`: European client reviews
  - `socialLooks`: Curated Instagram looks

#### `GET /api/v1/content/navigation`
Delivers mega-menu categories, styles, shop-by-leather options, and featured cards for Men, Women, Customize, and Design-Your-Own.
* **Authentication:** None
* **Query Params:** `menu` (optional: `men`, `women`, `customize`)

#### `GET /api/v1/settings/footer`
Delivers footer navigation columns, certification badge line (`✔️ AZO-Free Leather · ✔️ EU REACH Compliant`), atelier physical address, and copyright text.

#### `GET /api/v1/settings/shipping`
Returns European shipping zones, delivery timeframes, and free delivery thresholds (€250).

#### `GET /api/v1/settings/search-keywords`
Returns popular search chips for the storefront search overlay.

#### `GET /api/v1/seo/metadata?path=/products/montreal-leather-bomber`
Dynamic SEO, canonical link, OpenGraph card, and Schema.org JSON-LD for any page path.

---

### 2.2 Products & Catalogue

#### `GET /api/v1/products`
Filtered, paginated public catalogue for `/shop`, `/men`, `/women`.
* **Query Parameters:**
  - `category`: e.g. `biker`, `bomber`, `aviator`, `suede`, `trench`, `accessories`
  - `gender`: `men`, `women`, `unisex`, `all`
  - `style`: `classic`, `vintage`, `biker`, `minimal`, `luxury`, `shearling`
  - `leatherType`: Full or partial leather name
  - `leatherFamily`: `black`, `brown`, `suede`, `shearling`, `premium`
  - `size`: e.g. `48 (EU M)`
  - `color`: e.g. `Obsidian Black`
  - `min_price`, `max_price`: numeric EUR range
  - `is_new`: boolean
  - `is_bestseller`: boolean
  - `is_featured`: boolean
  - `sort`: `featured`, `newest`, `price-asc`, `price-desc`
  - `search` / `q`: full-text search term
  - `page`: integer (default 1)
  - `limit`: integer (default 12, max 48)

* **Response (200 OK):**
```json
{
  "success": true,
  "message": "Products retrieved successfully",
  "data": [
    {
      "sku": "MLB-001",
      "slug": "montreal-leather-bomber",
      "name": "Montreal Leather Bomber",
      "price": 385.00,
      "leatherType": "Full-Grain Italian Calfskin",
      "images": [...]
    }
  ],
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

#### `GET /api/v1/products/:slug`
Full garment specification for Product Detail Page (PDP).
* Returns product, image gallery, variants with stock, specifications, care instructions, approved client reviews, and related garments.

#### `GET /api/v1/products/facets`
Returns live attribute counts for filter sidebars (categories, leather types, available colors, sizes, price ranges).

#### `GET /api/v1/products/search?q=jacket`
High-speed query suggestion endpoint returning matching garments for live dropdowns.

#### `POST /api/v1/products/:id/reviews`
Submits customer review for moderation.
* **Request Body:**
```json
{
  "author": "Julien D.",
  "location": "Paris, France",
  "rating": 5,
  "title": "Masterpiece in leather",
  "comment": "Sublime cut through the shoulders and rich calfskin aroma."
}
```

---

### 2.3 Bespoke & Interactive Studio

#### `GET /api/v1/customization/options`
Returns options with prices, origins, weights, and finishes:
* Silhouettes (Biker, Bomber, Aviator, Trench, Cafe Racer)
* Leathers (Calfskin, Nappa Lambskin, Spanish Merino Shearling, Tuscan Suede)
* Colors (Obsidian Black, Espresso Brown, Tuscan Cognac, Smoked Graphite, Vintage Oxblood)
* Linings (Japanese Cupro Twill, Quilted Silk, Herringbone Cotton)
* Hardware (Antiqued Brushed Brass, Oxidized Silver Excella®, Matte Anthracite)

#### `POST /api/v1/customization/commissions`
Submits client bespoke commission.
* **Request Body:**
```json
{
  "silhouetteId": "biker",
  "leatherId": "calfskin",
  "colorId": "obsidian",
  "liningId": "cupro",
  "hardwareId": "brass",
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
  }
}
```
* **Response (201 Created):**
```json
{
  "success": true,
  "message": "Custom commission registered successfully with the Milan atelier.",
  "data": {
    "dossierNumber": "AV-2026-C001",
    "status": "pending",
    "estimatedPrice": 620.00,
    "currency": "EUR",
    "estimatedDelivery": "4–6 weeks"
  }
}
```

---

## 3. Protected Admin APIs

> **Authentication Required:** Pass `Authorization: Bearer <accessToken>` header or authenticated HttpOnly cookie.

### 3.1 Authentication

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/admin/auth/login` | Authenticate admin user, set session cookie, return JWT |
| `POST` | `/api/v1/admin/auth/refresh` | Refresh access token using refresh token |
| `POST` | `/api/v1/admin/auth/logout` | Invalidate cookies and sign out |
| `GET` | `/api/v1/admin/auth/me` | Current authenticated admin profile & permissions |
| `POST` | `/api/v1/admin/auth/change-password` | Update current admin password |

### 3.2 Product & Review Management

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/admin/products` | Paginated product table (all statuses) with search & filters |
| `POST` | `/api/v1/admin/products` | Create new garment specification |
| `GET` | `/api/v1/admin/products/:id` | Full garment editing state |
| `PUT` | `/api/v1/admin/products/:id` | Full update |
| `PATCH` | `/api/v1/admin/products/:id` | Partial update |
| `DELETE` | `/api/v1/admin/products/:id` | Remove garment from collection |
| `POST` | `/api/v1/admin/products/:id/publish` | Toggle published / draft state |
| `POST` | `/api/v1/admin/products/:id/duplicate` | Clone product with `-copy` SKU/slug |
| `POST` | `/api/v1/admin/products/bulk` | Bulk publish, unpublish, or delete |
| `PUT` | `/api/v1/admin/products/reorder` | Drag-and-drop sort order update |
| `GET` | `/api/v1/admin/reviews` | Review moderation queue |
| `PATCH` | `/api/v1/admin/reviews/:id/approve` | Approve or reject customer review |
| `DELETE` | `/api/v1/admin/reviews/:id` | Delete customer review |

### 3.3 Category & Collection Management

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/admin/categories` | List all categories with product counts |
| `POST` | `/api/v1/admin/categories` | Create category |
| `PUT` | `/api/v1/admin/categories/:id` | Update category details |
| `DELETE` | `/api/v1/admin/categories/:id` | Delete category |
| `PUT` | `/api/v1/admin/categories/reorder` | Reorder category cards |
| `GET` | `/api/v1/admin/collections` | List seasonal capsules |
| `POST` | `/api/v1/admin/collections` | Create seasonal capsule |
| `PUT` | `/api/v1/admin/collections/:id` | Update collection |
| `DELETE` | `/api/v1/admin/collections/:id` | Delete collection |

### 3.4 CMS & Content Builder

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/admin/cms/sections` | List all modular homepage sections |
| `GET` | `/api/v1/admin/cms/sections/:sectionKey` | Get section by key (hero, editorial, etc.) |
| `PUT` | `/api/v1/admin/cms/sections/:sectionKey` | Update section title, subtitle, CTAs, media, extraPayload |
| `PATCH` | `/api/v1/admin/cms/sections/:sectionKey/visibility` | Toggle section visibility |
| `PUT` | `/api/v1/admin/cms/sections/reorder` | Reorder homepage sections |
| `GET / POST` | `/api/v1/admin/testimonials` | List / create client testimonials |
| `PUT / DELETE` | `/api/v1/admin/testimonials/:id` | Update / delete testimonial |
| `PUT` | `/api/v1/admin/testimonials/reorder` | Reorder client testimonials |
| `GET / POST` | `/api/v1/admin/social-looks` | List / create Instagram editorial looks |
| `PUT / DELETE` | `/api/v1/admin/social-looks/:id` | Update / delete Instagram look |
| `PUT` | `/api/v1/admin/social-looks/reorder` | Reorder editorial feed grid |
| `GET` | `/api/v1/admin/subscribers` | List newsletter subscribers |

### 3.5 Bespoke Commission Dossiers

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/admin/commissions` | List dossiers with filter by status (`pending`, `contacted`, `in_tailoring`, `completed`) |
| `GET` | `/api/v1/admin/commissions/:id` | Full measurements and client details |
| `PATCH` | `/api/v1/admin/commissions/:id/status` | Advance atelier workflow status |
| `POST` | `/api/v1/admin/commissions/bulk-status` | Bulk advance statuses |

### 3.6 Media & File Upload

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/admin/media/upload` | Upload media file (multipart/form-data: `file`, `folder`, `altText`) |
| `GET` | `/api/v1/admin/media` | Browse media library with pagination & search |
| `DELETE` | `/api/v1/admin/media/:id` | Delete media asset and remove file from disk |

### 3.7 Settings & Navigation

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/admin/settings` | Retrieve global site configuration |
| `PATCH` | `/api/v1/admin/settings` | Update announcement, shipping, footer, address |
| `PUT` | `/api/v1/admin/settings/search-keywords` | Update search keyword chips |
| `GET` | `/api/v1/admin/navigation/mega-menu` | Get mega-menu tree |
| `PUT` | `/api/v1/admin/navigation/mega-menu/:menuKey` | Update specific menu (`men`, `women`, `customize`) |
| `GET / POST` | `/api/v1/admin/users` | List / create admin users (Super Admin only) |
| `PUT / DELETE` | `/api/v1/admin/users/:id` | Update role / delete admin user |
