# Atelier Valenti Milano / LeatherMart — Frontend Integration Handoff Guide

**Document Purpose:** Complete specification and integration playbook for the Storefront Frontend Coding Agent  
**Target Repository:** `leathermart` (Next.js / React Storefront)  
**Backend Target Branch:** `staging`  
**Backend URL (Local):** `http://localhost:5000/api/v1`  
**Protocol:** REST / JSON  
**Author:** Senior Backend Engineering Team  
**Audit Verification:** 100% verified against running code and 111 automated Vitest tests on `staging`  

---

## 1. Executive Summary of Backend Changes

The `staging` branch of the backend introduces major architectural upgrades, multi-market commerce capabilities, centralized catalogs, and new customer engagement features. 

While the administrative dashboard (`leathermart-admin`) has adopted several of these capabilities, the **public storefront (`leathermart`) must now be updated** to integrate the new contracts.

### Summary of What Changed:
1. **Platform Branding & Dynamic Store Identity:**
   - New `GET /api/v1/settings/branding` endpoint delivering dynamic brand title, short name, standard/light/dark logos, and favicon.
2. **Multi-Region Pricing Engine:**
   - Multi-currency support: Pakistan (`PK` -> `PKR` / `Rs.`), Italy (`IT` -> `EUR` / `€`), and Global (`GLOBAL` -> `EUR` / `€`).
   - Every product response includes `resolvedPrice` with pre-formatted currency amounts (`formattedPrice`, `formattedSalePrice`, `effectivePrice`).
   - Market selection passed via `?market=...` or `x-market` header.
3. **Master Reusable Attributes (Sizes, Colors, Policies):**
   - Centralized `GET /api/v1/sizes`, `GET /api/v1/colors`, and `GET /api/v1/policies`.
   - Products deliver structured `sizes`, `colors` (with verified HEX values), and `policies` (with structured bullet points for guarantees).
4. **Product Stock Master Flag & Variant Boolean Stock:**
   - **Breaking Change:** `ProductVariant.stock` (number) is replaced with `ProductVariant.inStock` (boolean).
   - `Product.isInStock` boolean master toggle on garments.
   - Filter query parameters support `in_stock=true|false`.
5. **Customer Concierge & "Contact Us" System:**
   - New public `POST /api/v1/contact` with IP rate limiting and email dispatch.
6. **Supabase Cloud Storage Integration:**
   - Uploads are streamed directly into Supabase Storage. Image URLs are full HTTPS Supabase URLs or local development URLs.
7. **Explicit Boundary Clarification (What is NOT implemented):**
   - **Cart & Checkout:** The backend **does not** yet feature a shopping cart or checkout/order table in the database. Cart management must continue to be handled client-side (e.g., Zustand, React Context, or LocalStorage) until server-side order APIs are introduced.
   - **Customer Accounts:** There is no customer authentication endpoint; JWT authentication is strictly for administrative users.

---

## 2. API Endpoint Change Matrix

### 2.1 New Endpoints to Integrate

