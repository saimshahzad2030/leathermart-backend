import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NavigationService } from '../src/services/navigation.service.js';
import { prisma } from '../src/lib/prisma.js';

vi.mock('../src/lib/prisma.js', () => {
  return {
    prisma: {
      navigationMenu: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        upsert: vi.fn(),
      },
      navigationSection: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      navigationItem: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      navigationFeature: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      category: {
        findUnique: vi.fn(),
      },
      product: {
        findUnique: vi.fn(),
      },
      $transaction: vi.fn((promises) => Promise.all(promises)),
    },
  };
});

describe('Navigation CMS Service Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    NavigationService.invalidateCache();
  });

  describe('Menu Management', () => {
    it('should list navigation menus with filters', async () => {
      const mockMenus = [
        { id: 'menu-1', name: 'Men Navigation', department: 'men', isActive: true, isDraft: false },
      ];
      prisma.navigationMenu.findMany.mockResolvedValueOnce(mockMenus);

      const result = await NavigationService.listMenus({ department: 'men', isActive: true });
      expect(prisma.navigationMenu.findMany).toHaveBeenCalled();
      expect(result).toEqual(mockMenus);
    });

    it('should retrieve a menu by ID or slug with nested relations', async () => {
      const mockMenu = {
        id: 'menu-1',
        name: 'Men Navigation',
        department: 'men',
        sections: [
          {
            id: 'sec-1',
            name: 'Categories',
            items: [{ id: 'item-1', label: 'Biker Jackets', type: 'CATEGORY' }],
          },
        ],
        features: [{ id: 'feat-1', title: 'Winter Edit' }],
      };
      prisma.navigationMenu.findFirst.mockResolvedValueOnce(mockMenu);

      const result = await NavigationService.getMenuById('menu-1');
      expect(result).toEqual(mockMenu);
    });

    it('should create a navigation menu with slug and department defaults', async () => {
      const input = { name: 'Men Navigation', department: 'men' };
      const expectedCreated = { id: 'menu-new', ...input, slug: 'men', menuKey: 'men', isActive: true, isDraft: false };
      prisma.navigationMenu.create.mockResolvedValueOnce(expectedCreated);

      const result = await NavigationService.createMenu(input);
      expect(prisma.navigationMenu.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Men Navigation',
            department: 'men',
            slug: 'men',
          }),
        })
      );
      expect(result).toEqual(expectedCreated);
    });

    it('should publish a menu by toggling isDraft to false and isActive to true', async () => {
      prisma.navigationMenu.findFirst.mockResolvedValueOnce({ id: 'menu-1' });
      prisma.navigationMenu.update.mockResolvedValueOnce({
        id: 'menu-1',
        isDraft: false,
        isActive: true,
      });

      const result = await NavigationService.publishMenu('menu-1', { isDraft: false, isActive: true });
      expect(result.isDraft).toBe(false);
      expect(result.isActive).toBe(true);
    });
  });

  describe('Section Management', () => {
    it('should create a section within a menu', async () => {
      prisma.navigationMenu.findFirst.mockResolvedValueOnce({ id: 'menu-1' });
      prisma.navigationSection.create.mockResolvedValueOnce({
        id: 'sec-new',
        menuId: 'menu-1',
        name: 'Styles',
        slug: 'styles',
        sortOrder: 1,
      });

      const result = await NavigationService.createSection('menu-1', { name: 'Styles', sortOrder: 1 });
      expect(prisma.navigationSection.create).toHaveBeenCalled();
      expect(result.name).toBe('Styles');
    });

    it('should reorder sections atomically via $transaction', async () => {
      prisma.navigationSection.update.mockImplementation(({ data }) => Promise.resolve(data));

      const items = [
        { id: 'sec-1', sortOrder: 1 },
        { id: 'sec-2', sortOrder: 0 },
      ];
      const result = await NavigationService.reorderSections(items);
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
    });
  });

  describe('Item Management', () => {
    it('should create a CATEGORY item and auto-populate the URL if empty', async () => {
      prisma.navigationSection.findUnique.mockResolvedValueOnce({ id: 'sec-1' });
      prisma.category.findUnique.mockResolvedValueOnce({ id: 'cat-123', slug: 'biker' });
      prisma.navigationItem.create.mockResolvedValueOnce({
        id: 'item-1',
        type: 'CATEGORY',
        label: 'Biker Jackets',
        url: '/shop?category=biker',
        categoryId: 'cat-123',
      });

      const result = await NavigationService.createItem('sec-1', {
        type: 'CATEGORY',
        label: 'Biker Jackets',
        categoryId: 'cat-123',
      });

      expect(prisma.category.findUnique).toHaveBeenCalledWith({ where: { id: 'cat-123' } });
      expect(prisma.navigationItem.create).toHaveBeenCalled();
      expect(result.url).toBe('/shop?category=biker');
    });

    it('should reorder navigation items in a section', async () => {
      prisma.navigationItem.update.mockImplementation(({ data }) => Promise.resolve(data));

      const items = [
        { id: 'item-1', sortOrder: 1 },
        { id: 'item-2', sortOrder: 0 },
      ];
      const result = await NavigationService.reorderItems(items);
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('Promotional Features Management', () => {
    it('should create a promotional feature banner', async () => {
      prisma.navigationMenu.findFirst.mockResolvedValueOnce({ id: 'menu-1' });
      prisma.navigationFeature.create.mockResolvedValueOnce({
        id: 'feat-1',
        menuId: 'menu-1',
        title: 'Bespoke Outerwear',
        imageUrl: 'https://images.unsplash.com/photo-1551028719-00167b16eac5',
        ctaUrl: '/customize',
        badge: 'NEW SEASON',
      });

      const result = await NavigationService.createFeature('menu-1', {
        title: 'Bespoke Outerwear',
        imageUrl: 'https://images.unsplash.com/photo-1551028719-00167b16eac5',
        ctaUrl: '/customize',
        badge: 'NEW SEASON',
      });

      expect(result.title).toBe('Bespoke Outerwear');
      expect(result.badge).toBe('NEW SEASON');
    });
  });

  describe('Public Storefront Navigation Resolution', () => {
    it('should return normalized active & published navigation data for storefront', async () => {
      const mockPublishedMenus = [
        {
          id: 'menu-m',
          department: 'men',
          menuKey: 'men',
          isActive: true,
          isDraft: false,
          sections: [
            {
              id: 'sec-cat',
              name: 'Categories',
              slug: 'categories',
              isActive: true,
              isDraft: false,
              items: [
                {
                  id: 'item-1',
                  legacyId: 'm-leather',
                  label: 'Leather Jackets',
                  labelKey: 'nav.leather',
                  url: '/men/leather',
                  badge: 'BESTSELLER',
                  isActive: true,
                  isDraft: false,
                },
              ],
            },
          ],
          features: [
            {
              id: 'feat-1',
              title: 'Master Tailoring',
              description: 'Handmade in Milan',
              imageUrl: 'https://example.com/banner.jpg',
              ctaText: 'EXPLORE',
              ctaUrl: '/men/bespoke',
              badge: 'FEATURED',
              isActive: true,
              isDraft: false,
            },
          ],
        },
        {
          id: 'menu-w',
          department: 'women',
          menuKey: 'women',
          isActive: true,
          isDraft: false,
          sections: [],
          features: [],
          payload: {
            id: 'women',
            labelKey: 'nav.women',
            fallbackLabel: 'WOMEN',
            href: '/women',
            categories: [],
            shopBy: [],
            featured: {},
          },
        },
      ];

      prisma.navigationMenu.findMany.mockResolvedValueOnce(mockPublishedMenus);

      const nav = await NavigationService.getPublicNavigation();
      expect(nav).toBeDefined();
      expect(nav.men).toBeDefined();
      expect(nav.men.categories).toHaveLength(1);
      expect(nav.men.categories[0].id).toBe('m-leather');
      expect(nav.men.categories[0].badge).toBe('BESTSELLER');
      expect(nav.men.featured.title).toBe('Master Tailoring');
      expect(nav.women).toBeDefined();
    });
  });

  describe('Draft & Live Isolation and Department Independence', () => {
    it('should save a draft without modifying the live storefront navigation', async () => {
      const initialPayload = {
        id: 'men',
        labelKey: 'nav.men',
        fallbackLabel: 'MEN',
        href: '/men',
        categories: [{ id: 'm-leather', fallbackLabel: 'LEATHER' }],
      };
      const draftPayload = {
        id: 'men',
        labelKey: 'nav.men',
        fallbackLabel: 'MEN NEW DRAFT',
        href: '/men',
        categories: [{ id: 'm-draft', fallbackLabel: 'DRAFT CATEGORY' }],
      };

      // Mock DB returns initial payload for findMany/findFirst
      prisma.navigationMenu.upsert.mockResolvedValueOnce({
        id: 'menu-m',
        menuKey: 'men',
        department: 'men',
        payload: initialPayload,
        draftPayload: draftPayload,
        isDraft: true,
      });

      // Saving as draft
      const savedDraft = await NavigationService.saveAdminMegaMenu('men', draftPayload, { asDraft: true });
      expect(savedDraft).toEqual(draftPayload);
      expect(prisma.navigationMenu.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { menuKey: 'men' },
          update: expect.objectContaining({ isDraft: true }),
        })
      );
    });

    it('should maintain independent state between Men and Women navigation', async () => {
      const menPayload = { id: 'men', fallbackLabel: 'MEN' };
      const womenPayload = { id: 'women', fallbackLabel: 'WOMEN' };

      prisma.navigationMenu.upsert.mockResolvedValueOnce({
        id: 'menu-m',
        menuKey: 'men',
        department: 'men',
        payload: menPayload,
        isDraft: false,
        isActive: true,
      });

      // Updating Men only
      await NavigationService.saveAdminMegaMenu('men', menPayload, { asDraft: false });
      expect(prisma.navigationMenu.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { menuKey: 'men' },
        })
      );

      // Verify Women is not touched
      expect(prisma.navigationMenu.upsert).not.toHaveBeenCalledWith(
        expect.objectContaining({
          where: { menuKey: 'women' },
        })
      );
    });
  });
});
