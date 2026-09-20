import { prisma } from '../lib/prisma.js';
import { generateSlug } from '../utils/slugify.js';
import { mapProduct } from '../utils/mapper.js';
import { HTTP_STATUS, DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT } from '../config/constants.js';

export const ProductService = {
  normalizeCategorySlug(category) {
    if (!category) return null;
    const s = category.toLowerCase().trim();
    if (s === 'biker-jackets' || s === 'biker') return 'biker';
    if (s === 'bomber-jackets' || s === 'bomber') return 'bomber';
    if (s === 'aviator-jackets' || s === 'aviator') return 'aviator';
    if (s === 'shearling-jackets' || s === 'shearling') return 'aviator';
    if (s === 'leather-coats' || s === 'trench') return 'trench';
    if (s === 'leather-jackets') return 'jackets';
    if (s === 'leather-vests' || s === 'vest') return 'vest';
    if (s === 'suede') return 'suede';
    if (s === 'accessories') return 'accessories';
    return s;
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

    // Price range
    const minPrice = query.minPrice ?? query.min_price;
    const maxPrice = query.maxPrice ?? query.max_price;
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = Number(minPrice);
      if (maxPrice !== undefined) where.price.lte = Number(maxPrice);
    }

    // Leather Type & Leather Family
    const leatherType = query.leatherType ?? query.leather_type;
    if (leatherType) {
      where.leatherType = { contains: leatherType, mode: 'insensitive' };
    }

    if (query.leatherFamily) {
      const lf = query.leatherFamily.toLowerCase();
      if (lf === 'suede') where.leatherType = { contains: 'suede', mode: 'insensitive' };
      else if (lf === 'shearling') where.leatherType = { contains: 'shearling', mode: 'insensitive' };
      else if (lf === 'premium') {
        const premiumOR = [
          { leatherType: { contains: 'full-grain', mode: 'insensitive' } },
          { leatherType: { contains: 'calfskin', mode: 'insensitive' } },
          { leatherType: { contains: 'nappa', mode: 'insensitive' } },
        ];
        if (where.OR) {
          where.AND = [{ OR: where.OR }, { OR: premiumOR }];
          delete where.OR;
        } else {
          where.OR = premiumOR;
        }
      }
    }

    // Style filter (array containment)
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

    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          images: { orderBy: { sortOrder: 'asc' } },
          variants: true,
        },
        skip,
        take: limit,
        orderBy,
      }),
      prisma.product.count({ where }),
    ]);

    return {
      products: products.map(mapProduct),
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

  async getProductBySlug(slug, isPublic = true) {
    const where = { slug };
    if (isPublic) where.isPublished = true;

    const product = await prisma.product.findFirst({
      where,
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        variants: true,
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

    const related = await this.getRelatedProducts(product.id, product.categorySlug);

    return {
      ...mapProduct(product),
      related,
    };
  },

  async getProductById(id) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        variants: true,
        reviews: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!product) {
      const err = new Error(`Product with id '${id}' not found`);
      err.statusCode = HTTP_STATUS.NOT_FOUND;
      throw err;
    }

    return mapProduct(product);
  },

  async getRelatedProducts(productId, categorySlug, limit = 4) {
    const related = await prisma.product.findMany({
      where: {
        categorySlug,
        isPublished: true,
        id: { not: productId },
      },
      take: limit,
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
      },
    });

    return related.map((p) => ({
      id: p.id,
      _id: p.id,
      name: p.name,
      slug: p.slug,
      price: Number(p.price),
      salePrice: p.salePrice ? Number(p.salePrice) : undefined,
      category: p.categorySlug,
      categoryLabel: p.categoryLabel,
      leatherType: p.leatherType,
      isNewArrival: p.isNewArrival,
      isBestseller: p.isBestseller,
      images: (p.images || []).map((img) => ({
        url: img.url,
        alt: img.alt,
        isPrimary: img.isPrimary,
      })),
    }));
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
      if (Array.isArray(p.availableColors)) {
        p.availableColors.forEach((c) => colors.add(c.name || c));
      }
      if (Array.isArray(p.availableSizes)) {
        p.availableSizes.forEach((s) => sizes.add(s));
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

  async createProduct(data) {
    if (!data.slug) {
      data.slug = generateSlug(data.name);
    }

    const normalizedCategory = this.normalizeCategorySlug(data.category);

    // Get category label if not provided
    let categoryName = data.categoryLabel;
    if (!categoryName && normalizedCategory) {
      const cat = await prisma.category.findUnique({
        where: { slug: normalizedCategory },
      });
      if (cat) categoryName = cat.name;
    }

    try {
      const product = await prisma.product.create({
        data: {
          sku: data.sku,
          slug: data.slug,
          name: data.name,
          tagline: data.tagline || '',
          categorySlug: normalizedCategory,
          categoryLabel: data.categoryLabel || categoryName || '',
          collectionId: data.collectionId || null,
          gender: data.gender || 'unisex',
          styles: data.styles || [],
          leatherType: data.leatherType,
          hardware: data.hardware || '',
          lining: data.lining || '',
          modelInfo: data.modelInfo || '',
          description: data.description,
          editorialQuote: data.editorialQuote || '',
          price: Number(data.price),
          salePrice: data.salePrice ? Number(data.salePrice) : null,
          isFeatured: !!data.isFeatured,
          isBestseller: !!data.isBestseller,
          isNewArrival: data.isNewArrival !== undefined ? !!data.isNewArrival : true,
          isPublished: data.isPublished !== undefined ? !!data.isPublished : true,
          specifications: data.specifications || [],
          careInstructions: data.careInstructions || [],
          availableColors: data.availableColors || [],
          availableSizes: data.availableSizes || [],
          seoTitle: data.seoTitle || null,
          seoDescription: data.seoDescription || null,
          images: data.images?.length
            ? {
                create: data.images.map((img, idx) => ({
                  url: img.url,
                  alt: img.alt || '',
                  isPrimary: !!img.isPrimary,
                  isHover: !!img.isHover,
                  type: img.type || 'perspective',
                  sortOrder: img.sortOrder ?? idx + 1,
                })),
              }
            : undefined,
          variants: data.variants?.length
            ? {
                create: data.variants.map((v) => ({
                  sku: v.sku || `${data.sku}-${v.size}-${v.color}`.toUpperCase().replace(/\s+/g, '-'),
                  size: v.size,
                  color: v.color,
                  colorHex: v.colorHex || '#000000',
                  stock: v.stock || 0,
                  priceOverride: v.priceOverride ? Number(v.priceOverride) : null,
                })),
              }
            : undefined,
        },
        include: {
          images: { orderBy: { sortOrder: 'asc' } },
          variants: true,
        },
      });

      return mapProduct(product);
    } catch (error) {
      if (error.code === 'P2002') {
        const err = new Error(`Product with SKU '${data.sku}' or slug '${data.slug}' already exists`);
        err.statusCode = HTTP_STATUS.CONFLICT;
        err.errorCode = 'ERR_DUPLICATE_PRODUCT';
        throw err;
      }
      throw error;
    }
  },

  async updateProduct(id, data) {
    if (data.name && !data.slug) {
      data.slug = generateSlug(data.name);
    }

    const updates = {};
    if (data.sku) updates.sku = data.sku;
    if (data.slug) updates.slug = data.slug;
    if (data.name) updates.name = data.name;
    if (data.tagline !== undefined) updates.tagline = data.tagline;
    if (data.category) {
      updates.categorySlug = this.normalizeCategorySlug(data.category);
    }
    if (data.categoryLabel !== undefined) updates.categoryLabel = data.categoryLabel;
    if (data.collectionId !== undefined) updates.collectionId = data.collectionId;
    if (data.gender) updates.gender = data.gender;
    if (data.styles) updates.styles = data.styles;
    if (data.leatherType) updates.leatherType = data.leatherType;
    if (data.hardware !== undefined) updates.hardware = data.hardware;
    if (data.lining !== undefined) updates.lining = data.lining;
    if (data.modelInfo !== undefined) updates.modelInfo = data.modelInfo;
    if (data.description) updates.description = data.description;
    if (data.editorialQuote !== undefined) updates.editorialQuote = data.editorialQuote;
    if (data.price !== undefined) updates.price = Number(data.price);
    if (data.salePrice !== undefined) updates.salePrice = data.salePrice ? Number(data.salePrice) : null;
    if (data.isFeatured !== undefined) updates.isFeatured = data.isFeatured;
    if (data.isBestseller !== undefined) updates.isBestseller = data.isBestseller;
    if (data.isNewArrival !== undefined) updates.isNewArrival = data.isNewArrival;
    if (data.isPublished !== undefined) updates.isPublished = data.isPublished;
    if (data.specifications) updates.specifications = data.specifications;
    if (data.careInstructions) updates.careInstructions = data.careInstructions;
    if (data.availableColors) updates.availableColors = data.availableColors;
    if (data.availableSizes) updates.availableSizes = data.availableSizes;
    if (data.seoTitle !== undefined) updates.seoTitle = data.seoTitle;
    if (data.seoDescription !== undefined) updates.seoDescription = data.seoDescription;

    try {
      const updated = await prisma.$transaction(async (tx) => {
        // Handle images replacement if supplied
        if (data.images && Array.isArray(data.images)) {
          await tx.productImage.deleteMany({ where: { productId: id } });
          updates.images = {
            create: data.images.map((img, idx) => ({
              url: img.url,
              alt: img.alt || '',
              isPrimary: !!img.isPrimary,
              isHover: !!img.isHover,
              type: img.type || 'perspective',
              sortOrder: img.sortOrder ?? idx + 1,
            })),
          };
        }

        // Handle variants replacement if supplied
        if (data.variants && Array.isArray(data.variants)) {
          await tx.productVariant.deleteMany({ where: { productId: id } });
          updates.variants = {
            create: data.variants.map((v) => ({
              sku: v.sku,
              size: v.size,
              color: v.color,
              colorHex: v.colorHex || '#000000',
              stock: v.stock || 0,
              priceOverride: v.priceOverride ? Number(v.priceOverride) : null,
            })),
          };
        }

        return tx.product.update({
          where: { id },
          data: updates,
          include: {
            images: { orderBy: { sortOrder: 'asc' } },
            variants: true,
          },
        });
      });

      return mapProduct(updated);
    } catch (error) {
      if (error.code === 'P2025') {
        const err = new Error(`Product with id '${id}' not found`);
        err.statusCode = HTTP_STATUS.NOT_FOUND;
        throw err;
      }
      throw error;
    }
  },

  async deleteProduct(id) {
    try {
      const product = await prisma.product.delete({
        where: { id },
      });
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
      include: {
        images: true,
        variants: true,
      },
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
                stock: v.stock,
                priceOverride: v.priceOverride,
              })),
            }
          : undefined,
      },
      include: {
        images: true,
        variants: true,
      },
    });

    return mapProduct(duplicate);
  },

  async searchProducts(queryText, limit = 20) {
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
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        variants: true,
      },
      take: limit,
    });
    return products.map(mapProduct);
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
