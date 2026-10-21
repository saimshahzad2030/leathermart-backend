import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StorageService } from '../src/services/storage.service.js';
import { ProductService } from '../src/services/product.service.js';
import { MediaService } from '../src/services/media.service.js';

const { mockStorageFrom, mockPrisma } = vi.hoisted(() => {
  const sFrom = {
    upload: vi.fn(),
    getPublicUrl: vi.fn(),
    remove: vi.fn(),
  };

  const pMock = {
    product: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
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
    category: {
      findUnique: vi.fn(),
    },
    mediaAsset: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(pMock)),
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

describe('Supabase Storage Service & Product Uploads', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockStorageFrom.upload.mockResolvedValue({
      data: { path: 'products/test/test-image.webp' },
      error: null,
    });
    mockStorageFrom.getPublicUrl.mockReturnValue({
      data: {
        publicUrl:
          'https://vkgxxzwridblughncypm.supabase.co/storage/v1/object/public/auraadorn-bucket/products/test/test-image.webp',
      },
    });
    mockStorageFrom.remove.mockResolvedValue({ data: [], error: null });

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

  describe('StorageService.validateFile', () => {
    it('should accept valid PNG buffer', () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
      expect(() => StorageService.validateFile(pngBuffer, 'image/png')).not.toThrow();
    });

    it('should reject unsupported MIME types', () => {
      const txtBuffer = Buffer.from('hello world');
      expect(() => StorageService.validateFile(txtBuffer, 'text/plain')).toThrow(
        /Unsupported MIME type/
      );
    });

    it('should reject empty buffers', () => {
      expect(() => StorageService.validateFile(Buffer.alloc(0), 'image/jpeg')).toThrow(
        /File content is empty/
      );
    });

    it('should reject signature mismatches', () => {
      const fakePng = Buffer.from('this is not a valid png');
      expect(() => StorageService.validateFile(fakePng, 'image/png')).toThrow(
        /signature does not match/
      );
    });
  });

  describe('StorageService.uploadBuffer & uploadBase64', () => {
    it('should upload a buffer and return the public URL', async () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
      const res = await StorageService.uploadBuffer({
        buffer: pngBuffer,
        originalName: 'jacket.png',
        mimeType: 'image/png',
        folder: 'products/biker-jacket',
      });

      expect(res.url).toContain('auraadorn-bucket');
      expect(res.path).toContain('products/biker-jacket');
      expect(mockStorageFrom.upload).toHaveBeenCalledTimes(1);
    });

    it('should upload base64 data URI and return public URL', async () => {
      const base64Data =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const res = await StorageService.uploadBase64(base64Data, {
        originalName: 'test.png',
        folder: 'products/bomber',
      });

      expect(res.url).toBeDefined();
      expect(mockStorageFrom.upload).toHaveBeenCalled();
    });
  });

  describe('StorageService path extraction & URL verification', () => {
    it('should extract path from full Supabase URL', () => {
      const url =
        'https://vkgxxzwridblughncypm.supabase.co/storage/v1/object/public/auraadorn-bucket/products/biker/test-123.webp';
      const extracted = StorageService.extractStoragePath(url);
      expect(extracted).toBe('products/biker/test-123.webp');
    });

    it('should recognize Supabase storage URLs', () => {
      const url =
        'https://vkgxxzwridblughncypm.supabase.co/storage/v1/object/public/auraadorn-bucket/products/biker/test-123.webp';
      expect(StorageService.isSupabaseStorageUrl(url)).toBe(true);
      expect(StorageService.isSupabaseStorageUrl('https://images.unsplash.com/photo-123')).toBe(
        false
      );
    });
  });

  describe('ProductService.createProduct with Supabase Uploads', () => {
    it('should upload base64 image and save product with Supabase URL', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({ id: 'c1', name: 'Biker Jackets' });
      mockPrisma.product.create.mockImplementation(({ data }) => ({
        id: 'p1',
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        images: data.images?.create || [],
        variants: [],
      }));

      const base64Image =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      const result = await ProductService.createProduct({
        sku: 'TEST-BIKER-01',
        name: 'Test Biker Jacket',
        category: 'biker',
        leatherType: 'Lambskin',
        description: 'Luxury handcrafted biker jacket with Italian hardware.',
        price: 550,
        sizes: ['M'],
        colors: ['Black'],
        images: [
          {
            url: base64Image,
            alt: 'Front View',
            isPrimary: true,
          },
        ],
      });

      expect(mockStorageFrom.upload).toHaveBeenCalled();
      expect(result.images[0].url).toContain('auraadorn-bucket');
    });

    it('should clean up newly uploaded storage objects if DB create fails', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({ id: 'c1', name: 'Biker Jackets' });
      mockPrisma.product.create.mockRejectedValue(new Error('DB Constraint Violation'));

      const base64Image =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      await expect(
        ProductService.createProduct({
          sku: 'TEST-FAIL-01',
          name: 'Test Failure Jacket',
          category: 'biker',
          leatherType: 'Lambskin',
          description: 'Testing rollback cleanup on database failure.',
          price: 550,
          sizes: ['M'],
          colors: ['Black'],
          images: [{ url: base64Image }],
        })
      ).rejects.toThrow('DB Constraint Violation');

      // Verify that remove was called to clean up the orphaned file
      expect(mockStorageFrom.remove).toHaveBeenCalled();
    });
  });

  describe('ProductService.deleteProduct cleanup', () => {
    it('should delete storage file when product is deleted and not referenced elsewhere', async () => {
      const supabaseUrl =
        'https://vkgxxzwridblughncypm.supabase.co/storage/v1/object/public/auraadorn-bucket/products/p1/img1.webp';

      mockPrisma.productImage.findMany.mockResolvedValue([
        { id: 'img-1', url: supabaseUrl },
      ]);
      mockPrisma.product.delete.mockResolvedValue({ id: 'p1', name: 'Deleted Garment' });
      mockPrisma.productImage.count.mockResolvedValue(0); // Not referenced elsewhere

      await ProductService.deleteProduct('p1');

      expect(mockStorageFrom.remove).toHaveBeenCalledWith(['products/p1/img1.webp']);
    });

    it('should NOT delete storage file if another product still references the same image', async () => {
      const sharedUrl =
        'https://vkgxxzwridblughncypm.supabase.co/storage/v1/object/public/auraadorn-bucket/products/shared/img.webp';

      mockPrisma.productImage.findMany.mockResolvedValue([
        { id: 'img-1', url: sharedUrl },
      ]);
      mockPrisma.product.delete.mockResolvedValue({ id: 'p1' });
      mockPrisma.productImage.count.mockResolvedValue(1); // Still referenced by another product!

      await ProductService.deleteProduct('p1');

      expect(mockStorageFrom.remove).not.toHaveBeenCalled();
    });
  });

  describe('MediaService integration with StorageService', () => {
    it('should upload asset and persist in Prisma mediaAsset', async () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);

      mockPrisma.mediaAsset.create.mockImplementation(({ data }) => ({
        id: 'asset-1',
        ...data,
        createdAt: new Date(),
      }));

      const asset = await MediaService.saveAsset(
        {
          buffer: pngBuffer,
          originalname: 'lookbook-01.png',
          mimetype: 'image/png',
          size: pngBuffer.length,
        },
        { folder: 'lookbooks', altText: 'Milan Lookbook' }
      );

      expect(asset).toBeDefined();
      expect(mockStorageFrom.upload).toHaveBeenCalled();
      expect(mockPrisma.mediaAsset.create).toHaveBeenCalled();
      expect(asset.url).toContain('auraadorn-bucket');
    });
  });
});
