import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { ROLES } from '../src/config/constants.js';

// Mock authentication to bypass login
vi.mock('../src/middlewares/auth.js', () => {
  return {
    authenticate: (req, res, next) => {
      req.user = { id: 'admin-1', role: 'super_admin', email: 'admin@ateliervalenti.com' };
      next();
    },
    authorize: (...roles) => (req, res, next) => {
      next();
    },
  };
});

// Mock NavigationService
vi.mock('../src/services/navigation.service.js', () => {
  return {
    NavigationService: {
      getAdminMegaMenu: vi.fn().mockResolvedValue({
        men: { id: 'men', categories: [] },
        women: { id: 'women', categories: [] },
      }),
      saveAdminMegaMenu: vi.fn().mockResolvedValue({
        id: 'men',
        categories: [{ id: 'm-1', fallbackLabel: 'Biker' }],
      }),
      listMenus: vi.fn().mockResolvedValue([
        { id: 'menu-1', name: 'Men Navigation', department: 'men', isActive: true, isDraft: false },
      ]),
      getMenuById: vi.fn().mockResolvedValue({
        id: 'menu-1',
        name: 'Men Navigation',
        department: 'men',
        sections: [],
        features: [],
      }),
      createMenu: vi.fn().mockResolvedValue({
        id: 'menu-2',
        name: 'Women Navigation',
        department: 'women',
        isActive: true,
        isDraft: false,
      }),
      updateMenu: vi.fn().mockResolvedValue({
        id: 'menu-1',
        name: 'Men Navigation Updated',
      }),
      deleteMenu: vi.fn().mockResolvedValue({ id: 'menu-1', deleted: true }),
      publishMenu: vi.fn().mockResolvedValue({ id: 'menu-1', isDraft: false, isActive: true }),
      listSections: vi.fn().mockResolvedValue([{ id: 'sec-1', name: 'Categories' }]),
      createSection: vi.fn().mockResolvedValue({ id: 'sec-1', name: 'Categories' }),
      updateSection: vi.fn().mockResolvedValue({ id: 'sec-1', name: 'Categories Updated' }),
      deleteSection: vi.fn().mockResolvedValue({ id: 'sec-1', deleted: true }),
      reorderSections: vi.fn().mockResolvedValue({ success: true, count: 2 }),
      listItems: vi.fn().mockResolvedValue([{ id: 'item-1', label: 'Biker Jackets' }]),
      createItem: vi.fn().mockResolvedValue({ id: 'item-1', label: 'Biker Jackets', type: 'CUSTOM_LINK' }),
      updateItem: vi.fn().mockResolvedValue({ id: 'item-1', label: 'Biker Jackets New' }),
      deleteItem: vi.fn().mockResolvedValue({ id: 'item-1', deleted: true }),
      reorderItems: vi.fn().mockResolvedValue({ success: true, count: 2 }),
      listFeatures: vi.fn().mockResolvedValue([{ id: 'feat-1', title: 'Winter' }]),
      createFeature: vi.fn().mockResolvedValue({ id: 'feat-1', title: 'Winter' }),
      updateFeature: vi.fn().mockResolvedValue({ id: 'feat-1', title: 'Winter New' }),
      deleteFeature: vi.fn().mockResolvedValue({ id: 'feat-1', deleted: true }),
      reorderFeatures: vi.fn().mockResolvedValue({ success: true, count: 1 }),
    },
  };
});

describe('Navigation Admin API Integration Tests', () => {
  describe('Mega Menu Compatibility Endpoints', () => {
    it('GET /api/v1/admin/navigation/mega-menu should return 200 with all menus', async () => {
      const res = await request(app)
        .get('/api/v1/admin/navigation/mega-menu')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.men).toBeDefined();
      expect(res.body.data.women).toBeDefined();
    });

    it('PUT /api/v1/admin/navigation/mega-menu/:menuKey should update menu payload', async () => {
      const res = await request(app)
        .put('/api/v1/admin/navigation/mega-menu/men')
        .send({ payload: { id: 'men', categories: [{ id: 'm-1', fallbackLabel: 'Biker' }] } })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('men');
    });
  });

  describe('Granular Navigation Menus CRUD', () => {
    it('GET /api/v1/admin/navigation/menus should list menus', async () => {
      const res = await request(app)
        .get('/api/v1/admin/navigation/menus?department=men')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data[0].department).toBe('men');
    });

    it('POST /api/v1/admin/navigation/menus should create menu with validation', async () => {
      const res = await request(app)
        .post('/api/v1/admin/navigation/menus')
        .send({ name: 'Women Navigation', department: 'women' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Women Navigation');
    });

    it('POST /api/v1/admin/navigation/menus/:id/publish should publish menu', async () => {
      const res = await request(app)
        .post('/api/v1/admin/navigation/menus/menu-1/publish')
        .send({ isDraft: false, isActive: true })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.isDraft).toBe(false);
    });
  });

  describe('Sections CRUD & Reorder', () => {
    it('POST /api/v1/admin/navigation/menus/:menuId/sections should create section', async () => {
      const res = await request(app)
        .post('/api/v1/admin/navigation/menus/menu-1/sections')
        .send({ name: 'Categories' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Categories');
    });

    it('PUT /api/v1/admin/navigation/sections/reorder should reorder sections', async () => {
      const res = await request(app)
        .put('/api/v1/admin/navigation/sections/reorder')
        .send({ items: [{ id: 'sec-1', sortOrder: 0 }, { id: 'sec-2', sortOrder: 1 }] })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.count).toBe(2);
    });
  });

  describe('Items CRUD & Reorder', () => {
    it('POST /api/v1/admin/navigation/sections/:sectionId/items should create item', async () => {
      const res = await request(app)
        .post('/api/v1/admin/navigation/sections/sec-1/items')
        .send({ label: 'Biker Jackets', type: 'CUSTOM_LINK', url: '/men/biker' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.label).toBe('Biker Jackets');
    });

    it('PUT /api/v1/admin/navigation/items/reorder should reorder items', async () => {
      const res = await request(app)
        .put('/api/v1/admin/navigation/items/reorder')
        .send({ items: [{ id: 'item-1', sortOrder: 0 }, { id: 'item-2', sortOrder: 1 }] })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.count).toBe(2);
    });
  });

  describe('Promotional Features CRUD', () => {
    it('POST /api/v1/admin/navigation/menus/:menuId/features should create promotional feature', async () => {
      const res = await request(app)
        .post('/api/v1/admin/navigation/menus/menu-1/features')
        .send({
          title: 'Winter Tailoring',
          imageUrl: 'https://images.unsplash.com/photo-1',
          ctaUrl: '/shop',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Winter');
    });
  });
});
