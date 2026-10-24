import { ContactService } from '../services/contact.service.js';
import { ApiResponse } from '../utils/apiResponse.js';

export const ContactController = {
  /**
   * Submit public contact form inquiry.
   */
  async submitContact(req, res, next) {
    try {
      const result = await ContactService.createContactMessage(req.body);
      return ApiResponse.created(res, {
        message: 'Your inquiry has been received. Our atelier concierge will contact you shortly.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * List contact messages with filters (Admin).
   */
  async listMessagesAdmin(req, res, next) {
    try {
      const { messages, pagination } = await ContactService.listContactMessages(req.query);
      return ApiResponse.success(res, {
        message: 'Contact messages retrieved successfully',
        data: messages,
        pagination,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get single message by ID (Admin).
   */
  async getMessageByIdAdmin(req, res, next) {
    try {
      const message = await ContactService.getContactMessageById(req.params.id);
      return ApiResponse.success(res, {
        data: message,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Update message status and/or notes (Admin).
   */
  async updateMessageAdmin(req, res, next) {
    try {
      const updated = await ContactService.updateContactMessage(req.params.id, req.body);
      return ApiResponse.success(res, {
        message: 'Contact message updated successfully',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Delete contact message (Admin).
   */
  async deleteMessageAdmin(req, res, next) {
    try {
      const result = await ContactService.deleteContactMessage(req.params.id);
      return ApiResponse.success(res, {
        message: result.message,
        data: { id: result.id },
      });
    } catch (err) {
      next(err);
    }
  },
};
