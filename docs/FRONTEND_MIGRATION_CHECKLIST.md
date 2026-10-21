# Frontend Migration & Integration Checklist — LeatherMart / Atelier Valenti Milano

**Target Applications:**
- `leathermart` (Next.js Storefront)
- `leathermart-admin` (React Admin Dashboard)

---

## 1. High-Priority Breaking Changes & Gotchas

| Issue | Previous Behavior | Current Backend Behavior | Action Required |
| :--- | :--- | :--- | :--- |
| **Variant Stock** | Numeric quantity `variant.stock: 5` | Boolean availability `variant.inStock: boolean` | Update variant selection logic and TypeScript interfaces from `v.stock > 0` to `Boolean(v.inStock)`. |
| **Product Master Stock** | No product-level flag; calculated strictly from variants | Master toggle `product.isInStock: boolean` + combined `product.inStock: boolean` | Render "Sold Out" / "Backorder" badges when `!product.isInStock`. |
| **Multi-Region Pricing** | Flat EUR price | Explicit regional pricing via `ProductPrice` model. API responds based on `x-market` header or `?market=...` | Set `publicApiClient.defaults.headers.common['x-market'] = marketCode` (Already configured in `MarketContext.tsx`). |
| **Product Sizes & Colors** | Arbitrary string arrays | Relational models (`ProductSize`, `ProductColor`). Products require at least one size and color selected. | In product creation/edit form, send `sizes: string[]` and `colors: string[]` mapped from master sizes/colors. |
| **Product Delete Safeguards** | Deleting sizes or categories used by products would fail with raw 500 error | Fails cleanly with HTTP 400 and `errorCode: "ERR_SIZE_IN_USE"` or `"ERR_COLOR_IN_USE"` | Display user-friendly error toast informing admin to unassign records before deleting. |

---

## 2. Storefront (`leathermart`) Migration Checklist

### A. Contact Us & Client Concierge (Status: COMPLETED)
- [x] Create `src/lib/api/contact.ts` with `submitContactInquiry(payload)`.
- [x] Create `src/context/ContactModalContext.tsx` exposing `openContactModal(subject?)` and `closeContactModal()`.
- [x] Create luxury `src/components/contact/ContactModal.tsx` matching Atelier Valenti aesthetic.
- [x] Mount `<ContactModalProvider>` and `<ContactModal />` in `src/components/providers/StoreProvider.tsx`.
- [x] Add "Client Concierge & Contact Us" trigger in `src/components/layout/Footer.tsx`.
- [x] Add "Contact Atelier Concierge" trigger in `src/components/layout/MobileNavDrawer.tsx`.
- [x] Verified zero TypeScript compilation errors via `npx tsc --noEmit`.

### B. Currency & Regional Pricing Integration
- [x] `MarketContext.tsx` stores selected market (`PK`, `IT`, `GLOBAL`) in `localStorage` and cookie `x-market`.
- [x] `publicApiClient.defaults.headers.common['x-market'] = storedMarket;` ensures all public requests resolve prices natively in target currency.
- [ ] In Product Detail Page (`src/app/products/[slug]/page.tsx`):
  - Ensure price displays using `product.currencySymbol` (`€` or `Rs.`) and formatted price `product.resolvedPrice?.formattedPrice`.
  - When user switches market in `MarketSelector`, trigger re-fetch of product data.

### C. Master Policies & Lifetime Guarantees
- [ ] In Product Detail Page (`src/app/products/[slug]/page.tsx`):
  - Check if `product.policies` array is present.
  - Render luxury accordion or bulleted cards for each policy:
    ```tsx
    {product.policies?.map((policy) => (
      <div key={policy.id} className="border-t border-white/[0.08] py-4">
        <h4 className="text-xs uppercase font-mono tracking-widest text-[#C5A47E]">{policy.name}</h4>
        <p className="text-xs text-white/70 mt-1">{policy.description}</p>
        <ul className="mt-2 space-y-1 text-xs text-white/50">
          {policy.bulletPoints?.map((pt, i) => (
            <li key={i}>• {pt}</li>
          ))}
        </ul>
      </div>
    ))}
    ```

