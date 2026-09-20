-- ============================================================================
-- Atelier Valenti Milano: Supabase PostgreSQL Initial Schema Migration (001)
-- ============================================================================

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Admin Users Table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'store_manager' CHECK (role IN ('super_admin', 'store_manager', 'content_editor', 'concierge')),
  permissions TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_admin_users_updated_at
BEFORE UPDATE ON admin_users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Refresh Tokens Table
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  subtitle TEXT DEFAULT '',
  description TEXT DEFAULT '',
  hero_image TEXT DEFAULT '',
  featured_order INT DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  highlight_specs TEXT[] DEFAULT '{}',
  seo_title TEXT,
  seo_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_categories_updated_at
BEFORE UPDATE ON categories
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Collections Table
CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(150) NOT NULL,
  season VARCHAR(100) NOT NULL,
  subtitle TEXT DEFAULT '',
  description TEXT DEFAULT '',
  hero_image TEXT DEFAULT '',
  badge VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_collections_updated_at
BEFORE UPDATE ON collections
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Products Table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku VARCHAR(50) UNIQUE NOT NULL,
  slug VARCHAR(150) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  tagline TEXT DEFAULT '',
  category_slug VARCHAR(100) NOT NULL REFERENCES categories(slug) ON UPDATE CASCADE,
  category_label VARCHAR(100) DEFAULT '',
  collection_id UUID REFERENCES collections(id) ON DELETE SET NULL,
  gender VARCHAR(20) DEFAULT 'unisex' CHECK (gender IN ('men', 'women', 'unisex')),
  styles TEXT[] DEFAULT '{}',
  leather_type VARCHAR(150) NOT NULL,
  hardware TEXT DEFAULT '',
  lining TEXT DEFAULT '',
  model_info TEXT DEFAULT '',
  description TEXT NOT NULL,
  editorial_quote TEXT DEFAULT '',
  price NUMERIC(10,2) NOT NULL,
  sale_price NUMERIC(10,2),
  is_featured BOOLEAN DEFAULT false,
  is_bestseller BOOLEAN DEFAULT false,
  is_new_arrival BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  rating NUMERIC(3,2) DEFAULT 5.00,
  review_count INT DEFAULT 0,
  specifications TEXT[] DEFAULT '{}',
  care_instructions TEXT[] DEFAULT '{}',
  available_colors JSONB DEFAULT '[]',
  available_sizes TEXT[] DEFAULT '{}',
  seo_title TEXT,
  seo_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Product Images Table
CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt TEXT DEFAULT '',
  is_primary BOOLEAN DEFAULT false,
  is_hover BOOLEAN DEFAULT false,
  type VARCHAR(30) DEFAULT 'perspective' CHECK (type IN ('front', 'back', 'detail', 'editorial', 'perspective')),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Product Variants Table
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku VARCHAR(60) UNIQUE NOT NULL,
  size VARCHAR(30) NOT NULL,
  color VARCHAR(50) NOT NULL,
  color_hex VARCHAR(10) NOT NULL,
  stock INT DEFAULT 0,
  price_override NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Product Reviews Table
CREATE TABLE IF NOT EXISTS product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  author VARCHAR(100) NOT NULL,
  location VARCHAR(100) NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title VARCHAR(200) NOT NULL,
  comment TEXT NOT NULL,
  verified BOOLEAN DEFAULT true,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_product_reviews_updated_at
