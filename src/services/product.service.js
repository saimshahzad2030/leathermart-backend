import { prisma } from '../lib/prisma.js';
import { generateSlug } from '../utils/slugify.js';
import { mapProduct } from '../utils/mapper.js';
import { HTTP_STATUS, DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT } from '../config/constants.js';
import { StorageService } from './storage.service.js';
import { PricingService } from './pricing.service.js';
import { logger } from '../utils/logger.js';

export const PRODUCT_INCLUDES = {
  images: { orderBy: { sortOrder: 'asc' } },
  variants: true,
  prices: true,
  sizeAssignments: {
    include: { size: true },
  },
  colorAssignments: {
    include: { color: true },
  },
  policyAssignments: {
    include: { policy: true },
    orderBy: { sortOrder: 'asc' },
  },
};

export const ProductService = {
  normalizeCategorySlug(category) {
    if (!category) return null;
    const s = category.toLowerCase().trim();
    if (s === 'biker-jackets' || s === 'biker') return 'biker';
    if (s === 'bomber-jackets' || s === 'bomber') return 'bomber';
    if (s === 'aviator-jackets' || s === 'aviator') return 'aviator';
    if (s === 'shearling-jackets' || s === 'shearling') return 'aviator';
    if (s === 'leather-coats' || s === 'trench' || s === 'coats') return 'leather-coats';
    if (s === 'leather-blazers' || s === 'blazers' || s === 'blazer') return 'leather-blazers';
    if (s === 'leather-accessories' || s === 'accessories') return 'leather-accessories';
    if (s === 'leather-jackets') return 'jackets';
    if (s === 'leather-vests' || s === 'vest') return 'vest';
    if (s === 'suede') return 'suede';
    return s;
  },

  async resolveCategory(categoryInput) {
    if (!categoryInput || typeof categoryInput !== 'string') {
      const err = new Error('Category is required');
      err.statusCode = HTTP_STATUS.BAD_REQUEST;
      err.errorCode = 'ERR_INVALID_CATEGORY';
      throw err;
    }

    const trimmed = categoryInput.trim();
    const normalizedSlug = this.normalizeCategorySlug(trimmed);

    // Look up category in database using normalized slug
    let category = await prisma.category.findUnique({
      where: { slug: normalizedSlug },
    });

    if (!category && trimmed.toLowerCase() !== normalizedSlug) {
      category = await prisma.category.findUnique({
        where: { slug: trimmed.toLowerCase() },
      });
    }

    if (!category) {
      const availableCategories = await prisma.category.findMany({
        select: { slug: true, name: true },
        orderBy: { featuredOrder: 'asc' },
      });
      const validSlugs = availableCategories.map((c) => c.slug).join(', ');

      const err = new Error(
        `Category '${categoryInput}' does not exist. Valid categories are: ${validSlugs || 'none configured'}`
      );
      err.statusCode = HTTP_STATUS.BAD_REQUEST;
      err.errorCode = 'ERR_INVALID_CATEGORY';
      err.details = {
        submittedCategory: categoryInput,
        normalizedSlug,
        validCategories: availableCategories.map((c) => ({ slug: c.slug, name: c.name })),
      };
      throw err;
    }

    return {
      id: category.id,
      slug: category.slug || normalizedSlug,
      name: category.name,
    };
  },

  /**
   * Helper to resolve, validate, and optionally auto-create custom size definitions.
   * Every product must have at least one size attached.
   */
  async resolveSizeAssignments(sizesInput, isUpdate = false, existingProduct = null) {
    if (!Array.isArray(sizesInput) || sizesInput.length === 0) {
      if (isUpdate && existingProduct) {
        // If not provided during update, retain existing
        return null;
      }
      const err = new Error('Every product must have at least one available size selected');
      err.statusCode = HTTP_STATUS.BAD_REQUEST;
      err.errorCode = 'ERR_SIZE_REQUIRED';
      throw err;
    }

    const stringItems = sizesInput
      .map((s) => (typeof s === 'string' ? s.trim() : s?.id || s?.name || ''))
      .filter(Boolean);

    if (stringItems.length === 0) {
      const err = new Error('Every product must have at least one available size selected');
      err.statusCode = HTTP_STATUS.BAD_REQUEST;
      err.errorCode = 'ERR_SIZE_REQUIRED';
      throw err;
    }

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUuid = (val) => typeof val === 'string' && UUID_REGEX.test(val);

    // Look up existing sizes by id, slug, or name (guarding against UUID cast errors)
    const uuidSizes = stringItems.filter(isUuid);
    const sizeConditions = [
      { slug: { in: stringItems.map((s) => s.toLowerCase()) } },
      { name: { in: stringItems } },
    ];
    if (uuidSizes.length > 0) {
      sizeConditions.push({ id: { in: uuidSizes } });
    }

    const existingSizes = await prisma.productSize.findMany({
      where: { OR: sizeConditions },
    });

    const foundNames = new Set(existingSizes.map((s) => s.name.toLowerCase()));
    const foundIds = new Set(existingSizes.map((s) => s.id));
    const foundSlugs = new Set(existingSizes.map((s) => s.slug.toLowerCase()));

    const finalSizes = [...existingSizes];

    // For any size provided that is not found, dynamically create it as a custom size
    for (const item of stringItems) {
      const lower = item.toLowerCase();
      if (foundIds.has(item) || foundNames.has(lower) || foundSlugs.has(lower)) {
        continue;
      }

      // Auto-create custom size
      const newSize = await prisma.productSize.create({
        data: {
          name: item,
          slug: generateSlug(item) || `size-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          isActive: true,
          sortOrder: finalSizes.length + 1,
        },
      });
      finalSizes.push(newSize);
      foundNames.add(lower);
      foundIds.add(newSize.id);
    }

    if (finalSizes.length === 0) {
      const err = new Error('Every product must have at least one available size selected');
      err.statusCode = HTTP_STATUS.BAD_REQUEST;
      err.errorCode = 'ERR_SIZE_REQUIRED';
      throw err;
    }

    // Validate active status for newly assigned sizes
    const existingAssignedSizeIds = new Set(
      existingProduct?.sizeAssignments?.map((sa) => sa.sizeId) || []
    );

    for (const s of finalSizes) {
      if (!s.isActive && !existingAssignedSizeIds.has(s.id)) {
        const err = new Error(`Size '${s.name}' is inactive and cannot be newly assigned to products.`);
        err.statusCode = HTTP_STATUS.BAD_REQUEST;
        err.errorCode = 'ERR_INACTIVE_SIZE';
        throw err;
      }
    }

    return finalSizes;
  },

  /**
   * Helper to resolve, validate, and optionally auto-create color definitions.
   * Every product must have at least one color attached.
   */
  async resolveColorAssignments(colorsInput, isUpdate = false, existingProduct = null) {
    if (!Array.isArray(colorsInput) || colorsInput.length === 0) {
      if (isUpdate && existingProduct) {
        return null;
      }
      const err = new Error('Every product must have at least one available color selected');
      err.statusCode = HTTP_STATUS.BAD_REQUEST;
      err.errorCode = 'ERR_COLOR_REQUIRED';
      throw err;
    }

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUuid = (val) => typeof val === 'string' && UUID_REGEX.test(val);

    const colorIdentifiers = [];
    const colorObjects = [];

    for (const c of colorsInput) {
      if (!c) continue;
      if (typeof c === 'string') {
        colorIdentifiers.push(c.trim());
      } else if (typeof c === 'object' && c !== null) {
        if (c.id) colorIdentifiers.push(c.id);
        if (c.name) {
          colorIdentifiers.push(c.name.trim());
          colorObjects.push(c);
        }
      }
    }

    const uuidColors = colorIdentifiers.filter(isUuid);
    const colorConditions = [
      { slug: { in: colorIdentifiers.map((c) => c.toLowerCase()) } },
      { name: { in: colorIdentifiers } },
    ];
    if (uuidColors.length > 0) {
      colorConditions.push({ id: { in: uuidColors } });
    }

    const existingColors = await prisma.productColor.findMany({
      where: { OR: colorConditions },
    });

    const finalColors = [...existingColors];
    const foundNames = new Set(existingColors.map((c) => c.name.toLowerCase()));
    const foundIds = new Set(existingColors.map((c) => c.id));
    const foundSlugs = new Set(existingColors.map((c) => c.slug.toLowerCase()));

    // Auto-create any string color identifiers not found
    for (const item of colorIdentifiers) {
      const lower = item.toLowerCase();
      if (foundIds.has(item) || foundNames.has(lower) || foundSlugs.has(lower)) {
        continue;
      }
      const newColor = await prisma.productColor.create({
        data: {
          name: item,
          slug: generateSlug(item) || `color-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          hex: '#11100F',
          isActive: true,
          sortOrder: finalColors.length + 1,
        },
      });
      finalColors.push(newColor);
      foundNames.add(lower);
      foundIds.add(newColor.id);
    }

    // Handle any object descriptors e.g. { name: 'Cognac', hex: '#8B4513' }
    for (const obj of colorObjects) {
      const rawName = String(obj.name).trim();
      if (!rawName || foundNames.has(rawName.toLowerCase())) continue;

      let hex = (obj.hex || '#11100F').trim();
      if (!hex.startsWith('#')) hex = `#${hex}`;

      const newColor = await prisma.productColor.create({
        data: {
          name: rawName,
          slug: generateSlug(rawName) || `color-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          hex: hex.toUpperCase(),
          isActive: true,
          sortOrder: finalColors.length + 1,
        },
      });
      finalColors.push(newColor);
      foundNames.add(rawName.toLowerCase());
      foundIds.add(newColor.id);
    }

    if (finalColors.length === 0) {
      const err = new Error('Every product must have at least one available color selected');
      err.statusCode = HTTP_STATUS.BAD_REQUEST;
      err.errorCode = 'ERR_COLOR_REQUIRED';
      throw err;
    }

    // Validate active status for newly assigned colors
    const existingAssignedColorIds = new Set(
      existingProduct?.colorAssignments?.map((ca) => ca.colorId) || []
    );

    for (const c of finalColors) {
      if (!c.isActive && !existingAssignedColorIds.has(c.id)) {
        const err = new Error(`Color '${c.name}' is inactive and cannot be newly assigned to products.`);
        err.statusCode = HTTP_STATUS.BAD_REQUEST;
        err.errorCode = 'ERR_INACTIVE_COLOR';
        throw err;
      }
    }

    return finalColors;
  },

  /**
   * Helper to resolve policy assignments.
   */
  async resolvePolicyAssignments(policiesInput, isUpdate = false, existingProduct = null) {
    if (!Array.isArray(policiesInput)) {
      if (isUpdate) return null;
      return [];
    }

    const identifiers = policiesInput
      .map((p) => (typeof p === 'string' ? p.trim() : p?.id || p?.slug || ''))
      .filter(Boolean);

    if (identifiers.length === 0) return [];

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUuid = (val) => typeof val === 'string' && UUID_REGEX.test(val);

    const uuidPolicies = identifiers.filter(isUuid);
    const policyConditions = [
      { slug: { in: identifiers.map((p) => p.toLowerCase()) } },
      { name: { in: identifiers } },
    ];
    if (uuidPolicies.length > 0) {
      policyConditions.push({ id: { in: uuidPolicies } });
    }

    const existingPolicies = await prisma.productPolicy.findMany({
      where: { OR: policyConditions },
    });

    const existingAssignedPolicyIds = new Set(
      existingProduct?.policyAssignments?.map((pa) => pa.policyId) || []
    );

    for (const pol of existingPolicies) {
      if (!pol.isActive && !existingAssignedPolicyIds.has(pol.id)) {
        const err = new Error(`Policy '${pol.name}' is inactive and cannot be newly assigned to products.`);
        err.statusCode = HTTP_STATUS.BAD_REQUEST;
        err.errorCode = 'ERR_INACTIVE_POLICY';
        throw err;
      }
    }

    return existingPolicies;
  },

  async listProducts(query = {}, isPublic = true) {
    const page = Math.max(1, parseInt(query.page || DEFAULT_PAGE, 10));
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(query.limit || DEFAULT_LIMIT, 10)));
    const skip = (page - 1) * limit;

    const where = {};

    if (isPublic) {
      where.isPublished = true;
    } else if (query.status) {
      if (query.status === 'published') where.isPublished = true;
      if (query.status === 'draft') where.isPublished = false;
    }

    // Gender filter
    const gender = query.gender;
    if (gender && gender !== 'all') {
      where.OR = [
        { gender: gender },
        { gender: 'unisex' },
      ];
    }

    // Category filter
    const category = query.category;
    if (category && category !== 'all') {
      const normalized = this.normalizeCategorySlug(category);
      if (normalized === 'jackets') {
        where.categorySlug = { not: 'accessories' };
      } else if (normalized === 'new-arrivals') {
        where.isNewArrival = true;
      } else if (normalized === 'best-sellers') {
        where.isBestseller = true;
      } else {
        where.categorySlug = normalized;
      }
    }

    // Collection filter
    if (query.collection) {
      const col = await prisma.collection.findUnique({
        where: { slug: query.collection },
      });
      if (col) {
        where.collectionId = col.id;
      }
    }

    // Boolean flags
    if (query.is_new !== undefined) where.isNewArrival = query.is_new === 'true' || query.is_new === true;
    if (query.is_bestseller !== undefined) where.isBestseller = query.is_bestseller === 'true' || query.is_bestseller === true;
    if (query.is_featured !== undefined) where.isFeatured = query.is_featured === 'true' || query.is_featured === true;

    // Stock availability filter
    const stockParam = query.is_in_stock ?? query.isInStock ?? query.in_stock;
    if (stockParam !== undefined) {
      where.isInStock = stockParam === 'true' || stockParam === true || stockParam === 1 || stockParam === '1';
    }

    // Price range
    const minPrice = query.minPrice ?? query.min_price;
    const maxPrice = query.maxPrice ?? query.max_price;
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = Number(minPrice);
      if (maxPrice !== undefined) where.price.lte = Number(maxPrice);
    }

    // Leather filter
    const leatherFilter = query.leatherType || query.leather_type || query.leatherFamily;
    if (leatherFilter && leatherFilter !== 'all') {
      const lf = leatherFilter.toLowerCase().trim();
      if (lf === 'suede') {
        where.leatherType = { contains: 'suede', mode: 'insensitive' };
      } else if (lf === 'shearling') {
        where.leatherType = { contains: 'shearling', mode: 'insensitive' };
      } else if (lf === 'calfskin' || lf === 'full-grain') {
        where.leatherType = { contains: 'calfskin', mode: 'insensitive' };
      } else if (lf === 'lambskin' || lf === 'nappa') {
        where.leatherType = { contains: 'lambskin', mode: 'insensitive' };
      } else {
        where.leatherType = { contains: lf, mode: 'insensitive' };
      }
    }

    // Style filter
    if (query.style) {
      where.styles = { has: query.style.toLowerCase() };
    }

    // Full-text / partial search
    const searchTerm = query.q || query.search;
    if (searchTerm && searchTerm.trim()) {
      const s = searchTerm.trim();
      const searchConditions = [
        { name: { contains: s, mode: 'insensitive' } },
        { tagline: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
        { leatherType: { contains: s, mode: 'insensitive' } },
        { sku: { contains: s, mode: 'insensitive' } },
      ];
      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchConditions }];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    // Sorting
    let orderBy = { sortOrder: 'asc' };
    const sort = query.sort || query.sortBy;
    if (sort === 'price-asc') orderBy = { price: 'asc' };
    else if (sort === 'price-desc') orderBy = { price: 'desc' };
    else if (sort === 'rating') orderBy = { rating: 'desc' };
    else if (sort === 'newest') orderBy = { createdAt: 'desc' };
    else if (sort === 'featured') orderBy = { isFeatured: 'desc' };

    const market = query.market || 'GLOBAL';

    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          ...PRODUCT_INCLUDES,
          reviews: {
            where: { isApproved: true },
            orderBy: { createdAt: 'desc' },
          },
        },
        skip,
        take: limit,
        orderBy,
      }),
      prisma.product.count({ where }),
    ]);

    return {
      products: products.map((p) => mapProduct(p, market)),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit) || 1,
        totalCount,
        limit,
        hasNextPage: skip + products.length < totalCount,
        hasPrevPage: page > 1,
      },
    };
  },

  async getProductBySlug(slug, isPublic = true, market = 'GLOBAL') {
    const where = { slug };
    if (isPublic) where.isPublished = true;

    const product = await prisma.product.findFirst({
      where,
      include: {
        ...PRODUCT_INCLUDES,
        reviews: {
          where: { isApproved: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!product) {
      const err = new Error(`Product with slug '${slug}' not found`);
      err.statusCode = HTTP_STATUS.NOT_FOUND;
      throw err;
    }

    const related = await this.getRelatedProducts(product.id, product.categorySlug, 4, market);

    return {
      ...mapProduct(product, market),
      relatedProducts: related,
    };
  },

  async getProductById(id, market = 'GLOBAL') {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        ...PRODUCT_INCLUDES,
        reviews: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!product) {
      const err = new Error(`Product with id '${id}' not found`);
      err.statusCode = HTTP_STATUS.NOT_FOUND;
      throw err;
    }

    return mapProduct(product, market);
  },

  async getRelatedProducts(productId, categorySlug, limit = 4, market = 'GLOBAL') {
    const related = await prisma.product.findMany({
      where: {
        categorySlug,
        isPublished: true,
        id: { not: productId },
      },
      take: limit,
      include: PRODUCT_INCLUDES,
    });

    return related.map((p) => mapProduct(p, market));
  },

  async getFacets() {
    const products = await prisma.product.findMany({
      where: { isPublished: true },
      select: {
        categorySlug: true,
        leatherType: true,
        availableColors: true,
        availableSizes: true,
        price: true,
        sizeAssignments: {
          include: { size: true },
        },
        colorAssignments: {
          include: { color: true },
        },
      },
    });

    const categories = new Set();
    const leatherTypes = new Set();
    const colors = new Set();
    const sizes = new Set();
    let minPrice = Infinity;
    let maxPrice = 0;

    products.forEach((p) => {
      if (p.categorySlug) categories.add(p.categorySlug);
      if (p.leatherType) leatherTypes.add(p.leatherType);

      if (p.sizeAssignments?.length) {
        p.sizeAssignments.forEach((sa) => {
          if (sa.size?.name) sizes.add(sa.size.name);
        });
      } else if (Array.isArray(p.availableSizes)) {
        p.availableSizes.forEach((s) => sizes.add(s));
      }

      if (p.colorAssignments?.length) {
        p.colorAssignments.forEach((ca) => {
          if (ca.color?.name) colors.add(ca.color.name);
        });
      } else if (Array.isArray(p.availableColors)) {
        p.availableColors.forEach((c) => colors.add(c.name || c));
      }

      const price = Number(p.price);
      if (price < minPrice) minPrice = price;
      if (price > maxPrice) maxPrice = price;
    });

    return {
      categories: Array.from(categories),
      leatherTypes: Array.from(leatherTypes),
      colors: Array.from(colors),
      sizes: Array.from(sizes),
      priceRange: {
        min: minPrice === Infinity ? 0 : minPrice,
        max: maxPrice || 2000,
      },
    };
  },

  async createProduct(data, files = []) {
    if (!data.slug && data.name) {
      data.slug = generateSlug(data.name);
    }

    const folder = `products/${data.slug || 'garments'}`;
    const newlyUploadedPaths = [];

    try {
      // 1. Process files passed via multipart
      const processedImages = Array.isArray(data.images) ? [...data.images] : [];

      if (Array.isArray(files) && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const uploaded = await StorageService.uploadBuffer({
            buffer: file.buffer,
            originalName: file.originalname,
            mimeType: file.mimetype,
            folder,
          });
          newlyUploadedPaths.push(uploaded.path);

          processedImages.push({
            url: uploaded.url,
            alt: data.name ? `${data.name} image ${processedImages.length + 1}` : 'Product image',
            isPrimary: processedImages.length === 0,
            isHover: processedImages.length === 1,
            type: processedImages.length === 0 ? 'perspective' : 'detail',
            sortOrder: processedImages.length + 1,
          });
        }
      }

      // 2. Process base64 data URIs
      for (let i = 0; i < processedImages.length; i++) {
        const img = processedImages[i];
        if (img && typeof img.url === 'string' && img.url.startsWith('data:')) {
          const uploaded = await StorageService.uploadBase64(img.url, {
            originalName: `${data.slug || 'product'}-${i + 1}.webp`,
            folder,
          });
          newlyUploadedPaths.push(uploaded.path);
          img.url = uploaded.url;
        } else if (img && img.buffer) {
          const uploaded = await StorageService.uploadBuffer({
            buffer: img.buffer,
            originalName: img.originalName || `${data.slug || 'product'}-${i + 1}.webp`,
            mimeType: img.mimeType || 'image/webp',
            folder,
          });
          newlyUploadedPaths.push(uploaded.path);
          img.url = uploaded.url;
        }
      }

      // 3. Resolve category
      const category = await this.resolveCategory(data.category);

      // 4. Validate & resolve sizes (Mandatory: at least one size required)
      const sizesInput = data.sizes || data.availableSizes;
      const resolvedSizes = await this.resolveSizeAssignments(sizesInput, false, null);

      // 5. Validate & resolve colors (Mandatory: at least one color required)
      const colorsInput = data.colors || data.availableColors;
      const resolvedColors = await this.resolveColorAssignments(colorsInput, false, null);

      // 6. Validate & resolve policies (Optional)
      const resolvedPolicies = await this.resolvePolicyAssignments(data.policies, false, null);

      // 7. Validate & resolve regional prices
      let regionalPricesData = [];
      if (Array.isArray(data.regionalPrices) && data.regionalPrices.length > 0) {
        regionalPricesData = PricingService.validateRegionalPrices(data.regionalPrices);
      }

      // Global price fallback
      const globalPriceItem = regionalPricesData.find((p) => p.regionCode === 'GLOBAL');
      const rootPrice = globalPriceItem ? globalPriceItem.price : Number(data.price || 0);
      const rootSalePrice = globalPriceItem ? globalPriceItem.salePrice : (data.salePrice ? Number(data.salePrice) : null);

      if (!globalPriceItem && rootPrice > 0) {
        regionalPricesData.push({
          regionCode: 'GLOBAL',
          currency: 'EUR',
          price: rootPrice,
          salePrice: rootSalePrice,
          isActive: true,
        });
      }

      // 8. Variants with boolean inStock
      const variantsData = (data.variants || []).map((v) => {
        const inStock = v.inStock !== undefined
          ? Boolean(v.inStock)
          : v.in_stock !== undefined
            ? Boolean(v.in_stock)
            : v.stock !== undefined && v.stock !== null
              ? Number(v.stock) > 0
              : true;

        return {
          sku: v.sku || `${data.sku}-${v.size}-${v.color}`.toUpperCase().replace(/\s+/g, '-'),
          size: v.size,
          color: v.color,
          colorHex: v.colorHex || '#000000',
          inStock,
          priceOverride: v.priceOverride ? Number(v.priceOverride) : null,
        };
      });

      const cachedSizes = resolvedSizes.map((s) => s.name);
      const cachedColors = resolvedColors.map((c) => ({ name: c.name, hex: c.hex }));

      const product = await prisma.$transaction(async (tx) => {
        const created = await tx.product.create({
          data: {
            sku: data.sku,
            slug: data.slug,
            name: data.name,
            tagline: data.tagline || '',
            categorySlug: category.slug,
            categoryLabel: category.name,
            collectionId: data.collectionId || null,
            gender: data.gender || 'unisex',
            styles: data.styles || [],
            leatherType: data.leatherType,
            hardware: data.hardware || '',
            lining: data.lining || '',
            modelInfo: data.modelInfo || '',
            description: data.description,
            editorialQuote: data.editorialQuote || '',
            price: rootPrice,
            salePrice: rootSalePrice,
            isFeatured: !!data.isFeatured,
            isBestseller: !!data.isBestseller,
            isNewArrival: data.isNewArrival !== undefined ? !!data.isNewArrival : true,
            isPublished: data.isPublished !== undefined ? !!data.isPublished : true,
            isInStock: data.isInStock !== undefined ? Boolean(data.isInStock === true || data.isInStock === 'true' || data.isInStock === 1) : true,
            specifications: data.specifications || [],
            careInstructions: data.careInstructions || [],
            availableColors: cachedColors,
            availableSizes: cachedSizes,
            seoTitle: data.seoTitle || null,
            seoDescription: data.seoDescription || null,
            images: processedImages.length
              ? {
                create: processedImages.map((img, idx) => ({
                  url: img.url,
                  alt: img.alt || '',
                  isPrimary: !!img.isPrimary,
                  isHover: !!img.isHover,
                  type: img.type || 'perspective',
                  sortOrder: img.sortOrder ?? idx + 1,
                })),
              }
              : undefined,
            variants: variantsData.length
              ? {
                create: variantsData,
              }
              : undefined,
            prices: regionalPricesData.length
              ? {
                create: regionalPricesData.map((rp) => ({
                  regionCode: rp.regionCode,
                  currency: rp.currency,
                  price: rp.price,
                  salePrice: rp.salePrice,
                  isActive: rp.isActive !== false,
                })),
              }
              : undefined,
            sizeAssignments: {
              create: resolvedSizes.map((s) => ({
                sizeId: s.id,
              })),
            },
            colorAssignments: {
              create: resolvedColors.map((c) => ({
                colorId: c.id,
              })),
            },
            policyAssignments: resolvedPolicies.length
              ? {
                create: resolvedPolicies.map((pol, idx) => ({
                  policyId: pol.id,
                  sortOrder: idx + 1,
                })),
              }
              : undefined,
          },
          include: PRODUCT_INCLUDES,
        });

        return created;
      }, { maxWait: 15000, timeout: 20000 });

      return mapProduct(product);
    } catch (error) {
      if (newlyUploadedPaths.length > 0) {
        await StorageService.deleteFiles(newlyUploadedPaths).catch((cleanupErr) => {
          logger.warn(`Could not clean up uploaded files: ${cleanupErr.message}`);
        });
      }

      if (error.code === 'P2002') {
        const err = new Error(`Product with SKU '${data.sku}' or slug '${data.slug}' already exists`);
        err.statusCode = HTTP_STATUS.CONFLICT;
        err.errorCode = 'ERR_DUPLICATE_PRODUCT';
        throw err;
      }
      throw error;
    }
  },

  async updateProduct(id, data, files = []) {
    if (data.name && !data.slug) {
      data.slug = generateSlug(data.name);
    }

    const folder = `products/${data.slug || id}`;
    const newlyUploadedPaths = [];

    const existingProduct = await prisma.product.findUnique({
      where: { id },
      include: {
        images: true,
        sizeAssignments: true,
        colorAssignments: true,
        policyAssignments: true,
        prices: true,
      },
    });

    if (!existingProduct) {
      const err = new Error(`Product with id '${id}' not found`);
      err.statusCode = HTTP_STATUS.NOT_FOUND;
      throw err;
    }

    const existingImages = existingProduct.images || [];

    // Resolve size assignments if provided
    let resolvedSizes = null;
    const sizesInput = data.sizes || data.availableSizes;
    if (sizesInput !== undefined) {
      resolvedSizes = await this.resolveSizeAssignments(sizesInput, true, existingProduct);
    }

    // Resolve color assignments if provided
    let resolvedColors = null;
    const colorsInput = data.colors || data.availableColors;
    if (colorsInput !== undefined) {
      resolvedColors = await this.resolveColorAssignments(colorsInput, true, existingProduct);
    }

    // Resolve policy assignments if provided
    let resolvedPolicies = null;
    if (data.policies !== undefined) {
      resolvedPolicies = await this.resolvePolicyAssignments(data.policies, true, existingProduct);
    }

    // Resolve regional prices if provided
    let regionalPricesData = null;
    if (data.regionalPrices !== undefined && Array.isArray(data.regionalPrices)) {
      regionalPricesData = PricingService.validateRegionalPrices(data.regionalPrices);
    }

    const updates = {};
    if (data.sku) updates.sku = data.sku;
    if (data.slug) updates.slug = data.slug;
    if (data.name) updates.name = data.name;
    if (data.tagline !== undefined) updates.tagline = data.tagline;
    if (data.category) {
      const category = await this.resolveCategory(data.category);
      updates.categorySlug = category.slug;
      updates.categoryLabel = category.name;
    }
    if (data.collectionId !== undefined) updates.collectionId = data.collectionId;
    if (data.gender) updates.gender = data.gender;
    if (data.styles) updates.styles = data.styles;
    if (data.leatherType) updates.leatherType = data.leatherType;
    if (data.hardware !== undefined) updates.hardware = data.hardware;
    if (data.lining !== undefined) updates.lining = data.lining;
    if (data.modelInfo !== undefined) updates.modelInfo = data.modelInfo;
    if (data.description) updates.description = data.description;
    if (data.editorialQuote !== undefined) updates.editorialQuote = data.editorialQuote;

    if (regionalPricesData !== null && regionalPricesData.length > 0) {
      const globalPriceItem = regionalPricesData.find((p) => p.regionCode === 'GLOBAL');
      if (globalPriceItem) {
        updates.price = globalPriceItem.price;
        updates.salePrice = globalPriceItem.salePrice;
      }
    } else {
      if (data.price !== undefined) updates.price = Number(data.price);
      if (data.salePrice !== undefined) updates.salePrice = data.salePrice ? Number(data.salePrice) : null;
    }

    if (data.isFeatured !== undefined) updates.isFeatured = data.isFeatured;
    if (data.isBestseller !== undefined) updates.isBestseller = data.isBestseller;
    if (data.isNewArrival !== undefined) updates.isNewArrival = data.isNewArrival;
    if (data.isPublished !== undefined) updates.isPublished = data.isPublished;
    if (data.isInStock !== undefined) {
      updates.isInStock = Boolean(data.isInStock === true || data.isInStock === 'true' || data.isInStock === 1);
    } else if (data.inStock !== undefined) {
      updates.isInStock = Boolean(data.inStock === true || data.inStock === 'true' || data.inStock === 1);
    }
    if (data.specifications) updates.specifications = data.specifications;
    if (data.careInstructions) updates.careInstructions = data.careInstructions;
    if (resolvedSizes !== null) {
      updates.availableSizes = resolvedSizes.map((s) => s.name);
    }
    if (resolvedColors !== null) {
      updates.availableColors = resolvedColors.map((c) => ({ name: c.name, hex: c.hex }));
    }
    if (data.seoTitle !== undefined) updates.seoTitle = data.seoTitle;
    if (data.seoDescription !== undefined) updates.seoDescription = data.seoDescription;

    try {
      let processedImages = null;
      if (Array.isArray(data.images) || (Array.isArray(files) && files.length > 0)) {
        processedImages = Array.isArray(data.images) ? [...data.images] : [];

        if (Array.isArray(files) && files.length > 0) {
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const uploaded = await StorageService.uploadBuffer({
              buffer: file.buffer,
              originalName: file.originalname,
              mimeType: file.mimetype,
              folder,
            });
            newlyUploadedPaths.push(uploaded.path);

            processedImages.push({
              url: uploaded.url,
              alt: data.name ? `${data.name} image` : '',
              isPrimary: processedImages.length === 0,
              isHover: false,
              type: 'perspective',
              sortOrder: processedImages.length + 1,
            });
          }
        }

        for (let i = 0; i < processedImages.length; i++) {
          const img = processedImages[i];
          if (img && typeof img.url === 'string' && img.url.startsWith('data:')) {
            const uploaded = await StorageService.uploadBase64(img.url, {
              originalName: `${data.slug || 'product'}-${Date.now()}-${i + 1}.webp`,
              folder,
            });
            newlyUploadedPaths.push(uploaded.path);
            img.url = uploaded.url;
          }
        }
      }

      await prisma.$transaction(
        async (tx) => {
          // 1. Update product root fields
          await tx.product.update({
            where: { id },
            data: updates,
          });

          // 2. Images update
          if (processedImages !== null) {
            await tx.productImage.deleteMany({ where: { productId: id } });
            if (processedImages.length > 0) {
              await tx.productImage.createMany({
                data: processedImages.map((img, idx) => ({
                  productId: id,
                  url: img.url,
                  alt: img.alt || '',
                  isPrimary: !!img.isPrimary,
                  isHover: !!img.isHover,
                  type: img.type || 'perspective',
                  sortOrder: img.sortOrder ?? idx + 1,
                })),
              });
            }
          }

          // 3. Variants update with inStock boolean
          if (data.variants && Array.isArray(data.variants)) {
            await tx.productVariant.deleteMany({ where: { productId: id } });
            if (data.variants.length > 0) {
              await tx.productVariant.createMany({
                data: data.variants.map((v) => {
                  const inStock = v.inStock !== undefined
                    ? Boolean(v.inStock)
                    : v.in_stock !== undefined
                      ? Boolean(v.in_stock)
                      : v.stock !== undefined && v.stock !== null
                        ? Number(v.stock) > 0
                        : true;

                  return {
                    productId: id,
                    sku: v.sku,
                    size: v.size,
                    color: v.color,
                    colorHex: v.colorHex || '#000000',
                    inStock,
                    priceOverride: v.priceOverride ? Number(v.priceOverride) : null,
                  };
                }),
              });
            }
          }

          // 4. Sizes assignments update
          if (resolvedSizes !== null) {
            await tx.productSizeAssignment.deleteMany({ where: { productId: id } });
            if (resolvedSizes.length > 0) {
              await tx.productSizeAssignment.createMany({
                data: resolvedSizes.map((s) => ({
                  productId: id,
                  sizeId: s.id,
                })),
              });
            }
          }

          // 5. Colors assignments update
          if (resolvedColors !== null) {
            await tx.productColorAssignment.deleteMany({ where: { productId: id } });
            if (resolvedColors.length > 0) {
              await tx.productColorAssignment.createMany({
                data: resolvedColors.map((c) => ({
                  productId: id,
                  colorId: c.id,
                })),
              });
            }
          }

          // 6. Policy assignments update
          if (resolvedPolicies !== null) {
            await tx.productPolicyAssignment.deleteMany({ where: { productId: id } });
            if (resolvedPolicies.length > 0) {
              await tx.productPolicyAssignment.createMany({
                data: resolvedPolicies.map((pol, idx) => ({
                  productId: id,
                  policyId: pol.id,
                  sortOrder: idx + 1,
                })),
              });
            }
          }

          // 7. Regional prices update
          if (regionalPricesData !== null) {
            await tx.productPrice.deleteMany({ where: { productId: id } });
            if (regionalPricesData.length > 0) {
              await tx.productPrice.createMany({
                data: regionalPricesData.map((rp) => ({
                  productId: id,
                  regionCode: rp.regionCode,
                  currency: rp.currency,
                  price: rp.price,
                  salePrice: rp.salePrice,
                  isActive: rp.isActive !== false,
                })),
              });
            }
          } else if (data.price !== undefined) {
            const existingGlobal = await tx.productPrice.findFirst({
              where: { productId: id, regionCode: 'GLOBAL' },
            });
            if (existingGlobal) {
              await tx.productPrice.update({
                where: { id: existingGlobal.id },
                data: {
                  price: updates.price,
                  salePrice: updates.salePrice,
                },
              });
            }
          }
        },
        { timeout: 15000 }
      );

      // Read updated product outside transaction
      const updated = await prisma.product.findUnique({
        where: { id },
        include: PRODUCT_INCLUDES,
      });

      if (!updated) {
        const err = new Error(`Product with id '${id}' not found`);
        err.statusCode = HTTP_STATUS.NOT_FOUND;
        throw err;
      }

      // Clean up removed images
      if (processedImages !== null) {
        const remainingUrls = new Set(processedImages.map((img) => img.url));
        const removedImages = existingImages.filter((img) => !remainingUrls.has(img.url));

        for (const removedImg of removedImages) {
          if (StorageService.isSupabaseStorageUrl(removedImg.url)) {
            const inUseCount = await prisma.productImage.count({
              where: { url: removedImg.url, productId: { not: id } },
            });
            if (inUseCount === 0) {
              await StorageService.deleteFile(removedImg.url).catch(() => {});
            }
          }
        }
      }

      return mapProduct(updated);
    } catch (error) {
      if (newlyUploadedPaths.length > 0) {
        await StorageService.deleteFiles(newlyUploadedPaths).catch(() => {});
      }

      if (error.code === 'P2025' || error.message?.includes('not found')) {
        const err = new Error(`Product with id '${id}' not found`);
        err.statusCode = HTTP_STATUS.NOT_FOUND;
        throw err;
      }
      if (error.code === 'P2002') {
        const err = new Error(`Product with SKU '${data.sku}' or slug '${data.slug}' already exists`);
        err.statusCode = HTTP_STATUS.CONFLICT;
        err.errorCode = 'ERR_DUPLICATE_PRODUCT';
        throw err;
      }
      throw error;
    }
  },

  async deleteProduct(id) {
    const existingImages = await prisma.productImage.findMany({
      where: { productId: id },
    });

    try {
      const product = await prisma.product.delete({
        where: { id },
      });

      for (const img of existingImages) {
        if (StorageService.isSupabaseStorageUrl(img.url)) {
          const inUseCount = await prisma.productImage.count({
            where: { url: img.url },
          });
          if (inUseCount === 0) {
            await StorageService.deleteFile(img.url).catch(() => {});
          }
        }
      }

      return product;
    } catch (error) {
      const err = new Error(`Product with id '${id}' not found`);
      err.statusCode = HTTP_STATUS.NOT_FOUND;
      throw err;
    }
  },

  async duplicateProduct(id) {
    const original = await prisma.product.findUnique({
      where: { id },
      include: PRODUCT_INCLUDES,
    });

    if (!original) {
      const err = new Error('Product not found');
      err.statusCode = HTTP_STATUS.NOT_FOUND;
      throw err;
    }

    const timestamp = Date.now().toString().slice(-4);
    const newSku = `${original.sku}-COPY-${timestamp}`;
    const newName = `${original.name} (Copy)`;
    const newSlug = generateSlug(newName) + `-${timestamp}`;

    const duplicate = await prisma.product.create({
      data: {
        sku: newSku,
        slug: newSlug,
        name: newName,
        tagline: original.tagline,
        categorySlug: original.categorySlug,
        categoryLabel: original.categoryLabel,
        collectionId: original.collectionId,
        gender: original.gender,
        styles: original.styles,
        leatherType: original.leatherType,
        hardware: original.hardware,
        lining: original.lining,
        modelInfo: original.modelInfo,
        description: original.description,
        editorialQuote: original.editorialQuote,
        price: original.price,
        salePrice: original.salePrice,
        isFeatured: false,
        isBestseller: false,
        isNewArrival: false,
        isPublished: false,
        isInStock: original.isInStock ?? true,
        specifications: original.specifications,
        careInstructions: original.careInstructions,
        availableColors: original.availableColors,
        availableSizes: original.availableSizes,
        images: original.images.length
          ? {
            create: original.images.map((img) => ({
              url: img.url,
              alt: img.alt,
              isPrimary: img.isPrimary,
              isHover: img.isHover,
              type: img.type,
              sortOrder: img.sortOrder,
            })),
          }
          : undefined,
        variants: original.variants.length
          ? {
            create: original.variants.map((v) => ({
              sku: `${v.sku}-COPY-${timestamp}`,
              size: v.size,
              color: v.color,
              colorHex: v.colorHex,
              inStock: v.inStock,
              priceOverride: v.priceOverride,
            })),
          }
          : undefined,
        prices: original.prices.length
          ? {
            create: original.prices.map((p) => ({
              regionCode: p.regionCode,
              currency: p.currency,
              price: p.price,
              salePrice: p.salePrice,
              isActive: p.isActive,
            })),
          }
          : undefined,
        sizeAssignments: original.sizeAssignments.length
          ? {
            create: original.sizeAssignments.map((sa) => ({
              sizeId: sa.sizeId,
            })),
          }
          : undefined,
        colorAssignments: original.colorAssignments.length
          ? {
            create: original.colorAssignments.map((ca) => ({
              colorId: ca.colorId,
            })),
          }
          : undefined,
        policyAssignments: original.policyAssignments.length
          ? {
            create: original.policyAssignments.map((pa) => ({
              policyId: pa.policyId,
              sortOrder: pa.sortOrder,
            })),
          }
          : undefined,
      },
      include: PRODUCT_INCLUDES,
    });

    return mapProduct(duplicate);
  },

  async searchProducts(queryText, limit = 20, market = 'GLOBAL') {
    if (!queryText || !queryText.trim()) return [];
    const q = queryText.trim();
    const products = await prisma.product.findMany({
      where: {
        isPublished: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { tagline: { contains: q, mode: 'insensitive' } },
          { categorySlug: { contains: q, mode: 'insensitive' } },
          { leatherType: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      },
      include: PRODUCT_INCLUDES,
      take: limit,
    });
    return products.map((p) => mapProduct(p, market));
  },

  async bulkAction(action, ids) {
    if (action === 'publish') {
      await prisma.product.updateMany({
        where: { id: { in: ids } },
        data: { isPublished: true },
      });
      return { message: `${ids.length} products published successfully` };
    }
    if (action === 'unpublish') {
      await prisma.product.updateMany({
        where: { id: { in: ids } },
        data: { isPublished: false },
      });
      return { message: `${ids.length} products set to draft successfully` };
    }
    if (action === 'delete') {
      await prisma.product.deleteMany({
        where: { id: { in: ids } },
      });
      return { message: `${ids.length} products deleted successfully` };
    }
    const err = new Error(`Unknown bulk action '${action}'`);
    err.statusCode = HTTP_STATUS.BAD_REQUEST;
    throw err;
  },

  async bulkPublish(ids, isPublished) {
    const result = await prisma.product.updateMany({
      where: { id: { in: ids } },
      data: { isPublished },
    });
    return { modifiedCount: result.count };
  },

  async reorderProducts(items) {
    const updates = items.map((item) =>
      prisma.product.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder },
      })
    );
    await prisma.$transaction(updates);
    return { message: 'Products reordered successfully' };
  },

  async addReview(productId, reviewData) {
    return this.createReview(productId, reviewData);
  },

  async createReview(productId, reviewData) {
    const review = await prisma.productReview.create({
      data: {
        productId,
        author: reviewData.author,
        location: reviewData.location,
        rating: reviewData.rating,
        title: reviewData.title,
        comment: reviewData.comment,
        verified: false,
        isApproved: false,
      },
    });

    return {
      id: review.id,
      _id: review.id,
      productId: review.productId,
      author: review.author,
      location: review.location,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      verified: review.verified,
      isApproved: review.isApproved,
      createdAt: review.createdAt,
    };
  },

  async listReviews(query = {}) {
    const page = Math.max(1, parseInt(query.page || 1, 10));
    const limit = Math.max(1, parseInt(query.limit || 20, 10));
    const skip = (page - 1) * limit;

    const where = {};
    if (query.isApproved !== undefined) {
      where.isApproved = query.isApproved === 'true' || query.isApproved === true;
    }
    if (query.productId) {
      where.productId = query.productId;
    }

    const [reviews, totalCount] = await Promise.all([
      prisma.productReview.findMany({
        where,
        include: {
          product: {
            select: { id: true, name: true, slug: true },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.productReview.count({ where }),
    ]);

    return {
      reviews: reviews.map((r) => ({
        id: r.id,
        _id: r.id,
        product: r.product,
        author: r.author,
        location: r.location,
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        verified: r.verified,
        isApproved: r.isApproved,
        createdAt: r.createdAt,
      })),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit) || 1,
        totalCount,
        limit,
      },
    };
  },

  async moderateReview(id, isApproved) {
    const review = await prisma.productReview.update({
      where: { id },
      data: { isApproved },
    });

    // Recalculate product rating
    const approvedReviews = await prisma.productReview.findMany({
      where: { productId: review.productId, isApproved: true },
      select: { rating: true },
    });

    const reviewCount = approvedReviews.length;
    const avgRating =
      reviewCount > 0
        ? approvedReviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
        : 5.0;

    await prisma.product.update({
      where: { id: review.productId },
      data: {
        rating: avgRating,
        reviewCount,
      },
    });

    return {
      id: review.id,
      _id: review.id,
      productId: review.productId,
      isApproved: review.isApproved,
    };
  },

  async listAllReviewsForAdmin(query = {}) {
    return this.listReviews(query);
  },

  async deleteReview(id) {
    const review = await prisma.productReview.delete({
      where: { id },
    });
    return review;
  },
};