---

## 3. Admin Dashboard (`leathermart-admin`) Migration Checklist

### A. Contact Inquiries Management (Status: COMPLETED)
- [x] Add `ContactMessage`, `ContactMessageStatus`, and `ContactQueryParams` to `src/types/index.ts`.
- [x] Add status badges for `new`, `in_progress`, `resolved`, `spam` in `src/components/common/Badge.tsx`.
- [x] Create `src/lib/api/contact.ts` (`listMessages`, `getMessage`, `updateMessage`, `deleteMessage`).
- [x] Create `src/pages/contact-messages/ContactMessageDetailModal.tsx`.
- [x] Create `src/pages/contact-messages/ContactMessagesList.tsx` with search, status filters, date range filters, pagination, and delete dialog.
- [x] Add "Contact Inquiries" route in `src/App.tsx` and sidebar link in `src/components/layout/Sidebar.tsx`.
- [x] Verified production build via `npm run build` (`tsc && vite build`) — 0 errors.

### B. Master Sizes Management Modal / Page
- [ ] Verify `src/pages/sizes/SizesList.tsx` or `ManageSizesModal.tsx` interacts with:
  - `GET /api/v1/admin/sizes`
  - `POST /api/v1/admin/sizes`
  - `PUT /api/v1/admin/sizes/:id`
  - `POST /api/v1/admin/sizes/:id/toggle-active`
  - `DELETE /api/v1/admin/sizes/:id`
- [ ] Handle `ERR_SIZE_IN_USE` gracefully with toast warning: "Cannot delete size while assigned to products. Deactivate it instead."

### C. Master Colors Management Modal / Page
- [ ] Verify `src/pages/colors/ColorsList.tsx` or `ManageColorsModal.tsx` interacts with:
  - `GET /api/v1/admin/colors`
  - `POST /api/v1/admin/colors`
  - `PUT /api/v1/admin/colors/:id`
  - `POST /api/v1/admin/colors/:id/toggle-active`
  - `DELETE /api/v1/admin/colors/:id`
- [ ] Include color picker component feeding `hex` value (e.g. `#0D0C0B`).

### D. Reusable Policies Management
- [ ] Create or update `src/pages/policies/PoliciesList.tsx` interacting with:
  - `GET /api/v1/admin/policies`
  - `POST /api/v1/admin/policies`
  - `PUT /api/v1/admin/policies/:id`
  - `POST /api/v1/admin/policies/:id/toggle-active`
  - `DELETE /api/v1/admin/policies/:id`

### E. Product Creation & Edit Form
- [ ] In `ProductForm.tsx`:
  - **In-Stock Toggle:** Add switch for `isInStock: boolean` (label: "Available in Stock").
  - **Size Checkboxes:** Fetch sizes from `GET /api/v1/admin/sizes` and allow multi-selecting.
  - **Color Swatches:** Fetch colors from `GET /api/v1/admin/colors` and allow multi-selecting.
  - **Regional Pricing Table:**
    - Inputs for `GLOBAL` (EUR), `IT` (EUR), and `PK` (PKR).
    - Allow entering price and optional sale price.
  - **Policies Multi-Select:** Fetch from `GET /api/v1/admin/policies` and allow attaching policies to the product.
  - **Image Upload:** Use `/api/v1/admin/products/images/upload` or direct `/api/v1/admin/media/upload`.

---

## 4. TypeScript Type Definition Updates

Ensure your frontend `src/types/index.ts` contains the following synchronized interfaces:

```typescript
// 1. Regional Pricing
export type MarketCode = 'GLOBAL' | 'IT' | 'PK';
export type CurrencyCode = 'EUR' | 'PKR';

export interface RegionalPrice {
  id?: string;
  regionCode: MarketCode;
  currency: CurrencyCode;
  price: number;
  salePrice?: number | null;
  isActive?: boolean;
}

export interface ResolvedPrice {
  regionCode: MarketCode;
  currency: CurrencyCode;
  symbol: string;
  price: number;
  salePrice: number | null;
  formattedPrice: string;
  formattedSalePrice: string | null;
  isSale: boolean;
  discountPercentage: number;
}

// 2. Master Sizes & Colors
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
  hex: string;
  sortOrder: number;
  isActive: boolean;
  productCount?: number;
}

// 3. Reusable Policies
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

// 4. Contact Concierge
export type ContactMessageStatus = 'new' | 'in_progress' | 'resolved' | 'spam';

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  subject: string;
  message: string;
  status: ContactMessageStatus;
  adminNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContactQueryParams {
  page?: number;
  limit?: number;
  status?: ContactMessageStatus;
  search?: string;
  startDate?: string;
  endDate?: string;
}

// 5. Updated Product Interface
export interface Product {
  id: string;
  _id?: string;
  sku: string;
  name: string;
  slug: string;
  categorySlug: string;
  categoryLabel?: string;
  collectionId?: string | null;
  gender?: string | null;
  styles?: string[];
  leatherType: string;
  hardware?: string;
  lining?: string;
  modelInfo?: string;
  description: string;
  editorialQuote?: string;
  price: number;
  salePrice?: number;
  currency: CurrencyCode;
  currencySymbol: string;
  resolvedPrice?: ResolvedPrice;
  regionalPrices?: RegionalPrice[];
  isInStock: boolean; // Master product availability toggle
  inStock: boolean;   // Master flag && at least one variant available
  isFeatured?: boolean;
  isBestseller?: boolean;
  isNewArrival?: boolean;
  isPublished?: boolean;
  sortOrder?: number;
  rating?: number;
  reviewCount?: number;
  images: Array<{
    id?: string;
    url: string;
    alt?: string;
    isPrimary?: boolean;
    isHover?: boolean;
    sortOrder?: number;
  }>;
  variants: Array<{
    id?: string;
    sku: string;
    size: string;
    color: string;
    colorHex: string;
    inStock: boolean; // Note: boolean flag, not numeric stock
    priceOverride?: number;
  }>;
  sizes?: ProductSize[];
  colors?: ProductColor[];
  policies?: ProductPolicy[];
  availableSizes?: string[];
  availableColors?: Array<{ name: string; hex: string }>;
}
```

---

## 5. Summary of Affected Frontend Components

| Repository | Component / File | Purpose of Update |
| :--- | :--- | :--- |
| `leathermart` | `src/context/ContactModalContext.tsx` | Global state controller for Contact Us modal (Created & Active). |
| `leathermart` | `src/components/contact/ContactModal.tsx` | Luxury Atelier Valenti Milano contact form with validation (Created & Active). |
| `leathermart` | `src/components/layout/Footer.tsx` | Hooked up "Client Concierge & Contact Us" button in footer care links. |
| `leathermart` | `src/components/layout/MobileNavDrawer.tsx` | Added "Contact Atelier Concierge" action inside mobile navigation drawer. |
| `leathermart` | `src/context/MarketContext.tsx` | Dispatches `x-market` header on all requests for dynamic regional prices. |
| `leathermart` | `src/components/product/ProductCard.tsx` | Replace `variant.stock > 0` with `variant.inStock`; show "Sold Out" when `!product.isInStock`. |
| `leathermart-admin` | `src/pages/contact-messages/ContactMessagesList.tsx` | Full contact messages inbox with status filter, date search, and delete modal (Created & Active). |
| `leathermart-admin` | `src/pages/contact-messages/ContactMessageDetailModal.tsx` | Detail view with status changer, notes updater, and mailto reply (Created & Active). |
| `leathermart-admin` | `src/components/layout/Sidebar.tsx` | Added Contact Inquiries link with `Inbox` icon to navigation (Active). |
| `leathermart-admin` | `src/pages/products/ProductForm.tsx` | Add `isInStock` toggle switch, relational size checkboxes, and color pickers. |
