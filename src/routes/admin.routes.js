import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { ProductController } from '../controllers/product.controller.js';
import { SizeController } from '../controllers/size.controller.js';
import { ColorController } from '../controllers/color.controller.js';
import { PolicyController } from '../controllers/policy.controller.js';
import { CategoryController } from '../controllers/category.controller.js';
import { CmsController } from '../controllers/cms.controller.js';
import { CommissionController } from '../controllers/commission.controller.js';
import { SettingsController } from '../controllers/settings.controller.js';
import { MediaController } from '../controllers/media.controller.js';
import { ContactController } from '../controllers/contact.controller.js';

import { authenticate, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { upload } from '../middlewares/upload.js';
import { authRateLimiter } from '../middlewares/rateLimiter.js';
import { ROLES } from '../config/constants.js';

import {
  createContactMessageSchema,
  updateContactMessageSchema,
  contactFilterQuerySchema,
} from '../validators/contact.validator.js';

import {
  loginSchema,
  changePasswordSchema,
  createAdminUserSchema,
  updateAdminUserSchema,
} from '../validators/auth.validator.js';
import {
  createProductSchema,
  updateProductSchema,
  bulkProductActionSchema,
  reorderSchema,
} from '../validators/product.validator.js';
import {
  createSizeSchema,
  updateSizeSchema,
} from '../validators/size.validator.js';
import {
  createColorSchema,
  updateColorSchema,
} from '../validators/color.validator.js';
import {
  createPolicySchema,
  updatePolicySchema,
} from '../validators/policy.validator.js';
import {
  createCategorySchema,
  updateCategorySchema,
  createCollectionSchema,
  updateCollectionSchema,
} from '../validators/category.validator.js';
import {
  updateCommissionStatusSchema,
  bulkCommissionStatusSchema,
} from '../validators/commission.validator.js';
import {
  updateCmsSectionSchema,
  updateSectionVisibilitySchema,
  createTestimonialSchema,
  updateTestimonialSchema,
  createSocialLookSchema,
  updateSocialLookSchema,
} from '../validators/cms.validator.js';
import {
  updateSettingsSchema,
  updateBrandingSchema,
  updateSearchKeywordsSchema,
} from '../validators/settings.validator.js';

const router = Router();

// ==========================================
// 1. Authentication (Public Admin endpoints)
// ==========================================
router.post('/auth/login', authRateLimiter, validate(loginSchema), AuthController.login);
router.post('/auth/refresh', AuthController.refresh);
router.post('/auth/logout', AuthController.logout);

// ==========================================
// All routes below require Admin Authentication
// ==========================================
router.use(authenticate);

// Profile & Password
router.get('/auth/me', AuthController.getMe);
router.post(
  '/auth/change-password',
  validate(changePasswordSchema),
  AuthController.changePassword
);

// Admin User Management (Super Admin only)
router.get('/users', authorize(ROLES.SUPER_ADMIN), AuthController.listUsers);
router.post(
  '/users',
  authorize(ROLES.SUPER_ADMIN),
  validate(createAdminUserSchema),
  AuthController.createUser
);
router.put(
  '/users/:id',
  authorize(ROLES.SUPER_ADMIN),
  validate(updateAdminUserSchema),
  AuthController.updateUser
);
router.delete('/users/:id', authorize(ROLES.SUPER_ADMIN), AuthController.deleteUser);

// ==========================================
// Middleware to parse multipart/form-data for products if files or form data are submitted
const parseMultipartProduct = (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    upload.any()(req, res, (err) => {
      if (err) return next(err);
      if (typeof req.body.data === 'string') {
        try {
          const parsed = JSON.parse(req.body.data);
          req.body = { ...parsed, ...req.body };
          delete req.body.data;
        } catch (e) { }
      }
      if (typeof req.body.price === 'string') req.body.price = Number(req.body.price);
      if (typeof req.body.salePrice === 'string') req.body.salePrice = Number(req.body.salePrice);
      if (typeof req.body.isFeatured === 'string') req.body.isFeatured = req.body.isFeatured === 'true';
      if (typeof req.body.isBestseller === 'string') req.body.isBestseller = req.body.isBestseller === 'true';
      if (typeof req.body.isNewArrival === 'string') req.body.isNewArrival = req.body.isNewArrival === 'true';
      if (typeof req.body.isPublished === 'string') req.body.isPublished = req.body.isPublished === 'true';
      if (typeof req.body.isInStock === 'string') req.body.isInStock = req.body.isInStock === 'true' || req.body.isInStock === '1';
      if (typeof req.body.inStock === 'string' && req.body.isInStock === undefined) req.body.isInStock = req.body.inStock === 'true' || req.body.inStock === '1';
      if (typeof req.body.sortOrder === 'string') req.body.sortOrder = parseInt(req.body.sortOrder, 10);
      if (typeof req.body.styles === 'string') {
        try { req.body.styles = JSON.parse(req.body.styles); } catch (e) { req.body.styles = [req.body.styles]; }
      }
      if (typeof req.body.specifications === 'string') {
        try { req.body.specifications = JSON.parse(req.body.specifications); } catch (e) { req.body.specifications = [req.body.specifications]; }
      }
      if (typeof req.body.careInstructions === 'string') {
        try { req.body.careInstructions = JSON.parse(req.body.careInstructions); } catch (e) { req.body.careInstructions = [req.body.careInstructions]; }
      }
      if (typeof req.body.availableColors === 'string') {
        try { req.body.availableColors = JSON.parse(req.body.availableColors); } catch (e) { }
      }
      if (typeof req.body.availableSizes === 'string') {
        try { req.body.availableSizes = JSON.parse(req.body.availableSizes); } catch (e) { req.body.availableSizes = [req.body.availableSizes]; }
      }
      if (typeof req.body.variants === 'string') {
        try { req.body.variants = JSON.parse(req.body.variants); } catch (e) { }
      }
      if (typeof req.body.images === 'string') {
        try { req.body.images = JSON.parse(req.body.images); } catch (e) { }
      }
      if (typeof req.body.sizes === 'string') {
        try { req.body.sizes = JSON.parse(req.body.sizes); } catch (e) { req.body.sizes = [req.body.sizes]; }
      }
      if (typeof req.body.colors === 'string') {
        try { req.body.colors = JSON.parse(req.body.colors); } catch (e) { }
      }
      if (typeof req.body.regionalPrices === 'string') {
        try { req.body.regionalPrices = JSON.parse(req.body.regionalPrices); } catch (e) { }
      }
      if (typeof req.body.policies === 'string') {
        try { req.body.policies = JSON.parse(req.body.policies); } catch (e) { req.body.policies = [req.body.policies]; }
      }
      next();
    });
  } else {
    next();
  }
};

