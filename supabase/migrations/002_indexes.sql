-- ============================================================================
-- Atelier Valenti Milano: Supabase Indexes & Full-Text Search Migration (002)
-- ============================================================================

-- Extensions for text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Products Indexes
CREATE INDEX IF NOT EXISTS idx_products_slug ON products (slug);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products (sku);
CREATE INDEX IF NOT EXISTS idx_products_category_slug ON products (category_slug);
CREATE INDEX IF NOT EXISTS idx_products_gender ON products (gender);
CREATE INDEX IF NOT EXISTS idx_products_is_published ON products (is_published);
CREATE INDEX IF NOT EXISTS idx_products_sort_order ON products (sort_order);
CREATE INDEX IF NOT EXISTS idx_products_is_featured ON products (is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_products_is_bestseller ON products (is_bestseller) WHERE is_bestseller = true;
CREATE INDEX IF NOT EXISTS idx_products_is_new_arrival ON products (is_new_arrival) WHERE is_new_arrival = true;
CREATE INDEX IF NOT EXISTS idx_products_price ON products (price);
CREATE INDEX IF NOT EXISTS idx_products_compound_query ON products (is_published, category_slug, sort_order);

-- GIN index for styles array
CREATE INDEX IF NOT EXISTS idx_products_styles ON products USING GIN (styles);

-- GIN Trigram index for ultra-fast partial/case-insensitive search across name, tagline, description, leather_type
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_tagline_trgm ON products USING GIN (tagline gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_desc_trgm ON products USING GIN (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_leather_trgm ON products USING GIN (leather_type gin_trgm_ops);

-- Product Images & Variants Indexes
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images (product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants (product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON product_reviews (product_id, is_approved);

-- Categories & Collections Indexes
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories (slug);
CREATE INDEX IF NOT EXISTS idx_categories_featured_order ON categories (featured_order);
CREATE INDEX IF NOT EXISTS idx_collections_slug ON collections (slug);

-- Custom Commissions Indexes
CREATE INDEX IF NOT EXISTS idx_commissions_dossier ON custom_commissions (dossier_number);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON custom_commissions (status);
CREATE INDEX IF NOT EXISTS idx_commissions_customer_email ON custom_commissions (customer_email);

-- CMS & Settings Indexes
CREATE INDEX IF NOT EXISTS idx_cms_sections_key ON cms_sections (section_key);
CREATE INDEX IF NOT EXISTS idx_testimonials_published ON testimonials (is_published, sort_order);
CREATE INDEX IF NOT EXISTS idx_social_looks_published ON social_looks (is_published, sort_order);
CREATE INDEX IF NOT EXISTS idx_media_assets_folder ON media_assets (folder);
