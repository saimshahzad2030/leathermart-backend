-- CreateEnum (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NavigationItemType') THEN
        CREATE TYPE "NavigationItemType" AS ENUM ('CUSTOM_LINK', 'CATEGORY', 'PRODUCT');
    END IF;
END$$;

-- AlterTable navigation_menus (safely with non-destructive backfill for existing rows)
ALTER TABLE "navigation_menus"
  ADD COLUMN IF NOT EXISTS "name" VARCHAR(150),
  ADD COLUMN IF NOT EXISTS "department" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "slug" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "is_draft" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "draft_payload" JSONB;

-- Explicit mapping to backfill existing rows
UPDATE "navigation_menus"
SET
  "department" = CASE
    WHEN LOWER(TRIM(COALESCE("menu_key", ''))) = 'women' THEN 'women'
    ELSE 'men'
  END,
  "slug" = CASE
    WHEN LOWER(TRIM(COALESCE("menu_key", ''))) = 'women' THEN 'women'
    ELSE 'men'
  END,
  "name" = CASE
    WHEN LOWER(TRIM(COALESCE("menu_key", ''))) = 'women' THEN 'Women Navigation'
    ELSE 'Men Navigation'
  END,
  "draft_payload" = COALESCE("draft_payload", "payload")
WHERE "department" IS NULL OR "name" IS NULL OR "slug" IS NULL OR "draft_payload" IS NULL;

-- Enforce NOT NULL on new required fields and allow legacy columns to be nullable
ALTER TABLE "navigation_menus"
  ALTER COLUMN "name" SET NOT NULL,
  ALTER COLUMN "department" SET NOT NULL,
  ALTER COLUMN "slug" SET NOT NULL,
  ALTER COLUMN "menu_key" DROP NOT NULL,
  ALTER COLUMN "payload" DROP NOT NULL;

-- CreateTable navigation_sections
CREATE TABLE IF NOT EXISTS "navigation_sections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "navigation_menu_id" UUID NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_draft" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "navigation_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable navigation_items
CREATE TABLE IF NOT EXISTS "navigation_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "legacy_id" VARCHAR(100),
    "navigation_section_id" UUID NOT NULL,
    "label" VARCHAR(150) NOT NULL,
    "label_key" VARCHAR(100),
    "href" VARCHAR(500) NOT NULL,
    "item_type" "NavigationItemType" NOT NULL DEFAULT 'CUSTOM_LINK',
    "category_id" UUID,
    "product_id" UUID,
    "badge" VARCHAR(50),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "is_draft" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "navigation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable navigation_features
CREATE TABLE IF NOT EXISTS "navigation_features" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "navigation_menu_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "image" VARCHAR(1000) NOT NULL,
    "href" VARCHAR(500) NOT NULL,
    "badge" VARCHAR(100),
    "cta_text" VARCHAR(100),
    "cta_text_key" VARCHAR(100),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_draft" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "navigation_features_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE INDEX IF NOT EXISTS "navigation_sections_navigation_menu_id_idx" ON "navigation_sections"("navigation_menu_id");
CREATE UNIQUE INDEX IF NOT EXISTS "navigation_sections_navigation_menu_id_slug_key" ON "navigation_sections"("navigation_menu_id", "slug");

CREATE INDEX IF NOT EXISTS "navigation_items_navigation_section_id_idx" ON "navigation_items"("navigation_section_id");
CREATE INDEX IF NOT EXISTS "navigation_items_legacy_id_idx" ON "navigation_items"("legacy_id");
CREATE INDEX IF NOT EXISTS "navigation_items_category_id_idx" ON "navigation_items"("category_id");
CREATE INDEX IF NOT EXISTS "navigation_items_product_id_idx" ON "navigation_items"("product_id");

CREATE INDEX IF NOT EXISTS "navigation_features_navigation_menu_id_idx" ON "navigation_features"("navigation_menu_id");

CREATE UNIQUE INDEX IF NOT EXISTS "navigation_menus_department_key" ON "navigation_menus"("department");
CREATE UNIQUE INDEX IF NOT EXISTS "navigation_menus_slug_key" ON "navigation_menus"("slug");

-- AddForeignKeys
ALTER TABLE "navigation_sections"
  DROP CONSTRAINT IF EXISTS "navigation_sections_navigation_menu_id_fkey",
  ADD CONSTRAINT "navigation_sections_navigation_menu_id_fkey" FOREIGN KEY ("navigation_menu_id") REFERENCES "navigation_menus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "navigation_items"
  DROP CONSTRAINT IF EXISTS "navigation_items_navigation_section_id_fkey",
  ADD CONSTRAINT "navigation_items_navigation_section_id_fkey" FOREIGN KEY ("navigation_section_id") REFERENCES "navigation_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "navigation_items"
  DROP CONSTRAINT IF EXISTS "navigation_items_category_id_fkey",
  ADD CONSTRAINT "navigation_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "navigation_items"
  DROP CONSTRAINT IF EXISTS "navigation_items_product_id_fkey",
  ADD CONSTRAINT "navigation_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "navigation_features"
  DROP CONSTRAINT IF EXISTS "navigation_features_navigation_menu_id_fkey",
  ADD CONSTRAINT "navigation_features_navigation_menu_id_fkey" FOREIGN KEY ("navigation_menu_id") REFERENCES "navigation_menus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill sections, items, and promotional features from existing JSON payloads
DO $$
DECLARE
    m RECORD;
    sec_cat_id UUID;
    sec_style_id UUID;
    sec_shop_id UUID;
    item RECORD;
    cat_match_id UUID;
    item_idx INT;
    feat JSONB;
    clean_slug TEXT;
    dept_slug TEXT;
BEGIN
    FOR m IN SELECT id, department, menu_key, payload FROM "navigation_menus" WHERE payload IS NOT NULL LOOP
        -- 1. Create or get 'Categories' section
        INSERT INTO "navigation_sections" ("id", "navigation_menu_id", "title", "slug", "sort_order", "is_active", "is_draft")
        VALUES (gen_random_uuid(), m.id, 'Categories', 'categories', 0, true, false)
        ON CONFLICT ("navigation_menu_id", "slug") DO UPDATE SET "title" = EXCLUDED."title"
        RETURNING "id" INTO sec_cat_id;

        -- Insert category items
        IF m.payload->'categories' IS NOT NULL AND jsonb_typeof(m.payload->'categories') = 'array' THEN
            item_idx := 0;
            FOR item IN SELECT * FROM jsonb_array_elements(m.payload->'categories') LOOP
                clean_slug := regexp_replace(item.value->>'href', '^/(men|women)/', '');
                dept_slug := m.department || '-' || clean_slug;

                -- Deterministic matching against actual category records
                SELECT c.id INTO cat_match_id
                FROM "categories" c
                WHERE c.slug = dept_slug
                   OR c.slug = clean_slug
                   OR (clean_slug = 'leather-coats' AND c.slug = 'trench')
                   OR (clean_slug = 'aviator-jackets' AND c.slug = 'aviator')
                   OR (clean_slug = 'shearling-jackets' AND c.slug = 'aviator')
                   OR (clean_slug = 'leather-vests' AND c.slug LIKE 'men-vests%')
                ORDER BY CASE WHEN c.slug = dept_slug THEN 0 WHEN c.slug = clean_slug THEN 1 ELSE 2 END
                LIMIT 1;

                INSERT INTO "navigation_items" (
                    "navigation_section_id",
                    "legacy_id",
                    "label",
                    "label_key",
                    "href",
                    "badge",
                    "item_type",
                    "category_id",
                    "sort_order",
                    "is_active",
                    "is_draft"
                ) VALUES (
                    sec_cat_id,
                    item.value->>'id',
                    COALESCE(item.value->>'fallbackLabel', item.value->>'name', item.value->>'id', 'Category'),
                    item.value->>'labelKey',
                    COALESCE(item.value->>'href', '/' || m.department),
                    item.value->>'badge',
                    CASE WHEN cat_match_id IS NOT NULL THEN 'CATEGORY'::"NavigationItemType" ELSE 'CUSTOM_LINK'::"NavigationItemType" END,
                    cat_match_id,
                    item_idx,
                    true,
                    false
                );
                item_idx := item_idx + 1;
            END LOOP;
        END IF;

        -- 2. Create or get 'Styles' / 'Coats' section
        IF m.department = 'women' THEN
            INSERT INTO "navigation_sections" ("id", "navigation_menu_id", "title", "slug", "sort_order", "is_active", "is_draft")
            VALUES (gen_random_uuid(), m.id, 'Coats', 'coats', 1, true, false)
            ON CONFLICT ("navigation_menu_id", "slug") DO UPDATE SET "title" = EXCLUDED."title"
            RETURNING "id" INTO sec_style_id;

            IF m.payload->'coats' IS NOT NULL AND jsonb_typeof(m.payload->'coats') = 'array' THEN
                item_idx := 0;
                FOR item IN SELECT * FROM jsonb_array_elements(m.payload->'coats') LOOP
                    clean_slug := regexp_replace(item.value->>'href', '^/(men|women)/', '');
                    dept_slug := m.department || '-' || clean_slug;

                    SELECT c.id INTO cat_match_id
                    FROM "categories" c
                    WHERE c.slug = dept_slug
                       OR c.slug = clean_slug
                       OR (clean_slug = 'leather-coats' AND c.slug = 'trench')
                       OR (clean_slug IN ('shearling-jackets', 'shearling-coats') AND c.slug = 'aviator')
                    ORDER BY CASE WHEN c.slug = dept_slug THEN 0 WHEN c.slug = clean_slug THEN 1 ELSE 2 END
                    LIMIT 1;

                    INSERT INTO "navigation_items" (
                        "navigation_section_id", "legacy_id", "label", "label_key", "href", "badge",
                        "item_type", "category_id", "sort_order", "is_active", "is_draft"
                    ) VALUES (
                        sec_style_id,
                        item.value->>'id',
                        COALESCE(item.value->>'fallbackLabel', item.value->>'name', item.value->>'id'),
                        item.value->>'labelKey',
                        COALESCE(item.value->>'href', '/' || m.department),
                        item.value->>'badge',
                        CASE WHEN cat_match_id IS NOT NULL THEN 'CATEGORY'::"NavigationItemType" ELSE 'CUSTOM_LINK'::"NavigationItemType" END,
                        cat_match_id,
                        item_idx,
                        true,
                        false
                    );
                    item_idx := item_idx + 1;
                END LOOP;
            END IF;
        ELSE
            INSERT INTO "navigation_sections" ("id", "navigation_menu_id", "title", "slug", "sort_order", "is_active", "is_draft")
            VALUES (gen_random_uuid(), m.id, 'Styles', 'styles', 1, true, false)
            ON CONFLICT ("navigation_menu_id", "slug") DO UPDATE SET "title" = EXCLUDED."title"
            RETURNING "id" INTO sec_style_id;

            IF m.payload->'styles' IS NOT NULL AND jsonb_typeof(m.payload->'styles') = 'array' THEN
                item_idx := 0;
                FOR item IN SELECT * FROM jsonb_array_elements(m.payload->'styles') LOOP
                    INSERT INTO "navigation_items" (
                        "navigation_section_id", "legacy_id", "label", "label_key", "href", "badge",
                        "item_type", "category_id", "sort_order", "is_active", "is_draft"
                    ) VALUES (
                        sec_style_id,
                        item.value->>'id',
                        COALESCE(item.value->>'fallbackLabel', item.value->>'name', item.value->>'id'),
                        item.value->>'labelKey',
                        COALESCE(item.value->>'href', '/' || m.department),
                        item.value->>'badge',
                        'CUSTOM_LINK'::"NavigationItemType",
                        NULL,
                        item_idx,
                        true,
                        false
                    );
                    item_idx := item_idx + 1;
                END LOOP;
            END IF;
        END IF;

        -- 3. Create or get 'Shop By' section
        INSERT INTO "navigation_sections" ("id", "navigation_menu_id", "title", "slug", "sort_order", "is_active", "is_draft")
        VALUES (gen_random_uuid(), m.id, 'Shop By', 'shop-by', 2, true, false)
        ON CONFLICT ("navigation_menu_id", "slug") DO UPDATE SET "title" = EXCLUDED."title"
        RETURNING "id" INTO sec_shop_id;

        IF m.payload->'shopBy' IS NOT NULL AND jsonb_typeof(m.payload->'shopBy') = 'array' THEN
            item_idx := 0;
            FOR item IN SELECT * FROM jsonb_array_elements(m.payload->'shopBy') LOOP
                INSERT INTO "navigation_items" (
                    "navigation_section_id", "legacy_id", "label", "label_key", "href", "badge",
                    "item_type", "category_id", "sort_order", "is_active", "is_draft"
                ) VALUES (
                    sec_shop_id,
                    item.value->>'id',
                    COALESCE(item.value->>'fallbackLabel', item.value->>'name', item.value->>'id'),
                    item.value->>'labelKey',
                    COALESCE(item.value->>'href', '/' || m.department),
                    item.value->>'badge',
                    'CUSTOM_LINK'::"NavigationItemType",
                    NULL,
                    item_idx,
                    true,
                    false
                );
                item_idx := item_idx + 1;
            END LOOP;
        END IF;

        -- 4. Create promotional feature
        feat := m.payload->'featured';
        IF feat IS NOT NULL AND feat != 'null'::jsonb AND feat->>'title' IS NOT NULL THEN
            INSERT INTO "navigation_features" (
                "navigation_menu_id",
                "title",
                "description",
                "image",
                "href",
                "badge",
                "cta_text",
                "cta_text_key",
                "sort_order",
                "is_active",
                "is_draft"
            ) VALUES (
                m.id,
                feat->>'title',
                feat->>'description',
                COALESCE(feat->>'imageUrl', feat->>'image', ''),
                COALESCE(feat->>'href', '/' || m.department),
                feat->>'tag',
                COALESCE(feat->>'fallbackCta', feat->>'ctaText'),
                feat->>'ctaTextKey',
                0,
                true,
                false
            );
        END IF;
    END LOOP;
END$$;