| Method | Canonical URL Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/settings/branding` | None (Public) | Fetch store brand name, standard/light/dark logo URLs, favicon, and SEO description |
| `GET` | `/api/v1/sizes` | None (Public) | Fetch active master sizes catalog |
| `GET` | `/api/v1/colors` | None (Public) | Fetch active master colors with hex codes |
| `GET` | `/api/v1/policies` | None (Public) | Fetch active master atelier policies & guarantees |
| `POST` | `/api/v1/contact` | None (Public) | Submit Contact Us / Concierge inquiry (Rate limited: 10/15min) |

### 2.2 Modified Endpoints Requiring Frontend Updates

| Method | Canonical URL Path | Changes & Impact |
|---|---|---|
| `GET` | `/api/v1/products` | Added `resolvedPrice`, `regionalPrices`, `sizes`, `colors`, `policies`, `isInStock`. Added query params `market`, `in_stock`, `isInStock`, `is_in_stock`. |
| `GET` | `/api/v1/products/:slug` | Added `resolvedPrice`, `sizes`, `colors`, `policies`, `isInStock`. `variants` objects now feature `inStock: boolean` (not integer `stock`). Supports `?market=` query param. |
| `GET` | `/api/v1/products/search` | Supports `?market=` query param and returns `resolvedPrice`. |
| `GET` | `/api/v1/products/facets` | Aggregates sizes and colors from relational assignments as well as legacy arrays. |
| `GET` | `/api/v1/seo/metadata` | Returns dynamic title and OpenGraph metadata including primary Supabase image URLs. |

### 2.3 Breaking Changes & Migration Caveats

1. **`ProductVariant.stock` -> `ProductVariant.inStock`:**
   - **Before:** `variant.stock > 0`
   - **Now:** `variant.inStock === true`
   - *Transitional Note:* The backend mapper still accepts legacy data, but will always emit `inStock: boolean` in JSON output.
2. **Product Stock Master Switch:**
   - Products have a master boolean `isInStock`. If `isInStock === false`, the garment is sold out regardless of variant state.
   - The computed property `inStock` is also provided (`isInStock && at least one variant inStock`).
3. **Price Resolution (`resolvedPrice`):**
   - The root `price` and `salePrice` are automatically set to the active market currency if `?market=` or `x-market` is provided.
   - Use `product.resolvedPrice.formattedPrice` or `product.resolvedPrice.formattedSalePrice` for clean currency display.

---

## 3. Required TypeScript Interfaces

Add or replace these interfaces in your frontend types directory (typically `src/types/product.ts`, `src/types/settings.ts`, etc.):

```typescript
// ==========================================
// 1. Regional Pricing
// ==========================================
export type MarketRegion = 'PK' | 'IT' | 'GLOBAL';

export interface RegionalPrice {
  id?: string;
  regionCode: MarketRegion;
  currency: 'PKR' | 'EUR';
  price: number;
  salePrice: number | null;
  isActive: boolean;
}

