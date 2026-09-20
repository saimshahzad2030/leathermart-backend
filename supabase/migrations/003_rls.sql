-- ============================================================================
-- Atelier Valenti Milano: Row Level Security (RLS) Migration (003)
-- ============================================================================

-- Enable RLS on core tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_silhouettes ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_leathers ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_linings ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_hardware ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE navigation_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_looks ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

-- 1. Public Read Policies for published storefront content
CREATE POLICY "Public read published products" ON products
  FOR SELECT USING (is_published = true);

CREATE POLICY "Public read product images" ON product_images
  FOR SELECT USING (true);

CREATE POLICY "Public read product variants" ON product_variants
  FOR SELECT USING (true);

CREATE POLICY "Public read approved reviews" ON product_reviews
  FOR SELECT USING (is_approved = true);

CREATE POLICY "Public insert product reviews" ON product_reviews
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public read published categories" ON categories
  FOR SELECT USING (is_published = true);

CREATE POLICY "Public read active collections" ON collections
  FOR SELECT USING (is_active = true);

CREATE POLICY "Public read active bespoke options" ON custom_silhouettes
  FOR SELECT USING (is_active = true);

CREATE POLICY "Public read active custom leathers" ON custom_leathers
  FOR SELECT USING (is_active = true);

CREATE POLICY "Public read active custom colors" ON custom_colors
  FOR SELECT USING (is_active = true);

CREATE POLICY "Public read active custom linings" ON custom_linings
  FOR SELECT USING (is_active = true);

CREATE POLICY "Public read active custom hardware" ON custom_hardware
  FOR SELECT USING (is_active = true);

CREATE POLICY "Public insert commissions" ON custom_commissions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public read visible cms sections" ON cms_sections
  FOR SELECT USING (is_visible = true);

CREATE POLICY "Public read site settings" ON site_settings
  FOR SELECT USING (true);

CREATE POLICY "Public read navigation menus" ON navigation_menus
  FOR SELECT USING (true);

CREATE POLICY "Public read published testimonials" ON testimonials
  FOR SELECT USING (is_published = true);

CREATE POLICY "Public read published social looks" ON social_looks
  FOR SELECT USING (is_published = true);

CREATE POLICY "Public insert newsletter subscribers" ON newsletter_subscribers
  FOR INSERT WITH CHECK (true);

-- 2. Service Role elevated policies (Express backend runs as service_role)
-- The service_role key automatically bypasses RLS in Supabase, but explicit policies ensure full access:
CREATE POLICY "Service role full access products" ON products FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access categories" ON categories FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access admin_users" ON admin_users FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access refresh_tokens" ON refresh_tokens FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access custom_commissions" ON custom_commissions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access cms_sections" ON cms_sections FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access media_assets" ON media_assets FOR ALL TO service_role USING (true) WITH CHECK (true);
