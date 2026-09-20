import { CmsService } from '../services/cms.service.js';
import { ApiResponse } from '../utils/apiResponse.js';

export const CmsController = {
  // Public
  async getHomepageContent(req, res, next) {
    try {
      const data = await CmsService.getHomepageContent();
      return ApiResponse.success(res, {
        message: 'Homepage content retrieved successfully',
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  async subscribeNewsletter(req, res, next) {
    try {
      const { email, locale } = req.body;
      const result = await CmsService.subscribeNewsletter(email, locale);
      return ApiResponse.success(res, {
        message: result.message,
      });
    } catch (err) {
      next(err);
    }
  },

  async listTestimonialsPublic(req, res, next) {
    try {
      const testimonials = await CmsService.listTestimonials(true);
      return ApiResponse.success(res, { data: testimonials });
    } catch (err) {
      next(err);
    }
  },

  async listSocialLooksPublic(req, res, next) {
    try {
      const looks = await CmsService.listSocialLooks(true);
      return ApiResponse.success(res, { data: looks });
    } catch (err) {
      next(err);
    }
  },

  // Admin CMS Sections
  async getAllSections(req, res, next) {
    try {
      const sections = await CmsService.getAllSections();
      return ApiResponse.success(res, { data: sections });
    } catch (err) {
      next(err);
    }
  },

  async getSection(req, res, next) {
    try {
      const section = await CmsService.getSection(req.params.sectionKey);
      return ApiResponse.success(res, { data: section });
    } catch (err) {
      next(err);
    }
  },

  async updateSection(req, res, next) {
    try {
      const section = await CmsService.updateSection(
        req.params.sectionKey,
        req.body
      );
      return ApiResponse.success(res, {
        message: `Section '${req.params.sectionKey}' updated successfully`,
        data: section,
      });
    } catch (err) {
      next(err);
    }
  },

  async toggleVisibility(req, res, next) {
    try {
      const { isVisible } = req.body;
      const section = await CmsService.toggleVisibility(
        req.params.sectionKey,
        isVisible
      );
      return ApiResponse.success(res, {
        message: `Section visibility updated to ${isVisible}`,
        data: section,
      });
    } catch (err) {
      next(err);
    }
  },

  async reorderSections(req, res, next) {
    try {
      const result = await CmsService.reorderSections(req.body.items);
      return ApiResponse.success(res, { message: result.message });
    } catch (err) {
      next(err);
    }
  },

  // Admin Testimonials
  async listTestimonialsAdmin(req, res, next) {
    try {
      const testimonials = await CmsService.listTestimonials(false);
      return ApiResponse.success(res, { data: testimonials });
    } catch (err) {
      next(err);
    }
  },

  async createTestimonial(req, res, next) {
    try {
      const testimonial = await CmsService.createTestimonial(req.body);
      return ApiResponse.created(res, {
        message: 'Testimonial created successfully',
        data: testimonial,
      });
    } catch (err) {
      next(err);
    }
  },

  async updateTestimonial(req, res, next) {
    try {
      const testimonial = await CmsService.updateTestimonial(
        req.params.id,
        req.body
      );
      return ApiResponse.success(res, {
        message: 'Testimonial updated successfully',
        data: testimonial,
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteTestimonial(req, res, next) {
    try {
      await CmsService.deleteTestimonial(req.params.id);
      return ApiResponse.success(res, {
        message: 'Testimonial deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  async reorderTestimonials(req, res, next) {
    try {
      const result = await CmsService.reorderTestimonials(req.body.items);
      return ApiResponse.success(res, { message: result.message });
    } catch (err) {
      next(err);
    }
  },

  // Admin Social Looks
  async listSocialLooksAdmin(req, res, next) {
    try {
      const looks = await CmsService.listSocialLooks(false);
      return ApiResponse.success(res, { data: looks });
    } catch (err) {
      next(err);
    }
  },

  async createSocialLook(req, res, next) {
    try {
      const look = await CmsService.createSocialLook(req.body);
      return ApiResponse.created(res, {
        message: 'Social look created successfully',
        data: look,
      });
    } catch (err) {
      next(err);
    }
  },

  async updateSocialLook(req, res, next) {
    try {
      const look = await CmsService.updateSocialLook(req.params.id, req.body);
      return ApiResponse.success(res, {
        message: 'Social look updated successfully',
        data: look,
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteSocialLook(req, res, next) {
    try {
      await CmsService.deleteSocialLook(req.params.id);
      return ApiResponse.success(res, {
        message: 'Social look deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  async reorderSocialLooks(req, res, next) {
    try {
      const result = await CmsService.reorderSocialLooks(req.body.items);
      return ApiResponse.success(res, { message: result.message });
    } catch (err) {
      next(err);
    }
  },

  // Admin Newsletter
  async listSubscribers(req, res, next) {
    try {
      const subscribers = await CmsService.listSubscribers();
      return ApiResponse.success(res, { data: subscribers });
    } catch (err) {
      next(err);
    }
  },
};