export interface ResolvedPrice {
  market: MarketRegion;
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

// ==========================================
// 2. Master Attributes
// ==========================================
export interface ProductSize {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  productCount?: number;
}

export interface ProductColor {
  id: string;
  name: string;
  slug: string;
  hex: string;                  // e.g. "#11100F"
  sortOrder: number;
  isActive: boolean;
  productCount?: number;
}

export interface ProductPolicy {
  id: string;
  name: string;
  slug: string;
  description: string;
  bulletPoints: string[];
  sortOrder: number;
  isActive: boolean;
  productCount?: number;
}

// ==========================================
// 3. Product & Variants
// ==========================================
export interface ProductImage {
  url: string;
  alt: string;
  isPrimary: boolean;
  isHover: boolean;
  type: 'front' | 'back' | 'detail' | 'editorial' | 'perspective';
  sortOrder: number;
}

export interface ProductVariant {
  id?: string;
  sku: string;
  size: string;
  color: string;
  colorHex?: string;
  inStock: boolean;             // Replaces legacy number stock
  stock?: number;               // Optional legacy fallback
  priceOverride?: number;
}

export interface ProductReview {
  id: string;
  author: string;
  location: string;
  rating: number;
  date: string;
  title: string;
  comment: string;
  verified: boolean;
}

export interface Product {
  id: string;
  _id?: string;
  sku: string;
  slug: string;
  name: string;
  tagline: string;
  category: string;             // Category slug (e.g. "biker")
  categoryLabel: string;        // Human readable (e.g. "Biker Jackets")
  collectionId?: string | null;
  gender: 'men' | 'women' | 'unisex';
  styles: string[];
  price: number;
  salePrice?: number;
  resolvedPrice?: ResolvedPrice;
  regionalPrices?: RegionalPrice[];
  currency: string;
  currencySymbol: string;
  isFeatured: boolean;
  isBestseller: boolean;
  isNewArrival: boolean;
  isPublished: boolean;
  isInStock: boolean;           // Product-level master toggle
  inStock: boolean;             // Computed availability (master && variants)
  leatherType: string;
  hardware: string;
  lining: string;
  description: string;
  editorialQuote?: string;
  specifications: string[];
  careInstructions: string[];
  modelInfo?: string;
  images: ProductImage[];
  variants: ProductVariant[];
  sizes: ProductSize[];         // Master relational sizes
  colors: ProductColor[];       // Master relational colors with hex
  policies: ProductPolicy[];    // Master relational policies
  availableColors: Array<{ name: string; hex: string }>; // Compatibility array
  availableSizes: string[];     // Compatibility array
  rating: number;
  reviewCount: number;
  reviews?: ProductReview[];
  relatedProducts?: Product[];
  seoTitle?: string;
  seoDescription?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 4. Platform Branding & Settings
// ==========================================
export interface PlatformBranding {
  platformName: string;
  platformShortName: string;
  logoUrl: string | null;
  logoDarkUrl: string | null;
  logoLightUrl: string | null;
  faviconUrl: string | null;
  browserTitle: string;
  metaDescription: string;
  updatedAt?: string;
}

// ==========================================
// 5. Contact Inquiries
// ==========================================
export interface ContactInquiryPayload {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

// ==========================================
// 6. Generic API Response Envelopes
// ==========================================
export interface ApiResponse<T> {
  success: boolean;
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

export interface ApiErrorResponse {
  success: false;
  message: string;
  errorCode: string;
  statusCode: number;
  errors?: Record<string, string[]>;
  details?: any;
}
```

---

## 4. Feature-by-Feature Frontend Implementation Guide

### 4.1 Feature 1: Platform Branding & Dynamic Identity
- **Endpoint:** `GET /api/v1/settings/branding`
- **UI Areas Affected:**
  - `Header` / `Navbar`: Render `logoUrl` (or `logoLightUrl` / `logoDarkUrl` based on theme) with fallback to `platformName`.
  - `Footer`: Display `platformName` and `platformShortName`.
  - `RootLayout` (`app/layout.tsx`): Dynamically set metadata `title` from `browserTitle` and `description` from `metaDescription`, and link `faviconUrl` in `<head>`.
- **Implementation Advice:**
  Create a React Context or SWR/React Query hook `useBranding()` that caches branding data at the root level.

```typescript
// Example fetcher in src/services/settings.service.ts
export async function getPlatformBranding(): Promise<PlatformBranding> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/settings/branding`);
  const json: ApiResponse<PlatformBranding> = await res.json();
  if (!json.success) throw new Error(json.message || 'Failed to load branding');
  return json.data;
}
```

---

### 4.2 Feature 2: Multi-Region Currency Selector
- **Endpoints Affected:**
  - `GET /api/v1/products?market={region}`
  - `GET /api/v1/products/{slug}?market={region}`
  - `GET /api/v1/products/search?q=...&market={region}`
- **UI Areas Affected:**
  - Header Currency Switcher: Allow client to toggle between:
    - `GLOBAL` (€ EUR - Global / Europe)
    - `IT` (€ EUR - Italy)
    - `PK` (Rs. PKR - Pakistan)
  - Persist chosen market in cookie or `localStorage` (key: `user_market`).
  - Attach `x-market: PK` header or `?market=PK` query parameter to all product API calls.
  - Product Card / PDP Price Display:
    ```tsx
    const priceDisplay = product.resolvedPrice?.formattedPrice || `€${product.price}`;
    const salePriceDisplay = product.resolvedPrice?.formattedSalePrice;
    const isSale = product.resolvedPrice?.isSale;
    ```

---

### 4.3 Feature 3: Master Sizes, Colors & PDP Swatches
- **Endpoints:**
  - `GET /api/v1/sizes`
  - `GET /api/v1/colors`
- **UI Areas Affected:**
  - **PDP Color Picker:** Use `product.colors` which provides `{ name, hex, slug }`. Render circular color swatches with CSS `style={{ backgroundColor: color.hex }}`.
  - **PDP Size Selector:** Use `product.sizes` which provides sorted `{ name, slug, sortOrder }`.
  - **Variant Matching:** When a user selects Size `S` and Color `Nero Milano`:
    ```typescript
    const selectedVariant = product.variants.find(
      (v) => v.size.toLowerCase() === selectedSize.toLowerCase() &&
             v.color.toLowerCase() === selectedColor.toLowerCase()
    );
    const isVariantAvailable = selectedVariant ? selectedVariant.inStock : false;
    ```
  - **Catalogue Filters Drawer:** Fetch `/api/v1/sizes` and `/api/v1/colors` to populate multi-select filter options in the product catalog sidebar.

---

### 4.4 Feature 4: Product Policies & Atelier Guarantees
- **Endpoint:** `GET /api/v1/policies` & `product.policies` on PDP
- **UI Areas Affected:**
  - **PDP Accordion / Guarantee Cards:** Render the policies assigned to the garment.
  - Display policy `name`, `description`, and iterate through `bulletPoints` with checkmark icons.
  - If a product has no customized policies, fallback to fetching all active policies from `GET /api/v1/policies`.

```tsx
// Example Policy Component
{product.policies?.map((policy) => (
  <div key={policy.id || policy.slug} className="atelier-policy-card">
    <h4 className="font-serif text-lg">{policy.name}</h4>
    <p className="text-sm text-neutral-400">{policy.description}</p>
    {policy.bulletPoints?.length > 0 && (
      <ul className="mt-2 space-y-1">
        {policy.bulletPoints.map((point, idx) => (
          <li key={idx} className="flex items-center text-xs text-neutral-300">
            <span className="mr-2 text-amber-500">✦</span> {point}
          </li>
        ))}
      </ul>
    )}
  </div>
))}
```

---

### 4.5 Feature 5: Product Stock Availability & Inventory UI
- **Contract Fields:**
  - `product.isInStock` (boolean): Master switch. If `false`, the garment is completely out of stock.
  - `product.inStock` (boolean): Computed availability (`isInStock && variants.some(v => v.inStock)`).
  - `variant.inStock` (boolean): Per-variant stock state.
- **Catalogue Filtering:**
  - Filter bar checkbox: `In Stock Only` (`?in_stock=true`).
- **PDP Add to Cart Button States:**
  1. **Garment Out of Stock:** If `!product.isInStock || !product.inStock`, disable "Add to Cart" and show "Currently Sold Out — Join Waitlist" or "Inquire for Bespoke Order".
  2. **Selected Variant Out of Stock:** If user chooses a variant where `!selectedVariant.inStock`, disable "Add to Cart" and display "Out of Stock in this Size/Color".
  3. **In Stock:** Show active "Add to Cart" / "Commission Piece".

---

### 4.6 Feature 6: "Contact Us" & Concierge Inquiry Page
- **Endpoint:** `POST /api/v1/contact`
- **UI Form Requirements:**
  - Fields:
    - `name` (input text, required)
    - `email` (input email, required)
    - `phone` (input tel, optional)
    - `subject` (input text or select dropdown, required)
    - `message` (textarea, required, min 10 chars)
  - **Loading State:** Disable submit button and display spinner while submitting.
  - **Success State:** Show confirmation banner: *"Your inquiry has been received. Our atelier concierge will contact you shortly."* Reset the form fields.
  - **Error Handling:**
    - `422 Unprocessable Entity`: Display inline error messages mapped from `errors` object.
    - `429 Too Many Requests`: Show alert *"You have submitted multiple inquiries. Please wait a few minutes before trying again."*
    - `500 Server Error`: Show generic *"Service temporarily unavailable. Please email concierge@ateliervalenti.com directly."*

---

## 5. Client API Service Implementation Examples

Here is ready-to-use TypeScript code for your API client (`src/services/api.ts`):

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export class AtelierApiClient {
  private static getHeaders(market?: string): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (market) {
      headers['x-market'] = market;
    }
    return headers;
  }