// 2. Catalogue Management (Products & Reviews)
// ==========================================
router.get('/products', ProductController.listProductsAdmin);
router.post(
  '/products',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  parseMultipartProduct,
  validate(createProductSchema),
  ProductController.createProduct
);
router.get('/products/:id', ProductController.getProductById);
router.put(
  '/products/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  parseMultipartProduct,
  validate(updateProductSchema),
  ProductController.updateProduct
);
router.patch(
  '/products/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  parseMultipartProduct,
  ProductController.updateProduct
);
router.delete(
  '/products/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  ProductController.deleteProduct
);
router.post(
  '/products/:id/publish',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER, ROLES.CONTENT_EDITOR),
  ProductController.togglePublish
);
router.post(
  '/products/:id/duplicate',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  ProductController.duplicateProduct
);
router.post(
  '/products/bulk',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  validate(bulkProductActionSchema),
  ProductController.bulkAction
);
router.put(
  '/products/reorder',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  validate(reorderSchema),
  ProductController.reorder
);

// Reviews Moderation Queue
router.get('/reviews', ProductController.listAllReviews);
router.patch(
  '/reviews/:id/approve',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER, ROLES.CONTENT_EDITOR),
  ProductController.moderateReview
);
router.delete(
  '/reviews/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  ProductController.deleteReview
);

