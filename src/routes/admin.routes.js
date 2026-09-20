import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { ProductController } from '../controllers/product.controller.js';
import { CategoryController } from '../controllers/category.controller.js';
import { CmsController } from '../controllers/cms.controller.js';
import { CommissionController } from '../controllers/commission.controller.js';
import { SettingsController } from '../controllers/settings.controller.js';
import { MediaController } from '../controllers/media.controller.js';

import { authenticate, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { upload } from '../middlewares/upload.js';
import { authRateLimiter } from '../middlewares/rateLimiter.js';
import { ROLES } from '../config/constants.js';

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
// 2. Catalogue Management (Products & Reviews)
// ==========================================
router.get('/products', ProductController.listProductsAdmin);
router.post(
  '/products',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  validate(createProductSchema),
  ProductController.createProduct
);
router.get('/products/:id', ProductController.getProductById);
router.put(
  '/products/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
  validate(updateProductSchema),
  ProductController.updateProduct
);
router.patch(
  '/products/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
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
router.get('/media', MediaController.listMedia);
router.delete('/media/:id', authorize(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER), MediaController.deleteMedia);

export default router;
