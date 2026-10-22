-- AlterTable
ALTER TABLE "site_settings"
ADD COLUMN IF NOT EXISTS "platform_name" VARCHAR(150) DEFAULT 'Atelier Valenti Milano',
ADD COLUMN IF NOT EXISTS "platform_short_name" VARCHAR(50) DEFAULT 'AVM',
ADD COLUMN IF NOT EXISTS "logo_url" TEXT,
ADD COLUMN IF NOT EXISTS "logo_dark_url" TEXT,
ADD COLUMN IF NOT EXISTS "logo_light_url" TEXT,
ADD COLUMN IF NOT EXISTS "favicon_url" TEXT,
ADD COLUMN IF NOT EXISTS "browser_title" VARCHAR(200) DEFAULT 'Atelier Valenti Milano — Handcrafted European Leather Outerwear',
ADD COLUMN IF NOT EXISTS "meta_description" TEXT DEFAULT 'Luxury Italian calfskin and lambskin outerwear crafted by hand in our Milanese atelier. AZO-free certified leather with European express delivery.';

-- Update any existing rows that have NULL in the new columns to their sensible defaults
UPDATE "site_settings"
SET
  "platform_name" = COALESCE("platform_name", 'Atelier Valenti Milano'),
  "platform_short_name" = COALESCE("platform_short_name", 'AVM'),
  "browser_title" = COALESCE("browser_title", 'Atelier Valenti Milano — Handcrafted European Leather Outerwear'),
  "meta_description" = COALESCE("meta_description", 'Luxury Italian calfskin and lambskin outerwear crafted by hand in our Milanese atelier. AZO-free certified leather with European express delivery.')
WHERE "singleton_key" = 'global';
