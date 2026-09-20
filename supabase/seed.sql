-- ============================================================================
-- Atelier Valenti Milano: Supabase Initial Seed SQL
-- ============================================================================

-- 1. Default Super Admin (admin@ateliervalenti.com / AtelierValenti2026!)
-- bcrypt hash for 'AtelierValenti2026!'
INSERT INTO admin_users (email, password_hash, first_name, last_name, role, permissions, is_active)
VALUES (
  'admin@ateliervalenti.com',
  '$2a$10$tZkm.UfD2s9ZtH7.c8Nn4eqG3uJvRz2kLm1.WfXnE1wK6d2oY8uWy',
  'Alessandro',
  'Valenti',
  'super_admin',
  ARRAY['*'],
  true
)
ON CONFLICT (email) DO NOTHING;

-- 2. Categories
INSERT INTO categories (slug, name, subtitle, description, hero_image, featured_order, highlight_specs)
VALUES
('biker', 'Biker Jackets', 'Asymmetric European silhouettes in plonge lambskin and distressed cowhide', 'Engineered with double-rider lapels, Excella® industrial zips, and tailored mobility gussets.', 'https://images.unsplash.com/photo-1520975954732-35dd22299614?q=80&w=1200&auto=format&fit=crop', 1, ARRAY['1.2mm Plonge Lambskin', 'Excella® Silver Zippers', 'Sartorial Waist Belt']),
('bomber', 'Bomber Jackets', 'Architectural drop shoulders with Italian merino wool trim', 'Clean proportions cut from Tuscan drum-dyed full-grain calfskin. Refined, effortless luxury.', 'https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=1200&auto=format&fit=crop', 2, ARRAY['Full-Grain Calfskin', 'Bi-color Wool Ribbing', 'Japanese Cupro Lining']),
('aviator', 'Aviator & Shearling', 'Whole-pelt Spanish Merino shearling thermal defenses', 'Substantial, cold-weather armor trimmed with natural shearling collars and antiqued roller buckles.', 'https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=1200&auto=format&fit=crop', 3, ARRAY['Spanish Merino Shearling', 'Antiqued Brass Buckles', 'Storm Throat Latch']),
('suede', 'Suede Outerwear', 'Silky split nap buffed to velvety light-absorbing depth', 'Featherweight luxury tailored for transitional European seasons. Exceptionally tactile.', 'https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?q=80&w=1200&auto=format&fit=crop', 4, ARRAY['0.8mm Tuscan Suede', 'Breathable Unlined Construction', 'Horn Buttons']),
('trench', 'Leather Coats & Trench', 'Dramatic proportions with half-canvassed sartorial chest drape', 'Sculpted length outerwear that moves with authority. Tailored in Lombardy.', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=1200&auto=format&fit=crop', 5, ARRAY['Calfskin & Nappa Blends', 'Storm Flap', 'Deep Walking Vent']),
('accessories', 'Accessories & Atelier Goods', 'Weekenders, cardholders, and artisan leather balms', 'Meticulously crafted leather lifestyle accessories utilizing vegetable-tanned full-grain offcuts.', 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=1200&auto=format&fit=crop', 6, ARRAY['Full-Grain Calfskin', 'Solid Cast Brass Hardware', 'Hand-stitched Edge Paint'])
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- 3. Collections
INSERT INTO collections (slug, title, season, subtitle, description, hero_image, badge, is_active)
VALUES (
  'inverno-26',
  'Inverno 2026 Lookbook',
  'Autumn / Winter 2026',
  'Sculpted Silhouettes in Heavyweight Tuscan Calfskin',
  'Debuted at Milan Men’s Fashion Week. A masterclass in minimalist European leather proportion.',
  'https://images.unsplash.com/photo-1520975954732-35dd22299614?q=80&w=1600&auto=format&fit=crop',
  'Capsule Collection',
  true
)
ON CONFLICT (slug) DO NOTHING;

-- 4. Site Settings
INSERT INTO site_settings (singleton_key, announcement, shipping, footer, search_keywords)
VALUES (
  'global',
  '{"enabled": true, "badge": "Milano Atelier", "message": "Complimentary Express European Delivery on All Orders Over €250", "linkText": "EXPLORE BESPOKE", "linkHref": "/customize", "countryNotice": "IT • DE • FR • CH • UK"}',
  '{"freeShippingThreshold": 250, "standardShippingCost": 15, "countries": [{"code": "IT", "name": "Italy", "rate": 0, "days": "1–2 business days"}, {"code": "DE", "name": "Germany", "rate": 15, "days": "2–3 business days"}, {"code": "FR", "name": "France", "rate": 15, "days": "2–3 business days"}]}',
  '{"certificationLine": "✔️ AZO-Free Leather · ✔️ EU REACH Compliant", "atelierAddress": "Via Montenapoleone, 27, 20121 Milano, Italy", "instagramHandle": "@ATELIERVALENTI", "copyrightText": "© 2026 Atelier Valenti Milano. All rights reserved.", "cities": ["MILANO", "PARIS", "ZURICH", "MUNICH"]}',
  ARRAY['Biker', 'Bomber', 'Shearling', 'Suede', 'Calfskin', 'Nappa', 'Trench', 'Excella']
)
ON CONFLICT (singleton_key) DO NOTHING;

-- 5. Bespoke Custom Options
INSERT INTO custom_silhouettes (slug, name, base_price, description, image_url, sort_order)
VALUES
('biker', 'The Asymmetric Biker', 620, 'Classic double-rider lapels, bi-swing back, zippered gusset sleeves.', 'https://images.unsplash.com/photo-1520975954732-35dd22299614?q=80&w=1200&auto=format&fit=crop', 1),
('bomber', 'The European Bomber', 580, 'Architectural drop shoulders, ribbed Italian wool trim, dual welt pockets.', 'https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=1200&auto=format&fit=crop', 2),
('aviator', 'The Alpine Aviator', 890, 'Plush shearling collar and lining, storm throat latch, heavy waist buckles.', 'https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=1200&auto=format&fit=crop', 3),
('trench', 'The Sartorial Car Coat', 740, 'Half-canvassed construction, mid-thigh length, concealed storm placket.', 'https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?q=80&w=1200&auto=format&fit=crop', 4)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO custom_leathers (slug, name, weight, origin, description, extra_price, sort_order)
VALUES
('calfskin', 'Full-Grain Italian Calfskin', '1.2mm', 'Santa Croce sull''Arno, Tuscany', 'Vegetable tanned, develops a luminous deep patina over decades.', 0, 1),
('nappa', 'Plonge Nappa Lambskin', '1.0mm', 'Veneto, Italy', 'Incomparably soft drape, lightweight feel with buttery hand.', 0, 2),
('shearling', 'Spanish Merino Shearling', '15mm Fleece', 'Pyrenees, Spain', 'Whole-pelt thermal defense with crackled exterior leather.', 260, 3),
('suede', 'Silky Suede Split', '0.8mm', 'Florence, Italy', 'Featherweight velvety split nap with rich light-absorbing depth.', 0, 4)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO custom_colors (slug, name, hex, sort_order)
VALUES
('obsidian', 'Obsidian Black', '#0E0D0C', 1),
('espresso', 'Espresso Brown', '#261A13', 2),
('cognac', 'Tuscan Cognac', '#522D1B', 3),
('graphite', 'Smoked Graphite', '#2B2A29', 4),
('oxblood', 'Vintage Oxblood', '#3A161B', 5)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO custom_linings (slug, name, description, extra_price, sort_order)
VALUES
('cupro', '100% Japanese Cupro Twill', 'Silky breathable fiber engineered for effortless friction-free layering.', 0, 1),
('silk', 'Thermal Quilted Silk Blend', 'Micro-quilted interior providing luxurious insulation against cold winds.', 65, 2),
('herringbone', 'Charcoal Herringbone Cotton', 'Durable heritage weave with breathable vintage English tailoring feel.', 40, 3)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO custom_hardware (slug, name, finish, extra_price, sort_order)
VALUES
('brass', 'Antiqued Brushed Brass', 'Warm golden hue with subtle brush polish forged in northern Italy.', 0, 1),
('silver', 'Oxidized Silver Excella®', 'Cool high-gauge gunmetal silver with mirror-polished teeth.', 0, 2),
('matte-black', 'Matte Anthracite Black', 'Low-reflection tactical luxury finish with durable PVD treatment.', 25, 3)
ON CONFLICT (slug) DO NOTHING;
