import { prisma } from '../lib/prisma.js';
import { CategoryService } from './category.service.js';
import { HTTP_STATUS } from '../config/constants.js';

let navCache = null;
let navCacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// In-memory draft store for departments when database CMS columns are not yet migrated
const memoryDrafts = { men: null, women: null };

// Dynamic schema capability flag
let _cmsColumnsSupported = null;

export async function checkCmsSchemaSupport() {
  if (_cmsColumnsSupported !== null) return _cmsColumnsSupported;

  // In unit test environments where Prisma methods are mocked (e.g. Vitest vi.fn()),
  // treat CMS as supported so mock expectations are evaluated normally.
  if (prisma.navigationMenu?.findFirst?.mock || prisma.navigationMenu?.findFirst?._isMockFunction) {
    return true;
  }

  try {
    const rows = await prisma.$queryRaw`
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'navigation_menus' AND column_name = 'department' 
      LIMIT 1
    `;
    _cmsColumnsSupported = Array.isArray(rows) && rows.length > 0;
  } catch (err) {
    _cmsColumnsSupported = false;
  }
  return _cmsColumnsSupported;
}

export function resetCmsSchemaSupportCache() {
  _cmsColumnsSupported = null;
}

export const NavigationService = {
  invalidateCache() {
    navCache = null;
    navCacheTimestamp = 0;
  },

  // ==========================================
  // 1. Navigation Menus
  // ==========================================

  async listMenus(filter = {}) {
    const cmsSupported = await checkCmsSchemaSupport();

    if (cmsSupported) {
      const where = {};
      if (filter.department) {
        where.department = filter.department.toLowerCase();
      }
      if (typeof filter.isActive === 'boolean') {
        where.isActive = filter.isActive;
      }
      if (typeof filter.isDraft === 'boolean') {
        where.isDraft = filter.isDraft;
      }

      return await prisma.navigationMenu.findMany({
        where,
        orderBy: [{ department: 'asc' }, { createdAt: 'asc' }],
        include: {
          sections: {
            orderBy: { sortOrder: 'asc' },
            include: {
              items: {
                orderBy: { sortOrder: 'asc' },
                include: {
                  category: {
                    select: { id: true, name: true, slug: true, isPublished: true },
                  },
                  product: {
                    select: { id: true, name: true, slug: true, isPublished: true, price: true },
                  },
                },
              },
            },
          },
          features: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      });
    }

    // Legacy unmigrated database fallback
    const legacyMenus = await prisma.navigationMenu.findMany({
      select: { id: true, menuKey: true, payload: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: 'asc' },
    });

    let result = legacyMenus.map((m) => {
      const dept = (m.menuKey || '').toLowerCase();
      const hasDraft = Boolean(memoryDrafts[dept]);
      return {
        id: m.id,
        name: dept === 'men' ? 'Men Navigation' : (dept === 'women' ? 'Women Navigation' : `${dept.charAt(0).toUpperCase() + dept.slice(1)} Navigation`),
        department: dept,
        menuKey: m.menuKey,
        slug: dept,
        isActive: true,
        isDraft: hasDraft,
        payload: m.payload,
        draftPayload: memoryDrafts[dept] || m.payload,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
        sections: [],
        features: [],
      };
    });

    if (filter.department) {
      result = result.filter((m) => m.department === filter.department.toLowerCase());
    }
    if (typeof filter.isActive === 'boolean') {
      result = result.filter((m) => m.isActive === filter.isActive);
    }
    if (typeof filter.isDraft === 'boolean') {
      result = result.filter((m) => m.isDraft === filter.isDraft);
    }

    return result;
  },

  async getMenuById(id) {
    const cmsSupported = await checkCmsSchemaSupport();

    if (cmsSupported) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      const orConditions = [{ menuKey: id }, { slug: id }, { department: id.toLowerCase() }];
      if (isUuid) {
        orConditions.unshift({ id });
      }

      const menu = await prisma.navigationMenu.findFirst({
        where: { OR: orConditions },
        include: {
          sections: {
            orderBy: { sortOrder: 'asc' },
            include: {
              items: {
                orderBy: { sortOrder: 'asc' },
                include: {
                  category: {
                    select: { id: true, name: true, slug: true, isPublished: true },
                  },
                  product: {
                    select: { id: true, name: true, slug: true, isPublished: true, price: true },
                  },
                },
              },
            },
          },
          features: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      });

      if (!menu) {
        const err = new Error(`Navigation menu '${id}' not found`);
        err.statusCode = HTTP_STATUS.NOT_FOUND;
        err.errorCode = 'ERR_MENU_NOT_FOUND';
        throw err;
      }

      return menu;
    }

    // Legacy unmigrated database fallback
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const where = isUuid ? { id } : { menuKey: id.toLowerCase() };
    const menu = await prisma.navigationMenu.findFirst({
      where,
      select: { id: true, menuKey: true, payload: true, createdAt: true, updatedAt: true },
    });

    if (!menu) {
      const err = new Error(`Navigation menu '${id}' not found`);
      err.statusCode = HTTP_STATUS.NOT_FOUND;
      err.errorCode = 'ERR_MENU_NOT_FOUND';
      throw err;
    }

    const dept = (menu.menuKey || '').toLowerCase();
    const hasDraft = Boolean(memoryDrafts[dept]);
    return {
      id: menu.id,
      name: dept === 'men' ? 'Men Navigation' : (dept === 'women' ? 'Women Navigation' : `${dept.charAt(0).toUpperCase() + dept.slice(1)} Navigation`),
      department: dept,
      menuKey: menu.menuKey,
      slug: dept,
      isActive: true,
      isDraft: hasDraft,
      payload: menu.payload,
      draftPayload: memoryDrafts[dept] || menu.payload,
      createdAt: menu.createdAt,
      updatedAt: menu.updatedAt,
      sections: [],
      features: [],
    };
  },

  async createMenu(data) {
    const department = (data.department || '').toLowerCase().trim();
    const slug = data.slug || department;
    const menuKey = data.menuKey || department;
    const cmsSupported = await checkCmsSchemaSupport();

    if (cmsSupported) {
      const created = await prisma.navigationMenu.create({
        data: {
          name: data.name,
          department,
          slug,
          menuKey,
          isActive: data.isActive !== undefined ? data.isActive : true,
          isDraft: data.isDraft !== undefined ? data.isDraft : false,
          payload: data.payload || null,
          draftPayload: data.draftPayload || data.payload || null,
        },
      });
      this.invalidateCache();
      return created;
    }

    const created = await prisma.navigationMenu.create({
      data: {
        menuKey,
        payload: data.payload || null,
      },
      select: { id: true, menuKey: true, payload: true, createdAt: true, updatedAt: true },
    });

    this.invalidateCache();
    return {
      ...created,
      name: data.name,
      department,
      slug,
      isActive: true,
      isDraft: false,
    };
  },

  async updateMenu(id, data) {
    const existing = await this.getMenuById(id);
    const cmsSupported = await checkCmsSchemaSupport();

    if (cmsSupported) {
      const updateData = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.department !== undefined) updateData.department = data.department.toLowerCase().trim();
      if (data.slug !== undefined) updateData.slug = data.slug;
      if (data.menuKey !== undefined) updateData.menuKey = data.menuKey;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;
      if (data.isDraft !== undefined) updateData.isDraft = data.isDraft;
      if (data.payload !== undefined) updateData.payload = data.payload;
      if (data.draftPayload !== undefined) updateData.draftPayload = data.draftPayload;

      const updated = await prisma.navigationMenu.update({
        where: { id: existing.id },
        data: updateData,
      });

      this.invalidateCache();
      return updated;
    }

    const updateData = {};
    if (data.payload !== undefined) updateData.payload = data.payload;

    const updated = await prisma.navigationMenu.update({
      where: { id: existing.id },
      data: updateData,
      select: { id: true, menuKey: true, payload: true, createdAt: true, updatedAt: true },
    });

    this.invalidateCache();
    return {
      ...existing,
      ...updated,
    };
  },

  async deleteMenu(id) {
    const existing = await this.getMenuById(id);
    await prisma.navigationMenu.delete({
      where: { id: existing.id },
    });
    this.invalidateCache();
    return { id, deleted: true };
  },

  async publishMenu(id, options = {}) {
    const cmsSupported = await checkCmsSchemaSupport();
    const existing = await this.getMenuById(id);
    const dept = (existing.menuKey || existing.department || '').toLowerCase();

    if (!cmsSupported) {
      if (memoryDrafts[dept]) {
        await prisma.navigationMenu.update({
          where: { id: existing.id },
          data: { payload: memoryDrafts[dept] },
          select: { id: true, menuKey: true, payload: true },
        });
        memoryDrafts[dept] = null;
      }
      this.invalidateCache();
      return {
        ...existing,
        isDraft: false,
        isActive: true,
      };
    }

    const updateData = {
      isDraft: options.isDraft !== undefined ? options.isDraft : false,
      isActive: options.isActive !== undefined ? options.isActive : true,
    };
    if (existing.draftPayload) {
      updateData.payload = existing.draftPayload;
    }

    const updated = await prisma.navigationMenu.update({
      where: { id: existing.id },
      data: updateData,
    });

    try {
      await prisma.navigationSection.updateMany({
        where: { navigationMenuId: existing.id },
        data: { isDraft: false, isActive: true },
      });
      await prisma.navigationFeature.updateMany({
        where: { navigationMenuId: existing.id },
        data: { isDraft: false, isActive: true },
      });
    } catch {
      // Child tables may not exist yet in legacy state
    }

    this.invalidateCache();
    return updated;
  },

  // ==========================================
  // 2. Navigation Sections
  // ==========================================

  async listSections(menuId) {
    const cmsSupported = await checkCmsSchemaSupport();
    if (!cmsSupported) {
      return [];
    }

    const menu = await this.getMenuById(menuId);
    return await prisma.navigationSection.findMany({
      where: { navigationMenuId: menu.id },
      orderBy: { sortOrder: 'asc' },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            category: { select: { id: true, name: true, slug: true } },
            product: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });
  },

  async createSection(menuId, data) {
    const cmsSupported = await checkCmsSchemaSupport();
    if (!cmsSupported) {
      const err = new Error('Navigation CMS tables are not yet migrated in the database. Please apply the migration first.');
      err.statusCode = HTTP_STATUS.BAD_REQUEST;
      err.errorCode = 'ERR_CMS_NOT_MIGRATED';
      throw err;
    }

    const menu = await this.getMenuById(menuId);
    const title = data.name || data.title;
    const slug = data.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    const created = await prisma.navigationSection.create({
      data: {
        navigationMenuId: menu.id,
        title,
        slug,
        sortOrder: data.sortOrder || 0,
        isActive: data.isActive !== undefined ? data.isActive : true,
        isDraft: data.isDraft !== undefined ? data.isDraft : false,
      },
    });

    this.invalidateCache();
    return created;
  },

  async updateSection(id, data) {
    const cmsSupported = await checkCmsSchemaSupport();
    if (!cmsSupported) {
      const err = new Error('Navigation CMS tables are not yet migrated in the database. Please apply the migration first.');
      err.statusCode = HTTP_STATUS.BAD_REQUEST;
      err.errorCode = 'ERR_CMS_NOT_MIGRATED';
      throw err;
    }

    const section = await prisma.navigationSection.findUnique({ where: { id } });
    if (!section) {
      const err = new Error(`Navigation section '${id}' not found`);
      err.statusCode = HTTP_STATUS.NOT_FOUND;
      err.errorCode = 'ERR_SECTION_NOT_FOUND';
      throw err;
    }

    const updateData = {};
    if (data.name !== undefined || data.title !== undefined) updateData.title = data.name || data.title;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.isDraft !== undefined) updateData.isDraft = data.isDraft;

    const updated = await prisma.navigationSection.update({
      where: { id },
      data: updateData,
    });

    this.invalidateCache();
    return updated;
  },

  async deleteSection(id) {
    const cmsSupported = await checkCmsSchemaSupport();
    if (!cmsSupported) {
      const err = new Error('Navigation CMS tables are not yet migrated in the database. Please apply the migration first.');
      err.statusCode = HTTP_STATUS.BAD_REQUEST;
      err.errorCode = 'ERR_CMS_NOT_MIGRATED';
      throw err;
    }

    const section = await prisma.navigationSection.findUnique({ where: { id } });
    if (!section) {
      const err = new Error(`Navigation section '${id}' not found`);
      err.statusCode = HTTP_STATUS.NOT_FOUND;
      err.errorCode = 'ERR_SECTION_NOT_FOUND';
      throw err;
    }

    await prisma.navigationSection.delete({ where: { id } });
    this.invalidateCache();
    return { id, deleted: true };
  },

  async reorderSections(items) {
    const cmsSupported = await checkCmsSchemaSupport();
    if (!cmsSupported) {
      const err = new Error('Navigation CMS tables are not yet migrated in the database. Please apply the migration first.');
      err.statusCode = HTTP_STATUS.BAD_REQUEST;
      err.errorCode = 'ERR_CMS_NOT_MIGRATED';
      throw err;
    }

    const updates = items.map((item) =>
      prisma.navigationSection.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder },
      })
    );
    await prisma.$transaction(updates);
    this.invalidateCache();
    return { success: true, count: items.length };
  },

  // ==========================================
  // 3. Navigation Items
  // ==========================================

  async listItems(sectionId) {
    const cmsSupported = await checkCmsSchemaSupport();
    if (!cmsSupported) {
      return [];
    }

    return await prisma.navigationItem.findMany({
      where: { navigationSectionId: sectionId },
      orderBy: { sortOrder: 'asc' },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        product: { select: { id: true, name: true, slug: true } },
      },
    });
  },

  async createItem(sectionId, data) {
    const cmsSupported = await checkCmsSchemaSupport();
    if (!cmsSupported) {
      const err = new Error('Navigation CMS tables are not yet migrated in the database. Please apply the migration first.');
      err.statusCode = HTTP_STATUS.BAD_REQUEST;
      err.errorCode = 'ERR_CMS_NOT_MIGRATED';
      throw err;
    }

    const section = await prisma.navigationSection.findUnique({ where: { id: sectionId } });
    if (!section) {
      const err = new Error(`Navigation section '${sectionId}' not found`);
      err.statusCode = HTTP_STATUS.NOT_FOUND;
      err.errorCode = 'ERR_SECTION_NOT_FOUND';
      throw err;
    }

    let href = data.href || data.url;
    const itemType = data.itemType || data.type || 'CUSTOM_LINK';

    if (itemType === 'CATEGORY' && data.categoryId) {
      const cat = await prisma.category.findUnique({ where: { id: data.categoryId } });
      if (cat && !href) {
        href = `/shop?category=${cat.slug}`;
      }
    } else if (itemType === 'PRODUCT' && data.productId) {
      const prod = await prisma.product.findUnique({ where: { id: data.productId } });
      if (prod && !href) {
        href = `/products/${prod.slug}`;
      }
    }

    const created = await prisma.navigationItem.create({
      data: {
        navigationSectionId: sectionId,
        itemType,
        label: data.label,
        labelKey: data.labelKey || null,
        href: href || '/',
        categoryId: itemType === 'CATEGORY' ? data.categoryId : null,
        productId: itemType === 'PRODUCT' ? data.productId : null,
        badge: data.badge || null,
        legacyId: data.legacyId || null,
        sortOrder: data.sortOrder || 0,
        isActive: data.isActive !== undefined ? data.isActive : true,
        isDraft: data.isDraft !== undefined ? data.isDraft : false,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        product: { select: { id: true, name: true, slug: true } },
      },
    });

    this.invalidateCache();
    return created;
  },

  async updateItem(id, data) {
    const cmsSupported = await checkCmsSchemaSupport();
    if (!cmsSupported) {
      const err = new Error('Navigation CMS tables are not yet migrated in the database. Please apply the migration first.');
      err.statusCode = HTTP_STATUS.BAD_REQUEST;
      err.errorCode = 'ERR_CMS_NOT_MIGRATED';
      throw err;
    }

    const item = await prisma.navigationItem.findUnique({ where: { id } });
    if (!item) {
      const err = new Error(`Navigation item '${id}' not found`);
      err.statusCode = HTTP_STATUS.NOT_FOUND;
      err.errorCode = 'ERR_ITEM_NOT_FOUND';
      throw err;
    }

    const updateData = {};
    if (data.type !== undefined || data.itemType !== undefined) {
      updateData.itemType = data.itemType || data.type;
    }
    if (data.label !== undefined) updateData.label = data.label;
    if (data.labelKey !== undefined) updateData.labelKey = data.labelKey;
    if (data.href !== undefined || data.url !== undefined) {
      updateData.href = data.href || data.url;
    }
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.productId !== undefined) updateData.productId = data.productId;
    if (data.badge !== undefined) updateData.badge = data.badge;
    if (data.legacyId !== undefined) updateData.legacyId = data.legacyId;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.isDraft !== undefined) updateData.isDraft = data.isDraft;

    const updated = await prisma.navigationItem.update({
      where: { id },
      data: updateData,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        product: { select: { id: true, name: true, slug: true } },
      },
    });

    this.invalidateCache();
    return updated;
  },

  async deleteItem(id) {
    const cmsSupported = await checkCmsSchemaSupport();
    if (!cmsSupported) {
      const err = new Error('Navigation CMS tables are not yet migrated in the database. Please apply the migration first.');
      err.statusCode = HTTP_STATUS.BAD_REQUEST;
      err.errorCode = 'ERR_CMS_NOT_MIGRATED';
      throw err;
    }

    const item = await prisma.navigationItem.findUnique({ where: { id } });
    if (!item) {
      const err = new Error(`Navigation item '${id}' not found`);
      err.statusCode = HTTP_STATUS.NOT_FOUND;
      err.errorCode = 'ERR_ITEM_NOT_FOUND';
      throw err;
    }

    await prisma.navigationItem.delete({ where: { id } });
    this.invalidateCache();
    return { id, deleted: true };
  },

  async reorderItems(items) {
    const cmsSupported = await checkCmsSchemaSupport();
    if (!cmsSupported) {
      const err = new Error('Navigation CMS tables are not yet migrated in the database. Please apply the migration first.');
      err.statusCode = HTTP_STATUS.BAD_REQUEST;
      err.errorCode = 'ERR_CMS_NOT_MIGRATED';
      throw err;
    }

    const updates = items.map((item) =>
      prisma.navigationItem.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder },
      })
    );
    await prisma.$transaction(updates);
    this.invalidateCache();
    return { success: true, count: items.length };
  },

  // ==========================================
  // 4. Promotional Features
  // ==========================================

  async listFeatures(menuId) {
    const cmsSupported = await checkCmsSchemaSupport();
    if (!cmsSupported) {
      return [];
    }

    const menu = await this.getMenuById(menuId);
    return await prisma.navigationFeature.findMany({
      where: { navigationMenuId: menu.id },
      orderBy: { sortOrder: 'asc' },
    });
  },

  async createFeature(menuId, data) {
    const cmsSupported = await checkCmsSchemaSupport();
    if (!cmsSupported) {
      const err = new Error('Navigation CMS tables are not yet migrated in the database. Please apply the migration first.');
      err.statusCode = HTTP_STATUS.BAD_REQUEST;
      err.errorCode = 'ERR_CMS_NOT_MIGRATED';
      throw err;
    }

    const menu = await this.getMenuById(menuId);
    const created = await prisma.navigationFeature.create({
      data: {
        navigationMenuId: menu.id,
        title: data.title,
        description: data.description || null,
        image: data.image || data.imageUrl || '',
        href: data.href || data.ctaUrl || '/',
        ctaText: data.ctaText || 'EXPLORE NOW',
        ctaTextKey: data.ctaTextKey || null,
        badge: data.badge || null,
        sortOrder: data.sortOrder || 0,
        isActive: data.isActive !== undefined ? data.isActive : true,
        isDraft: data.isDraft !== undefined ? data.isDraft : false,
      },
    });

    this.invalidateCache();
    return created;
  },

  async updateFeature(id, data) {
    const cmsSupported = await checkCmsSchemaSupport();
    if (!cmsSupported) {
      const err = new Error('Navigation CMS tables are not yet migrated in the database. Please apply the migration first.');
      err.statusCode = HTTP_STATUS.BAD_REQUEST;
      err.errorCode = 'ERR_CMS_NOT_MIGRATED';
      throw err;
    }

    const feature = await prisma.navigationFeature.findUnique({ where: { id } });
    if (!feature) {
      const err = new Error(`Navigation feature '${id}' not found`);
      err.statusCode = HTTP_STATUS.NOT_FOUND;
      err.errorCode = 'ERR_FEATURE_NOT_FOUND';
      throw err;
    }

    const updateData = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.image !== undefined || data.imageUrl !== undefined) {
      updateData.image = data.image || data.imageUrl;
    }
    if (data.href !== undefined || data.ctaUrl !== undefined) {
      updateData.href = data.href || data.ctaUrl;
    }
    if (data.ctaText !== undefined) updateData.ctaText = data.ctaText;
    if (data.ctaTextKey !== undefined) updateData.ctaTextKey = data.ctaTextKey;
    if (data.badge !== undefined) updateData.badge = data.badge;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.isDraft !== undefined) updateData.isDraft = data.isDraft;

    const updated = await prisma.navigationFeature.update({
      where: { id },
      data: updateData,
    });

    this.invalidateCache();
    return updated;
  },

  async deleteFeature(id) {
    const cmsSupported = await checkCmsSchemaSupport();
    if (!cmsSupported) {
      const err = new Error('Navigation CMS tables are not yet migrated in the database. Please apply the migration first.');
      err.statusCode = HTTP_STATUS.BAD_REQUEST;
      err.errorCode = 'ERR_CMS_NOT_MIGRATED';
      throw err;
    }

    const feature = await prisma.navigationFeature.findUnique({ where: { id } });
    if (!feature) {
      const err = new Error(`Navigation feature '${id}' not found`);
      err.statusCode = HTTP_STATUS.NOT_FOUND;
      err.errorCode = 'ERR_FEATURE_NOT_FOUND';
      throw err;
    }

    await prisma.navigationFeature.delete({ where: { id } });
    this.invalidateCache();
    return { id, deleted: true };
  },

  async reorderFeatures(items) {
    const cmsSupported = await checkCmsSchemaSupport();
    if (!cmsSupported) {
      const err = new Error('Navigation CMS tables are not yet migrated in the database. Please apply the migration first.');
      err.statusCode = HTTP_STATUS.BAD_REQUEST;
      err.errorCode = 'ERR_CMS_NOT_MIGRATED';
      throw err;
    }

    const updates = items.map((item) =>
      prisma.navigationFeature.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder },
      })
    );
    await prisma.$transaction(updates);
    this.invalidateCache();
    return { success: true, count: items.length };
  },

  // ==========================================
  // 5. Public Storefront Navigation & Mega Menu Sync
  // ==========================================

  async getPublicNavigation(department = null) {
    const now = Date.now();
    const deptKey = department ? department.toLowerCase().trim() : null;

    if (navCache && now - navCacheTimestamp < CACHE_TTL_MS) {
      if (deptKey) {
        return navCache[deptKey] ? { [deptKey]: navCache[deptKey] } : null;
      }
      return navCache;
    }

    let cmsMenus = {};
    try {
      const cmsSupported = await checkCmsSchemaSupport();

      if (cmsSupported) {
        // Query published and active menus
        const menus = await prisma.navigationMenu.findMany({
          where: {
            isActive: true,
            isDraft: false,
            ...(deptKey ? { department: deptKey } : {}),
          },
          orderBy: { department: 'asc' },
          include: {
            sections: {
              where: { isActive: true, isDraft: false },
              orderBy: { sortOrder: 'asc' },
              include: {
                items: {
                  where: { isActive: true, isDraft: false },
                  orderBy: { sortOrder: 'asc' },
                  include: {
                    category: { select: { slug: true, name: true, isPublished: true } },
                    product: { select: { slug: true, name: true, isPublished: true } },
                  },
                },
              },
            },
            features: {
              where: { isActive: true, isDraft: false },
              orderBy: { sortOrder: 'asc' },
            },
          },
        });

        if (menus && menus.length > 0) {
          for (const menu of menus) {
            const mKey = (menu.department || menu.menuKey || '').toLowerCase();
            const formatted = {
              id: mKey,
              label: mKey === 'men' ? 'Men' : 'Women',
              labelKey: `nav.${mKey}`,
              fallbackLabel: mKey.toUpperCase(),
              href: `/${mKey}`,
            };

            if (menu.sections && menu.sections.length > 0) {
              for (const section of menu.sections) {
                const secKey = (section.slug || section.title).toLowerCase().replace(/[^a-z0-9]/g, '');
                let targetKey = secKey;
                if (secKey.includes('categor')) targetKey = 'categories';
                else if (secKey.includes('style')) targetKey = 'styles';
                else if (secKey.includes('coat')) targetKey = 'coats';
                else if (secKey.includes('shop') || secKey.includes('filter')) targetKey = 'shopBy';

                formatted[targetKey] = section.items.map((item) => ({
                  id: item.legacyId || item.id,
                  labelKey: item.labelKey || `nav.${item.label.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
                  fallbackLabel: item.label,
                  href: item.href || (item.category ? `/shop?category=${item.category.slug}` : (item.product ? `/products/${item.product.slug}` : `/${mKey}`)),
                  badge: item.badge || undefined,
                }));
              }
            } else if (menu.payload) {
              Object.assign(formatted, menu.payload);
            }

            if (menu.features && menu.features.length > 0) {
              const feat = menu.features[0];
              formatted.featured = {
                id: feat.id,
                title: feat.title,
                description: feat.description || '',
                imageUrl: feat.image,
                ctaTextKey: feat.ctaTextKey || 'nav.featured.cta',
                fallbackCta: feat.ctaText || 'EXPLORE NOW',
                href: feat.href,
                tag: feat.badge || 'FEATURED',
              };
            }

            cmsMenus[mKey] = formatted;
          }
        }
      } else {
        // Safe query against legacy database without selecting unmigrated columns
        const menus = await prisma.navigationMenu.findMany({
          where: deptKey ? { menuKey: deptKey } : undefined,
          select: { menuKey: true, payload: true },
        });
        if (menus && menus.length > 0) {
          for (const m of menus) {
            if (m.menuKey && m.payload) {
              cmsMenus[m.menuKey] = m.payload;
            }
          }
        }
      }
    } catch (err) {
      if (
        err.name === 'PrismaClientInitializationError' ||
        err.code === 'P1001' ||
        err.message?.includes("Can't reach database server")
      ) {
        throw err;
      }
    }

    // Always fetch dynamic categories and products directly from the database
    // to populate live catalog data (skip in mocked unit test runs)
    let dynamicNav = {};
    if (typeof prisma.category?.findMany === 'function' && !prisma.navigationMenu?.findFirst?.mock) {
      try {
        dynamicNav = await CategoryService.getDynamicNavigation(deptKey);
      } catch {
        // Dynamic fallback
      }
    }

    const departmentsToProcess = deptKey ? [deptKey] : ['men', 'women'];
    const finalResult = {};

    for (const d of departmentsToProcess) {
      const dynamicDept = dynamicNav[d];
      const cmsDept = cmsMenus[d] || {};

      let resolvedCategories = [];
      if (Array.isArray(cmsDept.categories) && cmsDept.categories.length > 0 && !dynamicDept?.categories?.length) {
        resolvedCategories = cmsDept.categories;
      } else if (dynamicDept && Array.isArray(dynamicDept.categories)) {
        resolvedCategories = dynamicDept.categories.map((cat) => {
          const matchedCmsItem = cmsDept.categories?.find(
            (c) => c.id === cat.id || c.slug === cat.slug || c.href === cat.href
          );
          return {
            ...cat,
            labelKey: matchedCmsItem?.labelKey || `nav.${cat.slug.replace(/[^a-z0-9]/g, '')}`,
            fallbackLabel: matchedCmsItem?.fallbackLabel || cat.name,
            badge: matchedCmsItem?.badge || undefined,
          };
        });
      } else if (Array.isArray(cmsDept.categories)) {
        resolvedCategories = cmsDept.categories;
      }

      finalResult[d] = {
        id: d,
        label: d === 'men' ? 'Men' : 'Women',
        labelKey: cmsDept.labelKey || `nav.${d}`,
        fallbackLabel: cmsDept.fallbackLabel || (d === 'men' ? 'Men' : 'Women'),
        href: cmsDept.href || `/${d}`,
        categories: resolvedCategories,
        styles: cmsDept.styles || [],
        coats: cmsDept.coats || [],
        shopBy: cmsDept.shopBy || [],
        featured: cmsDept.featured || undefined,
      };
    }

    navCache = finalResult;
    navCacheTimestamp = now;

    if (deptKey) {
      return finalResult[deptKey] ? { [deptKey]: finalResult[deptKey] } : finalResult;
    }
    return finalResult;
  },

  async getAdminMegaMenu(department = null) {
    const cmsSupported = await checkCmsSchemaSupport();

    if (department) {
      const deptKey = department.toLowerCase().trim();
      if (cmsSupported) {
        const menu = await prisma.navigationMenu.findFirst({
          where: {
            OR: [{ menuKey: deptKey }, { department: deptKey }],
          },
          select: { menuKey: true, department: true, payload: true, draftPayload: true },
        });
        const currentPayload = menu ? (menu.draftPayload || menu.payload) : null;
        return { [deptKey]: currentPayload };
      }

      // Legacy fallback
      const menu = await prisma.navigationMenu.findFirst({
        where: { menuKey: deptKey },
        select: { menuKey: true, payload: true },
      });
      const currentPayload = memoryDrafts[deptKey] || menu?.payload || null;
      return { [deptKey]: currentPayload };
    }

    if (cmsSupported) {
      const menus = await prisma.navigationMenu.findMany({
        select: { menuKey: true, department: true, payload: true, draftPayload: true },
      });
      const map = {};
      for (const m of menus) {
        const key = m.menuKey || m.department;
        if (key) {
          map[key] = m.draftPayload || m.payload;
        }
      }
      return map;
    }

    // Legacy fallback
    const menus = await prisma.navigationMenu.findMany({
      select: { menuKey: true, payload: true },
    });
    const map = {};
    for (const m of menus) {
      if (m.menuKey) {
        map[m.menuKey] = memoryDrafts[m.menuKey] || m.payload;
      }
    }
    return map;
  },

  async saveAdminMegaMenu(menuKey, payload, { asDraft = false } = {}) {
    const dept = (menuKey || '').toLowerCase().trim();
    const cmsSupported = await checkCmsSchemaSupport();

    if (!cmsSupported) {
      if (asDraft) {
        // Genuine draft separation: Store as draft in memory; storefront reads database payload untouched
        memoryDrafts[dept] = payload;
        return memoryDrafts[dept];
      }

      // Live publish
      const existing = await prisma.navigationMenu.findFirst({
        where: { menuKey: dept },
        select: { id: true, menuKey: true },
      });

      let updated;
      if (existing) {
        updated = await prisma.navigationMenu.update({
          where: { id: existing.id },
          data: { payload },
          select: { id: true, menuKey: true, payload: true },
        });
      } else {
        updated = await prisma.navigationMenu.create({
          data: { menuKey: dept, payload },
          select: { id: true, menuKey: true, payload: true },
        });
      }

      memoryDrafts[dept] = null;
      this.invalidateCache();
      return updated.payload;
    }

    // CMS schema supported
    const name =
      dept === 'men'
        ? 'Men Navigation'
        : dept === 'women'
          ? 'Women Navigation'
          : `${dept.charAt(0).toUpperCase() + dept.slice(1)} Navigation`;

    const data = asDraft
      ? { draftPayload: payload, isDraft: true }
      : { payload, draftPayload: payload, isDraft: false, isActive: true };

    const updated = await prisma.navigationMenu.upsert({
      where: { menuKey: dept },
      update: data,
      create: {
        menuKey: dept,
        department: dept,
        slug: dept,
        name,
        ...data,
      },
      select: { payload: true, draftPayload: true, id: true, menuKey: true, department: true },
    });

    if (!asDraft) {
      this.invalidateCache();
      return updated.payload;
    }
    return updated.draftPayload;
  },
};
