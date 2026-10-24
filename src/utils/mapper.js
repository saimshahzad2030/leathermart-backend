import { PricingService } from '../services/pricing.service.js';

/**
 * Utility functions to convert between PostgreSQL snake_case and Frontend camelCase
 */

export function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

export function camelToSnake(str) {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export function mapKeysToCamel(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(mapKeysToCamel);

  return Object.keys(obj).reduce((acc, key) => {
    const camelKey = snakeToCamel(key);
    const val = obj[key];
    acc[camelKey] = val !== null && typeof val === 'object' && !(val instanceof Date)
      ? mapKeysToCamel(val)
      : val;
    return acc;
  }, {});
}

export const mapRowToCamelCase = mapKeysToCamel;

export function mapKeysToSnake(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(mapKeysToSnake);

  return Object.keys(obj).reduce((acc, key) => {
    const snakeKey = camelToSnake(key);
    const val = obj[key];
    acc[snakeKey] = val !== null && typeof val === 'object' && !(val instanceof Date)
      ? mapKeysToSnake(val)
      : val;
    return acc;
  }, {});
}

export function mapProduct(p, market = 'GLOBAL') {
  if (!p) return null;

  const rawImages = p.images || p.product_images || [];
  const images = rawImages.map((img) => ({
    url: img.url,
    alt: img.alt || '',
    isPrimary: img.isPrimary ?? img.is_primary ?? false,
    isHover: img.isHover ?? img.is_hover ?? false,
    type: img.type || 'perspective',
    sortOrder: img.sortOrder ?? img.sort_order ?? 0,
  }));

  const rawVariants = p.variants || p.product_variants || [];
  const variants = rawVariants.map((v) => {
    const inStock = v.inStock !== undefined
      ? Boolean(v.inStock)
      : v.in_stock !== undefined
        ? Boolean(v.in_stock)
        : v.stock !== undefined && v.stock !== null
          ? Number(v.stock) > 0
          : true;

    return {
      id: v.id,
      sku: v.sku,
      size: v.size,
      color: v.color,
      colorHex: v.colorHex ?? v.color_hex,
      inStock,
      priceOverride: (v.priceOverride ?? v.price_override) ? Number(v.priceOverride ?? v.price_override) : undefined,
    };
  });

  const rawReviews = p.reviews || p.product_reviews || [];
  const reviews = rawReviews.map((r) => ({
    id: r.id,
    author: r.author,
    location: r.location,
    rating: r.rating,
    date: (r.createdAt || r.created_at) ? new Date(r.createdAt || r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
    title: r.title,
    comment: r.comment,
    verified: r.verified,
  }));

  const categorySlug = p.categorySlug || p.category_slug || (typeof p.category === 'string' ? p.category : p.category?.slug);
  const categoryLabel = p.categoryLabel || p.category_label || p.category?.name || '';

  // Extract relational sizes
  const rawSizeAssignments = Array.isArray(p.sizeAssignments)
    ? p.sizeAssignments
    : Array.isArray(p.sizeAssignments?.create)
    ? p.sizeAssignments.create
    : [];
  const sizes = rawSizeAssignments
    .map((sa) => sa.size || sa)
    .filter(Boolean)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const availableSizes = sizes.length > 0
    ? sizes.map((s) => s.name || s)
    : p.availableSizes || p.available_sizes || [];

  // Extract relational colors
  const rawColorAssignments = Array.isArray(p.colorAssignments)
    ? p.colorAssignments
    : Array.isArray(p.colorAssignments?.create)
    ? p.colorAssignments.create
    : [];
  const colors = rawColorAssignments
    .map((ca) => ca.color || ca)
    .filter(Boolean)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const availableColors = colors.length > 0
    ? colors.map((c) => ({ name: c.name || c, hex: c.hex || c.hexCode }))
    : p.availableColors || p.available_colors || [];

  // Extract relational policies
  const rawPolicyAssignments = Array.isArray(p.policyAssignments)
    ? p.policyAssignments
    : Array.isArray(p.policyAssignments?.create)
    ? p.policyAssignments.create
    : [];
  const policies = rawPolicyAssignments
    .map((pa) => ({
      id: pa.policy?.id || pa.policyId,
      name: pa.policy?.name || pa.name || '',
      slug: pa.policy?.slug || pa.slug || '',
      description: pa.policy?.description || pa.description || '',
      bulletPoints: pa.policy?.bulletPoints || pa.bulletPoints || [],
      sortOrder: pa.sortOrder ?? pa.policy?.sortOrder ?? 0,
      isActive: pa.policy?.isActive ?? true,
    }))
    .filter((pol) => pol.name)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // Extract regional prices
  const rawPrices = Array.isArray(p.prices)
    ? p.prices
    : Array.isArray(p.prices?.create)
    ? p.prices.create
    : Array.isArray(p.product_prices)
    ? p.product_prices
    : [];
  const regionalPrices = rawPrices.map((rp) => ({
    id: rp.id,
    regionCode: rp.regionCode || rp.region_code,
    currency: rp.currency,
    price: Number(rp.price),
    salePrice: rp.salePrice !== null && rp.salePrice !== undefined ? Number(rp.salePrice) : null,
    isActive: rp.isActive ?? rp.is_active ?? true,
  }));

  // Resolve pricing for requested market
  const resolvedPrice = PricingService.resolvePrice(p, market);

  // Product-level master stock flag
  const productIsInStock = p.isInStock !== undefined
    ? Boolean(p.isInStock)
    : p.is_in_stock !== undefined
      ? Boolean(p.is_in_stock)
      : true;

  // Overall product stock: available if product-level flag is true AND (if variants exist, at least one variant is in stock)
  const isProductInStock = productIsInStock && (variants.length > 0
    ? variants.some((v) => v.inStock)
    : true);

  return {
    id: p.id,
    _id: p.id,
    sku: p.sku,
    slug: p.slug,
    name: p.name,
    tagline: p.tagline || '',
    category: categorySlug,
    categoryLabel: categoryLabel,
    collectionId: p.collectionId || p.collection_id,
    gender: p.gender,
    styles: p.styles || [],
    price: resolvedPrice ? resolvedPrice.price : Number(p.price),
    salePrice: resolvedPrice?.salePrice !== null ? resolvedPrice.salePrice : ((p.salePrice ?? p.sale_price) ? Number(p.salePrice ?? p.sale_price) : undefined),
    resolvedPrice,
    regionalPrices,
    currency: resolvedPrice?.currency || 'EUR',
    currencySymbol: resolvedPrice?.symbol || '€',
    isFeatured: p.isFeatured ?? p.is_featured ?? false,
    isBestseller: p.isBestseller ?? p.is_bestseller ?? false,
    isNewArrival: p.isNewArrival ?? p.is_new_arrival ?? false,
    isPublished: p.isPublished ?? p.is_published ?? true,
    isInStock: productIsInStock,
    inStock: isProductInStock,
    leatherType: p.leatherType || p.leather_type,
    hardware: p.hardware || '',
    lining: p.lining || '',
    description: p.description,
    editorialQuote: p.editorialQuote || p.editorial_quote || '',
    specifications: p.specifications || [],
    careInstructions: p.careInstructions || p.care_instructions || [],
    modelInfo: p.modelInfo || p.model_info || '',
    images,
    variants,
    sizes,
    colors,
    policies,
    availableColors,
    availableSizes,
    rating: Number(p.rating || 5.0),
    reviewCount: Number(p.reviewCount || p.review_count || 0),
    reviews,
    seoTitle: p.seoTitle || p.seo_title,
    seoDescription: p.seoDescription || p.seo_description,
    createdAt: p.createdAt || p.created_at,
    updatedAt: p.updatedAt || p.updated_at,
  };
}

export function mapCategory(c, itemCount = 0) {
  if (!c) return null;
  return {
    id: c.id,
    slug: c.slug,
    name: c.name,
    subtitle: c.subtitle || '',
    description: c.description || '',
    heroImage: c.hero_image || '',
    itemCount,
    featuredOrder: c.featured_order || 0,
    highlightSpecs: c.highlight_specs || [],
    seoTitle: c.seo_title,
    seoDescription: c.seo_description,
    isPublished: c.is_published,
  };
}