BEFORE UPDATE ON product_reviews
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. Bespoke Custom Options Tables
CREATE TABLE IF NOT EXISTS custom_silhouettes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT DEFAULT '',
  base_price NUMERIC(10,2) NOT NULL,
  image_url TEXT DEFAULT '',
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS custom_leathers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  weight VARCHAR(50) DEFAULT '',
  origin VARCHAR(100) DEFAULT '',
  description TEXT DEFAULT '',
  extra_price NUMERIC(10,2) DEFAULT 0.00,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS custom_colors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(50) NOT NULL,
  hex VARCHAR(10) NOT NULL,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS custom_linings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT DEFAULT '',
  extra_price NUMERIC(10,2) DEFAULT 0.00,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS custom_hardware (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  finish TEXT DEFAULT '',
  extra_price NUMERIC(10,2) DEFAULT 0.00,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Bespoke Customer Commissions Table
CREATE TABLE IF NOT EXISTS custom_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_number VARCHAR(50) UNIQUE NOT NULL,
  silhouette_id VARCHAR(50),
  silhouette_name VARCHAR(100) DEFAULT '',
  leather_id VARCHAR(50),
  leather_name VARCHAR(100) DEFAULT '',
  color_id VARCHAR(50),
  color_name VARCHAR(100) DEFAULT '',
  lining_id VARCHAR(50),
  lining_name VARCHAR(100) DEFAULT '',
  hardware_id VARCHAR(50),
  hardware_name VARCHAR(100) DEFAULT '',
  monogram_text VARCHAR(10),
  monogram_placement VARCHAR(100),
  measurements JSONB DEFAULT '{}',
  customer_name VARCHAR(150) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50) DEFAULT '',
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'in_tailoring', 'completed', 'cancelled')),
  estimated_price NUMERIC(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'EUR',
  estimated_delivery VARCHAR(50) DEFAULT '4–6 weeks',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_custom_commissions_updated_at
BEFORE UPDATE ON custom_commissions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. Homepage CMS Sections Table
CREATE TABLE IF NOT EXISTS cms_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key VARCHAR(50) UNIQUE NOT NULL,
  title TEXT DEFAULT '',
  subtitle TEXT DEFAULT '',
  eyebrow TEXT DEFAULT '',
  body JSONB,
  primary_cta JSONB DEFAULT '{"label": "", "href": ""}',
  secondary_cta JSONB DEFAULT '{"label": "", "href": ""}',
  media_url TEXT DEFAULT '',
  secondary_media_url TEXT DEFAULT '',
  extra_payload JSONB DEFAULT '{}',
  is_visible BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_cms_sections_updated_at
BEFORE UPDATE ON cms_sections
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 12. Site Settings Table (Singleton)
CREATE TABLE IF NOT EXISTS site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton_key VARCHAR(20) UNIQUE DEFAULT 'global',
  announcement JSONB DEFAULT '{}',
  shipping JSONB DEFAULT '{}',
  footer JSONB DEFAULT '{}',
  search_keywords TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_site_settings_updated_at
BEFORE UPDATE ON site_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 13. Navigation Menus Table
CREATE TABLE IF NOT EXISTS navigation_menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_key VARCHAR(50) UNIQUE NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_navigation_menus_updated_at
BEFORE UPDATE ON navigation_menus
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 14. Testimonials Table
CREATE TABLE IF NOT EXISTS testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote TEXT NOT NULL,
  author VARCHAR(100) NOT NULL,
  city VARCHAR(100) NOT NULL,
  country VARCHAR(100) NOT NULL,
  verified_garment VARCHAR(150) NOT NULL,
  rating INT DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  sort_order INT DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Social Looks Table
CREATE TABLE IF NOT EXISTS social_looks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  caption TEXT NOT NULL,
  tag VARCHAR(100) DEFAULT '@ATELIERVALENTI',
  instagram_url TEXT,
  sort_order INT DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Newsletter Subscribers Table
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  locale VARCHAR(10) DEFAULT 'en',
  is_active BOOLEAN DEFAULT true,
  subscribed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. Media Assets Table
CREATE TABLE IF NOT EXISTS media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size BIGINT NOT NULL,
  url TEXT NOT NULL,
  path TEXT NOT NULL,
  width INT,
  height INT,
  format VARCHAR(20),
  folder VARCHAR(50) DEFAULT 'general',
  alt_text TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
