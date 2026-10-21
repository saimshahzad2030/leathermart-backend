import { describe, it, expect, vi } from 'vitest';
import {
  baseProductSchema,
  productFilterQuerySchema,
} from '../src/validators/product.validator.js';
import { mapProduct } from '../src/utils/mapper.js';

describe('Product-Level Stock Availability & Master Control', () => {
  describe('1. Product Validator Schema Defaults & Boolean Handling', () => {
    const validSamplePayload = {
      sku: 'AVM-TST-001',
      name: 'Test Leather Jacket',
      category: 'biker',
      leatherType: 'Full-Grain Calfskin',
      description: 'Luxury handcrafted biker jacket with Italian hardware.',
      price: 1250,
      sizes: ['M', 'L'],
      colors: ['Black'],
    };

    it('should default isInStock to true when omitted', () => {
      const parsed = baseProductSchema.parse(validSamplePayload);
      expect(parsed.isInStock).toBe(true);
    });

    it('should accept isInStock: false explicitly without converting to true', () => {
      const parsed = baseProductSchema.parse({
        ...validSamplePayload,
        isInStock: false,
      });
      expect(parsed.isInStock).toBe(false);
    });

    it('should accept isInStock: true explicitly', () => {
      const parsed = baseProductSchema.parse({
        ...validSamplePayload,
        isInStock: true,
      });
      expect(parsed.isInStock).toBe(true);
    });

    it('should correctly parse string "false" as boolean false for multipart uploads', () => {
      const parsed = baseProductSchema.parse({
        ...validSamplePayload,
        isInStock: 'false',
      });
      expect(parsed.isInStock).toBe(false);
    });

    it('should correctly parse string "true" as boolean true for multipart uploads', () => {
      const parsed = baseProductSchema.parse({
        ...validSamplePayload,
        isInStock: 'true',
      });
      expect(parsed.isInStock).toBe(true);
    });
  });

  describe('2. Query Parameter Validator for Stock Filtering', () => {
    it('should correctly parse in_stock="false" as boolean false without JS coercion bug', () => {
      const parsed = productFilterQuerySchema.parse({ in_stock: 'false' });
      expect(parsed.in_stock).toBe(false);
    });

    it('should correctly parse in_stock="true" as boolean true', () => {
      const parsed = productFilterQuerySchema.parse({ in_stock: 'true' });
      expect(parsed.in_stock).toBe(true);
    });

    it('should correctly parse isInStock="false" and is_in_stock="false"', () => {
      const parsed1 = productFilterQuerySchema.parse({ isInStock: 'false' });
      expect(parsed1.isInStock).toBe(false);

      const parsed2 = productFilterQuerySchema.parse({ is_in_stock: 'false' });
      expect(parsed2.is_in_stock).toBe(false);
    });

    it('should leave stock filters undefined when omitted', () => {
      const parsed = productFilterQuerySchema.parse({ category: 'biker' });
      expect(parsed.in_stock).toBeUndefined();
      expect(parsed.isInStock).toBeUndefined();
      expect(parsed.is_in_stock).toBeUndefined();
    });
  });

  describe('3. Product Mapper Availability Rules', () => {
    const baseMockProduct = {
      id: 'prod-uuid-1',
      sku: 'AVM-MAP-001',
      slug: 'test-garment',
      name: 'Atelier Test Garment',
      categorySlug: 'biker',
      price: 1500,
      description: 'Handcrafted luxury piece',
      isInStock: true,
      variants: [
        { id: 'v1', sku: 'AVM-MAP-001-M-BLK', size: 'M', color: 'Black', inStock: true },
        { id: 'v2', sku: 'AVM-MAP-001-L-BLK', size: 'L', color: 'Black', inStock: false },
      ],
    };

    it('should return isInStock: true and composite inStock: true when product is in stock and at least one variant is available', () => {
      const mapped = mapProduct(baseMockProduct);
      expect(mapped.isInStock).toBe(true);
      expect(mapped.inStock).toBe(true);
      expect(mapped.variants[0].inStock).toBe(true);
      expect(mapped.variants[1].inStock).toBe(false);
    });

    it('MASTER RULE: if Product.isInStock is false, whole product is unavailable (inStock: false) even if all variants have inStock: true', () => {
      const outOfStockProduct = {
        ...baseMockProduct,
        isInStock: false,
        variants: [
          { id: 'v1', sku: 'AVM-MAP-001-M-BLK', size: 'M', color: 'Black', inStock: true },
          { id: 'v2', sku: 'AVM-MAP-001-L-BLK', size: 'L', color: 'Black', inStock: true },
        ],
      };

      const mapped = mapProduct(outOfStockProduct);
      expect(mapped.isInStock).toBe(false);
      expect(mapped.inStock).toBe(false);
      // Individual variant data is preserved independently
      expect(mapped.variants[0].inStock).toBe(true);
      expect(mapped.variants[1].inStock).toBe(true);
    });

    it('should return inStock: false if Product.isInStock is true but ALL variants have inStock: false', () => {
      const allVariantsOut = {
        ...baseMockProduct,
        isInStock: true,
        variants: [
          { id: 'v1', sku: 'AVM-MAP-001-M-BLK', size: 'M', color: 'Black', inStock: false },
          { id: 'v2', sku: 'AVM-MAP-001-L-BLK', size: 'L', color: 'Black', inStock: false },
        ],
      };

      const mapped = mapProduct(allVariantsOut);
      expect(mapped.isInStock).toBe(true);
      expect(mapped.inStock).toBe(false);
    });

    it('should respect database snake_case field is_in_stock when mapping from raw SQL', () => {
      const rawSqlProduct = {
        id: 'prod-uuid-2',
        sku: 'AVM-MAP-002',
        slug: 'test-garment-2',
        name: 'Raw SQL Garment',
        category_slug: 'bomber',
        price: 1800,
        description: 'Raw DB query result',
        is_in_stock: false,
        variants: [],
      };

      const mapped = mapProduct(rawSqlProduct);
      expect(mapped.isInStock).toBe(false);
      expect(mapped.inStock).toBe(false);
    });

    it('should handle products with no variants respecting product-level isInStock flag', () => {
      const noVariantsInStock = {
        id: 'prod-uuid-3',
        sku: 'AVM-MAP-003',
        slug: 'no-var-in',
        name: 'No Variants In Stock',
        price: 900,
        description: 'Single piece',
        isInStock: true,
        variants: [],
      };

      const mappedIn = mapProduct(noVariantsInStock);
      expect(mappedIn.isInStock).toBe(true);
      expect(mappedIn.inStock).toBe(true);

      const noVariantsOut = {
        ...noVariantsInStock,
        isInStock: false,
      };

      const mappedOut = mapProduct(noVariantsOut);
      expect(mappedOut.isInStock).toBe(false);
      expect(mappedOut.inStock).toBe(false);
    });
  });

  describe('4. Inventory & Storefront Purchase Feasibility Rules', () => {
    const evaluateCanPurchase = (product, selectedVariantSku) => {
      // 1. If product is out of stock, entire product cannot be purchased
      if (product.isInStock === false) return false;

      // 2. If product has variants, selected variant must be in stock
      if (product.variants && product.variants.length > 0) {
        const variant = product.variants.find((v) => v.sku === selectedVariantSku);
        if (!variant) return false;
        return Boolean(variant.inStock);
      }

      // 3. If product has no variants, rely on product-level stock
      return product.isInStock !== false;
    };

    it('Rule 1: Product.isInStock = false -> entire product is unavailable', () => {
      const product = {
        isInStock: false,
        variants: [{ sku: 'SKU-M', inStock: true }],
      };
      expect(evaluateCanPurchase(product, 'SKU-M')).toBe(false);
    });

    it('Rule 2: Product.isInStock = true and selected variant inStock = true -> variant may be purchased', () => {
      const product = {
        isInStock: true,
        variants: [
          { sku: 'SKU-M', inStock: true },
          { sku: 'SKU-L', inStock: false },
        ],
      };
      expect(evaluateCanPurchase(product, 'SKU-M')).toBe(true);
    });

    it('Rule 3: Product.isInStock = true and selected variant inStock = false -> that variant cannot be purchased', () => {
      const product = {
        isInStock: true,
        variants: [
          { sku: 'SKU-M', inStock: true },
          { sku: 'SKU-L', inStock: false },
        ],
      };
      expect(evaluateCanPurchase(product, 'SKU-L')).toBe(false);
    });

    it('Rule 4: If product has no variants, purchase follows product-level flag', () => {
      expect(evaluateCanPurchase({ isInStock: true, variants: [] }, null)).toBe(true);
      expect(evaluateCanPurchase({ isInStock: false, variants: [] }, null)).toBe(false);
    });
  });
});