// ==========================================
// 2b. Product Sizes Management
// ==========================================
router.get('/sizes', SizeController.listSizesAdmin);
router.get('/sizes/:id', SizeController.getSizeById);
router.post(
  '/sizes',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  validate(createSizeSchema),
  SizeController.createSize
);
router.put(
  '/sizes/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  validate(updateSizeSchema),
  SizeController.updateSize
);
router.post(
  '/sizes/:id/toggle-active',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  SizeController.toggleActive
);
router.delete(
  '/sizes/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  SizeController.deleteSize
);

// ==========================================
// 2c. Product Colors Management
// ==========================================
router.get('/colors', ColorController.listColorsAdmin);
router.get('/colors/:id', ColorController.getColorById);
router.post(
  '/colors',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  validate(createColorSchema),
  ColorController.createColor
);
router.put(
  '/colors/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  validate(updateColorSchema),
  ColorController.updateColor
);
router.post(
  '/colors/:id/toggle-active',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  ColorController.toggleActive
);
router.delete(
  '/colors/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  ColorController.deleteColor
);

// ==========================================
// 2d. Reusable Product Policies Management
// ==========================================
router.get('/policies', PolicyController.listPoliciesAdmin);
router.get('/policies/:id', PolicyController.getPolicyById);
router.post(
  '/policies',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  validate(createPolicySchema),
  PolicyController.createPolicy
);
router.put(
  '/policies/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  validate(updatePolicySchema),
  PolicyController.updatePolicy
);
router.post(
  '/policies/:id/toggle-active',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  PolicyController.toggleActive
);
router.delete(
  '/policies/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  PolicyController.deletePolicy
);

// ==========================================
// 3. Categories & Collections Management
// ==========================================
router.get('/categories', CategoryController.listCategoriesAdmin);
router.post(
  '/categories',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  validate(createCategorySchema),
  CategoryController.createCategory
);
router.put(
  '/categories/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  validate(updateCategorySchema),
  CategoryController.updateCategory
);
router.delete(
  '/categories/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  CategoryController.deleteCategory
);
router.put(
  '/categories/reorder',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  validate(reorderSchema),
  CategoryController.reorderCategories
);

router.get('/collections', CategoryController.listCollectionsAdmin);
router.post(
  '/collections',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  validate(createCollectionSchema),
  CategoryController.createCollection
);
router.put(
  '/collections/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  validate(updateCollectionSchema),
  CategoryController.updateCollection
);
router.delete(
  '/collections/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  CategoryController.deleteCollection
);

// ==========================================
// 4. Homepage & CMS Content Builder
// ==========================================
router.get('/cms/sections', CmsController.getAllSections);
router.get('/cms/sections/:sectionKey', CmsController.getSection);
router.put(
  '/cms/sections/:sectionKey',
  authorize(ROLES.SUPER_ADMIN, ROLES.CONTENT_EDITOR),
  validate(updateCmsSectionSchema),
  CmsController.updateSection
);
router.patch(
  '/cms/sections/:sectionKey/visibility',
  authorize(ROLES.SUPER_ADMIN, ROLES.CONTENT_EDITOR),
  validate(updateSectionVisibilitySchema),
  CmsController.toggleVisibility
);
router.put(
  '/cms/sections/reorder',
  authorize(ROLES.SUPER_ADMIN, ROLES.CONTENT_EDITOR),
  validate(reorderSchema),
  CmsController.reorderSections
);

// Testimonials
router.get('/testimonials', CmsController.listTestimonialsAdmin);
router.post(
  '/testimonials',
  authorize(ROLES.SUPER_ADMIN, ROLES.CONTENT_EDITOR),
  validate(createTestimonialSchema),
  CmsController.createTestimonial
);
router.put(
  '/testimonials/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.CONTENT_EDITOR),
  validate(updateTestimonialSchema),
  CmsController.updateTestimonial
);
router.delete(
  '/testimonials/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.CONTENT_EDITOR),
  CmsController.deleteTestimonial
);
router.put(
  '/testimonials/reorder',
  authorize(ROLES.SUPER_ADMIN, ROLES.CONTENT_EDITOR),
  validate(reorderSchema),
  CmsController.reorderTestimonials
);

