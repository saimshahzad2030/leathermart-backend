import { prisma } from '../lib/prisma.js';
import { generateSlug } from '../utils/slugify.js';
import { HTTP_STATUS } from '../config/constants.js';

export const SizeService = {
  /**
   * List all sizes. If isPublic=true, only active sizes are returned.
   */
  async listSizes(query = {}, isPublic = false) {
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
      ];
    }

    const sizes = await prisma.productSize.findMany({
      where,
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'asc' },
      ],
      include: {
        _count: {
          select: { productSizes: true },
        },
      },
    });

    return sizes.map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      sortOrder: s.sortOrder,
      isActive: s.isActive,
      productCount: s._count?.productSizes || 0,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));
  },

  async getSizeById(id) {
    const size = await prisma.productSize.findUnique({
      where: { id },
      include: {
        _count: {
          select: { productSizes: true },
        },
      },
    });

    if (!size) {
      const err = new Error(`Size with id '${id}' not found`);
      err.statusCode = HTTP_STATUS.NOT_FOUND;
      throw err;
    }

    return {
      id: size.id,
      name: size.name,
      slug: size.slug,
      sortOrder: size.sortOrder,
      isActive: size.isActive,
      productCount: size._count?.productSizes || 0,
      createdAt: size.createdAt,
      updatedAt: size.updatedAt,
    };
  },

  async createSize(data) {
    const name = data.name?.trim();
    if (!name) {
      const err = new Error('Size name/label is required');
      err.statusCode = HTTP_STATUS.BAD_REQUEST;
      throw err;
    }

    const slug = (data.slug?.trim() || generateSlug(name)).toLowerCase();

    // Check duplicate name or slug
    const existing = await prisma.productSize.findFirst({
      where: {
        OR: [
          { name: { equals: name, mode: 'insensitive' } },
          { slug },
        ],
      },
    });

    if (existing) {
      const err = new Error(`A size with name '${name}' or slug '${slug}' already exists`);
      err.statusCode = HTTP_STATUS.CONFLICT;
      throw err;
    }

    const sortOrder = data.sortOrder !== undefined ? parseInt(data.sortOrder, 10) : 0;
    const isActive = data.isActive !== undefined ? !!data.isActive : true;

    const size = await prisma.productSize.create({
      data: {
        name,
        slug,
        sortOrder,
        isActive,
      },
    });

    return {
      id: size.id,
      name: size.name,
      slug: size.slug,
      sortOrder: size.sortOrder,
      isActive: size.isActive,
      productCount: 0,
      createdAt: size.createdAt,
      updatedAt: size.updatedAt,
    };
  },

  async updateSize(id, data) {
    const size = await prisma.productSize.findUnique({ where: { id } });
    if (!size) {
      const err = new Error(`Size with id '${id}' not found`);
      err.statusCode = HTTP_STATUS.NOT_FOUND;
      throw err;
    }

    const updates = {};
    if (data.name !== undefined) {
      const name = data.name.trim();
      if (!name) {
        const err = new Error('Size name cannot be empty');
        err.statusCode = HTTP_STATUS.BAD_REQUEST;
        throw err;
      }
      // Check duplicate
      const duplicate = await prisma.productSize.findFirst({
        where: {
          id: { not: id },
          name: { equals: name, mode: 'insensitive' },
        },
      });
      if (duplicate) {
        const err = new Error(`A size with name '${name}' already exists`);
        err.statusCode = HTTP_STATUS.CONFLICT;
        throw err;
      }
      updates.name = name;
    }

    if (data.slug !== undefined) {
      const slug = data.slug.trim().toLowerCase();
      const duplicateSlug = await prisma.productSize.findFirst({
        where: {
          id: { not: id },
          slug,
        },
      });
      if (duplicateSlug) {
        const err = new Error(`A size with slug '${slug}' already exists`);
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

    const updated = await prisma.productSize.update({
      where: { id },
      data: updates,
      include: {
        _count: {
          select: { productSizes: true },
        },
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      sortOrder: updated.sortOrder,
      isActive: updated.isActive,
      productCount: updated._count?.productSizes || 0,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  },

  async toggleActive(id) {
    const size = await prisma.productSize.findUnique({ where: { id } });
    if (!size) {
      const err = new Error(`Size with id '${id}' not found`);
      err.statusCode = HTTP_STATUS.NOT_FOUND;
      throw err;
    }

    const updated = await prisma.productSize.update({
      where: { id },
      data: { isActive: !size.isActive },
      include: {
        _count: {
          select: { productSizes: true },
        },
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      sortOrder: updated.sortOrder,
      isActive: updated.isActive,
      productCount: updated._count?.productSizes || 0,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  },

  async deleteSize(id) {
    const size = await prisma.productSize.findUnique({
      where: { id },
      include: {
        _count: {
          select: { productSizes: true },
        },
      },
    });

    if (!size) {
      const err = new Error(`Size with id '${id}' not found`);
      err.statusCode = HTTP_STATUS.NOT_FOUND;
      throw err;
    }

    const assignedCount = size._count?.productSizes || 0;
    if (assignedCount > 0) {
      const err = new Error(
        `Cannot delete size '${size.name}' because it is currently assigned to ${assignedCount} product(s). Please unassign this size from all products before deleting, or deactivate it instead.`
      );
      err.statusCode = HTTP_STATUS.BAD_REQUEST;
      err.errorCode = 'ERR_SIZE_IN_USE';
      throw err;
    }

    await prisma.productSize.delete({ where: { id } });
    return { success: true, message: `Size '${size.name}' deleted successfully` };
  },
};
