-- CreateTable
CREATE TABLE "admin_users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "role" VARCHAR(50) NOT NULL DEFAULT 'store_manager',
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "admin_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(100) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "subtitle" TEXT DEFAULT '',
    "description" TEXT DEFAULT '',
    "hero_image" TEXT DEFAULT '',
    "featured_order" INTEGER DEFAULT 0,
    "is_published" BOOLEAN DEFAULT true,
    "highlight_specs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "seo_title" TEXT,
    "seo_description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(100) NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "season" VARCHAR(100) NOT NULL,
    "subtitle" TEXT DEFAULT '',
    "description" TEXT DEFAULT '',
    "hero_image" TEXT DEFAULT '',
    "badge" VARCHAR(50),
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sku" VARCHAR(50) NOT NULL,
    "slug" VARCHAR(150) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "tagline" TEXT DEFAULT '',
    "category_slug" VARCHAR(100) NOT NULL,
    "category_label" VARCHAR(100) DEFAULT '',
    "collection_id" UUID,
    "gender" VARCHAR(20) DEFAULT 'unisex',
    "styles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "leather_type" VARCHAR(150) NOT NULL,
    "hardware" TEXT DEFAULT '',
    "lining" TEXT DEFAULT '',
    "model_info" TEXT DEFAULT '',
    "description" TEXT NOT NULL,
    "editorial_quote" TEXT DEFAULT '',
    "price" DECIMAL(10,2) NOT NULL,
    "sale_price" DECIMAL(10,2),
    "is_featured" BOOLEAN DEFAULT false,
    "is_bestseller" BOOLEAN DEFAULT false,
    "is_new_arrival" BOOLEAN DEFAULT false,
    "is_published" BOOLEAN DEFAULT true,
    "sort_order" INTEGER DEFAULT 0,
    "rating" DECIMAL(3,2) DEFAULT 5.00,
    "review_count" INTEGER DEFAULT 0,
    "specifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "care_instructions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "available_colors" JSONB DEFAULT '[]',
    "available_sizes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "seo_title" TEXT,
    "seo_description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_images" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT DEFAULT '',
    "is_primary" BOOLEAN DEFAULT false,
    "is_hover" BOOLEAN DEFAULT false,
    "type" VARCHAR(30) DEFAULT 'perspective',
    "sort_order" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "sku" VARCHAR(60) NOT NULL,
    "size" VARCHAR(30) NOT NULL,
    "color" VARCHAR(50) NOT NULL,
    "color_hex" VARCHAR(10) NOT NULL,
    "stock" INTEGER DEFAULT 0,
    "price_override" DECIMAL(10,2),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "author" VARCHAR(100) NOT NULL,
    "location" VARCHAR(100) NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "comment" TEXT NOT NULL,
    "verified" BOOLEAN DEFAULT true,
    "is_approved" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_silhouettes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT DEFAULT '',
    "base_price" DECIMAL(10,2) NOT NULL,
    "image_url" TEXT DEFAULT '',
    "sort_order" INTEGER DEFAULT 0,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_silhouettes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_leathers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "weight" VARCHAR(50) DEFAULT '',
    "origin" VARCHAR(100) DEFAULT '',
    "description" TEXT DEFAULT '',
    "extra_price" DECIMAL(10,2) DEFAULT 0.00,
    "sort_order" INTEGER DEFAULT 0,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_leathers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_colors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(50) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "hex" VARCHAR(10) NOT NULL,
    "sort_order" INTEGER DEFAULT 0,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_colors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_linings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT DEFAULT '',
    "extra_price" DECIMAL(10,2) DEFAULT 0.00,
    "sort_order" INTEGER DEFAULT 0,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_linings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_hardware" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "finish" TEXT DEFAULT '',
    "extra_price" DECIMAL(10,2) DEFAULT 0.00,
    "sort_order" INTEGER DEFAULT 0,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_hardware_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_commissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "dossier_number" VARCHAR(50) NOT NULL,
    "silhouette_id" VARCHAR(50),
    "silhouette_name" VARCHAR(100) DEFAULT '',
    "leather_id" VARCHAR(50),
    "leather_name" VARCHAR(100) DEFAULT '',
    "color_id" VARCHAR(50),
    "color_name" VARCHAR(100) DEFAULT '',
    "lining_id" VARCHAR(50),
    "lining_name" VARCHAR(100) DEFAULT '',
    "hardware_id" VARCHAR(50),
    "hardware_name" VARCHAR(100) DEFAULT '',
    "monogram_text" VARCHAR(10),
    "monogram_placement" VARCHAR(100),
    "measurements" JSONB DEFAULT '{}',
    "customer_name" VARCHAR(150) NOT NULL,
    "customer_email" VARCHAR(255) NOT NULL,
    "customer_phone" VARCHAR(50) DEFAULT '',
    "status" VARCHAR(30) DEFAULT 'pending',
    "estimated_price" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(10) DEFAULT 'EUR',
    "estimated_delivery" VARCHAR(50) DEFAULT '4–6 weeks',
    "notes" TEXT DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_sections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "section_key" VARCHAR(50) NOT NULL,
    "title" TEXT DEFAULT '',
    "subtitle" TEXT DEFAULT '',
    "eyebrow" TEXT DEFAULT '',
    "body" JSONB,
    "primary_cta" JSONB DEFAULT '{"label": "", "href": ""}',
    "secondary_cta" JSONB DEFAULT '{"label": "", "href": ""}',
    "media_url" TEXT DEFAULT '',
    "secondary_media_url" TEXT DEFAULT '',
    "extra_payload" JSONB DEFAULT '{}',
    "is_visible" BOOLEAN DEFAULT true,
    "sort_order" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cms_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "singleton_key" VARCHAR(20) DEFAULT 'global',
    "announcement" JSONB DEFAULT '{}',
    "shipping" JSONB DEFAULT '{}',
    "footer" JSONB DEFAULT '{}',
    "search_keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "navigation_menus" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "menu_key" VARCHAR(50) NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "navigation_menus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "testimonials" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "quote" TEXT NOT NULL,
    "author" VARCHAR(100) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "country" VARCHAR(100) NOT NULL,
    "verified_garment" VARCHAR(150) NOT NULL,
    "rating" INTEGER DEFAULT 5,
    "sort_order" INTEGER DEFAULT 0,
    "is_published" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "testimonials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_looks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "image_url" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "tag" VARCHAR(100) DEFAULT '@ATELIERVALENTI',
    "instagram_url" TEXT,
    "sort_order" INTEGER DEFAULT 0,
    "is_published" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_looks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "newsletter_subscribers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "locale" VARCHAR(10) DEFAULT 'en',
    "is_active" BOOLEAN DEFAULT true,
    "subscribed_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "newsletter_subscribers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "filename" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "size" BIGINT NOT NULL,
    "url" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "format" VARCHAR(20),
    "folder" VARCHAR(50) DEFAULT 'general',
    "alt_text" TEXT DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_admin_id_idx" ON "refresh_tokens"("admin_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "collections_slug_key" ON "collections"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_category_slug_idx" ON "products"("category_slug");

