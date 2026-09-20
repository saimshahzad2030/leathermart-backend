import { Router } from 'express';
import { ProductController } from '../controllers/product.controller.js';
import { CategoryController } from '../controllers/category.controller.js';
import { CmsController } from '../controllers/cms.controller.js';
import { CommissionController } from '../controllers/commission.controller.js';
import { SettingsController } from '../controllers/settings.controller.js';
import { validate } from '../middlewares/validate.js';
import {
  productFilterQuerySchema,
  createReviewSchema,
} from '../validators/product.validator.js';
import { createCommissionSchema } from '../validators/commission.validator.js';
import { subscribeNewsletterSchema } from '../validators/cms.validator.js';

const router = Router();

// 1. Content & Layout APIs
router.get('/content/homepage', CmsController.getHomepageContent);
router.get('/content/navigation', SettingsController.getNavigation);

// 2. Settings & SEO APIs
router.get('/settings/footer', SettingsController.getFooter);
router.get('/settings/announcement', SettingsController.getAnnouncement);
router.get('/settings/shipping', SettingsController.getShipping);
router.get('/settings/search-keywords', SettingsController.getSearchKeywords);
router.get('/seo/metadata', SettingsController.getSeoMetadata);

// 3. Products & Catalogue APIs
router.get('/products', validate(productFilterQuerySchema, 'query'), ProductController.listProducts);
router.get('/products/facets', ProductController.getFacets);
router.get('/products/search', ProductController.search);
router.get('/products/:slug', ProductController.getProductBySlug);
router.get('/products/:slug/reviews', ProductController.listReviews);
router.post('/products/:id/reviews', validate(createReviewSchema), ProductController.addReview);
router.get('/products/:slug/related', ProductController.getRelated);

// 4. Categories & Collections APIs
router.get('/categories', CategoryController.listCategories);
router.get('/categories/:slug', CategoryController.getCategoryBySlug);
router.get('/collections', CategoryController.listCollections);

// 5. Bespoke & Interactive Studio APIs
router.get('/customization/options', CommissionController.getOptions);
router.post(
  '/customization/commissions',
  validate(createCommissionSchema),
  CommissionController.createCommission
);

// 6. Interactions, Testimonials, Social
router.post(
  '/newsletter/subscribe',
  validate(subscribeNewsletterSchema),
  CmsController.subscribeNewsletter
);
router.get('/testimonials', CmsController.listTestimonialsPublic);
router.get('/social-looks', CmsController.listSocialLooksPublic);

export default router;
