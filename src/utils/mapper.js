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

export function mapProduct(p) {
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
  const variants = rawVariants.map((v) => ({
    id: v.id,
    sku: v.sku,
    size: v.size,
    color: v.color,
    colorHex: v.colorHex ?? v.color_hex,
    stock: v.stock || 0,
    priceOverride: (v.priceOverride ?? v.price_override) ? Number(v.priceOverride ?? v.price_override) : undefined,
  }));

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
    price: Number(p.price),
    salePrice: (p.salePrice ?? p.sale_price) ? Number(p.salePrice ?? p.sale_price) : undefined,
    isFeatured: p.isFeatured ?? p.is_featured ?? false,
    isBestseller: p.isBestseller ?? p.is_bestseller ?? false,
    isNewArrival: p.isNewArrival ?? p.is_new_arrival ?? false,
    isPublished: p.isPublished ?? p.is_published ?? true,
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
    availableColors: p.availableColors || p.available_colors || [],
    availableSizes: p.availableSizes || p.available_sizes || [],
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