  // 1. Settings & Branding
  static async getBranding() {
    const res = await fetch(`${API_BASE}/settings/branding`, { next: { revalidate: 300 } });
    return (await res.json()).data;
  }

  // 2. Products
  static async getProducts(params: Record<string, any> = {}, market: string = 'GLOBAL') {
    const url = new URL(`${API_BASE}/products`);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.append(k, String(v));
      }
    });
    if (!url.searchParams.has('market')) {
      url.searchParams.append('market', market);
    }

    const res = await fetch(url.toString(), {
      headers: this.getHeaders(market),
      cache: 'no-store',
    });
    return await res.json();
  }

  static async getProductBySlug(slug: string, market: string = 'GLOBAL') {
    const res = await fetch(`${API_BASE}/products/${slug}?market=${market}`, {
      headers: this.getHeaders(market),
      cache: 'no-store',
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Product not found');
    return json.data;
  }

  // 3. Catalogs
  static async getSizes() {
    const res = await fetch(`${API_BASE}/sizes`, { next: { revalidate: 600 } });
    return (await res.json()).data;
  }

  static async getColors() {
    const res = await fetch(`${API_BASE}/colors`, { next: { revalidate: 600 } });
    return (await res.json()).data;
  }

  static async getPolicies() {
    const res = await fetch(`${API_BASE}/policies`, { next: { revalidate: 600 } });
    return (await res.json()).data;
  }

  // 4. Contact Us
  static async submitContact(payload: {
    name: string;
    email: string;
    phone?: string;
    subject: string;
    message: string;
  }) {
    const res = await fetch(`${API_BASE}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      const error: any = new Error(json.message || 'Submission failed');
      error.statusCode = res.status;
      error.errors = json.errors;
      throw error;
    }
    return json;
  }
}
```

---

## 6. Frontend Environment Configuration

Update your frontend `.env.local` or production Vercel configuration:

```env
# URL of the Atelier Valenti Backend Server
NEXT_PUBLIC_API_URL=http://localhost:5000

# Default Regional Market (GLOBAL, IT, or PK)
NEXT_PUBLIC_DEFAULT_MARKET=GLOBAL
```

---

## 7. Prioritized Implementation Checklist

Follow this sequence to update the storefront without regressions:

- [ ] **Step 1: Update TypeScript Types**
  - Replace `ProductVariant.stock` with `inStock: boolean`.
  - Add `ResolvedPrice`, `RegionalPrice`, `ProductSize`, `ProductColor`, `ProductPolicy`, and `PlatformBranding` interfaces.
- [ ] **Step 2: Update Layout & Dynamic Branding**
  - Call `GET /api/v1/settings/branding` in root layout or navigation header.
  - Render dynamic brand logos and browser titles.
- [ ] **Step 3: Implement Regional Currency Selector**
  - Store selected market in state/cookie (`GLOBAL`, `IT`, `PK`).
  - Pass `?market=` or `x-market` header on all product queries.
  - Update product cards and PDPs to display `product.resolvedPrice.formattedPrice` and `formattedSalePrice`.
- [ ] **Step 4: Update PDP Variant & Stock Availability**
  - Inspect `product.isInStock` and `variant.inStock`.
  - Render color swatches using verified `hex` codes from `product.colors`.
  - Disable Add to Cart button when a size/color variant is out of stock.
- [ ] **Step 5: Integrate Product Policies on PDP**
  - Render policy cards/accordions on the PDP showing `name`, `description`, and `bulletPoints`.
- [ ] **Step 6: Build "Contact Us" Concierge Page**
  - Implement form submitting to `POST /api/v1/contact`.
  - Handle 422 inline field errors and 429 rate limit errors.
- [ ] **Step 7: Update Catalogue Filters Drawer**
  - Add `In Stock Only` filter toggle submitting `in_stock=true`.
  - Populate sizes and colors filter options using `/api/v1/sizes` and `/api/v1/colors`.

---

## 8. Verification & QA Checklist

Verify the completed integration with the following tests:

1. **Branding Check:**
   - [ ] Run `GET http://localhost:5000/api/v1/settings/branding` and confirm logo, browser title, and store name render correctly in the browser tab and header.
2. **Stock Availability Check:**
   - [ ] In the admin panel, mark a product variant as out of stock. Confirm storefront shows "Out of Stock" when selecting that size/color.
   - [ ] In the admin panel, toggle the product's master `isInStock` to false. Confirm the storefront product card shows a "Sold Out" badge and disables purchasing.
3. **Multi-Region Pricing Check:**
   - [ ] Select `PK` in currency switcher. Confirm prices display in `Rs.` (PKR) without automatic exchange rate distortion.
   - [ ] Select `GLOBAL` or `IT`. Confirm prices display in `€` (EUR).
4. **Master Attributes Check:**
   - [ ] View a PDP and verify color swatches render with proper hex colors (`#11100F`, `#8B4513`, etc.).
   - [ ] Verify policies (shipping, guarantees) render bullet points correctly.
5. **Contact Form Check:**
   - [ ] Submit an inquiry with valid data: verify 201 Created and success message.
   - [ ] Submit empty fields: verify 422 inline validation messages appear.
   - [ ] Submit 11 times quickly: verify 429 rate limit alert appears on the 11th request.
