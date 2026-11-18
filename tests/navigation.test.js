import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { CategoryService } from '../src/services/category.service.js';

describe('Dynamic Database-Driven Navigation API Integration Tests', { timeout: 20000 }, () => {
  beforeEach(() => {
    CategoryService.invalidateNavigationCache();
  });

  describe('GET /api/v1/content/navigation (Unfiltered - Both Departments)', () => {
    it('should return 200 with both Men and Women dynamic navigation', async () => {
      const res = await request(app)
        .get('/api/v1/content/navigation')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();

      const { men, women } = res.body.data;
      expect(men).toBeDefined();
      expect(women).toBeDefined();

      expect(men.label).toBe('Men');
      expect(women.label).toBe('Women');

      expect(Array.isArray(men.categories)).toBe(true);
      expect(Array.isArray(women.categories)).toBe(true);

      // Verify HTTP Cache-Control header
      expect(res.headers['cache-control']).toBe(
        'public, max-age=60, stale-while-revalidate=120'
      );
    });

    it('should have properly structured categories and products matching DB records', async () => {
      const res = await request(app)
        .get('/api/v1/content/navigation')
        .expect(200);

      const men = res.body.data.men;
      const women = res.body.data.women;

      // Verify Men categories structure
      const menBiker = men.categories.find((c) => c.slug === 'biker');
      expect(menBiker).toBeDefined();
      expect(menBiker.name).toBe('Biker Jackets');
      expect(menBiker.href).toBe('/men/biker');
      expect(Array.isArray(menBiker.products)).toBe(true);
      expect(menBiker.products.length).toBeGreaterThan(0);

      const sampleMenProd = menBiker.products[0];
      expect(sampleMenProd).toHaveProperty('id');
      expect(sampleMenProd).toHaveProperty('name');
      expect(sampleMenProd).toHaveProperty('slug');
      expect(sampleMenProd).toHaveProperty('image');
      expect(sampleMenProd).toHaveProperty('price');
      expect(typeof sampleMenProd.price).toBe('number');
      expect(sampleMenProd).toHaveProperty('isInStock');
      expect(typeof sampleMenProd.isInStock).toBe('boolean');

      // Verify Women categories structure
      const womenCoats = women.categories.find((c) => c.slug === 'women-coats-trench');
      expect(womenCoats).toBeDefined();
      expect(womenCoats.href).toBe('/women/women-coats-trench');
      expect(womenCoats.products.length).toBeGreaterThan(0);

      const sampleWomenProd = womenCoats.products[0];
      expect(sampleWomenProd).toHaveProperty('id');
      expect(sampleWomenProd).toHaveProperty('name');
      expect(sampleWomenProd).toHaveProperty('price');
      expect(typeof sampleWomenProd.price).toBe('number');
      expect(typeof sampleWomenProd.isInStock).toBe('boolean');
    });

    it('should handle empty categories with an empty products array', async () => {
      const res = await request(app)
        .get('/api/v1/content/navigation')
        .expect(200);

      const men = res.body.data.men;
      const emptyMenCat = men.categories.find((c) => c.slug === 'men-bomber-jackets');
      if (emptyMenCat) {
        expect(Array.isArray(emptyMenCat.products)).toBe(true);
        expect(emptyMenCat.products).toHaveLength(0);
      }
    });
  });

  describe('GET /api/v1/content/navigation?department=men', () => {
    it('should return ONLY Men navigation', async () => {
      const res = await request(app)
        .get('/api/v1/content/navigation?department=men')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.men).toBeDefined();
      expect(res.body.data.women).toBeUndefined();
      expect(res.body.data.men.label).toBe('Men');

      // Verify all categories in Men do not include women-specific slugs
      const womenSlugsInMen = res.body.data.men.categories.filter((c) =>
        c.slug.startsWith('women-')
      );
      expect(womenSlugsInMen).toHaveLength(0);

      // Verify all category hrefs start with /men/
      res.body.data.men.categories.forEach((cat) => {
        expect(cat.href).toMatch(/^\/men\//);
      });
    });
  });

  describe('GET /api/v1/content/navigation?department=women', () => {
    it('should return ONLY Women navigation', async () => {
      const res = await request(app)
        .get('/api/v1/content/navigation?department=women')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.women).toBeDefined();
      expect(res.body.data.men).toBeUndefined();
      expect(res.body.data.women.label).toBe('Women');

      // Verify all categories in Women do not include men-specific slugs
      const menSlugsInWomen = res.body.data.women.categories.filter((c) =>
        c.slug.startsWith('men-')
      );
      expect(menSlugsInWomen).toHaveLength(0);

      // Verify all category hrefs start with /women/
      res.body.data.women.categories.forEach((cat) => {
        expect(cat.href).toMatch(/^\/women\//);
      });
    });
  });

  describe('Validation & Edge Cases', () => {
    it('should reject invalid department with 400 Bad Request', async () => {
      const res = await request(app)
        .get('/api/v1/content/navigation?department=unsupported_dept')
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid department');
    });

    it('should support legacy query parameter ?menu=men', async () => {
      const res = await request(app)
        .get('/api/v1/content/navigation?menu=men')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.men).toBeDefined();
      expect(res.body.data.women).toBeUndefined();
    });

    it('should serve cached responses with low latency', async () => {
      // First call (primes cache)
      await request(app).get('/api/v1/content/navigation').expect(200);

      // Warm-up call
      await request(app).get('/api/v1/content/navigation').expect(200);

      // Subsequent call from in-memory cache
      const start = performance.now();
      const res = await request(app).get('/api/v1/content/navigation').expect(200);
      const duration = performance.now() - start;

      expect(res.body.success).toBe(true);
      expect(duration).toBeLessThan(100);
    });
  });

  describe('CORS and Preflight Compatibility', () => {
    it('should accept x-locale and x-market request headers without errors', async () => {
      const res = await request(app)
        .get('/api/v1/content/navigation?department=men')
        .set('Origin', 'http://localhost:3000')
        .set('x-locale', 'it')
        .set('x-market', 'IT')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.men).toBeDefined();
    });
  });

  describe('Legacy Upsert Create and Update Compatibility', () => {
    it('should update existing navigation menu payload without breaking schema constraints', async () => {
      const { SettingsService } = await import('../src/services/settings.service.js');
      const { prisma } = await import('../src/lib/prisma.js');
      const { vi } = await import('vitest');

      const existingMen = await SettingsService.getNavigationMenu('men');
      expect(existingMen).toBeDefined();

      const updatedPayload = {
        ...existingMen,
        fallbackLabel: 'MEN ATELIER',
      };

      const spy = vi.spyOn(prisma.navigationMenu, 'upsert').mockResolvedValueOnce({
        payload: updatedPayload,
      });

      const result = await SettingsService.updateNavigationMenu('men', updatedPayload);
      expect(result).toBeDefined();
      expect(result.fallbackLabel).toBe('MEN ATELIER');
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { menuKey: 'men' },
          update: { payload: updatedPayload },
        })
      );
      spy.mockRestore();
    });

    it('should supply required name, department, and slug in create branch of upsert', async () => {
      const { SettingsService } = await import('../src/services/settings.service.js');
      const { prisma } = await import('../src/lib/prisma.js');
      const { vi } = await import('vitest');

      const testKey = 'kids';
      const testPayload = { id: testKey, label: 'Kids Collection' };

      const spy = vi.spyOn(prisma.navigationMenu, 'upsert').mockResolvedValueOnce({
        payload: testPayload,
      });

      const result = await SettingsService.updateNavigationMenu(testKey, testPayload);

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { menuKey: testKey },
          update: { payload: testPayload },
          create: expect.objectContaining({
            menuKey: testKey,
            department: testKey,
            slug: testKey,
            name: 'Kids Navigation',
            payload: testPayload,
          }),
        })
      );
      expect(result).toEqual(testPayload);
      spy.mockRestore();
    });
  });

  describe('Existing Men & Women Navigation Content Preservation', () => {
    it('should preserve and retrieve complete legacy Men navigation payload', async () => {
      const { SettingsService } = await import('../src/services/settings.service.js');
      const men = await SettingsService.getNavigationMenu('men');

      expect(men).toBeDefined();
      expect(men.id).toBe('men');
      expect(men.fallbackLabel).toBe('MEN');
      expect(Array.isArray(men.categories)).toBe(true);
      expect(men.categories.length).toBeGreaterThanOrEqual(9);
      expect(Array.isArray(men.styles)).toBe(true);
      expect(men.styles.length).toBeGreaterThanOrEqual(5);
      expect(Array.isArray(men.shopBy)).toBe(true);
      expect(men.shopBy.length).toBeGreaterThanOrEqual(5);
      expect(men.featured).toBeDefined();
      expect(men.featured.title).toBe('THE MILANESE CUT');
    });

    it('should preserve and retrieve complete legacy Women navigation payload', async () => {
      const { SettingsService } = await import('../src/services/settings.service.js');
      const women = await SettingsService.getNavigationMenu('women');

      expect(women).toBeDefined();
      expect(women.id).toBe('women');
      expect(women.fallbackLabel).toBe('WOMEN');
      expect(Array.isArray(women.categories)).toBe(true);
      expect(women.categories.length).toBeGreaterThanOrEqual(10);
      expect(Array.isArray(women.coats)).toBe(true);
      expect(women.coats.length).toBeGreaterThanOrEqual(6);
      expect(Array.isArray(women.shopBy)).toBe(true);
      expect(women.shopBy.length).toBeGreaterThanOrEqual(7);
      expect(women.featured).toBeDefined();
      expect(women.featured.title).toBe('SCULPTED SILHOUETTES');
    });

    it('should retrieve full dictionary mapping for all navigation menus', async () => {
      const { SettingsService } = await import('../src/services/settings.service.js');
      const menus = await SettingsService.getNavigationMenu();

      expect(menus).toBeDefined();
      expect(menus.men).toBeDefined();
      expect(menus.women).toBeDefined();
      expect(menus.men.id).toBe('men');
      expect(menus.women.id).toBe('women');
    });

    it('should maintain legacyId identifiers across Men and Women category items', async () => {
      const { SettingsService } = await import('../src/services/settings.service.js');
      const men = await SettingsService.getNavigationMenu('men');
      const women = await SettingsService.getNavigationMenu('women');

      // Verify Men legacy identifiers
      const menIds = men.categories.map((c) => c.id);
      expect(menIds).toContain('m-leather');
      expect(menIds).toContain('m-biker');
      expect(menIds).toContain('m-bomber');
      expect(menIds).toContain('m-aviator');

      // Verify Women legacy identifiers
      const womenIds = women.categories.map((c) => c.id);
      expect(womenIds).toContain('w-leather');
      expect(womenIds).toContain('w-biker');
      expect(womenIds).toContain('w-cropped');
      expect(womenIds).toContain('w-coats');
    });

    it('should perform deterministic category mapping without ambiguous guessing', async () => {
      const { prisma } = await import('../src/lib/prisma.js');
      const categories = await prisma.category.findMany({ select: { id: true, slug: true } });

      const menBikerCat = categories.find((c) => c.slug === 'men-biker-jackets');
      expect(menBikerCat).toBeDefined();

      const womenBikerCat = categories.find((c) => c.slug === 'women-biker-jackets');
      expect(womenBikerCat).toBeDefined();

      // Slugs must be mutually exclusive
      expect(menBikerCat.id).not.toBe(womenBikerCat.id);
    });
  });
});
