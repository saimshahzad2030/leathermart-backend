import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { ROLES } from '../config/constants.js';
import { logger } from '../utils/logger.js';

/**
 * Atelier Valenti Milano / LeatherMart Idempotent Seeder
 *
 * Supports:
 *   1. Destructive reset: pass `--reset` or set `RESET_DB=true`.
 *   2. Non-destructive seeding / re-runs: safe upserts without creating duplicates.
 */
export async function runSeed({ reset = false } = {}) {
  const isReset = reset || process.argv.includes('--reset') || process.env.RESET_DB === 'true';

  logger.info('============================================================');
  logger.info(`Starting Atelier Valenti Milano Database Seeding (Mode: ${isReset ? 'RESET & SEED' : 'IDEMPOTENT UPSERT'})`);
  logger.info('============================================================');

  // Verify environment safety
  const dbUrl = process.env.DATABASE_URL || '';
  const maskedHost = dbUrl.includes('@') ? dbUrl.split('@')[1].split('/')[0] : 'local/unspecified';
  logger.info(`Target Database Host: ${maskedHost}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);

  try {
    // 1. Transactional / Orderly Cleanup if Reset is Requested
    if (isReset) {
      logger.info('Reset flag active: Clearing existing records in reverse dependency order...');
      await prisma.productReview.deleteMany();
      await prisma.productImage.deleteMany();
      await prisma.productVariant.deleteMany();
      await prisma.productPrice.deleteMany();
      await prisma.productSizeAssignment.deleteMany();
      await prisma.productColorAssignment.deleteMany();
      await prisma.productPolicyAssignment.deleteMany();
      await prisma.product.deleteMany();
      await prisma.productPolicy.deleteMany();
      await prisma.productSize.deleteMany();
      await prisma.productColor.deleteMany();
      await prisma.customCommission.deleteMany();
      await prisma.customSilhouette.deleteMany();
      await prisma.customLeather.deleteMany();
      await prisma.customColor.deleteMany();
      await prisma.customLining.deleteMany();
      await prisma.customHardware.deleteMany();
      await prisma.cmsSection.deleteMany();
      await prisma.testimonial.deleteMany();
      await prisma.socialLook.deleteMany();
      await prisma.siteSetting.deleteMany();
      await prisma.navigationMenu.deleteMany();
      await prisma.category.deleteMany();
      await prisma.collection.deleteMany();
      await prisma.refreshToken.deleteMany();
      await prisma.adminUser.deleteMany();
      logger.info('Existing application data cleared successfully.');
    }

    // 2. Admin User Creation / Upsert
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@leathermart.local').toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe_Admin_2026!';
    const adminFirstName = process.env.ADMIN_FIRST_NAME || 'Alessandro';
    const adminLastName = process.env.ADMIN_LAST_NAME || 'Valenti';

    logger.info(`Configuring administrator account: ${adminEmail}`);
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    const adminUser = await prisma.adminUser.upsert({
      where: { email: adminEmail },
      update: {
        passwordHash,
        firstName: adminFirstName,
        lastName: adminLastName,
        role: ROLES.SUPER_ADMIN,
        permissions: ['*'],
        isActive: true,
      },
      create: {
        email: adminEmail,
        passwordHash,
        firstName: adminFirstName,
        lastName: adminLastName,
        role: ROLES.SUPER_ADMIN,
        permissions: ['*'],
        isActive: true,
      },
    });
    logger.info(`Admin user configured with ID: ${adminUser.id} (${adminUser.role})`);

    // 3. Seed Product Categories
    logger.info('Seeding product categories...');
    const categoriesData = [
      {
        slug: 'biker',
        name: 'Biker Jackets',
        subtitle: 'Asymmetric European silhouettes in plonge lambskin and distressed cowhide',
        description: 'Engineered with double-rider lapels, Excella® industrial zips, and tailored mobility gussets.',
        heroImage: 'https://images.unsplash.com/photo-1520975954732-35dd22299614?q=80&w=1200&auto=format&fit=crop',
        featuredOrder: 1,
        highlightSpecs: ['1.2mm Plonge Lambskin', 'Excella® Silver Zippers', 'Sartorial Waist Belt'],
        isPublished: true,
      },
      {
        slug: 'bomber',
        name: 'Bomber Jackets',
        subtitle: 'Architectural drop shoulders with Italian merino wool trim',
        description: 'Clean proportions cut from Tuscan drum-dyed full-grain calfskin. Refined, effortless luxury.',
        heroImage: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=1200&auto=format&fit=crop',
        featuredOrder: 2,
        highlightSpecs: ['Full-Grain Calfskin', 'Bi-color Wool Ribbing', 'Japanese Cupro Lining'],
        isPublished: true,
      },
      {
        slug: 'leather-coats',
        name: 'Leather Coats',
        subtitle: 'Dramatic proportions with half-canvassed sartorial chest drape',
        description: 'Sculpted length outerwear that moves with authority. Tailored in Lombardy.',
        heroImage: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=1200&auto=format&fit=crop',
        featuredOrder: 3,
        highlightSpecs: ['Calfskin & Nappa Blends', 'Storm Flap', 'Deep Walking Vent'],
        isPublished: true,
      },
      {
        slug: 'leather-blazers',
        name: 'Leather Blazers',
        subtitle: 'Sartorial single and double-breasted tailoring in glove-soft lambskin',
        description: 'Unstructured lightness with razor-sharp Italian lapels. Designed for sophisticated layering.',
        heroImage: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=1200&auto=format&fit=crop',
        featuredOrder: 4,
        highlightSpecs: ['0.9mm Glove Lambskin', 'Horn Buttons', 'Bemberg Cupro Lining'],
        isPublished: true,
      },
      {
        slug: 'leather-accessories',
        name: 'Leather Accessories',
        subtitle: 'Weekenders, cardholders, and artisan leather goods',
        description: 'Meticulously crafted leather lifestyle accessories utilizing vegetable-tanned full-grain offcuts.',
        heroImage: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=1200&auto=format&fit=crop',
        featuredOrder: 5,
        highlightSpecs: ['Full-Grain Calfskin', 'Solid Cast Brass Hardware', 'Hand-stitched Edge Paint'],
        isPublished: true,
      },
      {
        slug: 'aviator',
        name: 'Aviator & Shearling',
        subtitle: 'Whole-pelt Spanish Merino shearling thermal defenses',
        description: 'Substantial, cold-weather armor trimmed with natural shearling collars and antiqued roller buckles.',
        heroImage: 'https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=1200&auto=format&fit=crop',
        featuredOrder: 6,
        highlightSpecs: ['Spanish Merino Shearling', 'Antiqued Brass Buckles', 'Storm Throat Latch'],
        isPublished: true,
      },
      {
        slug: 'suede',
        name: 'Suede Outerwear',
        subtitle: 'Silky split nap buffed to velvety light-absorbing depth',
        description: 'Featherweight luxury tailored for transitional European seasons. Exceptionally tactile.',
        heroImage: 'https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?q=80&w=1200&auto=format&fit=crop',
        featuredOrder: 7,
        highlightSpecs: ['0.8mm Tuscan Suede', 'Breathable Unlined Construction', 'Horn Buttons'],
        isPublished: true,
      },
    ];

    for (const cat of categoriesData) {
      await prisma.category.upsert({
        where: { slug: cat.slug },
        update: cat,
        create: cat,
      });
    }

    // 4. Seed Collections
    logger.info('Seeding collections...');
    const collection = await prisma.collection.upsert({
      where: { slug: 'inverno-26' },
      update: {
        title: 'Inverno 2026 Lookbook',
        season: 'Autumn / Winter 2026',
        subtitle: 'Sculpted Silhouettes in Heavyweight Tuscan Calfskin',
        description: 'Debuted at Milan Men’s Fashion Week. A masterclass in minimalist European leather proportion.',
        heroImage: 'https://images.unsplash.com/photo-1520975954732-35dd22299614?q=80&w=1600&auto=format&fit=crop',
        badge: 'Capsule Collection',
        isActive: true,
      },
      create: {
        slug: 'inverno-26',
        title: 'Inverno 2026 Lookbook',
        season: 'Autumn / Winter 2026',
        subtitle: 'Sculpted Silhouettes in Heavyweight Tuscan Calfskin',
        description: 'Debuted at Milan Men’s Fashion Week. A masterclass in minimalist European leather proportion.',
        heroImage: 'https://images.unsplash.com/photo-1520975954732-35dd22299614?q=80&w=1600&auto=format&fit=crop',
        badge: 'Capsule Collection',
        isActive: true,
      },
    });

    // 5. Seed Reusable Sizes, Colors, and Policies
    logger.info('Seeding reusable product sizes...');
    const sizesData = [
      { name: '46 (EU S)', slug: '46-eu-s', sortOrder: 1, isActive: true },
      { name: '48 (EU M)', slug: '48-eu-m', sortOrder: 2, isActive: true },
      { name: '50 (EU L)', slug: '50-eu-l', sortOrder: 3, isActive: true },
      { name: '52 (EU XL)', slug: '52-eu-xl', sortOrder: 4, isActive: true },
      { name: '54 (EU XXL)', slug: '54-eu-xxl', sortOrder: 5, isActive: true },
      { name: 'XS', slug: 'xs', sortOrder: 6, isActive: true },
      { name: 'S', slug: 's', sortOrder: 7, isActive: true },
      { name: 'M', slug: 'm', sortOrder: 8, isActive: true },
      { name: 'L', slug: 'l', sortOrder: 9, isActive: true },
      { name: 'XL', slug: 'xl', sortOrder: 10, isActive: true },
      { name: 'One Size', slug: 'one-size', sortOrder: 11, isActive: true },
    ];
    const createdSizesMap = new Map();
    for (const s of sizesData) {
      const created = await prisma.productSize.upsert({
        where: { slug: s.slug },
        update: s,
        create: s,
      });
      createdSizesMap.set(s.name, created);
    }

    logger.info('Seeding reusable product colors...');
    const colorsData = [
      { name: 'Obsidian Black', slug: 'obsidian-black', hex: '#11100F', sortOrder: 1, isActive: true },
      { name: 'Espresso Brown', slug: 'espresso-brown', hex: '#2B1E17', sortOrder: 2, isActive: true },
      { name: 'Tuscan Cognac', slug: 'tuscan-cognac', hex: '#8B4513', sortOrder: 3, isActive: true },
      { name: 'Oxblood Burgundy', slug: 'oxblood-burgundy', hex: '#4A0E17', sortOrder: 4, isActive: true },
      { name: 'Smoked Graphite', slug: 'smoked-graphite', hex: '#2B2A29', sortOrder: 5, isActive: true },
    ];
    const createdColorsMap = new Map();
    for (const c of colorsData) {
      const created = await prisma.productColor.upsert({
        where: { slug: c.slug },
        update: c,
        create: c,
      });
      createdColorsMap.set(c.name, created);
    }

    logger.info('Seeding reusable product policies...');
    const policiesData = [
      {
        name: 'Complimentary Atelier Shipping',
        slug: 'shipping-policy',
        description: 'All Atelier Valenti Milano garments are prepared and dispatched from our Lombardy workshop via express air courier.',
        bulletPoints: [
          'Complimentary insured global delivery on all outerwear',
          'Dispatched within 24–48 hours in museum-grade garment box',
          'Signature required upon delivery with real-time GPS tracking',
        ],
        sortOrder: 1,
        isActive: true,
      },
      {
        name: 'Archival Exchange & Returns',
        slug: 'returns-policy',
        description: 'We welcome returns and size exchanges on ready-to-wear outerwear within 14 days of delivery receipt.',
        bulletPoints: [
          'Garment must remain unworn with intact atelier security tags',
          'Pre-paid insured return shipping label included in delivery dossier',
          'Personalized bespoke commissions are final sale',
        ],
        sortOrder: 2,
        isActive: true,
      },
      {
        name: 'Lifetime Craftsmanship Warranty',
        slug: 'warranty-policy',
        description: 'Every Atelier Valenti garment is protected by our lifetime warranty against hardware and seam failures.',
        bulletPoints: [
          'Complimentary Excella® zipper and solid cast brass snap repairs for life',
          'Complimentary biannual leather conditioning at our Milan flagship',
          'Re-lining and sleeve length alterations available upon request',
        ],
        sortOrder: 3,
        isActive: true,
      },
      {
        name: 'Garment Care & Preservation',
        slug: 'care-instructions',
        description: 'Engineered instructions to maintain the architectural drape and supple touch of your Italian leather.',
        bulletPoints: [
          'Condition annually with neutral organic beeswax emulsion',
          'Store on wide contoured cedar hanger away from direct sunlight',
          'Specialist leather dry-clean only',
        ],
        sortOrder: 4,
        isActive: true,
      },
    ];
    const createdPolicies = [];
    for (const pol of policiesData) {
      const created = await prisma.productPolicy.upsert({
        where: { slug: pol.slug },
        update: pol,
        create: pol,
      });
      createdPolicies.push(created);
    }

    // 6. Seed Sample Products
    logger.info('Seeding sample products with variants, regional prices, images, and policy assignments...');
    const productsData = [
      {
        sku: 'AVM-BKR-001',
        slug: 'classic-black-leather-biker-jacket',
        name: 'Classic Black Leather Biker Jacket',
        tagline: 'Asymmetric European silhouette in hand-buffed plunge lambskin',
        categorySlug: 'biker',
        categoryLabel: 'Biker Jackets',
        gender: 'men',
        styles: ['biker', 'classic', 'luxury'],
        price: 895,
        salePrice: null,
        isFeatured: true,
        isBestseller: true,
        isNewArrival: false,
        isPublished: true,
        leatherType: 'Full-Grain Italian Calfskin (1.2mm)',
        hardware: 'Excella® Silver Zippers & Antiqued Snaps',
        lining: '100% Breathable Japanese Cupro Twill',
        description:
          'A timeless biker silhouette handcrafted from supple full-grain Italian calfskin. Features clean lapels that snap flat or close tight against headwinds, ergonomic bi-swing back gussets, and dual internal welt pockets.',
        editorialQuote: 'The definitive Milanese double-rider—sharp, structured, and deceptively supple.',
        modelInfo: 'Model is 187cm / 6\'1" wearing size 48 (EU M)',
        specifications: [
          '1.2mm premium vegetable-tanned full-grain calfskin',
          'Iconic off-center asymmetrical front fastening',
          'Ergonomic bi-swing accordion shoulder pleats',
          'Removable buckle belt with keeper loops',
        ],
        careInstructions: [
          'Specialist leather dry clean only',
          'Store on contoured wide wooden hanger',
          'Condition annually with neutral beeswax balm',
        ],
        images: [
          {
            url: 'https://images.unsplash.com/photo-1520975954732-35dd22299614?q=80&w=1200&auto=format&fit=crop',
            alt: 'Classic Black Leather Biker Jacket Front View',
            isPrimary: true,
            isHover: false,
            type: 'perspective',
            sortOrder: 1,
          },
          {
            url: 'https://images.unsplash.com/photo-1521223890158-f9f7c3d5d504?q=80&w=1200&auto=format&fit=crop',
            alt: 'Classic Black Leather Biker Jacket Detail View',
            isPrimary: false,
            isHover: true,
            type: 'detail',
            sortOrder: 2,
          },
        ],
        variants: [
          { sku: 'AVM-BKR-001-BLK-46', size: '46 (EU S)', color: 'Obsidian Black', colorHex: '#11100F', inStock: true },
          { sku: 'AVM-BKR-001-BLK-48', size: '48 (EU M)', color: 'Obsidian Black', colorHex: '#11100F', inStock: true },
          { sku: 'AVM-BKR-001-BLK-50', size: '50 (EU L)', color: 'Obsidian Black', colorHex: '#11100F', inStock: true },
          { sku: 'AVM-BKR-001-BLK-52', size: '52 (EU XL)', color: 'Obsidian Black', colorHex: '#11100F', inStock: true },
        ],
        availableColors: [{ name: 'Obsidian Black', hex: '#11100F' }],
        availableSizes: ['46 (EU S)', '48 (EU M)', '50 (EU L)', '52 (EU XL)'],
      },
      {
        sku: 'AVM-BMB-002',
        slug: 'vintage-brown-leather-bomber-jacket',
        name: 'Vintage Brown Leather Bomber Jacket',
        tagline: 'Architectural drop shoulders with Italian merino wool trim',
        categorySlug: 'bomber',
        categoryLabel: 'Bomber Jackets',
        gender: 'men',
        styles: ['vintage', 'minimal', 'luxury'],
        price: 780,
        salePrice: 720,
        isFeatured: true,
        isBestseller: true,
        isNewArrival: false,
        isPublished: true,
        leatherType: 'Washed Drum-Dyed Nappa Lambskin',
        hardware: 'Antiqued Brushed Brass YKK Excella®',
        lining: 'Japanese Cupro with Wool Ribbed Trim',
        description:
          'Cut from Tuscan drum-dyed calfskin that softens progressively with body heat. Finished with 2x2 ribbed wool collar and cuffs, dual exterior handwarmer pockets, and sculpted shoulder seams.',
        editorialQuote: 'Effortless vintage elegance with modern Italian proportion.',
        modelInfo: 'Model is 185cm wearing size 48 (EU M)',
        specifications: [
          '1.1mm hand-washed drum-dyed nappa lambskin',
          'Heavyweight 2x2 ribbed wool-cashmere collar and hem',
          'Two-way antiqued brass zipper with leather pulls',
        ],
        careInstructions: [
          'Professional leather cleaner only',
          'Keep away from heat and damp environments',
        ],
        images: [
          {
            url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=1200&auto=format&fit=crop',
            alt: 'Vintage Brown Leather Bomber Jacket Front View',
            isPrimary: true,
            isHover: false,
            type: 'perspective',
            sortOrder: 1,
          },
          {
            url: 'https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?q=80&w=1200&auto=format&fit=crop',
            alt: 'Vintage Brown Leather Bomber Jacket Angled View',
            isPrimary: false,
            isHover: true,
            type: 'detail',
            sortOrder: 2,
          },
        ],
        variants: [
          { sku: 'AVM-BMB-002-BRN-48', size: '48 (EU M)', color: 'Espresso Brown', colorHex: '#2B1E17', inStock: true },
          { sku: 'AVM-BMB-002-BRN-50', size: '50 (EU L)', color: 'Espresso Brown', colorHex: '#2B1E17', inStock: true },
          { sku: 'AVM-BMB-002-COG-48', size: '48 (EU M)', color: 'Tuscan Cognac', colorHex: '#8B4513', inStock: true },
        ],
        availableColors: [
          { name: 'Espresso Brown', hex: '#2B1E17' },
          { name: 'Tuscan Cognac', hex: '#8B4513' },
        ],
        availableSizes: ['48 (EU M)', '50 (EU L)'],
      },
      {
        sku: 'AVM-COT-003',
        slug: 'premium-black-leather-coat',
        name: 'Premium Black Leather Coat',
        tagline: 'Dramatic full-length double-breasted coat in buttery lambskin',
        categorySlug: 'leather-coats',
        categoryLabel: 'Leather Coats',
        gender: 'unisex',
        styles: ['classic', 'luxury', 'tailored'],
        price: 1150,
        salePrice: null,
        isFeatured: true,
        isBestseller: false,
        isNewArrival: true,
        isPublished: true,
        leatherType: 'Full-Grain Italian Calfskin & Plonge Nappa',
        hardware: 'Concealed Horn Buttons & Leather-Wrapped Buckle',
        lining: 'Cupro Silk Twill',
        description:
          'Dramatic full-length outerwear designed to command authority. Features wide peak lapels, a tailored waist belt, and deep walking vent that moves gracefully with every stride.',
        editorialQuote: 'Cinematic drama tailored from the finest Italian lambskin.',
        modelInfo: 'Model is 188cm wearing size 50 (EU L)',
        specifications: [
          'Full-length 118cm drape with deep rear walking vent',
          'Half-canvassed chest for lifetime shape retention',
          'Dual internal storm pockets with security tabs',
        ],
        careInstructions: [
          'Store on wide padded cedar hanger',
          'Professional leather cleaning only',
        ],
        images: [
          {
            url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=1200&auto=format&fit=crop',
            alt: 'Premium Black Leather Coat Full View',
            isPrimary: true,
            isHover: false,
            type: 'perspective',
            sortOrder: 1,
          },
        ],
        variants: [
          { sku: 'AVM-COT-003-BLK-48', size: '48 (EU M)', color: 'Obsidian Black', colorHex: '#11100F', inStock: true },
          { sku: 'AVM-COT-003-BLK-50', size: '50 (EU L)', color: 'Obsidian Black', colorHex: '#11100F', inStock: true },
          { sku: 'AVM-COT-003-BLK-52', size: '52 (EU XL)', color: 'Obsidian Black', colorHex: '#11100F', inStock: true },
        ],
        availableColors: [{ name: 'Obsidian Black', hex: '#11100F' }],
        availableSizes: ['48 (EU M)', '50 (EU L)', '52 (EU XL)'],
      },
      {
        sku: 'AVM-BLZ-004',
        slug: 'italian-leather-blazer',
        name: 'Italian Leather Blazer',
        tagline: 'Sartorial two-button single-breasted blazer in glove-soft calfskin',
        categorySlug: 'leather-blazers',
        categoryLabel: 'Leather Blazers',
        gender: 'men',
        styles: ['sartorial', 'luxury', 'minimal'],
        price: 950,
        salePrice: null,
        isFeatured: false,
        isBestseller: true,
        isNewArrival: true,
        isPublished: true,
        leatherType: '0.9mm Glove-Soft Italian Lambskin',
        hardware: 'Hand-Carved Buffalo Horn Buttons',
        lining: 'Half-Canvassed Bemberg Cupro Lining',
        description:
          'Bridging high tailoring with tactile luxury. Unstructured shoulders and notched lapels crafted from featherweight 0.9mm lambskin that molds instantly to the torso.',
        editorialQuote: 'Redefining the evening blazer through the medium of pure leather.',
        modelInfo: 'Model is 186cm wearing size 48 (EU M)',
        specifications: [
          'Featherweight 0.9mm Tuscan lambskin',
          'Dual rear side vents and notched lapel',
          'Flap waist pockets and angled chest welt pocket',
        ],
        careInstructions: [
          'Specialist dry clean only',
          'Avoid direct exposure to rainfall',
        ],
        images: [
          {
            url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=1200&auto=format&fit=crop',
            alt: 'Italian Leather Blazer Front View',
            isPrimary: true,
            isHover: false,
            type: 'perspective',
            sortOrder: 1,
          },
        ],
        variants: [
          { sku: 'AVM-BLZ-004-BLK-48', size: '48 (EU M)', color: 'Obsidian Black', colorHex: '#11100F', inStock: true },
          { sku: 'AVM-BLZ-004-BLK-50', size: '50 (EU L)', color: 'Obsidian Black', colorHex: '#11100F', inStock: true },
        ],
        availableColors: [{ name: 'Obsidian Black', hex: '#11100F' }],
        availableSizes: ['48 (EU M)', '50 (EU L)'],
      },
      {
        sku: 'AVM-ACC-005',
        slug: 'leather-travel-accessory',
        name: 'Tuscan Leather Travel Weekender',
        tagline: 'Hand-burnished vegetable-tanned travel duffle with solid brass locks',
        categorySlug: 'leather-accessories',
        categoryLabel: 'Leather Accessories',
        gender: 'unisex',
        styles: ['artisan', 'heritage', 'luxury'],
        price: 480,
        salePrice: null,
        isFeatured: false,
        isBestseller: true,
        isNewArrival: false,
        isPublished: true,
        leatherType: '1.8mm Tuscan Saddle Hide (Vegetable Tanned)',
        hardware: 'Solid Cast Antiqued Brass Padlock & Rivets',
        lining: 'Reinforced Heavy Italian Cotton Canvas',
        description:
          'Hand-cut 1.8mm vegetable-tanned Tuscan saddle calfskin with reinforced double-stitched handles, detachable shoulder strap, and protective brass base studs. Built for decades of European journeys.',
        editorialQuote: 'The quintessential Italian travel companion.',
        modelInfo: 'Dimensions: 52cm x 28cm x 26cm',
        specifications: [
          '1.8mm full-grain Tuscan vegetable-tanned hide',
          'TSA-compliant solid brass padlock with twin keys',
          'Reinforced base panel with 6 protective brass feet',
        ],
        careInstructions: [
          'Condition twice a year with natural leather cream',
        ],
        images: [
          {
            url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=1200&auto=format&fit=crop',
            alt: 'Tuscan Leather Travel Weekender Front',
            isPrimary: true,
            isHover: false,
            type: 'perspective',
            sortOrder: 1,
          },
        ],
        variants: [
          { sku: 'AVM-ACC-005-COG-OS', size: 'One Size', color: 'Tuscan Cognac', colorHex: '#8B4513', inStock: true },
        ],
        availableColors: [{ name: 'Tuscan Cognac', hex: '#8B4513' }],
        availableSizes: ['One Size'],
      },
      {
        sku: 'AVM-AVT-006',
        slug: 'alpine-merino-aviator',
        name: 'Alpine Merino Aviator Jacket',
        tagline: 'Whole-pelt Spanish Merino shearling thermal defense',
        categorySlug: 'aviator',
        categoryLabel: 'Aviator & Shearling',
        gender: 'unisex',
        styles: ['shearling', 'luxury', 'vintage'],
        price: 1250,
        salePrice: null,
        isFeatured: true,
        isBestseller: false,
        isNewArrival: true,
        isPublished: true,
        leatherType: 'Spanish Merino Shearling (15mm Fleece)',
        hardware: 'Antiqued Brass Roller Buckles',
        lining: '15mm Natural Merino Wool Fleece',
        description:
          'Engineered for extreme alpine altitudes. Crafted from whole-pelt Spanish merino shearling with dense 15mm wool fleece and an antiqued cracked exterior hide.',
        editorialQuote: 'Pure thermal mastery engineered for winter in the Dolomites.',
        modelInfo: 'Model is 188cm wearing size 50 (EU L)',
        specifications: [
          'Genuine 100% Spanish merino sheepskin whole-pelt',
          'Dual throat latch buckles with brass grommets',
          'Heavy leather storm tape along every structural seam',
        ],
        careInstructions: ['Specialist fur and shearling cleaner only'],
        images: [
          {
            url: 'https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=1200&auto=format&fit=crop',
            alt: 'Alpine Merino Aviator Front',
            isPrimary: true,
            isHover: false,
            type: 'perspective',
            sortOrder: 1,
          },
        ],
        variants: [
          { sku: 'AVM-AVT-006-BRN-48', size: '48 (EU M)', color: 'Espresso Brown', colorHex: '#2B1E17', inStock: true },
          { sku: 'AVM-AVT-006-BRN-50', size: '50 (EU L)', color: 'Espresso Brown', colorHex: '#2B1E17', inStock: true },
        ],
        availableColors: [{ name: 'Espresso Brown', hex: '#2B1E17' }],
        availableSizes: ['48 (EU M)', '50 (EU L)'],
      },
    ];

    for (const prod of productsData) {
      const { images, variants, ...productFields } = prod;

      // Match size records
      const assignedSizeIds = (prod.availableSizes || [])
        .map((sName) => createdSizesMap.get(sName)?.id)
        .filter(Boolean);

      // Match color records
      const assignedColorIds = (prod.availableColors || [])
        .map((cObj) => createdColorsMap.get(cObj.name)?.id)
        .filter(Boolean);

      // Regional pricing calculation
      const eurPrice = Number(prod.price);
      const eurSale = prod.salePrice ? Number(prod.salePrice) : null;
      const itPrice = eurPrice; // Italy EUR
      const itSale = eurSale;
      const pkrPrice = Math.round(eurPrice * 295); // Pakistan PKR
      const pkrSale = eurSale ? Math.round(eurSale * 295) : null;

      // Check if product already exists (by slug or sku)
      const existingProduct = await prisma.product.findFirst({
        where: {
          OR: [{ slug: prod.slug }, { sku: prod.sku }],
        },
      });

      if (existingProduct) {
        // Clean dependent relations first to avoid duplicate unique keys
        await prisma.productImage.deleteMany({ where: { productId: existingProduct.id } });
        await prisma.productVariant.deleteMany({ where: { productId: existingProduct.id } });
        await prisma.productPrice.deleteMany({ where: { productId: existingProduct.id } });
        await prisma.productSizeAssignment.deleteMany({ where: { productId: existingProduct.id } });
        await prisma.productColorAssignment.deleteMany({ where: { productId: existingProduct.id } });
        await prisma.productPolicyAssignment.deleteMany({ where: { productId: existingProduct.id } });

        await prisma.product.update({
          where: { id: existingProduct.id },
          data: {
            ...productFields,
            collectionId: collection.id,
            images: {
              create: (images || []).map((img, idx) => ({
                url: img.url,
                alt: img.alt || '',
                isPrimary: !!img.isPrimary,
                isHover: !!img.isHover,
                type: img.type || 'perspective',
                sortOrder: img.sortOrder || idx + 1,
              })),
            },
            variants: {
              create: (variants || []).map((v) => ({
                sku: v.sku,
                size: v.size,
                color: v.color,
                colorHex: v.colorHex || '#000000',
                inStock: true,
                priceOverride: null,
              })),
            },
            prices: {
              create: [
                { regionCode: 'GLOBAL', currency: 'EUR', price: eurPrice, salePrice: eurSale, isActive: true },
                { regionCode: 'IT', currency: 'EUR', price: itPrice, salePrice: itSale, isActive: true },
                { regionCode: 'PK', currency: 'PKR', price: pkrPrice, salePrice: pkrSale, isActive: true },
              ],
            },
            sizeAssignments: {
              create: assignedSizeIds.map((sizeId) => ({ sizeId })),
            },
            colorAssignments: {
              create: assignedColorIds.map((colorId) => ({ colorId })),
            },
            policyAssignments: {
              create: createdPolicies.map((pol, idx) => ({ policyId: pol.id, sortOrder: idx + 1 })),
            },
          },
        });
      } else {
        await prisma.product.create({
          data: {
            ...productFields,
            collectionId: collection.id,
            images: {
              create: (images || []).map((img, idx) => ({
                url: img.url,
                alt: img.alt || '',
                isPrimary: !!img.isPrimary,
                isHover: !!img.isHover,
                type: img.type || 'perspective',
                sortOrder: img.sortOrder || idx + 1,
              })),
            },
            variants: {
              create: (variants || []).map((v) => ({
                sku: v.sku,
                size: v.size,
                color: v.color,
                colorHex: v.colorHex || '#000000',
                inStock: true,
                priceOverride: null,
              })),
            },
            prices: {
              create: [
                { regionCode: 'GLOBAL', currency: 'EUR', price: eurPrice, salePrice: eurSale, isActive: true },
                { regionCode: 'IT', currency: 'EUR', price: itPrice, salePrice: itSale, isActive: true },
                { regionCode: 'PK', currency: 'PKR', price: pkrPrice, salePrice: pkrSale, isActive: true },
              ],
            },
            sizeAssignments: {
              create: assignedSizeIds.map((sizeId) => ({ sizeId })),
            },
            colorAssignments: {
              create: assignedColorIds.map((colorId) => ({ colorId })),
            },
            policyAssignments: {
              create: createdPolicies.map((pol, idx) => ({ policyId: pol.id, sortOrder: idx + 1 })),
            },
            reviews: {
              create: [
                {
                  author: 'Gianluca M.',
                  location: 'Milan, Italy',
                  rating: 5,
                  title: 'Impeccable craftsmanship and fit',
                  comment: 'Ordered from Lombardy and received within 24 hours. The calfskin aroma and handfeel confirm true artisan manufacturing.',
                  verified: true,
                  isApproved: true,
                },
              ],
            },
          },
        });
      }
    }

    // 7. Seed Bespoke Studio Options
    logger.info('Seeding bespoke custom options...');
    const silhouettes = [
      { slug: 'biker', name: 'The Asymmetric Biker', basePrice: 620, description: 'Classic double-rider lapels, bi-swing back, zippered gusset sleeves.', imageUrl: 'https://images.unsplash.com/photo-1520975954732-35dd22299614?q=80&w=1200&auto=format&fit=crop', sortOrder: 1 },
      { slug: 'bomber', name: 'The European Bomber', basePrice: 580, description: 'Architectural drop shoulders, ribbed Italian wool trim, dual welt pockets.', imageUrl: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=1200&auto=format&fit=crop', sortOrder: 2 },
      { slug: 'aviator', name: 'The Alpine Aviator', basePrice: 890, description: 'Plush shearling collar and lining, storm throat latch, heavy waist buckles.', imageUrl: 'https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=1200&auto=format&fit=crop', sortOrder: 3 },
      { slug: 'trench', name: 'The Sartorial Car Coat', basePrice: 740, description: 'Half-canvassed construction, mid-thigh length, concealed storm placket.', imageUrl: 'https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?q=80&w=1200&auto=format&fit=crop', sortOrder: 4 },
    ];
    for (const sil of silhouettes) {
      await prisma.customSilhouette.upsert({
        where: { slug: sil.slug },
        update: sil,
        create: sil,
      });
    }

    const leathers = [
      { slug: 'calfskin', name: 'Full-Grain Italian Calfskin', weight: '1.2mm', origin: "Santa Croce sull'Arno, Tuscany", description: 'Vegetable tanned, develops a luminous deep patina over decades.', extraPrice: 0, sortOrder: 1 },
      { slug: 'nappa', name: 'Plonge Nappa Lambskin', weight: '1.0mm', origin: 'Veneto, Italy', description: 'Incomparably soft drape, lightweight feel with buttery hand.', extraPrice: 0, sortOrder: 2 },
      { slug: 'shearling', name: 'Spanish Merino Shearling', weight: '15mm Fleece', origin: 'Pyrenees, Spain', description: 'Whole-pelt thermal defense with crackled exterior leather.', extraPrice: 260, sortOrder: 3 },
      { slug: 'suede', name: 'Silky Suede Split', weight: '0.8mm', origin: 'Florence, Italy', description: 'Featherweight velvety split nap with rich light-absorbing depth.', extraPrice: 0, sortOrder: 4 },
    ];
    for (const lth of leathers) {
      await prisma.customLeather.upsert({
        where: { slug: lth.slug },
        update: lth,
        create: lth,
      });
    }

    const customColors = [
      { slug: 'obsidian', name: 'Obsidian Black', hex: '#0E0D0C', sortOrder: 1 },
      { slug: 'espresso', name: 'Espresso Brown', hex: '#261A13', sortOrder: 2 },
      { slug: 'cognac', name: 'Tuscan Cognac', hex: '#522D1B', sortOrder: 3 },
      { slug: 'graphite', name: 'Smoked Graphite', hex: '#2B2A29', sortOrder: 4 },
      { slug: 'oxblood', name: 'Vintage Oxblood', hex: '#3A161B', sortOrder: 5 },
    ];
    for (const col of customColors) {
      await prisma.customColor.upsert({
        where: { slug: col.slug },
        update: col,
        create: col,
      });
    }

    const linings = [
      { slug: 'cupro', name: '100% Japanese Cupro Twill', description: 'Silky breathable fiber engineered for effortless friction-free layering.', extraPrice: 0, sortOrder: 1 },
      { slug: 'silk', name: 'Thermal Quilted Silk Blend', description: 'Micro-quilted interior providing luxurious insulation against cold winds.', extraPrice: 65, sortOrder: 2 },
      { slug: 'herringbone', name: 'Charcoal Herringbone Cotton', description: 'Durable heritage weave with breathable vintage English tailoring feel.', extraPrice: 40, sortOrder: 3 },
    ];
    for (const lin of linings) {
      await prisma.customLining.upsert({
        where: { slug: lin.slug },
        update: lin,
        create: lin,
      });
    }

    const hardwares = [
      { slug: 'brass', name: 'Antiqued Brushed Brass', finish: 'Warm golden hue with subtle brush polish forged in northern Italy.', extraPrice: 0, sortOrder: 1 },
      { slug: 'silver', name: 'Oxidized Silver Excella®', finish: 'Cool high-gauge gunmetal silver with mirror-polished teeth.', extraPrice: 0, sortOrder: 2 },
      { slug: 'matte-black', name: 'Matte Anthracite Black', finish: 'Low-reflection tactical luxury finish with durable PVD treatment.', extraPrice: 25, sortOrder: 3 },
    ];
    for (const hw of hardwares) {
      await prisma.customHardware.upsert({
        where: { slug: hw.slug },
        update: hw,
        create: hw,
      });
    }

    // 8. Seed CMS Sections
    logger.info('Seeding homepage CMS modular sections...');
    const cmsSections = [
      {
        sectionKey: 'hero',
        eyebrow: 'ATELIER VALENTI • MILANO',
        title: 'Premium Leather Jackets | AZO-Free Certified Leather',
        subtitle: 'Handcrafted in our Milanese workshop from certified AZO-free full-grain calfskin and Spanish merino shearling. Built to outlive trends, tailored to endure for generations.',
        primaryCta: { label: 'EXPLORE CATALOGUE', href: '/shop' },
        secondaryCta: { label: 'THE ATELIER HERITAGE', href: '/craftsmanship' },
        mediaUrl: 'https://images.unsplash.com/photo-1520975954732-35dd22299614?q=80&w=1600&auto=format&fit=crop',
        sortOrder: 1,
        isVisible: true,
      },
      {
        sectionKey: 'editorial',
        eyebrow: 'THE PHILOSOPHY',
        title: 'SCULPTED IN MILAN. CUT FROM GENERATIONS OF MASTERY.',
        subtitle: 'Every silhouette is an architectural dialogue between raw nature and refined tailoring.',
        primaryCta: { label: 'DISCOVER BESPOKE', href: '/customize' },
        mediaUrl: 'https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?q=80&w=1200&auto=format&fit=crop',
        secondaryMediaUrl: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=800&auto=format&fit=crop',
        extraPayload: {
          quote: 'We do not mass produce; we tailor heirlooms that mold to your life.',
          caption: 'Lookbook Winter 2026 / Milano Workshop No. 4',
        },
        body: [
          'In an era of disposable fashion, Atelier Valenti stands as a bastion of permanent elegance. Located in the heart of Milan’s historic tailoring district, our master artisans hand-select every individual hide from family-owned Tuscan tanneries.',
          'Our jackets are engineered with ergonomic shoulder gussets and half-canvassed construction that allow uncompromised movement while preserving sharp razor-clean silhouettes.',
        ],
        sortOrder: 2,
        isVisible: true,
      },
      {
        sectionKey: 'craftsmanship',
        eyebrow: 'HANDCRAFTED EXCELLENCE',
        title: 'BUILT BY HAND. MADE TO ENDURE.',
        subtitle: 'The four cornerstones that distinguish genuine European leather tailoring.',
        extraPayload: {
          principles: [
            { number: '01', title: 'Full-Grain Selection', description: 'Never sanded or corrected. Only the strongest top 3% of Tuscan hides are chosen.', detail: 'Natural breathability and living patina.' },
            { number: '02', title: 'Canvassed Structure', description: 'Traditional tailoring chest canvas provides permanent drape that resists sagging.', detail: 'Tailored drape over the chest.' },
            { number: '03', title: 'Excella® Hardware', description: 'Hand-polished double-toothed brass zippers engineered for millions of smooth closures.', detail: 'Guaranteed lifetime smoothness.' },
            { number: '04', title: 'Bonded German Thread', description: 'Sewn with heavyweight bonded nylon thread with 8 stitches per inch for extreme tensile strength.', detail: 'Double reinforced load points.' },
          ],
        },
        sortOrder: 3,
        isVisible: true,
      },
      {
        sectionKey: 'macro_detail',
        eyebrow: 'MATERIAL ANATOMY',
        title: '1.2mm Drum-Dyed Full-Grain Tuscan Calfskin',
        subtitle: 'Tanned in Santa Croce sull’Arno using historic vegetable extracts of chestnut and mimosa bark. Retains the organic character and pore structure of natural hide.',
        mediaUrl: 'https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=1600&auto=format&fit=crop',
        extraPayload: {
          detailBullets: [
            { label: 'Hide Origin', value: 'Santa Croce sull’Arno, Tuscany' },
            { label: 'Tannage', value: '100% Vegetable Drum-Dyed' },
            { label: 'Weight & Gauge', value: '1.2mm Architectural Weight' },
            { label: 'Certification', value: 'AZO-Free & REACH Compliant' },
          ],
        },
        sortOrder: 4,
        isVisible: true,
      },
      {
        sectionKey: 'signature_banner',
        eyebrow: 'LIMITED CAPSULE',
        title: 'INVERNO ‘26 ATELIER COLLECTION',
        subtitle: 'A strict release of fifty numbered garments tailored from single-origin Alpine hides.',
        primaryCta: { label: 'VIEW THE LOOKBOOK', href: '/shop?collection=inverno-26' },
        mediaUrl: 'https://images.unsplash.com/photo-1520975954732-35dd22299614?q=80&w=1600&auto=format&fit=crop',
        sortOrder: 5,
        isVisible: true,
      },
      {
        sectionKey: 'brand_story',
        eyebrow: 'THE HERITAGE',
        title: 'A Legacy of Milanese Leatherwork',
        mediaUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=1200&auto=format&fit=crop',
        extraPayload: {
          paragraph1: 'Founded in Milan in 1988, Atelier Valenti began with a singular focus: to create European leather jackets with the anatomical precision of Savile Row tailoring and the visceral tactile power of Tuscan leather craftsmanship.',
          paragraph2: 'Today, our private atelier continues to craft each garment individually, refusing assembly lines in favor of master artisans who cut, skive, stitch, and finish every piece under one roof.',
          signature: 'Giancarlo Valenti, Master Tailor',
        },
        sortOrder: 6,
        isVisible: true,
      },
      {
        sectionKey: 'trust_quality',
        eyebrow: 'ATELIER GUARANTEE',
        title: 'Leather you can trust.',
        subtitle: 'AZO-free certified leather. European express delivery. Lifetime structural warranty.',
        extraPayload: {
          perks: [
            { id: 'perk-1', iconName: 'Truck', title: 'European Express Delivery', description: 'Complimentary tracked delivery on all orders over €250 across EU, Switzerland, and UK.', subtext: '2–4 Business Days' },
            { id: 'perk-2', iconName: 'Sparkles', title: 'AZO-Free Certified Leather', description: 'Certified free from harmful AZO dyes and REACH compliant for hypoallergenic safety.', subtext: 'European Health Standard' },
            { id: 'perk-3', iconName: 'ShieldCheck', title: 'Lifetime Atelier Warranty', description: 'All stitching, hardware, and zips are backed by our lifetime repair commitment.', subtext: 'Enduring Longevity' },
            { id: 'perk-4', iconName: 'RotateCcw', title: '30-Day Complimentary Exchanges', description: 'Experience the fit in your home with prepaid return labels and size exchange concierge.', subtext: 'Stress-Free Guarantee' },
          ],
        },
        sortOrder: 7,
        isVisible: true,
      },
    ];

    for (const section of cmsSections) {
      await prisma.cmsSection.upsert({
        where: { sectionKey: section.sectionKey },
        update: section,
        create: section,
      });
    }

    // 9. Seed Testimonials
    logger.info('Seeding testimonials...');
    if (isReset) {
      await prisma.testimonial.createMany({
        data: [
          {
            quote: 'The Montreal Bomber surpassed all expectations. The calfskin weight feels solid yet buttery, and the cut through the shoulders is unlike anything available off the rack in Zurich.',
            author: 'Maximilian Von Berg',
            city: 'Zurich',
            country: 'Switzerland',
            verifiedGarment: 'Montreal Leather Bomber, Size 50',
            rating: 5,
            sortOrder: 1,
          },
          {
            quote: 'Exceptional Italian craftsmanship. The Cortina Biker has already traveled with me to Paris, Berlin, and London. It molds to the body more with every wear.',
            author: 'Julien Delacroix',
            city: 'Paris',
            country: 'France',
            verifiedGarment: 'Cortina Double Rider, Size 48',
            rating: 5,
            sortOrder: 2,
          },
          {
            quote: 'Ordered the Alpine Shearling for winter in Bavaria. The natural Merino fleece provides incredible warmth without feeling cumbersome. Truly master-level finishing.',
            author: 'Lukas Steiner',
            city: 'Munich',
            country: 'Germany',
            verifiedGarment: 'Alpine Merino Aviator, Size 52',
            rating: 5,
            sortOrder: 3,
          },
        ],
      });
    }

    // 10. Seed Social Looks
    logger.info('Seeding social looks...');
    if (isReset) {
      await prisma.socialLook.createMany({
        data: [
          { imageUrl: 'https://images.unsplash.com/photo-1520975954732-35dd22299614?q=80&w=800&auto=format&fit=crop', caption: 'Milan Fashion Week street look in the Cortina Biker', tag: '@ATELIERVALENTI', sortOrder: 1 },
          { imageUrl: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=800&auto=format&fit=crop', caption: 'Montreal Bomber styled over heavy charcoal rollneck', tag: '@ATELIERVALENTI', sortOrder: 2 },
          { imageUrl: 'https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=800&auto=format&fit=crop', caption: 'Alpine Shearling high above St. Moritz', tag: '@ATELIERVALENTI', sortOrder: 3 },
          { imageUrl: 'https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?q=80&w=800&auto=format&fit=crop', caption: 'Sartorial Suede in autumn Tuscan light', tag: '@ATELIERVALENTI', sortOrder: 4 },
          { imageUrl: 'https://images.unsplash.com/photo-1521223890158-f9f7c3d5d504?q=80&w=800&auto=format&fit=crop', caption: 'Monza Cafe Racer taking the mountain pass', tag: '@ATELIERVALENTI', sortOrder: 5 },
        ],
      });
    }

    // 11. Seed Site Settings
    logger.info('Seeding site settings...');
    const siteSettingPayload = {
      announcement: {
        enabled: true,
        badge: 'Milano Atelier',
        message: 'Complimentary Express European Delivery on All Orders Over €250',
        linkText: 'EXPLORE BESPOKE',
        linkHref: '/customize',
        countryNotice: 'IT • DE • FR • CH • UK',
      },
      shipping: {
        freeShippingThreshold: 250,
        standardShippingCost: 15,
        countries: [
          { code: 'IT', name: 'Italy', rate: 0, days: '1–2 business days' },
          { code: 'DE', name: 'Germany', rate: 15, days: '2–3 business days' },
          { code: 'FR', name: 'France', rate: 15, days: '2–3 business days' },
          { code: 'CH', name: 'Switzerland', rate: 20, days: '2–4 business days' },
          { code: 'UK', name: 'United Kingdom', rate: 20, days: '3–5 business days' },
          { code: 'AT', name: 'Austria', rate: 15, days: '2–3 business days' },
          { code: 'NL', name: 'Netherlands', rate: 15, days: '2–3 business days' },
          { code: 'ES', name: 'Spain', rate: 15, days: '2–4 business days' },
          { code: 'SE', name: 'Sweden', rate: 20, days: '3–5 business days' },
        ],
      },
      footer: {
        certificationLine: '✔️ AZO-Free Leather · ✔️ EU REACH Compliant',
        atelierAddress: 'Via Montenapoleone, 27, 20121 Milano, Italy',
        instagramHandle: '@ATELIERVALENTI',
        copyrightText: '© 2026 Atelier Valenti Milano. All rights reserved.',
        cities: ['MILANO', 'PARIS', 'ZURICH', 'MUNICH'],
        columns: [
          {
            title: 'Catalogue',
            links: [
              { label: 'Biker Jackets', href: '/shop?category=biker' },
              { label: 'Bomber Jackets', href: '/shop?category=bomber' },
              { label: 'Leather Coats', href: '/shop?category=leather-coats' },
              { label: 'Leather Blazers', href: '/shop?category=leather-blazers' },
              { label: 'Leather Accessories', href: '/shop?category=leather-accessories' },
            ],
          },
          {
            title: 'Client Care',
            links: [
              { label: 'Bespoke Commissions', href: '/customize' },
              { label: 'Size & Fit Architecture', href: '/craftsmanship' },
              { label: 'European Shipping & Duties', href: '/cart' },
              { label: 'Lifetime Atelier Guarantee', href: '/craftsmanship' },
            ],
          },
          {
            title: 'The Atelier',
            links: [
              { label: 'Heritage & Craftsmanship', href: '/craftsmanship' },
              { label: 'Tannery Certifications', href: '/craftsmanship' },
              { label: 'Via Montenapoleone Workshop', href: '/craftsmanship' },
            ],
          },
        ],
      },
      searchKeywords: ['Biker', 'Bomber', 'Coat', 'Blazer', 'Calfskin', 'Nappa', 'Accessories', 'Excella'],
    };

    await prisma.siteSetting.upsert({
      where: { singletonKey: 'global' },
      update: siteSettingPayload,
      create: { singletonKey: 'global', ...siteSettingPayload },
    });

    // 12. Seed Navigation Menus
    logger.info('Seeding navigation menus...');
    const menPayload = {
      id: 'men',
      label: 'MEN',
      href: '/men',
      categories: [
        { label: 'Biker Jackets', href: '/men/biker' },
        { label: 'Bomber Jackets', href: '/men/bomber' },
        { label: 'Leather Coats', href: '/men/leather-coats' },
        { label: 'Leather Blazers', href: '/men/leather-blazers' },
        { label: 'Leather Accessories', href: '/men/leather-accessories' },
        { label: 'New Arrivals', href: '/men?is_new=true', badge: 'New' },
        { label: 'Best Sellers', href: '/men?is_bestseller=true' },
      ],
      styles: [
        { label: 'Classic', href: '/men?style=classic' },
        { label: 'Vintage', href: '/men?style=vintage' },
        { label: 'Biker', href: '/men?style=biker' },
        { label: 'Minimal', href: '/men?style=minimal' },
        { label: 'Luxury', href: '/men?style=luxury' },
      ],
      shopBy: [
        { label: 'Black Leather', href: '/men?leatherFamily=black' },
        { label: 'Brown Leather', href: '/men?leatherFamily=brown' },
        { label: 'Suede', href: '/men?leatherFamily=suede' },
        { label: 'Premium', href: '/men?leatherFamily=premium' },
      ],
      featured: {
        title: 'THE MILANESE CUT',
        description: 'Handcrafted calfskin and lambskin silhouettes engineered for effortless elegance.',
        imageUrl: 'https://images.unsplash.com/photo-1520975954732-35dd22299614?q=80&w=1200&auto=format&fit=crop',
        ctaText: 'SHOP MEN',
        href: '/men',
        tag: 'Atelier Curated',
      },
    };

    const womenPayload = {
      id: 'women',
      label: 'WOMEN',
      href: '/women',
      categories: [
        { label: 'Sculpted Bikers', href: '/women/biker' },
        { label: 'Nappa Bombers', href: '/women/bomber' },
        { label: 'Leather Coats', href: '/women/leather-coats' },
        { label: 'Leather Blazers', href: '/women/leather-blazers' },
      ],
      styles: [
        { label: 'Architectural', href: '/women?style=architectural' },
        { label: 'Fitted', href: '/women?style=fitted' },
        { label: 'Minimalist', href: '/women?style=minimalist' },
      ],
      featured: {
        title: 'SCULPTED SILHOUETTES',
        description: 'Sensual architectural lines cut from ultralight plunge lambskin.',
        imageUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=1200&auto=format&fit=crop',
        ctaText: 'SHOP WOMEN',
        href: '/women',
        tag: 'New Capsule',
      },
    };

    await prisma.navigationMenu.upsert({
      where: { menuKey: 'men' },
      update: { payload: menPayload },
      create: { menuKey: 'men', payload: menPayload },
    });

    await prisma.navigationMenu.upsert({
      where: { menuKey: 'women' },
      update: { payload: womenPayload },
      create: { menuKey: 'women', payload: womenPayload },
    });

    logger.info('============================================================');
    logger.info('Database seeding completed successfully! ✨');
    logger.info(`Development Admin Account: ${adminEmail}`);
    logger.info(`Password Source: ${process.env.ADMIN_PASSWORD ? 'Environment Variable (ADMIN_PASSWORD)' : 'Configured Default Development Credential'}`);
    logger.info('============================================================');
    return true;
  } catch (err) {
    logger.error(`Database seeding failed: ${err.message}`);
    throw err;
  }
}

// Run directly if invoked from CLI
if (process.argv[1]?.endsWith('seed.js')) {
  runSeed()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
