import { prisma } from '../lib/prisma.js';
import { HTTP_STATUS, DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT } from '../config/constants.js';
import { EmailService } from './email.service.js';
import { logger } from '../utils/logger.js';

export const ContactService = {
  /**
   * Submit a new public contact message.
   * Persists message to Supabase DB and notifies atelier concierge.
   */
  async createContactMessage(data) {
    const payload = {
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      phone: (data.phone || '').trim(),
      subject: data.subject.trim(),
      message: data.message.trim(),
      status: 'new',
      adminNotes: '',
    };

    const created = await prisma.contactMessage.create({
      data: payload,
    });

    // Send business notification email asynchronously without blocking or failing client response
    EmailService.sendContactNotification(created).catch((emailErr) => {
      logger.warn(`Email notification failed for message ${created.id}: ${emailErr.message}`);
    });

    return {
      id: created.id,
      name: created.name,
      email: created.email,
      phone: created.phone,
      subject: created.subject,
      status: created.status,
      createdAt: created.createdAt,
    };
  },

  /**
   * List contact messages with pagination, search, status and date filters (Admin).
   */
  async listContactMessages(query = {}) {
    const page = Math.max(1, parseInt(query.page || DEFAULT_PAGE, 10));
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(query.limit || DEFAULT_LIMIT, 10)));
    const skip = (page - 1) * limit;

    const where = {};

    // Filter by status
    if (query.status && query.status !== 'all') {
      where.status = query.status;
    }

    // Filter by date range
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    // Search query across name, email, subject, message
    const search = (query.search || '').trim();
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [messages, totalCount] = await Promise.all([
      prisma.contactMessage.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.contactMessage.count({ where }),
    ]);

    return {
      messages,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit) || 1,
        totalCount,
        limit,
        hasNextPage: skip + messages.length < totalCount,
        hasPrevPage: page > 1,
      },
    };
  },

  /**
   * Get single message details by ID.
   */
  async getContactMessageById(id) {
    const message = await prisma.contactMessage.findUnique({
      where: { id },
    });

    if (!message) {
      const err = new Error(`Contact message with id '${id}' not found`);
      err.statusCode = HTTP_STATUS.NOT_FOUND;
      err.errorCode = 'ERR_CONTACT_NOT_FOUND';
      throw err;
    }

    return message;
  },

  /**
   * Update message status and/or admin notes.
   */
  async updateContactMessage(id, data) {
    const existing = await prisma.contactMessage.findUnique({
      where: { id },
    });

    if (!existing) {
      const err = new Error(`Contact message with id '${id}' not found`);
      err.statusCode = HTTP_STATUS.NOT_FOUND;
      err.errorCode = 'ERR_CONTACT_NOT_FOUND';
      throw err;
    }

    const updates = {};
    if (data.status !== undefined) updates.status = data.status;
    if (data.adminNotes !== undefined) updates.adminNotes = data.adminNotes;

    const updated = await prisma.contactMessage.update({
      where: { id },
      data: updates,
    });

    return updated;
  },

  /**
   * Delete contact message.
   */
  async deleteContactMessage(id) {
    const existing = await prisma.contactMessage.findUnique({
      where: { id },
    });

    if (!existing) {
      const err = new Error(`Contact message with id '${id}' not found`);
      err.statusCode = HTTP_STATUS.NOT_FOUND;
      err.errorCode = 'ERR_CONTACT_NOT_FOUND';
      throw err;
    }

    await prisma.contactMessage.delete({
      where: { id },
    });

    return { id, message: 'Contact inquiry deleted successfully' };
  },
};
