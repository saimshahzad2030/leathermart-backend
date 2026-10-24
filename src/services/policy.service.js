import { prisma } from '../lib/prisma.js';
import { generateSlug } from '../utils/slugify.js';
import { HTTP_STATUS } from '../config/constants.js';

export const PolicyService = {
  /**
   * List all policies. If isPublic=true, only active policies are returned.
   */
  async listPolicies(query = {}, isPublic = false) {
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
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const policies = await prisma.productPolicy.findMany({
      where,
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'asc' },
      ],
      include: {
        _count: {
          select: { productPolicies: true },
        },
      },
    });

    return policies.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      bulletPoints: p.bulletPoints || [],
      sortOrder: p.sortOrder,
      isActive: p.isActive,
      productCount: p._count?.productPolicies || 0,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  },

  async getPolicyById(id) {
    const policy = await prisma.productPolicy.findUnique({
      where: { id },
      include: {
        _count: {
          select: { productPolicies: true },
        },
      },
    });

    if (!policy) {
      const err = new Error(`Policy with id '${id}' not found`);
      err.statusCode = HTTP_STATUS.NOT_FOUND;
      throw err;
    }

    return {
      id: policy.id,
      name: policy.name,
      slug: policy.slug,
      description: policy.description,
      bulletPoints: policy.bulletPoints || [],
      sortOrder: policy.sortOrder,
      isActive: policy.isActive,
      productCount: policy._count?.productPolicies || 0,
      createdAt: policy.createdAt,
      updatedAt: policy.updatedAt,
    };
  },

  async createPolicy(data) {
    const name = data.name?.trim();
    if (!name) {
      const err = new Error('Policy name is required');
      err.statusCode = HTTP_STATUS.BAD_REQUEST;
      throw err;
    }

    const description = data.description?.trim();
    if (!description) {
      const err = new Error('Policy description is required');
      err.statusCode = HTTP_STATUS.BAD_REQUEST;
      throw err;
    }

    const slug = (data.slug?.trim() || generateSlug(name)).toLowerCase();

    // Check duplicate slug
    const existing = await prisma.productPolicy.findFirst({
      where: {
        OR: [
          { name: { equals: name, mode: 'insensitive' } },
          { slug },
        ],
      },
    });

    if (existing) {
      const err = new Error(`A policy with name '${name}' or slug '${slug}' already exists`);
      err.statusCode = HTTP_STATUS.CONFLICT;
      throw err;
    }

    const bulletPoints = Array.isArray(data.bulletPoints)
      ? data.bulletPoints.map((b) => (typeof b === 'string' ? b.trim() : '')).filter(Boolean)
      : [];

    const sortOrder = data.sortOrder !== undefined ? parseInt(data.sortOrder, 10) : 0;
    const isActive = data.isActive !== undefined ? !!data.isActive : true;

    const policy = await prisma.productPolicy.create({
      data: {
        name,
        slug,
        description,
        bulletPoints,
        sortOrder,
        isActive,
      },
    });

    return {
      id: policy.id,
      name: policy.name,
      slug: policy.slug,
      description: policy.description,
      bulletPoints: policy.bulletPoints,
      sortOrder: policy.sortOrder,
      isActive: policy.isActive,
      productCount: 0,
      createdAt: policy.createdAt,
      updatedAt: policy.updatedAt,
    };
  },

  async updatePolicy(id, data) {
    const policy = await prisma.productPolicy.findUnique({ where: { id } });
    if (!policy) {
      const err = new Error(`Policy with id '${id}' not found`);
      err.statusCode = HTTP_STATUS.NOT_FOUND;
      throw err;
    }

    const updates = {};
    if (data.name !== undefined) {
      const name = data.name.trim();
      if (!name) {
        const err = new Error('Policy name cannot be empty');
        err.statusCode = HTTP_STATUS.BAD_REQUEST;
        throw err;
      }
      const duplicate = await prisma.productPolicy.findFirst({
        where: {
          id: { not: id },
          name: { equals: name, mode: 'insensitive' },
        },
      });
      if (duplicate) {
        const err = new Error(`A policy with name '${name}' already exists`);
        err.statusCode = HTTP_STATUS.CONFLICT;
        throw err;
      }
      updates.name = name;
    }

    if (data.description !== undefined) {
      const description = data.description.trim();
      if (!description) {
        const err = new Error('Policy description cannot be empty');
        err.statusCode = HTTP_STATUS.BAD_REQUEST;
        throw err;
      }
      updates.description = description;
    }

    if (data.slug !== undefined) {
      const slug = data.slug.trim().toLowerCase();
      const duplicateSlug = await prisma.productPolicy.findFirst({
        where: {
          id: { not: id },
          slug,
        },
      });
      if (duplicateSlug) {
        const err = new Error(`A policy with slug '${slug}' already exists`);
        err.statusCode = HTTP_STATUS.CONFLICT;
        throw err;
      }
      updates.slug = slug;
    }

    if (data.bulletPoints !== undefined) {
      updates.bulletPoints = Array.isArray(data.bulletPoints)
        ? data.bulletPoints.map((b) => (typeof b === 'string' ? b.trim() : '')).filter(Boolean)
        : [];
    }

    if (data.sortOrder !== undefined) {
      updates.sortOrder = parseInt(data.sortOrder, 10) || 0;
    }

    if (data.isActive !== undefined) {
      updates.isActive = !!data.isActive;
    }

    const updated = await prisma.productPolicy.update({
      where: { id },
      data: updates,
      include: {
        _count: {
          select: { productPolicies: true },
        },
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      description: updated.description,
      bulletPoints: updated.bulletPoints,
      sortOrder: updated.sortOrder,
      isActive: updated.isActive,
      productCount: updated._count?.productPolicies || 0,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  },

  async toggleActive(id) {
    const policy = await prisma.productPolicy.findUnique({ where: { id } });
    if (!policy) {
      const err = new Error(`Policy with id '${id}' not found`);
      err.statusCode = HTTP_STATUS.NOT_FOUND;
      throw err;
    }

    const updated = await prisma.productPolicy.update({
      where: { id },
      data: { isActive: !policy.isActive },
      include: {
        _count: {
          select: { productPolicies: true },
        },
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      description: updated.description,
      bulletPoints: updated.bulletPoints,
      sortOrder: updated.sortOrder,
      isActive: updated.isActive,
      productCount: updated._count?.productPolicies || 0,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  },

  async deletePolicy(id) {
    const policy = await prisma.productPolicy.findUnique({
      where: { id },
      include: {
        _count: {
          select: { productPolicies: true },
        },
      },
    });

    if (!policy) {
      const err = new Error(`Policy with id '${id}' not found`);
      err.statusCode = HTTP_STATUS.NOT_FOUND;
      throw err;
    }

    const assignedCount = policy._count?.productPolicies || 0;
    if (assignedCount > 0) {
      const err = new Error(
        `Cannot delete policy '${policy.name}' because it is currently assigned to ${assignedCount} product(s). Please unassign this policy from all products before deleting, or deactivate it instead.`
      );
      err.statusCode = HTTP_STATUS.BAD_REQUEST;
      err.errorCode = 'ERR_POLICY_IN_USE';
      throw err;
    }

    await prisma.productPolicy.delete({ where: { id } });
    return { success: true, message: `Policy '${policy.name}' deleted successfully` };
  },
};
