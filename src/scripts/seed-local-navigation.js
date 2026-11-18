import { prisma } from '../lib/prisma.js';
import { logger } from '../utils/logger.js';

/**
 * Isolated Local Development Navigation Data Seed
 *
 * Populates representative Men and Women navigation payloads locally
 * without accessing or copying from the remote production database.
 */
export async function seedLocalNavigation() {
  logger.info('Seeding representative local navigation menus and catalog categories...');

  // 1. Seed essential catalog categories for local deterministic mapping
  const localCategories = [
    { slug: 'men-biker-jackets', name: "Men's Biker & Moto Jackets" },
    { slug: 'men-bomber-jackets', name: "Men's Bomber & Flight Jackets" },
    { slug: 'men-coats-trench', name: "Men's Long Coats & Trench" },
    { slug: 'women-biker-jackets', name: "Women's Biker & Moto Jackets" },
    { slug: 'women-coats-trench', name: "Women's Long Coats & Trench" },
    { slug: 'trench', name: 'Leather Coats & Trench' },
    { slug: 'aviator', name: 'Aviator & Shearling' },
    { slug: 'biker', name: 'Biker Jackets' },
  ];

  for (const cat of localCategories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, isPublished: true },
      create: {
        slug: cat.slug,
        name: cat.name,
        isPublished: true,
      },
    });
  }

  // 2. Representative Men Navigation Payload
  const menPayload = {
    id: 'men',
    labelKey: 'nav.men',
    fallbackLabel: 'MEN',
    href: '/men',
    categories: [
      { id: 'm-leather', labelKey: 'nav.leatherJackets', fallbackLabel: 'Leather Jackets', href: '/men/leather-jackets' },
      { id: 'm-biker', labelKey: 'nav.bikerJackets', fallbackLabel: 'Biker Jackets', href: '/men/biker-jackets' },
      { id: 'm-bomber', labelKey: 'nav.bomberJackets', fallbackLabel: 'Bomber Jackets', href: '/men/bomber-jackets' },
      { id: 'm-aviator', labelKey: 'nav.aviatorJackets', fallbackLabel: 'Aviator Jackets', href: '/men/aviator-jackets' },
      { id: 'm-shearling', labelKey: 'nav.shearlingJackets', fallbackLabel: 'Shearling Jackets', href: '/men/shearling-jackets' },
      { id: 'm-coats', labelKey: 'nav.leatherCoats', fallbackLabel: 'Leather Coats', href: '/men/leather-coats' },
      { id: 'm-vests', labelKey: 'nav.leatherVests', fallbackLabel: 'Leather Vests', href: '/men/leather-vests' },
      { id: 'm-new', labelKey: 'nav.newArrivals', fallbackLabel: 'New Arrivals', href: '/men/new-arrivals', badge: 'New' },
      { id: 'm-best', labelKey: 'nav.bestSellers', fallbackLabel: 'Best Sellers', href: '/men/best-sellers' },
    ],
    styles: [
      { id: 's-classic', labelKey: 'nav.classic', fallbackLabel: 'Classic', href: '/men?style=classic' },
      { id: 's-vintage', labelKey: 'nav.vintage', fallbackLabel: 'Vintage', href: '/men?style=vintage' },
      { id: 's-biker', labelKey: 'nav.biker', fallbackLabel: 'Biker', href: '/men?style=biker' },
      { id: 's-minimal', labelKey: 'nav.minimal', fallbackLabel: 'Minimal', href: '/men?style=minimal' },
      { id: 's-shearling', labelKey: 'nav.shearling', fallbackLabel: 'Shearling', href: '/men?style=shearling' },
    ],
    shopBy: [
      { id: 'sb-black', labelKey: 'nav.blackLeather', fallbackLabel: 'Black Leather', href: '/men?leather=black' },
      { id: 'sb-brown', labelKey: 'nav.brownLeather', fallbackLabel: 'Brown Leather', href: '/men?leather=brown' },
      { id: 'sb-suede', labelKey: 'nav.suede', fallbackLabel: 'Suede', href: '/men?leather=suede' },
      { id: 'sb-shearling', labelKey: 'nav.shearling', fallbackLabel: 'Shearling', href: '/men?leather=shearling' },
      { id: 'sb-premium', labelKey: 'nav.premiumLeather', fallbackLabel: 'Premium Leather', href: '/men?leather=premium' },
    ],
    featured: {
      title: 'THE MILANESE CUT',
      description: 'Handcrafted calfskin and lambskin silhouettes engineered for effortless elegance.',
      imageUrl: 'https://images.unsplash.com/photo-1520975954732-35dd22299614?q=80&w=1200&auto=format&fit=crop',
      ctaTextKey: 'nav.shopMen',
      fallbackCta: 'SHOP MEN',
      href: '/men',
      tag: 'Atelier Curated',
    },
  };

  // 3. Representative Women Navigation Payload
  const womenPayload = {
    id: 'women',
    labelKey: 'nav.women',
    fallbackLabel: 'WOMEN',
    href: '/women',
    categories: [
      { id: 'w-leather', labelKey: 'nav.leatherJackets', fallbackLabel: 'Leather Jackets', href: '/women/leather-jackets' },
      { id: 'w-biker', labelKey: 'nav.bikerJackets', fallbackLabel: 'Biker Jackets', href: '/women/biker-jackets' },
      { id: 'w-cropped', labelKey: 'nav.croppedLeatherJackets', fallbackLabel: 'Cropped Leather Jackets', href: '/women/cropped-leather-jackets' },
      { id: 'w-bomber', labelKey: 'nav.bomberJackets', fallbackLabel: 'Bomber Jackets', href: '/women/bomber-jackets' },
      { id: 'w-moto', labelKey: 'nav.motoJackets', fallbackLabel: 'Moto Jackets', href: '/women/moto-jackets' },
      { id: 'w-blazers', labelKey: 'nav.leatherBlazers', fallbackLabel: 'Leather Blazers', href: '/women/leather-blazers' },
      { id: 'w-coats', labelKey: 'nav.leatherCoats', fallbackLabel: 'Leather Coats', href: '/women/leather-coats' },
      { id: 'w-shearling', labelKey: 'nav.shearlingJackets', fallbackLabel: 'Shearling Jackets', href: '/women/shearling-jackets' },
      { id: 'w-new', labelKey: 'nav.newArrivals', fallbackLabel: 'New Arrivals', href: '/women/new-arrivals', badge: 'New' },
      { id: 'w-best', labelKey: 'nav.bestSellers', fallbackLabel: 'Best Sellers', href: '/women/best-sellers' },
    ],
    coats: [
      { id: 'w-leather-coats', labelKey: 'nav.leatherCoats', fallbackLabel: 'Leather Coats', href: '/women/leather-coats' },
      { id: 'w-leather-trench', labelKey: 'nav.leatherTrenchCoats', fallbackLabel: 'Leather Trench Coats', href: '/women/leather-trench-coats' },
      { id: 'w-trench', labelKey: 'nav.trenchCoats', fallbackLabel: 'Trench Coats', href: '/women/trench-coats' },
      { id: 'w-winter', labelKey: 'nav.winterCoats', fallbackLabel: 'Winter Coats', href: '/women/winter-coats' },
      { id: 'w-shearling-jackets', labelKey: 'nav.shearlingJackets', fallbackLabel: 'Shearling Jackets', href: '/women/shearling-jackets' },
      { id: 'w-shearling-coats', labelKey: 'nav.shearlingCoats', fallbackLabel: 'Shearling Coats', href: '/women/shearling-coats' },
    ],
    shopBy: [
      { id: 'wsb-black', labelKey: 'nav.blackLeather', fallbackLabel: 'Black Leather', href: '/women?leather=black' },
      { id: 'wsb-brown', labelKey: 'nav.brownLeather', fallbackLabel: 'Brown Leather', href: '/women?leather=brown' },
      { id: 'wsb-burgundy', labelKey: 'nav.burgundyLeather', fallbackLabel: 'Burgundy Leather', href: '/women?leather=burgundy' },
      { id: 'wsb-suede', labelKey: 'nav.suede', fallbackLabel: 'Suede', href: '/women?leather=suede' },
      { id: 'wsb-shearling', labelKey: 'nav.shearling', fallbackLabel: 'Shearling', href: '/women?leather=shearling' },
      { id: 'wsb-distressed', labelKey: 'nav.distressedLeather', fallbackLabel: 'Distressed Leather', href: '/women?leather=distressed' },
      { id: 'wsb-premium', labelKey: 'nav.premiumLeather', fallbackLabel: 'Premium Leather', href: '/women?leather=premium' },
    ],
    featured: {
      title: 'SCULPTED SILHOUETTES',
      description: 'From razor-sharp cropped bikers to tailored leather blazers, discover feminine silhouettes handcrafted from supple Italian plongé nappa.',
      imageUrl: 'https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?q=80&w=1200&auto=format&fit=crop',
      ctaTextKey: 'nav.shopWomen',
      fallbackCta: 'SHOP WOMEN',
      href: '/women',
      tag: 'New Season',
    },
  };

  await prisma.navigationMenu.upsert({
    where: { menuKey: 'men' },
    update: { payload: menPayload },
    create: {
      menuKey: 'men',
      department: 'men',
      slug: 'men',
      name: 'Men Navigation',
      payload: menPayload,
    },
  });

  await prisma.navigationMenu.upsert({
    where: { menuKey: 'women' },
    update: { payload: womenPayload },
    create: {
      menuKey: 'women',
      department: 'women',
      slug: 'women',
      name: 'Women Navigation',
      payload: womenPayload,
    },
  });

  logger.info('Local representative navigation test data successfully prepared.');
}

if (process.argv[1]?.endsWith('seed-local-navigation.js')) {
  seedLocalNavigation()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error(`Local seed failed: ${err.message}`);
      process.exit(1);
    });
}
