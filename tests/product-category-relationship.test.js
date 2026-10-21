import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductService } from '../src/services/product.service.js';
import { CategoryService } from '../src/services/category.service.js';
import { StorageService } from '../src/services/storage.service.js';
import { auditAndRepairCategories } from '../src/scripts/audit-and-repair-categories.js';

const { mockStorageFrom, mockPrisma } = vi.hoisted(() => {
  const sFrom = {
    upload: vi.fn(),
    getPublicUrl: vi.fn(),
    remove: vi.fn(),
  };

  const pMock = {
    category: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
    },
    product: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      delete: vi.fn(),
    },
    productImage: {
      findMany: vi.fn(),
      createMany: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    productVariant: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    productSize: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    productColor: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    productPrice: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    productPolicy: {
      findMany: vi.fn(),
    },
    productPolicyAssignment: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    productSizeAssignment: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    productColorAssignment: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn((callback) => {
      if (typeof callback === 'function') return callback(pMock);
      return Promise.all(callback);
    }),
  };

  return { mockStorageFrom: sFrom, mockPrisma: pMock };
});

vi.mock('../src/config/supabase.js', () => ({
  supabase: {
    storage: {
      from: () => mockStorageFrom,
    },
  },
  getSupabase: () => ({
    storage: {
      from: () => mockStorageFrom,
    },
  }),
}));

