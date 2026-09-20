import { prisma } from '../lib/prisma.js';
import { HTTP_STATUS, COMMISSION_STATUS } from '../config/constants.js';

export const CommissionService = {
  async getOptions() {
    const [silhouettes, leathers, colors, linings, hardwares] = await Promise.all([
      prisma.customSilhouette.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.customLeather.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.customColor.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.customLining.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.customHardware.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
    ]);

    return {
      silhouettes: silhouettes.map((s) => ({
        id: s.id,
        _id: s.id,
        slug: s.slug,
        name: s.name,
        price: Number(s.basePrice),
        basePrice: Number(s.basePrice),
        desc: s.description,
        description: s.description,
        imageUrl: s.imageUrl,
      })),
      leathers: leathers.map((l) => ({
        id: l.id,
        _id: l.id,
        slug: l.slug,
        name: l.name,
        weight: l.weight,
        origin: l.origin,
        desc: l.description,
        description: l.description,
        extraPrice: Number(l.extraPrice || 0),
      })),
      colors: colors.map((c) => ({
        id: c.id,
        _id: c.id,
        slug: c.slug,
        name: c.name,
        hex: c.hex,
      })),
      linings: linings.map((lin) => ({
        id: lin.id,
        _id: lin.id,
        slug: lin.slug,
        name: lin.name,
        desc: lin.description,
        description: lin.description,
        extraPrice: Number(lin.extraPrice || 0),
      })),
      hardwares: hardwares.map((h) => ({
        id: h.id,
        _id: h.id,
        slug: h.slug,
        name: h.name,
        finish: h.finish,
        extraPrice: Number(h.extraPrice || 0),
      })),
    };
  },

  async createCommission(data) {
    const year = new Date().getFullYear();
    const count = await prisma.customCommission.count();
    const dossierNumber = `AV-${year}-C${(count + 1).toString().padStart(3, '0')}`;

    let estimatedPrice = data.estimatedPrice;
    if (!estimatedPrice) {
      let base = 590;
      if (data.silhouetteId) {
        const sil = await prisma.customSilhouette.findFirst({
          where: {
            OR: [
              { slug: data.silhouetteId },
              { id: data.silhouetteId.match(/^[0-9a-fA-F-]{36}$/) ? data.silhouetteId : '00000000-0000-0000-0000-000000000000' },
            ],
          },
        });
        if (sil) base = Number(sil.basePrice);
      }
      let extra = 0;
      if (data.leatherId) {
        const lea = await prisma.customLeather.findFirst({
          where: {
            OR: [
              { slug: data.leatherId },
              { id: data.leatherId.match(/^[0-9a-fA-F-]{36}$/) ? data.leatherId : '00000000-0000-0000-0000-000000000000' },
            ],
          },
        });
        if (lea) extra += Number(lea.extraPrice || 0);
      }
      estimatedPrice = base + extra;
    }

    const commission = await prisma.customCommission.create({
      data: {
        dossierNumber,
        silhouetteId: data.silhouetteId,
        silhouetteName: data.silhouetteName || '',
        leatherId: data.leatherId,
        leatherName: data.leatherName || '',
        colorId: data.colorId,
        colorName: data.colorName || '',
        liningId: data.liningId,
        liningName: data.liningName || '',
        hardwareId: data.hardwareId,
        hardwareName: data.hardwareName || '',
        monogramText: data.monogramText || null,
        monogramPlacement: data.monogramPlacement || null,
        measurements: data.measurements || {},
        customerName: data.customer.name,
        customerEmail: data.customer.email.toLowerCase().trim(),
        customerPhone: data.customer.phone || '',
        status: COMMISSION_STATUS.PENDING,
        estimatedPrice,
        currency: 'EUR',
        estimatedDelivery: '4–6 weeks',
        notes: data.notes || '',
      },
    });

    return {
      dossierNumber: commission.dossierNumber,
      status: commission.status,
      estimatedPrice: Number(commission.estimatedPrice),
      currency: commission.currency,
      estimatedDelivery: commission.estimatedDelivery,
      createdAt: commission.createdAt,
    };
  },

  async listCommissions(query = {}) {
    const page = Math.max(1, parseInt(query.page || 1, 10));
    const limit = Math.max(1, parseInt(query.limit || 20, 10));
    const skip = (page - 1) * limit;

    const where = {};
    if (query.status) {
      where.status = query.status;
    }
    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { dossierNumber: { contains: s, mode: 'insensitive' } },
        { customerName: { contains: s, mode: 'insensitive' } },
        { customerEmail: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [commissions, totalCount] = await Promise.all([
      prisma.customCommission.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.customCommission.count({ where }),
    ]);

    const formatted = commissions.map((c) => ({
      id: c.id,
      _id: c.id,
      dossierNumber: c.dossierNumber,
      silhouetteId: c.silhouetteId,
      silhouetteName: c.silhouetteName,
      leatherId: c.leatherId,
      leatherName: c.leatherName,
      colorId: c.colorId,
      colorName: c.colorName,
      liningId: c.liningId,
      liningName: c.liningName,
      hardwareId: c.hardwareId,
      hardwareName: c.hardwareName,
      monogramText: c.monogramText,
      monogramPlacement: c.monogramPlacement,
      measurements: c.measurements,
      customer: {
        name: c.customerName,
        email: c.customerEmail,
        phone: c.customerPhone,
      },
      status: c.status,
      estimatedPrice: Number(c.estimatedPrice),
      currency: c.currency,
      estimatedDelivery: c.estimatedDelivery,
      notes: c.notes,
      createdAt: c.createdAt,
    }));

    return {
      commissions: formatted,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit) || 1,
        totalCount,
        limit,
      },
    };
  },

  async getCommissionById(id) {
    const c = await prisma.customCommission.findUnique({
      where: { id },
    });

    if (!c) {
      const err = new Error('Commission dossier not found');
      err.statusCode = HTTP_STATUS.NOT_FOUND;
      throw err;
    }

    return {
      id: c.id,
      _id: c.id,
      dossierNumber: c.dossierNumber,
      silhouetteId: c.silhouetteId,
      silhouetteName: c.silhouetteName,
      leatherId: c.leatherId,
      leatherName: c.leatherName,
      colorId: c.colorId,
      colorName: c.colorName,
      liningId: c.liningId,
      liningName: c.liningName,
      hardwareId: c.hardwareId,
      hardwareName: c.hardwareName,
      monogramText: c.monogramText,
      monogramPlacement: c.monogramPlacement,
      measurements: c.measurements,
      customer: {
        name: c.customerName,
        email: c.customerEmail,
        phone: c.customerPhone,
      },
      status: c.status,
      estimatedPrice: Number(c.estimatedPrice),
      currency: c.currency,
      estimatedDelivery: c.estimatedDelivery,
      notes: c.notes,
      createdAt: c.createdAt,
    };
  },

  async updateStatus(id, status, notes) {
    const updates = { status };
    if (notes) updates.notes = notes;

    try {
      const updated = await prisma.customCommission.update({
        where: { id },
        data: updates,
      });

      return {
        ...updated,
        _id: updated.id,
      };
    } catch (error) {
      const err = new Error('Commission dossier not found');
      err.statusCode = HTTP_STATUS.NOT_FOUND;
      throw err;
    }
  },

  async bulkUpdateStatus(status, ids) {
    await prisma.customCommission.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });
    return { message: `Updated status to '${status}' for ${ids.length} commissions` };
  },

  // Admin Custom Options CRUD
  async createSilhouette(data) {
    const item = await prisma.customSilhouette.create({
      data: {
        slug: data.slug,
        name: data.name,
        description: data.description || '',
        basePrice: data.basePrice || data.price,
        imageUrl: data.imageUrl || '',
        sortOrder: data.sortOrder || 0,
        isActive: data.isActive ?? true,
      },
    });
    return { ...item, _id: item.id };
  },
  async updateSilhouette(id, data) {
    const updates = {};
    if (data.name) updates.name = data.name;
    if (data.slug) updates.slug = data.slug;
    if (data.description !== undefined) updates.description = data.description;
    if (data.basePrice !== undefined) updates.basePrice = data.basePrice;
    if (data.imageUrl !== undefined) updates.imageUrl = data.imageUrl;
    const item = await prisma.customSilhouette.update({
      where: { id },
      data: updates,
    });
    return { ...item, _id: item.id };
  },
  async deleteSilhouette(id) {
    await prisma.customSilhouette.delete({ where: { id } });
    return { success: true };
  },

  async createLeather(data) {
    const item = await prisma.customLeather.create({
      data: {
        slug: data.slug,
        name: data.name,
        weight: data.weight || '',
        origin: data.origin || '',
        description: data.description || '',
        extraPrice: data.extraPrice || 0,
        sortOrder: data.sortOrder || 0,
        isActive: data.isActive ?? true,
      },
    });
    return { ...item, _id: item.id };
  },
  async updateLeather(id, data) {
    const updates = {};
    if (data.name) updates.name = data.name;
    if (data.slug) updates.slug = data.slug;
    if (data.weight !== undefined) updates.weight = data.weight;
    if (data.origin !== undefined) updates.origin = data.origin;
    if (data.description !== undefined) updates.description = data.description;
    if (data.extraPrice !== undefined) updates.extraPrice = data.extraPrice;
    const item = await prisma.customLeather.update({
      where: { id },
      data: updates,
    });
    return { ...item, _id: item.id };
  },
  async deleteLeather(id) {
    await prisma.customLeather.delete({ where: { id } });
    return { success: true };
  },

  async createColor(data) {
    const item = await prisma.customColor.create({
      data: {
        slug: data.slug,
        name: data.name,
        hex: data.hex,
        sortOrder: data.sortOrder || 0,
        isActive: data.isActive ?? true,
      },
    });
    return { ...item, _id: item.id };
  },
  async updateColor(id, data) {
    const updates = {};
    if (data.name) updates.name = data.name;
    if (data.slug) updates.slug = data.slug;
    if (data.hex) updates.hex = data.hex;
    const item = await prisma.customColor.update({
      where: { id },
      data: updates,
    });
    return { ...item, _id: item.id };
  },
  async deleteColor(id) {
    await prisma.customColor.delete({ where: { id } });
    return { success: true };
  },

  async createLining(data) {
    const item = await prisma.customLining.create({
      data: {
        slug: data.slug,
        name: data.name,
        description: data.description || '',
        extraPrice: data.extraPrice || 0,
        sortOrder: data.sortOrder || 0,
        isActive: data.isActive ?? true,
      },
    });
    return { ...item, _id: item.id };
  },
  async updateLining(id, data) {
    const updates = {};
    if (data.name) updates.name = data.name;
    if (data.slug) updates.slug = data.slug;
    if (data.description !== undefined) updates.description = data.description;
    if (data.extraPrice !== undefined) updates.extraPrice = data.extraPrice;
    const item = await prisma.customLining.update({
      where: { id },
      data: updates,
    });
    return { ...item, _id: item.id };
  },
  async deleteLining(id) {
    await prisma.customLining.delete({ where: { id } });
    return { success: true };
  },

  async createHardware(data) {
    const item = await prisma.customHardware.create({
      data: {
        slug: data.slug,
        name: data.name,
        finish: data.finish || '',
        extraPrice: data.extraPrice || 0,
        sortOrder: data.sortOrder || 0,
        isActive: data.isActive ?? true,
      },
    });
    return { ...item, _id: item.id };
  },
  async updateHardware(id, data) {
    const updates = {};
    if (data.name) updates.name = data.name;
    if (data.slug) updates.slug = data.slug;
    if (data.finish !== undefined) updates.finish = data.finish;
    if (data.extraPrice !== undefined) updates.extraPrice = data.extraPrice;
    const item = await prisma.customHardware.update({
      where: { id },
      data: updates,
    });
    return { ...item, _id: item.id };
  },
  async deleteHardware(id) {
    await prisma.customHardware.delete({ where: { id } });
    return { success: true };
  },
};
