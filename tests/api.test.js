import { describe, it, expect, vi, beforeAll } from 'vitest';

const { mockDb, prismaMock, supabaseMock } = vi.hoisted(() => {
  const db = {
    adminUser: [
      {
        id: 'a1111111-1111-1111-1111-111111111111',
        email: 'admin@ateliervalenti.com',
        // Verified hash for 'AtelierValenti2026!'
        passwordHash: '$2b$10$XbAjKdk66JAxxRapjOT3P.XhWaGeyM3M0GjOaQkkYWgQxxTQJJamq',
        firstName: 'Alessandro',
        lastName: 'Valenti',
        role: 'super_admin',
        permissions: ['*'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    refreshToken: [],
    category: [
      {
        id: 'c1111111-1111-1111-1111-111111111111',
        slug: 'bomber',
        name: 'Bomber Jackets',
        subtitle: 'European silhouettes',
        description: 'Clean proportions cut from Tuscan drum-dyed full-grain calfskin.',
        heroImage: 'https://images.unsplash.com/photo-1551028719-00167b16eac5',
        featuredOrder: 1,
        highlightSpecs: ['Calfskin', 'Brass'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'c2222222-2222-2222-2222-222222222222',
        slug: 'biker',
        name: 'Biker Jackets',
        subtitle: 'Asymmetric European silhouettes',
        description: 'Engineered with double-rider lapels.',
        heroImage: 'https://images.unsplash.com/photo-1520975954732-35dd22299614',
        featuredOrder: 2,
        highlightSpecs: ['Lambskin'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    collection: [
      {
        id: 'col-1',
        slug: 'inverno-26',
        title: 'Inverno 2026 Lookbook',
        season: 'Autumn / Winter 2026',
        subtitle: 'Sculpted Silhouettes',
        description: 'Debuted at Milan Men’s Fashion Week.',
        heroImage: 'https://images.unsplash.com/photo-1520975954732-35dd22299614',
        badge: 'Capsule Collection',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    product: [
      {
        id: 'p1111111-1111-1111-1111-111111111111',
        sku: 'TEST-MLB-001',
        slug: 'test-leather-bomber',
        name: 'Test Leather Bomber',
        tagline: 'Full-grain calfskin with Italian antiqued brass hardware',
        categorySlug: 'bomber',
        categoryLabel: 'Bomber Jackets',
        gender: 'men',
        styles: ['classic', 'minimal'],
        price: 385,
        salePrice: null,
        isFeatured: true,
        isBestseller: true,
        isNewArrival: true,
        isPublished: true,
        leatherType: 'Full-Grain Italian Calfskin',
        hardware: 'Custom Brushed Brass YKK Excella®',
        lining: '100% Breathable Japanese Cupro Twill',
        description: 'A masterclass in modern European proportion tailored in Milan.',
        editorialQuote: 'The benchmark of modern leather tailoring.',
        modelInfo: 'Model is 187cm',
        specifications: ['1.2mm premium calfskin'],
        careInstructions: ['Specialist clean only'],
        availableSizes: ['48 (EU M)', '50 (EU L)'],
        availableColors: [{ name: 'Obsidian Black', hex: '#11100F' }],
        rating: 4.95,
        reviewCount: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    productImage: [
      {
        id: 'img-1',
        productId: 'p1111111-1111-1111-1111-111111111111',
        url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5',
        alt: 'Test Bomber',
        isPrimary: true,
        isHover: false,
        type: 'front',
        sortOrder: 1,
        createdAt: new Date(),
      },
    ],
    productVariant: [
      {
        id: 'var-1',
        productId: 'p1111111-1111-1111-1111-111111111111',
        sku: 'TEST-MLB-001-48',
        size: '48 (EU M)',
        color: 'Obsidian Black',
        colorHex: '#11100F',
        stock: 10,
        createdAt: new Date(),
      },
    ],
    productReview: [
      {
        id: 'rev-1',
        productId: 'p1111111-1111-1111-1111-111111111111',
        author: 'Gianluca M.',
        location: 'Milan, Italy',
        rating: 5,
        title: 'Impeccable craftsmanship and fit',
        comment: 'Superb quality and fit.',
        verified: true,
        isApproved: true,
        createdAt: new Date(),
      },
    ],
    customSilhouette: [
      {
        id: 'biker',
        slug: 'biker',
        name: 'The Asymmetric Biker',
        basePrice: 620,
        description: 'Classic double-rider lapels',
        imageUrl: 'https://images.unsplash.com/photo-1520975954732-35dd22299614',
        sortOrder: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    customLeather: [
      {
        id: 'calfskin',
        slug: 'calfskin',
        name: 'Full-Grain Italian Calfskin',
        weight: '1.2mm',
        origin: 'Tuscany',
        description: 'Vegetable tanned',
        extraPrice: 0,
        sortOrder: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    customColor: [
      { id: 'col-1', slug: 'obsidian', name: 'Obsidian Black', hex: '#0E0D0C', sortOrder: 1, isActive: true, createdAt: new Date() },
    ],
    customLining: [
      { id: 'lin-1', slug: 'cupro', name: '100% Japanese Cupro Twill', description: 'Silky breathable', extraPrice: 0, sortOrder: 1, isActive: true, createdAt: new Date() },
    ],
    customHardware: [
      { id: 'hw-1', slug: 'brass', name: 'Antiqued Brushed Brass', finish: 'Brushed', extraPrice: 0, sortOrder: 1, isActive: true, createdAt: new Date() },
    ],
    cmsSection: [
      {
        id: 'cms-1',
        sectionKey: 'hero',
        eyebrow: 'ATELIER VALENTI • MILANO',
        title: 'Premium Leather Jackets | AZO-Free Certified Leather',
        subtitle: 'Handcrafted in our Milanese workshop.',
        primaryCta: { label: 'EXPLORE', href: '/shop' },
        secondaryCta: null,
        mediaUrl: 'https://images.unsplash.com/photo-1520975954732-35dd22299614',
        secondaryMediaUrl: null,
        extraPayload: {},
        body: [],
        sortOrder: 1,
        isVisible: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    siteSetting: [
      {
        id: 'set-1',
        singletonKey: 'global',
        announcement: {
          enabled: true,
          badge: 'Milano Atelier',
          message: 'Complimentary Express European Delivery on All Orders Over €250',
        },
        shipping: {
          freeShippingThreshold: 250,
          standardShippingCost: 15,
          countries: [{ code: 'IT', name: 'Italy' }],
        },
        footer: {
          certificationLine: '✔️ AZO-Free Leather · ✔️ EU REACH Compliant',
          atelierAddress: 'Via Montenapoleone, 27, 20121 Milano, Italy',
          cities: ['MILANO', 'PARIS'],
        },
        searchKeywords: ['Biker', 'Bomber'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    navigationMenu: [
      {
        id: 'nav-1',
        menuKey: 'men',
        payload: { id: 'men', label: 'MEN', categories: [] },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    testimonial: [
      {
        id: 'test-1',
        quote: 'Exceptional craftsmanship',
        author: 'Maximilian Von Berg',
        city: 'Zurich',
        country: 'Switzerland',
        verifiedGarment: 'Montreal Leather Bomber',
        rating: 5,
        sortOrder: 1,
        isActive: true,
        createdAt: new Date(),
      },
    ],
    socialLook: [
      {
        id: 'sl-1',
        imageUrl: 'https://images.unsplash.com/photo-1520975954732-35dd22299614',
        caption: 'Milan look',
        tag: '@ATELIERVALENTI',
        sortOrder: 1,
        isActive: true,
        createdAt: new Date(),
      },
    ],
    newsletterSubscriber: [],
    customCommission: [],
    mediaAsset: [],
  };

  function matchesFilter(item, where) {
    if (!where) return true;
    for (const key of Object.keys(where)) {
      const condition = where[key];
      if (key === 'OR' && Array.isArray(condition)) {
        const matchesAny = condition.some((cond) => matchesFilter(item, cond));
        if (!matchesAny) return false;
        continue;
      }
      if (key === 'AND' && Array.isArray(condition)) {
        const matchesAll = condition.every((cond) => matchesFilter(item, cond));
        if (!matchesAll) return false;
        continue;
      }
      if (condition && typeof condition === 'object' && !Array.isArray(condition)) {
        if ('contains' in condition) {
          const itemVal = String(item[key] || '').toLowerCase();
          const targetVal = String(condition.contains).toLowerCase();
          if (!itemVal.includes(targetVal)) return false;
          continue;
        }
        if ('has' in condition) {
          const arr = item[key] || [];
          if (!arr.includes(condition.has)) return false;
          continue;
        }
        if ('gte' in condition) {
          if (item[key] < condition.gte) return false;
        }
        if ('lte' in condition) {
          if (item[key] > condition.lte) return false;
        }
        if ('gt' in condition) {
          if (item[key] <= condition.gt) return false;
        }
        if ('lt' in condition) {
          if (item[key] >= condition.lt) return false;
        }
        if ('in' in condition && Array.isArray(condition.in)) {
          if (!condition.in.includes(item[key])) return false;
        }
        continue;
      }
      if (item[key] !== condition) {
        return false;
      }
    }
    return true;
  }

  function attachIncludes(modelName, item, include) {
    if (!item || !include) return item;
    const cloned = { ...item };
    if (modelName === 'product') {
      if (include.images) {
        cloned.images = (db.productImage || [])
          .filter((img) => img.productId === item.id)
          .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      }
      if (include.variants) {
        cloned.variants = (db.productVariant || [])
          .filter((v) => v.productId === item.id);
      }
      if (include.reviews) {
        cloned.reviews = (db.productReview || [])
          .filter((r) => r.productId === item.id);
      }
    }
    if (modelName === 'category') {
      if (include._count) {
        cloned._count = {
          products: (db.product || []).filter((p) => p.categorySlug === item.slug).length,
        };
      }
    }
    if (modelName === 'customCommission') {
      if (include.silhouette) {
        cloned.silhouette = db.customSilhouette.find((s) => s.id === item.silhouetteId);
      }
      if (include.leather) {
        cloned.leather = db.customLeather.find((l) => l.id === item.leatherId);
      }
      if (include.color) {
        cloned.color = db.customColor.find((c) => c.id === item.colorId);
      }
      if (include.lining) {
        cloned.lining = db.customLining.find((l) => l.id === item.liningId);
      }
      if (include.hardware) {
        cloned.hardware = db.customHardware.find((h) => h.id === item.hardwareId);
      }
    }
    return cloned;
  }

  function createModelOperations(modelName) {
    return {
      findUnique: async ({ where, include }) => {
        if (
          modelName === 'category' &&
          where?.id &&
          typeof where.id === 'string' &&
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(where.id)
        ) {
          const err = new Error(`Inconsistent column data: Conversion failed: invalid input syntax for type uuid: "${where.id}"`);
          err.code = 'P2023';
          throw err;
        }
        const item = (db[modelName] || []).find((r) => matchesFilter(r, where));
        return item ? attachIncludes(modelName, item, include) : null;
      },
      findFirst: async ({ where, include }) => {
        const item = (db[modelName] || []).find((r) => matchesFilter(r, where));
        return item ? attachIncludes(modelName, item, include) : null;
      },
      findMany: async ({ where, include, orderBy, skip, take } = {}) => {
        let items = (db[modelName] || []).filter((r) => matchesFilter(r, where));
        if (orderBy) {
          const key = Object.keys(orderBy)[0];
          const dir = orderBy[key];
          items.sort((a, b) => {
            if (a[key] < b[key]) return dir === 'desc' ? 1 : -1;
            if (a[key] > b[key]) return dir === 'desc' ? -1 : 1;
            return 0;
          });
        }
        if (typeof skip === 'number' && typeof take === 'number') {
          items = items.slice(skip, skip + take);
        } else if (typeof take === 'number') {
          items = items.slice(0, take);
        }
        return items.map((item) => attachIncludes(modelName, item, include));
      },
      count: async ({ where } = {}) => {
        return (db[modelName] || []).filter((r) => matchesFilter(r, where)).length;
      },
      create: async ({ data, include }) => {
        const id = data.id || `mock-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const { images, variants, reviews, ...fields } = data;
        const newItem = {
          ...fields,
          id,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        if (!db[modelName]) db[modelName] = [];
        db[modelName].push(newItem);

        if (modelName === 'product') {
          if (images?.create) {
            const imgArray = Array.isArray(images.create) ? images.create : [images.create];
            imgArray.forEach((img) => {
              db.productImage.push({
                ...img,
                id: `img-${Date.now()}-${Math.random()}`,
                productId: id,
                createdAt: new Date(),
              });
            });
          }
          if (variants?.create) {
            const varArray = Array.isArray(variants.create) ? variants.create : [variants.create];
            varArray.forEach((v) => {
              db.productVariant.push({
                ...v,
                id: `var-${Date.now()}-${Math.random()}`,
                productId: id,
                createdAt: new Date(),
              });
            });
          }
          if (reviews?.create) {
            const revArray = Array.isArray(reviews.create) ? reviews.create : [reviews.create];
            revArray.forEach((r) => {
              db.productReview.push({
                ...r,
                id: `rev-${Date.now()}-${Math.random()}`,
                productId: id,
                createdAt: new Date(),
              });
            });
          }
        }
        return attachIncludes(modelName, newItem, include);
      },
      createMany: async ({ data }) => {
        const arr = Array.isArray(data) ? data : [data];
        arr.forEach((item) => {
          const id = item.id || `mock-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          if (!db[modelName]) db[modelName] = [];
          db[modelName].push({ ...item, id, createdAt: new Date(), updatedAt: new Date() });
        });
        return { count: arr.length };
      },
      update: async ({ where, data, include }) => {
        const idx = (db[modelName] || []).findIndex((r) => matchesFilter(r, where));
        if (idx === -1) throw new Error(`${modelName} record to update not found`);
        db[modelName][idx] = { ...db[modelName][idx], ...data, updatedAt: new Date() };
        return attachIncludes(modelName, db[modelName][idx], include);
      },
      upsert: async ({ where, update, create, include }) => {
        const idx = (db[modelName] || []).findIndex((r) => matchesFilter(r, where));
        if (idx >= 0) {
          db[modelName][idx] = { ...db[modelName][idx], ...update, updatedAt: new Date() };
          return attachIncludes(modelName, db[modelName][idx], include);
        }
        const id = create.id || `mock-${Date.now()}`;
        const newItem = { ...create, id, createdAt: new Date(), updatedAt: new Date() };
        if (!db[modelName]) db[modelName] = [];
        db[modelName].push(newItem);
        return attachIncludes(modelName, newItem, include);
      },
      delete: async ({ where, include }) => {
        if (
          modelName === 'category' &&
          where?.id &&
          typeof where.id === 'string' &&
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(where.id)
        ) {
          const err = new Error(`Inconsistent column data: Conversion failed: invalid input syntax for type uuid: "${where.id}"`);
          err.code = 'P2023';
          throw err;
        }
        const idx = (db[modelName] || []).findIndex((r) => matchesFilter(r, where));
        if (idx === -1) {
          const err = new Error(`${modelName} record to delete not found`);
          err.code = 'P2025';
          throw err;
        }
        const [deleted] = db[modelName].splice(idx, 1);
        return attachIncludes(modelName, deleted, include);
      },
      deleteMany: async ({ where } = {}) => {
        const before = (db[modelName] || []).length;
        if (!where) {
          db[modelName] = [];
          return { count: before };
        }
        db[modelName] = (db[modelName] || []).filter((r) => !matchesFilter(r, where));
        return { count: before - db[modelName].length };
      },
    };
  }

  const modelNames = [
    'adminUser',
    'refreshToken',
    'category',
    'collection',
    'product',
    'productImage',
    'productVariant',
    'productReview',
    'customSilhouette',
    'customLeather',
    'customColor',
    'customLining',
    'customHardware',
    'customCommission',
    'cmsSection',
    'testimonial',
    'socialLook',
    'siteSetting',
    'navigationMenu',
    'newsletterSubscriber',
    'mediaAsset',
  ];

  const pMock = {
    $transaction: async (arg) => {
      if (typeof arg === 'function') {
        return arg(pMock);
      }
      return Promise.all(arg);
    },
    $queryRaw: async () => [{ '?column?': 1 }],
  };

  modelNames.forEach((m) => {
    pMock[m] = createModelOperations(m);
  });

  const sMock = {
    storage: {
      from() {
        return {
          upload: async () => ({ data: { path: 'mock/path.jpg' }, error: null }),
          getPublicUrl: () => ({ data: { publicUrl: 'https://example.com/mock.jpg' } }),
          remove: async () => ({ data: [], error: null }),
        };
      },
    },
  };

  return { mockDb: db, prismaMock: pMock, supabaseMock: sMock };
});

// Mock the prisma module
vi.mock('../src/lib/prisma.js', () => ({
  prisma: prismaMock,
  checkPrismaConnection: async () => ({
    connected: true,
    message: 'Connected to Supabase PostgreSQL (via Prisma)',
  }),
}));

// Mock the supabase module (for media.service storage)
vi.mock('../src/config/supabase.js', () => ({
  supabase: supabaseMock,
  getSupabase: () => supabaseMock,
  checkSupabaseConnection: async () => ({
    connected: true,
    message: 'Connected to Supabase PostgreSQL',
  }),
}));

// Now import app and request
import request from 'supertest';
import { app } from '../src/app.js';

let adminToken = '';
let testProductSlug = 'test-leather-bomber';
let testProductId = 'p1111111-1111-1111-1111-111111111111';

describe('1. Health Check Endpoint', () => {
  it('GET /api/health should return status healthy and database status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('healthy');
    expect(res.body.data.database).toBe('connected');
    expect(res.body.data.orm).toBe('Prisma');
  });
});

describe('2. Admin Authentication & RBAC', () => {
  it('POST /api/v1/admin/auth/login should authenticate valid admin and return JWT', async () => {
    const res = await request(app)
      .post('/api/v1/admin/auth/login')
      .send({
        email: 'admin@ateliervalenti.com',
        password: 'AtelierValenti2026!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.admin.email).toBe('admin@ateliervalenti.com');
    expect(res.body.data.admin.password).toBeUndefined();

    adminToken = res.body.data.accessToken;
  });

  it('POST /api/v1/admin/auth/login should reject invalid credentials with 401', async () => {
    const res = await request(app)
      .post('/api/v1/admin/auth/login')
      .send({
        email: 'admin@ateliervalenti.com',
        password: 'WrongPassword123!',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('ERR_INVALID_CREDENTIALS');
  });

  it('GET /api/v1/admin/auth/me should return current admin profile when authenticated', async () => {
    const res = await request(app)
      .get('/api/v1/admin/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('admin@ateliervalenti.com');
  });

  it('GET /api/v1/admin/products should reject unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/v1/admin/products');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe('3. Public Products & Catalogue APIs', () => {
  it('GET /api/v1/products should return paginated published products', async () => {
    const res = await request(app).get('/api/v1/products');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.totalCount).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/v1/products?category=bomber should filter products by category', async () => {
    const res = await request(app).get('/api/v1/products?category=bomber');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].category).toBe('bomber');
  });

  it('GET /api/v1/products/:slug should return single product with related products', async () => {
    const res = await request(app).get(`/api/v1/products/${testProductSlug}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.slug).toBe(testProductSlug);
    expect(res.body.data.reviews).toBeDefined();
  });

  it('GET /api/v1/products/facets should return attribute facet counts', async () => {
    const res = await request(app).get('/api/v1/products/facets');
    expect(res.status).toBe(200);
    expect(res.body.data.categories).toContain('bomber');
    expect(res.body.data.leatherTypes).toBeDefined();
  });

  it('GET /api/v1/products/search?q=Bomber should return matching garments', async () => {
    const res = await request(app).get('/api/v1/products/search?q=Bomber');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('POST /api/v1/products/:id/reviews should submit customer review for moderation', async () => {
    const res = await request(app)
      .post(`/api/v1/products/${testProductId}/reviews`)
      .send({
        author: 'Julien D.',
        location: 'Paris, France',
        rating: 5,
        title: 'Masterpiece in leather',
        comment: 'Superb quality and fit.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isApproved).toBe(false);
  });
});

describe('4. Admin Product CRUD Operations', () => {
  let createdProductId = '';

  it('POST /api/v1/admin/products should create new garment specification', async () => {
    const res = await request(app)
      .post('/api/v1/admin/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        sku: 'NEW-JACKET-01',
        name: 'New Milanese Double Rider',
        category: 'biker',
        price: 520,
        leatherType: 'Plonge Nappa Lambskin',
        description: 'New architectural biker jacket designed for modern layering.',
        styles: ['biker', 'luxury'],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sku).toBe('NEW-JACKET-01');
    createdProductId = res.body.data.id || res.body.data._id;
  });

  it('POST /api/v1/admin/products/:id/duplicate should clone product as draft', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/products/${createdProductId}/duplicate`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isPublished).toBe(false);
    expect(res.body.data.name).toContain('(Copy)');
  });

  it('DELETE /api/v1/admin/products/:id should delete product', async () => {
    const res = await request(app)
      .delete(`/api/v1/admin/products/${createdProductId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('5. Public Content & Homepage API', () => {
  it('GET /api/v1/content/homepage should return aggregated homepage blocks', async () => {
    const res = await request(app).get('/api/v1/content/homepage');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.announcement).toBeDefined();
    expect(res.body.data.hero).toBeDefined();
    expect(res.body.data.hero.title).toContain('AZO-Free Certified Leather');
  });

  it('GET /api/v1/settings/footer should return footer configuration and certification line', async () => {
    const res = await request(app).get('/api/v1/settings/footer');
    expect(res.status).toBe(200);
    expect(res.body.data.certificationLine).toContain('AZO-Free');
  });
});

describe('6. Bespoke Commission Experience', () => {
  it('GET /api/v1/customization/options should return silhouettes, leathers, and colors', async () => {
    const res = await request(app).get('/api/v1/customization/options');
    expect(res.status).toBe(200);
    expect(res.body.data.silhouettes.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.leathers.length).toBeGreaterThanOrEqual(1);
  });

  it('POST /api/v1/customization/commissions should register client commission dossier', async () => {
    const res = await request(app)
      .post('/api/v1/customization/commissions')
      .send({
        silhouetteId: 'biker',
        leatherId: 'calfskin',
        customer: {
          name: 'Alessandro Moretti',
          email: 'alessandro@example.it',
          phone: '+39 02 555 1234',
        },
        measurements: {
          unit: 'cm',
          chest: 102,
          waist: 88,
          shoulders: 48,
          sleeve: 66,
          backLength: 64,
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.dossierNumber).toMatch(/^AV-\d{4}-C\d{3}$/);
    expect(res.body.data.status).toBe('pending');
  });
});

describe('7. Validation & Error Handling', () => {
  it('POST /api/v1/admin/products should return 422 with structured errors when payload invalid', async () => {
    const res = await request(app)
      .post('/api/v1/admin/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        // Missing required fields
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('ERR_VALIDATION_FAILED');
    expect(res.body.errors).toBeDefined();
  });

  it('GET /api/v1/products/non-existent-product-slug should return 404', async () => {
    const res = await request(app).get('/api/v1/products/non-existent-product-slug');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('8. Category Deletion & Foreign Key Constraint Handling', () => {
  const unusedCategoryId = 'c4444444-4444-4444-4444-444444444444';
  const usedCategoryId = 'c1111111-1111-1111-1111-111111111111';

  beforeAll(() => {
    mockDb.category.push({
      id: unusedCategoryId,
      slug: 'unused-category-test',
      name: 'Unused Category',
      subtitle: '',
      description: '',
      heroImage: '',
      featuredOrder: 99,
      highlightSpecs: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it('Test 1 — Delete unused category should succeed with 200', async () => {
    const res = await request(app)
      .delete(`/api/v1/admin/categories/${unusedCategoryId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Category deleted successfully');

    // Verify it is actually deleted from database
    const checkRes = await request(app)
      .delete(`/api/v1/admin/categories/${unusedCategoryId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(checkRes.status).toBe(404);
  });

  it('Test 2 — Delete category used by products should return 409 Conflict with CATEGORY_IN_USE', async () => {
    const res = await request(app)
      .delete(`/api/v1/admin/categories/${usedCategoryId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('CATEGORY_IN_USE');
    expect(res.body.message).toBe('Cannot delete category because it is being used by 1 product.');
    expect(res.body.details).toEqual({
      categoryId: usedCategoryId,
      productCount: 1,
    });

    // Verify category was not deleted
    const cat = mockDb.category.find((c) => c.id === usedCategoryId);
    expect(cat).toBeDefined();

    // Verify product was not deleted or altered
    const prod = mockDb.product.find((p) => p.categorySlug === 'bomber');
    expect(prod).toBeDefined();
    expect(prod.categorySlug).toBe('bomber');
  });

  it('Test 3 — Delete nonexistent category should return 404 with CATEGORY_NOT_FOUND', async () => {
    const res = await request(app)
      .delete('/api/v1/admin/categories/99999999-9999-9999-9999-999999999999')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('CATEGORY_NOT_FOUND');
    expect(res.body.message).toBe('Category not found');
  });

  it('Test 4 — Delete with invalid UUID format should return 400 ERR_INVALID_ID', async () => {
    const res = await request(app)
      .delete('/api/v1/admin/categories/not-a-valid-uuid')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('ERR_INVALID_ID');
    expect(res.body.message).toBe('Invalid ID format provided');
  });

  it('Test 5 — Race condition protection: Prisma P2003 during delete() returns 409 CATEGORY_IN_USE', async () => {
    // Add a temporary category with 0 products
    const raceCatId = 'c3333333-3333-3333-3333-333333333333';
    mockDb.category.push({
      id: raceCatId,
      slug: 'race-condition-category',
      name: 'Race Condition Category',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Mock prisma.category.delete to simulate a concurrent product creation causing P2003
    const originalDelete = prismaMock.category.delete;
    prismaMock.category.delete = vi.fn().mockImplementation(async () => {
      const p2003 = new Error(
        'Foreign key constraint violated on the constraint: `products_category_slug_fkey`'
      );
      p2003.code = 'P2003';
      throw p2003;
    });

    try {
      const res = await request(app)
        .delete(`/api/v1/admin/categories/${raceCatId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe('CATEGORY_IN_USE');
      expect(res.body.message).toBe(
        'Cannot delete category because it is being used by products.'
      );
    } finally {
      prismaMock.category.delete = originalDelete;
      const idx = mockDb.category.findIndex((c) => c.id === raceCatId);
      if (idx !== -1) mockDb.category.splice(idx, 1);
    }
  });
});

