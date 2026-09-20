import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { ROLES } from '../config/constants.js';
import { logger } from '../utils/logger.js';

export async function runSeed() {
  logger.info('Starting Atelier Valenti Milano database seeding (Prisma ORM)...');

  try {
    // 1. Clear existing rows in reverse dependency order
    logger.info('Clearing existing tables...');
    await prisma.productReview.deleteMany();
    await prisma.productImage.deleteMany();
    await prisma.productVariant.deleteMany();
    await prisma.product.deleteMany();
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

    // 2. Create Default Super Admin
    logger.info('Creating default Super Admin user...');
    const hashedPassword = await bcrypt.hash('AtelierValenti2026!', 10);
    await prisma.adminUser.create({
      data: {
        email: 'admin@ateliervalenti.com',
        passwordHash: hashedPassword,
        firstName: 'Alessandro',
        lastName: 'Valenti',
        role: ROLES.SUPER_ADMIN,
        permissions: ['*'],
        isActive: true,
      },
    });

    // 3. Create Categories
    logger.info('Seeding categories...');
    const categoriesData = [
      {
        slug: 'biker',
        name: 'Biker Jackets',
        subtitle: 'Asymmetric European silhouettes in plonge lambskin and distressed cowhide',
        description: 'Engineered with double-rider lapels, Excella® industrial zips, and tailored mobility gussets.',
        heroImage: 'https://images.unsplash.com/photo-1520975954732-35dd22299614?q=80&w=1200&auto=format&fit=crop',
        featuredOrder: 1,
        highlightSpecs: ['1.2mm Plonge Lambskin', 'Excella® Silver Zippers', 'Sartorial Waist Belt'],
      },
      {
        slug: 'bomber',
        name: 'Bomber Jackets',
        subtitle: 'Architectural drop shoulders with Italian merino wool trim',
        description: 'Clean proportions cut from Tuscan drum-dyed full-grain calfskin. Refined, effortless luxury.',
        heroImage: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=1200&auto=format&fit=crop',
        featuredOrder: 2,
        highlightSpecs: ['Full-Grain Calfskin', 'Bi-color Wool Ribbing', 'Japanese Cupro Lining'],
      },
      {
        slug: 'aviator',
        name: 'Aviator & Shearling',
        subtitle: 'Whole-pelt Spanish Merino shearling thermal defenses',
        description: 'Substantial, cold-weather armor trimmed with natural shearling collars and antiqued roller buckles.',
        heroImage: 'https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=1200&auto=format&fit=crop',
        featuredOrder: 3,
        highlightSpecs: ['Spanish Merino Shearling', 'Antiqued Brass Buckles', 'Storm Throat Latch'],
      },
      {
        slug: 'suede',
        name: 'Suede Outerwear',
        subtitle: 'Silky split nap buffed to velvety light-absorbing depth',
        description: 'Featherweight luxury tailored for transitional European seasons. Exceptionally tactile.',
        heroImage: 'https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?q=80&w=1200&auto=format&fit=crop',
        featuredOrder: 4,
        highlightSpecs: ['0.8mm Tuscan Suede', 'Breathable Unlined Construction', 'Horn Buttons'],
      },
      {
        slug: 'trench',
        name: 'Leather Coats & Trench',
        subtitle: 'Dramatic proportions with half-canvassed sartorial chest drape',
        description: 'Sculpted length outerwear that moves with authority. Tailored in Lombardy.',
        heroImage: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=1200&auto=format&fit=crop',
        featuredOrder: 5,
        highlightSpecs: ['Calfskin & Nappa Blends', 'Storm Flap', 'Deep Walking Vent'],
      },
      {
        slug: 'accessories',
        name: 'Accessories & Atelier Goods',
        subtitle: 'Weekenders, cardholders, and artisan leather balms',
        description: 'Meticulously crafted leather lifestyle accessories utilizing vegetable-tanned full-grain offcuts.',
        heroImage: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=1200&auto=format&fit=crop',
        featuredOrder: 6,
        highlightSpecs: ['Full-Grain Calfskin', 'Solid Cast Brass Hardware', 'Hand-stitched Edge Paint'],
      },
    ];

    for (const cat of categoriesData) {
      await prisma.category.create({ data: cat });
    }

    // 4. Create Collections
    logger.info('Seeding collections...');
    await prisma.collection.create({
      data: {
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

    // 5. Create Products, Variants, Images & Reviews
    logger.info('Seeding products, variants, images & reviews...');
    const productsData = [
      {
        sku: 'MLB-001',
        slug: 'montreal-leather-bomber',
        name: 'Montreal Leather Bomber',
        tagline: 'Full-grain calfskin with Italian antiqued brass hardware',
        categorySlug: 'bomber',
        categoryLabel: 'Bomber Jackets',
        gender: 'men',
        styles: ['classic', 'minimal', 'luxury'],
        price: 385,
        salePrice: null,
        isFeatured: true,
        isBestseller: true,
        isNewArrival: false,
        isPublished: true,
        leatherType: 'Full-Grain Italian Calfskin',
        hardware: 'Custom Brushed Brass YKK Excella®',
        lining: '100% Breathable Japanese Cupro Twill',
        description:
          'A masterclass in modern European proportion. The Montreal Bomber is cut from hand-selected 1.2mm full-grain calfskin that softens progressively with body heat. Finished with ribbed wool-blend cuffs, dual internal welt pockets, and sculpted shoulder seams.',
        editorialQuote: 'The benchmark of modern leather tailoring—structured yet deceptively supple.',
        modelInfo: 'Model is 187cm / 6\'1" with a 98cm chest and wears size 48 (EU M)',
        specifications: [
          '1.2mm premium vegetable-tanned full-grain calfskin',
          'Signature drop-shoulder silhouette with tapered waist',
          'Two-way antiqued brass zipper with leather pull tabs',
          'Dual exterior angled handwarmer pockets with storm flap',
          'Internal passport pocket with concealed horn button closure',
          'Heavyweight 2x2 ribbed collar and hem knit in northern Italy',
        ],
        careInstructions: [
          'Specialist leather dry clean only',
          'Store on contoured wide wooden hanger away from direct sunlight',
          'Condition annually with neutral organic beeswax balm',
        ],
        images: [
          {
            url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=1200&auto=format&fit=crop',
            alt: 'Montreal Leather Bomber front view',
            isPrimary: true,
            type: 'front',
            sortOrder: 1,
          },
          {
            url: 'https://images.unsplash.com/photo-1521223890158-f9f7c3d5d504?q=80&w=1200&auto=format&fit=crop',
            alt: 'Montreal Leather Bomber worn street view',
            isHover: true,
            type: 'editorial',
            sortOrder: 2,
          },
        ],
        variants: [
          { sku: 'MLB-BLK-46', size: '46 (EU S)', color: 'Obsidian Black', colorHex: '#11100F', stock: 6 },
          { sku: 'MLB-BLK-48', size: '48 (EU M)', color: 'Obsidian Black', colorHex: '#11100F', stock: 12 },
          { sku: 'MLB-BLK-50', size: '50 (EU L)', color: 'Obsidian Black', colorHex: '#11100F', stock: 9 },
          { sku: 'MLB-BLK-52', size: '52 (EU XL)', color: 'Obsidian Black', colorHex: '#11100F', stock: 4 },
        ],
        availableColors: [
          { name: 'Obsidian Black', hex: '#11100F' },
          { name: 'Espresso Brown', hex: '#2B1E17' },
        ],
        availableSizes: ['46 (EU S)', '48 (EU M)', '50 (EU L)', '52 (EU XL)'],
        rating: 4.95,
        reviewCount: 2,
      },
      {
        sku: 'CDR-002',
        slug: 'cortina-double-rider-biker',
        name: 'Cortina Double Rider Biker',
        tagline: 'Asymmetric closure in drum-dyed plunging nappa',
        categorySlug: 'biker',
        categoryLabel: 'Biker Jackets',
        gender: 'men',
        styles: ['biker', 'vintage', 'luxury'],
        price: 495,
        salePrice: 445,
        isFeatured: true,
        isBestseller: true,
        isNewArrival: false,
        isPublished: true,
        leatherType: 'Plonge Nappa Lambskin',
        hardware: 'Oxidized Silver Heavy-Gauge Zips',
        lining: 'Burgundy Satin Twill',
        description:
          'An architectural interpretation of the classic motorcycling jacket. Tailored with clean lapels that snap flat or close tight against European headwinds. Features bi-swing back shoulder gussets.',
        editorialQuote: 'Rebellious spirit tempered by immaculate European tailoring.',
        modelInfo: 'Model is 185cm with a 100cm chest and wears size 50 (EU L)',
        specifications: [
          'Drum-dyed buttery plonge lambskin (1.0mm thickness)',
          'Iconic off-center asymmetrical front fastening',
          'Ergonomic bi-swing accordion shoulder pleats',
          'Removable buckle belt with keeper loops',
        ],
        careInstructions: ['Specialist leather care only', 'Protect with water-repellent mist'],
        images: [
          {
            url: 'https://images.unsplash.com/photo-1520975954732-35dd22299614?q=80&w=1200&auto=format&fit=crop',
            alt: 'Cortina Double Rider Biker front',
            isPrimary: true,
            type: 'front',
            sortOrder: 1,
          },
        ],
        variants: [
          { sku: 'CDR-BLK-48', size: '48 (EU M)', color: 'Obsidian Black', colorHex: '#0E0D0C', stock: 8 },
          { sku: 'CDR-BLK-50', size: '50 (EU L)', color: 'Obsidian Black', colorHex: '#0E0D0C', stock: 10 },
        ],
        availableColors: [{ name: 'Obsidian Black', hex: '#0E0D0C' }],
        availableSizes: ['48 (EU M)', '50 (EU L)'],
        rating: 4.9,
        reviewCount: 1,
      },
      {
        sku: 'AAJ-003',
        slug: 'alpine-merino-aviator',
        name: 'Alpine Merino Aviator',
        tagline: 'Whole-pelt Spanish Merino shearling thermal defense',
        categorySlug: 'aviator',
        categoryLabel: 'Aviator Jackets',
        gender: 'unisex',
        styles: ['shearling', 'luxury', 'vintage'],
        price: 890,
        salePrice: null,
        isFeatured: true,
        isBestseller: false,
        isNewArrival: true,
        isPublished: true,
        leatherType: 'Spanish Merino Shearling',
        hardware: 'Antiqued Brass Roller Buckles',
        lining: '15mm Natural Merino Wool Fleece',
        description:
          'Constructed for extreme European winter weather. Crafted from whole-pelt Spanish merino shearling with dense 15mm wool fleece and an antiqued cracked exterior hide.',
        editorialQuote: 'Pure thermal mastery engineered for alpine altitudes.',
        modelInfo: 'Model is 188cm and wears size 50 (EU L)',
        specifications: [
          'Genuine 100% Spanish merino sheepskin whole-pelt',
          'Dual throat latch buckles with brass grommets',
          'Heavy leather storm tape along every structural seam',
        ],
        careInstructions: ['Specialist fur and shearling cleaner only'],
        images: [
          {
            url: 'https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=1200&auto=format&fit=crop',
            alt: 'Alpine Merino Aviator front',
            isPrimary: true,
            type: 'front',
            sortOrder: 1,
          },
        ],
        variants: [
          { sku: 'AAJ-BRN-48', size: '48 (EU M)', color: 'Tuscan Umber', colorHex: '#3D2517', stock: 4 },
        ],
        availableColors: [{ name: 'Tuscan Umber', hex: '#3D2517' }],
        availableSizes: ['48 (EU M)'],
        rating: 5.0,
        reviewCount: 1,
      },
      {
        sku: 'SSC-004',
        slug: 'sartorial-suede-car-coat',
        name: 'Sartorial Suede Car Coat',
        tagline: 'Velvety Tuscan split suede with horn button closure',
        categorySlug: 'suede',
        categoryLabel: 'Suede Outerwear',
        gender: 'men',
        styles: ['classic', 'minimal', 'luxury'],
        price: 540,
        salePrice: null,
        isFeatured: false,
        isBestseller: true,
        isNewArrival: false,
        isPublished: true,
        leatherType: 'Silky Suede Split',
        hardware: 'Genuine Italian Buffalo Horn Buttons',
        lining: 'Cupro Cotton Half-Lining',
        description:
          'A benchmark in refined quiet luxury. Lightweight 0.8mm suede split nap provides an extraordinary velvet hand that drapes naturally over tailored knitwear.',
        editorialQuote: 'Effortless Milanese sophistication for autumn evenings.',
        modelInfo: 'Model is 186cm and wears size 48 (EU M)',
        specifications: ['0.8mm Tuscan split calf suede', 'Half-canvassed lightweight interior'],
        careInstructions: ['Use brass suede brush only'],
        images: [
          {
            url: 'https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?q=80&w=1200&auto=format&fit=crop',
            alt: 'Sartorial Suede Car Coat',
            isPrimary: true,
            type: 'front',
            sortOrder: 1,
          },
        ],
        variants: [
          { sku: 'SSC-SND-48', size: '48 (EU M)', color: 'Desert Sand', colorHex: '#A89279', stock: 7 },
        ],
        availableColors: [{ name: 'Desert Sand', hex: '#A89279' }],
        availableSizes: ['48 (EU M)'],
        rating: 4.88,
        reviewCount: 1,
      },
      {
        sku: 'MCR-005',
        slug: 'monza-cafe-racer',
        name: 'Monza Cafe Racer',
        tagline: 'Mandarin collar and streamlined racing chest panels',
        categorySlug: 'biker',
        categoryLabel: 'Biker Jackets',
        gender: 'men',
        styles: ['minimal', 'classic'],
        price: 420,
        salePrice: null,
        isFeatured: false,
        isBestseller: false,
        isNewArrival: true,
        isPublished: true,
        leatherType: 'Distressed Vintage Cowhide',
        hardware: 'Gunmetal Polished Zippers',
        lining: 'Cotton Twill Racing Stripe',
        description:
          'Inspired by 1960s Italian grand prix circuits. Tailored with a snap mandarin collar, contoured sleeves, and unembellished torso lines for a sleek silhouette.',
        editorialQuote: 'A minimalist tribute to Italian motorsport heritage.',
        modelInfo: 'Model is 185cm and wears size 48 (EU M)',
        specifications: ['1.1mm vegetable-infused oiled cowhide', 'Dual zippered chest slash pockets'],
        careInstructions: ['Wipe clean with damp cloth'],
        images: [
          {
            url: 'https://images.unsplash.com/photo-1521223890158-f9f7c3d5d504?q=80&w=1200&auto=format&fit=crop',
            alt: 'Monza Cafe Racer',
            isPrimary: true,
            type: 'front',
            sortOrder: 1,
          },
        ],
        variants: [
          { sku: 'MCR-VNT-48', size: '48 (EU M)', color: 'Vintage Cognac', colorHex: '#4A2A18', stock: 5 },
        ],
        availableColors: [{ name: 'Vintage Cognac', hex: '#4A2A18' }],
        availableSizes: ['48 (EU M)'],
        rating: 4.9,
        reviewCount: 0,
      },
      {
        sku: 'SLT-006',
        slug: 'sculpted-leather-trench',
        name: 'The Sculpted Leather Trench',
        tagline: 'Double-breasted storm flap trench in buttery nappa',
        categorySlug: 'trench',
        categoryLabel: 'Leather Coats',
        gender: 'women',
        styles: ['luxury', 'classic'],
        price: 780,
        salePrice: null,
        isFeatured: true,
        isBestseller: false,
        isNewArrival: true,
        isPublished: true,
        leatherType: 'Plonge Nappa Lambskin',
        hardware: 'Leather-Wrapped Horn Buckles',
        lining: 'Full Silk Blend Twill',
        description:
          'Dramatic full-length outerwear designed to command attention. Double-breasted front with wide lapels and belted waist that accentuates an architectural hourglass silhouette.',
        editorialQuote: 'Cinematic drama tailored from the softest Italian lambskin.',
        modelInfo: 'Model is 178cm and wears size 46 (EU S)',
        specifications: ['1.0mm glove-soft lambskin', 'Storm flap on shoulder and back storm shield'],
        careInstructions: ['Professional leather clean only'],
        images: [
          {
            url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=1200&auto=format&fit=crop',
            alt: 'Sculpted Leather Trench',
            isPrimary: true,
            type: 'front',
            sortOrder: 1,
          },
        ],
        variants: [
          { sku: 'SLT-NOIR-46', size: '46 (EU S)', color: 'Noir Black', colorHex: '#141414', stock: 3 },
        ],
        availableColors: [{ name: 'Noir Black', hex: '#141414' }],
        availableSizes: ['46 (EU S)'],
        rating: 5.0,
        reviewCount: 1,
      },
      {
        sku: 'CWD-007',
        slug: 'tuscan-calfskin-weekend-duffle',
        name: 'Tuscan Calfskin Weekend Duffle',
        tagline: 'Hand-burnished vegetable-tanned travel bag with solid brass locks',
        categorySlug: 'accessories',
        categoryLabel: 'Artisan Goods',
        gender: 'unisex',
        styles: ['luxury', 'classic'],
        price: 360,
        salePrice: null,
        isFeatured: false,
        isBestseller: true,
        isNewArrival: false,
        isPublished: true,
        leatherType: 'Full-Grain Italian Calfskin',
        hardware: 'Solid Cast Antiqued Brass',
        lining: 'Heavy Italian Cotton Canvas',
        description:
          'Built for a lifetime of European journeys. Hand-cut 1.8mm Tuscan saddle calfskin with reinforced double-stitched leather handles, detachable shoulder strap, and protective brass base studs.',
        editorialQuote: 'The quintessential Italian travel companion.',
        modelInfo: 'Dimensions: 52cm x 28cm x 26cm',
        specifications: ['1.8mm full-grain Tuscan vegetable-tanned hide', 'TSA-compliant brass padlock'],
        careInstructions: ['Apply leather conditioner twice a year'],
        images: [
          {
            url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=1200&auto=format&fit=crop',
            alt: 'Tuscan Calfskin Weekend Duffle',
            isPrimary: true,
            type: 'front',
            sortOrder: 1,
          },
        ],
        variants: [
          { sku: 'CWD-COG-OS', size: 'One Size', color: 'Tuscan Cognac', colorHex: '#5C3119', stock: 15 },
        ],
        availableColors: [{ name: 'Tuscan Cognac', hex: '#5C3119' }],
        availableSizes: ['One Size'],
        rating: 4.96,
        reviewCount: 1,
      },
    ];

    for (const prod of productsData) {
      const { images, variants, ...productFields } = prod;

      const createdProd = await prisma.product.create({
        data: {
          ...productFields,
          images: {
            create: (images || []).map((img, idx) => ({
              url: img.url,
              alt: img.alt || '',
              isPrimary: !!img.isPrimary,
              isHover: !!img.isHover,
              type: img.type || 'gallery',
              sortOrder: img.sortOrder || idx + 1,
            })),
          },
          variants: {
            create: (variants || []).map((v) => ({
              sku: v.sku,
              size: v.size,
              color: v.color,
              colorHex: v.colorHex || '#000000',
              stock: v.stock || 0,
            })),
          },
          reviews: {
            create: [
              {
                author: 'Gianluca M.',
                location: 'Milan, Italy',
                rating: 5,
                title: 'Impeccable craftsmanship and fit',
                comment:
                  'Ordered from Lombardy and received within 24 hours. The calfskin aroma and handfeel confirm true artisan manufacturing.',
                verified: true,
                isApproved: true,
              },
            ],
          },
        },
      });
    }

    // 6. Seed Bespoke Customization Studio Options
    logger.info('Seeding bespoke customization options...');
    await prisma.customSilhouette.createMany({
      data: [
        {
          slug: 'biker',
          name: 'The Asymmetric Biker',
          basePrice: 620,
          description: 'Classic double-rider lapels, bi-swing back, zippered gusset sleeves.',
          imageUrl: 'https://images.unsplash.com/photo-1520975954732-35dd22299614?q=80&w=1200&auto=format&fit=crop',
          sortOrder: 1,
        },
        {
          slug: 'bomber',
          name: 'The European Bomber',
          basePrice: 580,
          description: 'Architectural drop shoulders, ribbed Italian wool trim, dual welt pockets.',
          imageUrl: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=1200&auto=format&fit=crop',
          sortOrder: 2,
        },
        {
          slug: 'aviator',
          name: 'The Alpine Aviator',
          basePrice: 890,
          description: 'Plush shearling collar and lining, storm throat latch, heavy waist buckles.',
          imageUrl: 'https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=1200&auto=format&fit=crop',
          sortOrder: 3,
        },
        {
          slug: 'trench',
          name: 'The Sartorial Car Coat',
          basePrice: 740,
          description: 'Half-canvassed construction, mid-thigh length, concealed storm placket.',
          imageUrl: 'https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?q=80&w=1200&auto=format&fit=crop',
          sortOrder: 4,
        },
      ],
    });

    await prisma.customLeather.createMany({
      data: [
        {
          slug: 'calfskin',
          name: 'Full-Grain Italian Calfskin',
          weight: '1.2mm',
          origin: "Santa Croce sull'Arno, Tuscany",
          description: 'Vegetable tanned, develops a luminous deep patina over decades.',
          extraPrice: 0,
          sortOrder: 1,
        },
        {
          slug: 'nappa',
          name: 'Plonge Nappa Lambskin',
          weight: '1.0mm',
          origin: 'Veneto, Italy',
          description: 'Incomparably soft drape, lightweight feel with buttery hand.',
          extraPrice: 0,
          sortOrder: 2,
        },
        {
          slug: 'shearling',
          name: 'Spanish Merino Shearling',
          weight: '15mm Fleece',
          origin: 'Pyrenees, Spain',
          description: 'Whole-pelt thermal defense with crackled exterior leather.',
          extraPrice: 260,
          sortOrder: 3,
        },
        {
          slug: 'suede',
          name: 'Silky Suede Split',
          weight: '0.8mm',
          origin: 'Florence, Italy',
          description: 'Featherweight velvety split nap with rich light-absorbing depth.',
          extraPrice: 0,
          sortOrder: 4,
        },
      ],
    });

    await prisma.customColor.createMany({
      data: [
        { slug: 'obsidian', name: 'Obsidian Black', hex: '#0E0D0C', sortOrder: 1 },
        { slug: 'espresso', name: 'Espresso Brown', hex: '#261A13', sortOrder: 2 },
        { slug: 'cognac', name: 'Tuscan Cognac', hex: '#522D1B', sortOrder: 3 },
        { slug: 'graphite', name: 'Smoked Graphite', hex: '#2B2A29', sortOrder: 4 },
        { slug: 'oxblood', name: 'Vintage Oxblood', hex: '#3A161B', sortOrder: 5 },
      ],
    });

    await prisma.customLining.createMany({
      data: [
        {
          slug: 'cupro',
          name: '100% Japanese Cupro Twill',
          description: 'Silky breathable fiber engineered for effortless friction-free layering.',
          extraPrice: 0,
          sortOrder: 1,
        },
        {
          slug: 'silk',
          name: 'Thermal Quilted Silk Blend',
          description: 'Micro-quilted interior providing luxurious insulation against cold winds.',
          extraPrice: 65,
          sortOrder: 2,
        },
        {
          slug: 'herringbone',
          name: 'Charcoal Herringbone Cotton',
          description: 'Durable heritage weave with breathable vintage English tailoring feel.',
          extraPrice: 40,
          sortOrder: 3,
        },
      ],
    });

    await prisma.customHardware.createMany({
      data: [
        {
          slug: 'brass',
          name: 'Antiqued Brushed Brass',
          finish: 'Warm golden hue with subtle brush polish forged in northern Italy.',
          extraPrice: 0,
          sortOrder: 1,
        },
        {
          slug: 'silver',
          name: 'Oxidized Silver Excella®',
          finish: 'Cool high-gauge gunmetal silver with mirror-polished teeth.',
          extraPrice: 0,
          sortOrder: 2,
        },
        {
          slug: 'matte-black',
          name: 'Matte Anthracite Black',
          finish: 'Low-reflection tactical luxury finish with durable PVD treatment.',
          extraPrice: 25,
          sortOrder: 3,
        },
      ],
    });

    // 7. Seed CMS Sections
    logger.info('Seeding homepage CMS modular sections...');
    const cmsSections = [
      {
        sectionKey: 'hero',
        eyebrow: 'ATELIER VALENTI • MILANO',
        title: 'Premium Leather Jackets | AZO-Free Certified Leather',
        subtitle:
          'Handcrafted in our Milanese workshop from certified AZO-free full-grain calfskin and Spanish merino shearling. Built to outlive trends, tailored to endure for generations.',
        primaryCta: { label: 'EXPLORE CATALOGUE', href: '/shop' },
        secondaryCta: { label: 'THE ATELIER HERITAGE', href: '/craftsmanship' },
        mediaUrl:
          'https://images.unsplash.com/photo-1520975954732-35dd22299614?q=80&w=1600&auto=format&fit=crop',
        sortOrder: 1,
        isVisible: true,
      },
      {
        sectionKey: 'editorial',
        eyebrow: 'THE PHILOSOPHY',
        title: 'SCULPTED IN MILAN. CUT FROM GENERATIONS OF MASTERY.',
        subtitle: 'Every silhouette is an architectural dialogue between raw nature and refined tailoring.',
        primaryCta: { label: 'DISCOVER BESPOKE', href: '/customize' },
        mediaUrl:
          'https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?q=80&w=1200&auto=format&fit=crop',
        secondaryMediaUrl:
          'https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=800&auto=format&fit=crop',
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
            {
              number: '01',
              title: 'Full-Grain Selection',
              description: 'Never sanded or corrected. Only the strongest top 3% of Tuscan hides are chosen.',
              detail: 'Natural breathability and living patina.',
            },
            {
              number: '02',
              title: 'Canvassed Structure',
              description: 'Traditional tailoring chest canvas provides permanent drape that resists sagging.',
              detail: 'Tailored drape over the chest.',
            },
            {
              number: '03',
              title: 'Excella® Hardware',
              description: 'Hand-polished double-toothed brass zippers engineered for millions of smooth closures.',
              detail: 'Guaranteed lifetime smoothness.',
            },
            {
              number: '04',
              title: 'Bonded German Thread',
              description: 'Sewn with heavyweight bonded nylon thread with 8 stitches per inch for extreme tensile strength.',
              detail: 'Double reinforced load points.',
            },
          ],
        },
        sortOrder: 3,
        isVisible: true,
      },
      {
        sectionKey: 'macro_detail',
        eyebrow: 'MATERIAL ANATOMY',
        title: '1.2mm Drum-Dyed Full-Grain Tuscan Calfskin',
        subtitle:
          'Tanned in Santa Croce sull’Arno using historic vegetable extracts of chestnut and mimosa bark. Retains the organic character and pore structure of natural hide.',
        mediaUrl:
          'https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=1600&auto=format&fit=crop',
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
        mediaUrl:
          'https://images.unsplash.com/photo-1520975954732-35dd22299614?q=80&w=1600&auto=format&fit=crop',
        sortOrder: 5,
        isVisible: true,
      },
      {
        sectionKey: 'brand_story',
        eyebrow: 'THE HERITAGE',
        title: 'A Legacy of Milanese Leatherwork',
        mediaUrl:
          'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=1200&auto=format&fit=crop',
        extraPayload: {
          paragraph1:
            'Founded in Milan in 1988, Atelier Valenti began with a singular focus: to create European leather jackets with the anatomical precision of Savile Row tailoring and the visceral tactile power of Tuscan leather craftsmanship.',
          paragraph2:
            'Today, our private atelier continues to craft each garment individually, refusing assembly lines in favor of master artisans who cut, skive, stitch, and finish every piece under one roof.',
          signature: 'Giancarlo Valenti, Master Tailor',
        },
        sortOrder: 6,
        isVisible: true,
      },
      {
        sectionKey: 'trust_quality',
        eyebrow: 'ATELIER GUARANTEE',
        title: 'Leather you can trust.',
        subtitle:
          'AZO-free certified leather. European express delivery. Lifetime structural warranty.',
        extraPayload: {
          perks: [
            {
              id: 'perk-1',
              iconName: 'Truck',
              title: 'European Express Delivery',
              description: 'Complimentary tracked delivery on all orders over €250 across EU, Switzerland, and UK.',
              subtext: '2–4 Business Days',
            },
            {
              id: 'perk-2',
              iconName: 'Sparkles',
              title: 'AZO-Free Certified Leather',
              description: 'Certified free from harmful AZO dyes and REACH compliant for hypoallergenic safety.',
              subtext: 'European Health Standard',
            },
            {
              id: 'perk-3',
              iconName: 'ShieldCheck',
              title: 'Lifetime Atelier Warranty',
              description: 'All stitching, hardware, and zips are backed by our lifetime repair commitment.',
              subtext: 'Enduring Longevity',
            },
            {
              id: 'perk-4',
              iconName: 'RotateCcw',
              title: '30-Day Complimentary Exchanges',
              description: 'Experience the fit in your home with prepaid return labels and size exchange concierge.',
              subtext: 'Stress-Free Guarantee',
            },
          ],
        },
        sortOrder: 7,
        isVisible: true,
      },
    ];

    for (const section of cmsSections) {
      await prisma.cmsSection.create({ data: section });
    }

    // 8. Seed Testimonials
    logger.info('Seeding testimonials...');
    await prisma.testimonial.createMany({
      data: [
        {
          quote:
            'The Montreal Bomber surpassed all expectations. The calfskin weight feels solid yet buttery, and the cut through the shoulders is unlike anything available off the rack in Zurich.',
          author: 'Maximilian Von Berg',
          city: 'Zurich',
          country: 'Switzerland',
          verifiedGarment: 'Montreal Leather Bomber, Size 50',
          rating: 5,
          sortOrder: 1,
        },
        {
          quote:
            'Exceptional Italian craftsmanship. The Cortina Biker has already traveled with me to Paris, Berlin, and London. It molds to the body more with every wear.',
          author: 'Julien Delacroix',
          city: 'Paris',
          country: 'France',
          verifiedGarment: 'Cortina Double Rider, Size 48',
          rating: 5,
          sortOrder: 2,
        },
        {
          quote:
            'Ordered the Alpine Shearling for winter in Bavaria. The natural Merino fleece provides incredible warmth without feeling cumbersome. Truly master-level finishing.',
          author: 'Lukas Steiner',
          city: 'Munich',
          country: 'Germany',
          verifiedGarment: 'Alpine Merino Aviator, Size 52',
          rating: 5,
          sortOrder: 3,
        },
      ],
    });

    // 9. Seed Social Looks
    logger.info('Seeding social looks...');
    await prisma.socialLook.createMany({
      data: [
        {
          imageUrl: 'https://images.unsplash.com/photo-1520975954732-35dd22299614?q=80&w=800&auto=format&fit=crop',
          caption: 'Milan Fashion Week street look in the Cortina Biker',
          tag: '@ATELIERVALENTI',
          sortOrder: 1,
        },
        {
          imageUrl: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=800&auto=format&fit=crop',
          caption: 'Montreal Bomber styled over heavy charcoal rollneck',
          tag: '@ATELIERVALENTI',
          sortOrder: 2,
        },
        {
          imageUrl: 'https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=800&auto=format&fit=crop',
          caption: 'Alpine Shearling high above St. Moritz',
          tag: '@ATELIERVALENTI',
          sortOrder: 3,
        },
        {
          imageUrl: 'https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?q=80&w=800&auto=format&fit=crop',
          caption: 'Sartorial Suede in autumn Tuscan light',
          tag: '@ATELIERVALENTI',
          sortOrder: 4,
        },
        {
          imageUrl: 'https://images.unsplash.com/photo-1521223890158-f9f7c3d5d504?q=80&w=800&auto=format&fit=crop',
          caption: 'Monza Cafe Racer taking the mountain pass',
          tag: '@ATELIERVALENTI',
          sortOrder: 5,
        },
      ],
    });

    // 10. Seed Site Settings
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
              { label: 'Aviator & Shearling', href: '/shop?category=aviator' },
              { label: 'Suede Outerwear', href: '/shop?category=suede' },
              { label: 'Leather Coats', href: '/shop?category=trench' },
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
      searchKeywords: ['Biker', 'Bomber', 'Shearling', 'Suede', 'Calfskin', 'Nappa', 'Trench', 'Excella'],
    };

    await prisma.siteSetting.upsert({
      where: { singletonKey: 'global' },
      update: siteSettingPayload,
      create: { singletonKey: 'global', ...siteSettingPayload },
    });

    // 11. Seed Navigation Menus
    logger.info('Seeding navigation menus...');
    const menPayload = {
      id: 'men',
      label: 'MEN',
      href: '/men',
      categories: [
        { label: 'Leather Jackets', href: '/men/leather-jackets' },
        { label: 'Biker Jackets', href: '/men/biker-jackets' },
        { label: 'Bomber Jackets', href: '/men/bomber-jackets' },
        { label: 'Aviator Jackets', href: '/men/aviator-jackets' },
        { label: 'Shearling Jackets', href: '/men/shearling-jackets' },
        { label: 'Leather Coats', href: '/men/leather-coats' },
        { label: 'New Arrivals', href: '/men?is_new=true', badge: 'New' },
        { label: 'Best Sellers', href: '/men?is_bestseller=true' },
      ],
      styles: [
        { label: 'Classic', href: '/men?style=classic' },
        { label: 'Vintage', href: '/men?style=vintage' },
        { label: 'Biker', href: '/men?style=biker' },
        { label: 'Minimal', href: '/men?style=minimal' },
        { label: 'Luxury', href: '/men?style=luxury' },
        { label: 'Shearling', href: '/men?style=shearling' },
      ],
      shopBy: [
        { label: 'Black Leather', href: '/men?leatherFamily=black' },
        { label: 'Brown Leather', href: '/men?leatherFamily=brown' },
        { label: 'Suede', href: '/men?leatherFamily=suede' },
        { label: 'Shearling', href: '/men?leatherFamily=shearling' },
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
        { label: 'Sculpted Bikers', href: '/women/biker-jackets' },
        { label: 'Nappa Bombers', href: '/women/bomber-jackets' },
        { label: 'Merino Shearling', href: '/women/shearling-jackets' },
        { label: 'Trench Coats', href: '/women/leather-coats' },
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

    logger.info('Database seeding completed successfully! ✨');
    logger.info('Default Admin credentials:');
    logger.info('Email: admin@ateliervalenti.com');
    logger.info('Password: AtelierValenti2026!');
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