vi.mock('../src/lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

describe('Product–Category Relationship & Deletion Safeguards', () => {
  const categoriesDb = [
    {
      id: '5603ec9f-8f7d-43fa-b424-1017684f7fbf',
      slug: 'biker',
      name: 'Biker Jackets 2',
      featuredOrder: 1,
      isPublished: true,
    },
    {
      id: 'f6de4d8e-6cd8-4111-922b-f14837dd95ea',
      slug: 'bomber',
      name: 'Bomber Jackets',
      featuredOrder: 2,
      isPublished: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    mockStorageFrom.upload.mockResolvedValue({ data: { path: 'products/test/img1.webp' }, error: null });
    mockStorageFrom.getPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://supabase.co/storage/v1/object/public/bucket/products/test/img1.webp' },
    });
    mockStorageFrom.remove.mockResolvedValue({ data: [], error: null });

    // Setup category findUnique mock
    mockPrisma.category.findUnique.mockImplementation(async ({ where }) => {
      if (where.slug) {
        return categoriesDb.find((c) => c.slug === where.slug) || null;
      }
      if (where.id) {
        return categoriesDb.find((c) => c.id === where.id) || null;
      }
      return null;
    });

    mockPrisma.category.findMany.mockImplementation(async () => categoriesDb);

    mockPrisma.productSize.findMany.mockImplementation(async ({ where }) => {
      const orList = where?.OR || [];
      const items = orList.flatMap((o) => o.id?.in || o.slug?.in || o.name?.in || []);
      return items.map((val, i) => ({ id: `sz-${i}`, name: String(val), slug: String(val).toLowerCase(), isActive: true }));
    });
    mockPrisma.productSize.create.mockImplementation(async ({ data }) => ({
      id: `sz-created-${Date.now()}`,
      ...data,
      isActive: true,
    }));

    mockPrisma.productColor.findMany.mockImplementation(async ({ where }) => {
      const orList = where?.OR || [];
      const items = orList.flatMap((o) => o.id?.in || o.slug?.in || o.name?.in || []);
      return items.map((val, i) => ({ id: `cl-${i}`, name: String(val), slug: String(val).toLowerCase(), hexCode: '#000000', isActive: true }));
    });
    mockPrisma.productColor.create.mockImplementation(async ({ data }) => ({
      id: `cl-created-${Date.now()}`,
      ...data,
      isActive: true,
    }));
    mockPrisma.productPolicy.findMany.mockResolvedValue([]);
  });

  // Test 1: Creating a product with a valid canonical category slug
  it('1. should create a product with a valid canonical category slug and set consistent categoryLabel', async () => {
    mockPrisma.product.create.mockImplementation(async ({ data }) => ({
      id: 'prod-001',
      ...data,
      images: [],
      variants: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const result = await ProductService.createProduct({
      sku: 'AVM-JKT-001',
      slug: 'classic-black-leather-jacket',
      name: 'Classic Black Leather Jacket',
      category: 'biker',
      categoryLabel: 'Old Outdated Label',
      price: 650,
      leatherType: 'Full-Grain Calfskin',
      description: 'Luxury Italian biker jacket with Excella hardware.',
      sizes: ['M'],
      colors: ['Black'],
    });

    expect(result.sku).toBe('AVM-JKT-001');
    expect(result.category).toBe('biker');
    expect(result.categoryLabel).toBe('Biker Jackets 2');

    // Verify Prisma create called with canonical categorySlug and categoryLabel
    expect(mockPrisma.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          categorySlug: 'biker',
          categoryLabel: 'Biker Jackets 2',
        }),
      })
    );
  });

  // Test 2: Creating a product with an invalid category slug
  it('2. should reject product creation with an invalid category slug with HTTP 400 and ERR_INVALID_CATEGORY', async () => {
    await expect(
      ProductService.createProduct({
        sku: 'AVM-JKT-002',
        slug: 'invalid-product',
        name: 'Invalid Product',
        category: 'nonexistent-category-slug',
        price: 500,
        leatherType: 'Lambskin',
        description: 'Should fail validation.',
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      errorCode: 'ERR_INVALID_CATEGORY',
      message: expect.stringContaining("Category 'nonexistent-category-slug' does not exist"),
    });

    expect(mockPrisma.product.create).not.toHaveBeenCalled();
  });

  // Test 3: Handling the legacy `jackets` slug if it is not a valid canonical slug
  it('3. should reject product creation with legacy generic "jackets" slug with clear guidance', async () => {
    await expect(
      ProductService.createProduct({
        sku: 'AVM-JKT-003',
        slug: 'classic-leather-jacket',
        name: 'Classic Leather Jacket',
        category: 'jackets',
        categoryLabel: 'Biker Jackets 2',
        price: 700,
        leatherType: 'Calfskin',
        description: 'Testing legacy jackets slug.',
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      errorCode: 'ERR_INVALID_CATEGORY',
      message: expect.stringContaining("Category 'jackets' does not exist"),
    });

    expect(mockPrisma.product.create).not.toHaveBeenCalled();
  });

  // Test 4: Deleting an unused category successfully
  it('4. should delete an unused category successfully', async () => {
    const unusedCat = categoriesDb[1]; // 'bomber'
    mockPrisma.product.count.mockResolvedValue(0);
    mockPrisma.category.delete.mockResolvedValue(unusedCat);

    const deleted = await CategoryService.deleteCategory(unusedCat.id);

    expect(deleted.id).toBe(unusedCat.id);
    expect(mockPrisma.product.count).toHaveBeenCalledWith({
      where: { categorySlug: 'bomber' },
    });
    expect(mockPrisma.category.delete).toHaveBeenCalledWith({
      where: { id: unusedCat.id },
    });
  });

  // Test 5: Preventing deletion of a category genuinely referenced by products
  it('5. should prevent deletion of a category genuinely referenced by products with 409 CATEGORY_IN_USE', async () => {
    const usedCat = categoriesDb[0]; // 'biker'
    mockPrisma.product.count.mockResolvedValue(3);

    await expect(CategoryService.deleteCategory(usedCat.id)).rejects.toMatchObject({
      statusCode: 409,
      errorCode: 'CATEGORY_IN_USE',
      message: 'Cannot delete category because it is being used by 3 products.',
      details: {
        categoryId: usedCat.id,
        productCount: 3,
      },
    });

    expect(mockPrisma.category.delete).not.toHaveBeenCalled();
  });

  // Test 6: Ensuring an unrelated category is not incorrectly treated as in use
  it('6. should allow deleting category B even if category A has active products', async () => {
    const catA = categoriesDb[0]; // 'biker' has 5 products
    const catB = categoriesDb[1]; // 'bomber' has 0 products

    mockPrisma.product.count.mockImplementation(async ({ where }) => {
      if (where.categorySlug === catA.slug) return 5;
      if (where.categorySlug === catB.slug) return 0;
      return 0;
    });

    mockPrisma.category.delete.mockResolvedValue(catB);

    const result = await CategoryService.deleteCategory(catB.id);

    expect(result.id).toBe(catB.id);
    expect(mockPrisma.category.delete).toHaveBeenCalledWith({ where: { id: catB.id } });
  });

  // Test 7: Handling existing inconsistent product/category data
  it('7. should audit and repair existing products with mismatched category labels', async () => {
    const mockProducts = [
      {
        id: 'p-1',
        sku: 'AVM-01',
        slug: 'p-1',
        name: 'Product 1',
        categorySlug: 'biker',
        categoryLabel: 'Old Label 1', // Mismatched: expected 'Biker Jackets 2'
      },
      {
        id: 'p-2',
        sku: 'AVM-02',
        slug: 'p-2',
        name: 'Product 2',
        categorySlug: 'bomber',
        categoryLabel: 'Bomber Jackets', // Matches!
      },
    ];

    mockPrisma.product.findMany.mockResolvedValue(mockProducts);
    mockPrisma.product.update.mockResolvedValue({});

    // Run audit only
    const auditReport = await auditAndRepairCategories({ repair: false });
    expect(auditReport.mismatchedLabelCount).toBe(1);
    expect(auditReport.repairedCount).toBe(0);
    expect(mockPrisma.product.update).not.toHaveBeenCalled();

    // Run repair
    const repairReport = await auditAndRepairCategories({ repair: true });
    expect(repairReport.mismatchedLabelCount).toBe(1);
    expect(repairReport.repairedCount).toBe(1);
    expect(mockPrisma.product.update).toHaveBeenCalledWith({
      where: { id: 'p-1' },
      data: { categoryLabel: 'Biker Jackets 2' },
    });
  });

  // Test 8: Ensuring a failed product creation does not leave uploaded files orphaned
  it('8. should clean up uploaded files if category validation or product creation fails', async () => {
    const base64Image =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    mockPrisma.product.create.mockRejectedValue(new Error('Prisma database failure'));

    await expect(
      ProductService.createProduct({
        sku: 'AVM-ORPHAN-TEST',
        name: 'Orphan File Test',
        category: 'biker',
        price: 500,
        leatherType: 'Lambskin',
        description: 'Testing orphan cleanup on failure.',
        sizes: ['M'],
        colors: ['Black'],
        images: [{ url: base64Image, alt: 'Test' }],
      })
    ).rejects.toThrow('Prisma database failure');

    // Storage remove MUST be invoked to clean up newly uploaded image
    expect(mockStorageFrom.remove).toHaveBeenCalled();
  });

  // Test 9: Ensuring existing product creation, image handling, variants, and category listing work
  it('9. should handle full product creation with variants, images, and category listing properly', async () => {
    mockPrisma.product.create.mockImplementation(async ({ data }) => ({
      id: 'full-prod-1',
      ...data,
      images: [
        {
          id: 'img-1',
          url: 'https://supabase.co/storage/v1/object/public/bucket/products/test/img1.webp',
          isPrimary: true,
          sortOrder: 1,
        },
      ],
      variants: [
        {
          id: 'var-1',
          sku: 'AVM-FULL-48-BLK',
          size: '48 (EU M)',
          color: 'Black',
          stock: 10,
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const product = await ProductService.createProduct({
      sku: 'AVM-FULL-01',
      name: 'Full Product',
      category: 'biker-jackets', // Valid alias normalized to 'biker'
      price: 890,
      leatherType: 'Calfskin',
      description: 'Comprehensive test with variants and images.',
      sizes: ['48 (EU M)'],
      colors: ['Black'],
      variants: [
        {
          sku: 'AVM-FULL-48-BLK',
          size: '48 (EU M)',
          color: 'Black',
          colorHex: '#000000',
          stock: 10,
        },
      ],
    });

    expect(product.category).toBe('biker');
    expect(product.categoryLabel).toBe('Biker Jackets 2');
    expect(product.variants).toHaveLength(1);

    // Test category listing
    mockPrisma.category.findMany.mockResolvedValue([
      {
        ...categoriesDb[0],
        _count: { products: 1 },
      },
    ]);

    const categories = await CategoryService.getAllCategories(false);
    expect(categories).toHaveLength(1);
    expect(categories[0].slug).toBe('biker');
    expect(categories[0].itemCount).toBe(1);
  });
});