-- CreateIndex
CREATE INDEX "products_collection_id_idx" ON "products"("collection_id");

-- CreateIndex
CREATE INDEX "products_is_published_idx" ON "products"("is_published");

-- CreateIndex
CREATE INDEX "products_gender_idx" ON "products"("gender");

-- CreateIndex
CREATE INDEX "products_is_featured_idx" ON "products"("is_featured");

-- CreateIndex
CREATE INDEX "products_is_bestseller_idx" ON "products"("is_bestseller");

-- CreateIndex
CREATE INDEX "products_is_new_arrival_idx" ON "products"("is_new_arrival");

-- CreateIndex
CREATE INDEX "product_images_product_id_idx" ON "product_images"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants"("sku");

-- CreateIndex
CREATE INDEX "product_variants_product_id_idx" ON "product_variants"("product_id");

-- CreateIndex
CREATE INDEX "product_reviews_product_id_idx" ON "product_reviews"("product_id");

-- CreateIndex
CREATE INDEX "product_reviews_is_approved_idx" ON "product_reviews"("is_approved");

-- CreateIndex
CREATE UNIQUE INDEX "custom_silhouettes_slug_key" ON "custom_silhouettes"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "custom_leathers_slug_key" ON "custom_leathers"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "custom_colors_slug_key" ON "custom_colors"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "custom_linings_slug_key" ON "custom_linings"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "custom_hardware_slug_key" ON "custom_hardware"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "custom_commissions_dossier_number_key" ON "custom_commissions"("dossier_number");

-- CreateIndex
CREATE INDEX "custom_commissions_status_idx" ON "custom_commissions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "cms_sections_section_key_key" ON "cms_sections"("section_key");

-- CreateIndex
CREATE INDEX "cms_sections_is_visible_idx" ON "cms_sections"("is_visible");

-- CreateIndex
CREATE INDEX "cms_sections_sort_order_idx" ON "cms_sections"("sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "site_settings_singleton_key_key" ON "site_settings"("singleton_key");

-- CreateIndex
CREATE UNIQUE INDEX "navigation_menus_menu_key_key" ON "navigation_menus"("menu_key");

-- CreateIndex
CREATE INDEX "testimonials_is_published_idx" ON "testimonials"("is_published");

-- CreateIndex
CREATE INDEX "social_looks_is_published_idx" ON "social_looks"("is_published");

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_subscribers_email_key" ON "newsletter_subscribers"("email");

-- CreateIndex
CREATE INDEX "media_assets_folder_idx" ON "media_assets"("folder");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_slug_fkey" FOREIGN KEY ("category_slug") REFERENCES "categories"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