// Social Looks
router.get('/social-looks', CmsController.listSocialLooksAdmin);
router.post(
  '/social-looks',
  authorize(ROLES.SUPER_ADMIN, ROLES.CONTENT_EDITOR),
  validate(createSocialLookSchema),
  CmsController.createSocialLook
);
router.put(
  '/social-looks/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.CONTENT_EDITOR),
  validate(updateSocialLookSchema),
  CmsController.updateSocialLook
);
router.delete(
  '/social-looks/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.CONTENT_EDITOR),
  CmsController.deleteSocialLook
);
router.put(
  '/social-looks/reorder',
  authorize(ROLES.SUPER_ADMIN, ROLES.CONTENT_EDITOR),
  validate(reorderSchema),
  CmsController.reorderSocialLooks
);

// Subscribers
router.get('/subscribers', CmsController.listSubscribers);

// ==========================================
// 5. Bespoke & Custom Commission Management
// ==========================================
router.get('/commissions', CommissionController.listCommissions);
router.get('/commissions/:id', CommissionController.getCommissionById);
router.patch(
  '/commissions/:id/status',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER, ROLES.CONCIERGE),
  validate(updateCommissionStatusSchema),
  CommissionController.updateStatus
);
router.post(
  '/commissions/bulk-status',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER, ROLES.CONCIERGE),
  validate(bulkCommissionStatusSchema),
  CommissionController.bulkUpdateStatus
);

// Custom Configuration Studio Options CRUD
router.post('/customization/silhouettes', CommissionController.createSilhouette);
router.put('/customization/silhouettes/:id', CommissionController.updateSilhouette);
router.delete('/customization/silhouettes/:id', CommissionController.deleteSilhouette);

router.post('/customization/leathers', CommissionController.createLeather);
router.put('/customization/leathers/:id', CommissionController.updateLeather);
router.delete('/customization/leathers/:id', CommissionController.deleteLeather);

router.post('/customization/colors', CommissionController.createColor);
router.put('/customization/colors/:id', CommissionController.updateColor);
router.delete('/customization/colors/:id', CommissionController.deleteColor);

router.post('/customization/linings', CommissionController.createLining);
router.put('/customization/linings/:id', CommissionController.updateLining);
router.delete('/customization/linings/:id', CommissionController.deleteLining);

router.post('/customization/hardware', CommissionController.createHardware);
router.put('/customization/hardware/:id', CommissionController.updateHardware);
router.delete('/customization/hardware/:id', CommissionController.deleteHardware);

// ==========================================
// 6. Global Settings & Navigation Menus
// ==========================================
router.get('/settings/branding', SettingsController.getBranding);
router.patch(
  '/settings/branding',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  validate(updateBrandingSchema),
  SettingsController.updateBranding
);
router.get('/settings', SettingsController.getSettings);
router.patch(
  '/settings',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  validate(updateSettingsSchema),
  SettingsController.updateSettings
);
router.put(
  '/settings/search-keywords',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER, ROLES.CONTENT_EDITOR),
  validate(updateSearchKeywordsSchema),
  SettingsController.updateSearchKeywords
);
router.get('/navigation/mega-menu', SettingsController.getNavigation);
router.put(
  '/navigation/mega-menu/:menuKey',
  authorize(ROLES.SUPER_ADMIN, ROLES.CONTENT_EDITOR),
  SettingsController.updateNavigationMenu
);

// ==========================================
// 7. Media & File Management
// ==========================================
router.post('/media/upload', upload.single('file'), MediaController.uploadFile);
router.post('/products/images/upload', upload.single('file'), MediaController.uploadFile);
router.get('/media', MediaController.listMedia);
router.delete('/media/:id', authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER), MediaController.deleteMedia);

// ==========================================
// 8. Contact Inquiries Management
// ==========================================
router.get(
  '/contact-messages',
  validate(contactFilterQuerySchema, 'query'),
  ContactController.listMessagesAdmin
);
router.get(
  '/contact-messages/:id',
  ContactController.getMessageByIdAdmin
);
router.patch(
  '/contact-messages/:id',
  validate(updateContactMessageSchema),
  ContactController.updateMessageAdmin
);
router.delete(
  '/contact-messages/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  ContactController.deleteMessageAdmin
);

export default router;
