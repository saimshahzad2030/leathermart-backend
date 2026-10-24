import { prisma } from '../lib/prisma.js';
import { generateSlug } from '../utils/slugify.js';
import { HTTP_STATUS } from '../config/constants.js';

export const ColorService = {
  /**
   * List all colors. If isPublic=true, only active colors are returned.
   */
  async listColors(query = {}, isPublic = false) {
    const where = {};
    if (isPublic) {
      where.isActive = true;
    } else if (query.status === 'active') {
      where.isActive = true;
    } else if (query.status === 'inactive') {
      where.isActive = false;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
        { hex: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const colors = await prisma.productColor.findMany({
      where,
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'asc' },
      ],
      include: {
        _count: {
          select: { productColors: true },
        },
      },
    });

    return colors.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      hex: c.hex,
      sortOrder: c.sortOrder,
      isActive: c.isActive,
      productCount: c._count?.productColors || 0,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  },

  async getColorById(id) {
    const color = await prisma.productColor.findUnique({
      where: { id },
      include: {
        _count: {
          select: { productColors: true },
        },
      },
    });

    if (!color) {
      const err = new Error(`Color with id '${id}' not found`);
      err.statusCode = HTTP_STATUS.NOT_FOUND;
      throw err;
    }

    return {
      id: color.id,
      name: color.name,
      slug: color.slug,
      hex: color.hex,
      sortOrder: color.sortOrder,
      isActive: color.isActive,
      productCount: color._count?.productColors || 0,
      createdAt: color.createdAt,
      updatedAt: color.updatedAt,
    };
  },

  async createColor(data) {
    const name = data.name?.trim();
    if (!name) {
      const err = new Error('Color name is required');
      err.statusCode = HTTP_STATUS.BAD_REQUEST;
      throw err;
    }

    let hex = data.hex?.trim();
    if (!hex) {
      const err = new Error('Color HEX value is required');
      err.statusCode = HTTP_STATUS.BAD_REQUEST;
      throw err;
    }
    if (!hex.startsWith('#')) hex = `#${hex}`;
    if (!/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex)) {
      const err = new Error('Invalid HEX color format. Expected format like #11100F or #000');
      err.statusCode = HTTP_STATUS.BAD_REQUEST;
      throw err;
    }

    const slug = (data.slug?.trim() || generateSlug(name)).toLowerCase();

    // Check duplicate name or slug
    const existing = await prisma.productColor.findFirst({
      where: {
        OR: [
          { name: { equals: name, mode: 'insensitive' } },
          { slug },
        ],
      },
    });

    if (existing) {
      const err = new Error(`A color with name '${name}' or slug '${slug}' already exists`);
      err.statusCode = HTTP_STATUS.CONFLICT;
      throw err;
    }

    const sortOrder = data.sortOrder !== undefined ? parseInt(data.sortOrder, 10) : 0;
    const isActive = data.isActive !== undefined ? !!data.isActive : true;

    const color = await prisma.productColor.create({
      data: {
        name,
        slug,
        hex: hex.toUpperCase(),
        sortOrder,
        isActive,
      },
    });

    return {
      id: color.id,
      name: color.name,
      slug: color.slug,
      hex: color.hex,
      sortOrder: color.sortOrder,
      isActive: color.isActive,
      productCount: 0,
      createdAt: color.createdAt,
      updatedAt: color.updatedAt,
    };
  },

  async updateColor(id, data) {
    const color = await prisma.productColor.findUnique({ where: { id } });
    if (!color) {
      const err = new Error(`Color with id '${id}' not found`);
      err.statusCode = HTTP_STATUS.NOT_FOUND;
      throw err;
    }

    const updates = {};
    if (data.name !== undefined) {
      const name = data.name.trim();
      if (!name) {
        const err = new Error('Color name cannot be empty');
        err.statusCode = HTTP_STATUS.BAD_REQUEST;
        throw err;
      }
      const duplicate = await prisma.productColor.findFirst({
        where: {
          id: { not: id },
          name: { equals: name, mode: 'insensitive' },
        },
      });
      if (duplicate) {
        const err = new Error(`A color with name '${name}' already exists`);
        err.statusCode = HTTP_STATUS.CONFLICT;
        throw err;
      }
      updates.name = name;
    }

    if (data.hex !== undefined) {
      let hex = data.hex.trim();
      if (!hex.startsWith('#')) hex = `#${hex}`;
      if (!/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex)) {
        const err = new Error('Invalid HEX color format. Expected format like #11100F or #000');
        err.statusCode = HTTP_STATUS.BAD_REQUEST;
        throw err;
      }
      updates.hex = hex.toUpperCase();
    }

    if (data.slug !== undefined) {
      const slug = data.slug.trim().toLowerCase();
      const duplicateSlug = await prisma.productColor.findFirst({
        where: {
          id: { not: id },
          slug,
        },
      });
      if (duplicateSlug) {
        const err = new Error(`A color with slug '${slug}' already exists`);
        err.statusCode = HTTP_STATUS.CONFLICT;
        throw err;
      }
      updates.slug = slug;
    }

    if (data.sortOrder !== undefined) {
      updates.sortOrder = parseInt(data.sortOrder, 10) || 0;
    }

    if (data.isActive !== undefined) {
      updates.isActive = !!data.isActive;
    }

    const updated = await prisma.productColor.update({
      where: { id },
      data: updates,
      include: {
        _count: {
          select: { productColors: true },
        },
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      hex: updated.hex,
      sortOrder: updated.sortOrder,
      isActive: updated.isActive,
      productCount: updated._count?.productColors || 0,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  },

  async toggleActive(id) {
    const color = await prisma.productColor.findUnique({ where: { id } });
    if (!color) {
      const err = new Error(`Color with id '${id}' not found`);
      err.statusCode = HTTP_STATUS.NOT_FOUND;
      throw err;
    }

    const updated = await prisma.productColor.update({
      where: { id },
      data: { isActive: !color.isActive },
      include: {
        _count: {
          select: { productColors: true },
        },
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      hex: updated.hex,
      sortOrder: updated.sortOrder,
      isActive: updated.isActive,
      productCount: updated._count?.productColors || 0,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  },

  async deleteColor(id) {
    const color = await prisma.productColor.findUnique({
      where: { id },
      include: {
        _count: {
          select: { productColors: true },
        },
      },
    });

    if (!color) {
      const err = new Error(`Color with id '${id}' not found`);
      err.statusCode = HTTP_STATUS.NOT_FOUND;
      throw err;
    }

    const assignedCount = color._count?.productColors || 0;
    if (assignedCount > 0) {
      const err = new Error(
        `Cannot delete color '${color.name}' because it is currently assigned to ${assignedCount} product(s). Please unassign this color from all products before deleting, or deactivate it instead.`
      );
      err.statusCode = HTTP_STATUS.BAD_REQUEST;
      err.errorCode = 'ERR_COLOR_IN_USE';
      throw err;
    }

    await prisma.productColor.delete({ where: { id } });
    return { success: true, message: `Color '${color.name}' deleted successfully` };
  },
};
