import { prisma } from '../lib/prisma.js';
import { logger } from '../utils/logger.js';

/**
 * Audit and optional repair script for Product-Category relationships.
 * 
 * Usage:
 *   node src/scripts/audit-and-repair-categories.js            # Audit only (safe, read-only)
 *   node src/scripts/audit-and-repair-categories.js --audit   # Audit only (safe, read-only)
 *   node src/scripts/audit-and-repair-categories.js --repair  # Apply safe non-destructive repairs
 */
export async function auditAndRepairCategories({ repair = false } = {}) {
  console.log('='.repeat(70));
  console.log(`PRODUCT-CATEGORY AUDIT & REPAIR REPORT (${repair ? 'REPAIR MODE' : 'AUDIT ONLY'})`);
  console.log('='.repeat(70));

  // 1. Fetch all categories
  const categories = await prisma.category.findMany({
    orderBy: { featuredOrder: 'asc' },
  });

  const categoryMap = new Map();
  const categoryBySlug = new Map();
  for (const cat of categories) {
    categoryMap.set(cat.id, cat);
    categoryBySlug.set(cat.slug, cat);
  }

  console.log(`\nFound ${categories.length} configured categories:`);
  categories.forEach((cat) => {
    console.log(`  - [${cat.slug}] "${cat.name}" (ID: ${cat.id})`);
  });

  // 2. Fetch all products
  const products = await prisma.product.findMany({
    select: {
      id: true,
      sku: true,
      slug: true,
      name: true,
      categorySlug: true,
      categoryLabel: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`\nFound ${products.length} products in database.`);

  // 3. Analyze products
  const invalidCategorySlugProducts = [];
  const mismatchedLabelProducts = [];
  const categoryUsageCounts = new Map();

  for (const p of products) {
    const matchedCat = categoryBySlug.get(p.categorySlug);

    if (!matchedCat) {
      invalidCategorySlugProducts.push({
        id: p.id,
        sku: p.sku,
        name: p.name,
        categorySlug: p.categorySlug,
        categoryLabel: p.categoryLabel,
      });
    } else {
      categoryUsageCounts.set(
        matchedCat.slug,
        (categoryUsageCounts.get(matchedCat.slug) || 0) + 1
      );

      if (p.categoryLabel !== matchedCat.name) {
        mismatchedLabelProducts.push({
          id: p.id,
          sku: p.sku,
          name: p.name,
          categorySlug: p.categorySlug,
          currentLabel: p.categoryLabel,
          expectedLabel: matchedCat.name,
        });
      }
    }
  }

  console.log('\nCategory Usage Distribution:');
  categories.forEach((cat) => {
    const count = categoryUsageCounts.get(cat.slug) || 0;
    console.log(`  - ${cat.slug}: ${count} product(s)`);
  });

  console.log(`\nProducts with Nonexistent Category Slugs: ${invalidCategorySlugProducts.length}`);
  if (invalidCategorySlugProducts.length > 0) {
    console.table(invalidCategorySlugProducts);
  } else {
    console.log('  [OK] None found. All products reference existing category slugs.');
  }

  console.log(`\nProducts with Mismatched Category Labels: ${mismatchedLabelProducts.length}`);
  if (mismatchedLabelProducts.length > 0) {
    console.table(mismatchedLabelProducts);
  } else {
    console.log('  [OK] None found. All product category labels match canonical category names.');
  }

  // 4. Perform repair if requested
  let repairedCount = 0;
  if (repair) {
    console.log('\n--- EXECUTING REPAIRS ---');
    if (mismatchedLabelProducts.length > 0) {
      for (const item of mismatchedLabelProducts) {
        await prisma.product.update({
          where: { id: item.id },
          data: { categoryLabel: item.expectedLabel },
        });
        repairedCount++;
        console.log(`  [Repaired Label] Product ${item.sku}: "${item.currentLabel}" -> "${item.expectedLabel}"`);
      }
    }

    if (invalidCategorySlugProducts.length > 0) {
      console.warn('  [Notice] Products with invalid category slugs must be remapped with explicit admin approval.');
    }

    console.log(`\nRepaired ${repairedCount} record(s).`);
  } else if (mismatchedLabelProducts.length > 0 || invalidCategorySlugProducts.length > 0) {
    console.log('\nRun with `--repair` to automatically reconcile mismatched category labels.');
  }

  console.log('\n' + '='.repeat(70));
  console.log('AUDIT COMPLETE');
  console.log('='.repeat(70) + '\n');

  return {
    categoriesCount: categories.length,
    productsCount: products.length,
    invalidCategorySlugCount: invalidCategorySlugProducts.length,
    mismatchedLabelCount: mismatchedLabelProducts.length,
    invalidCategorySlugProducts,
    mismatchedLabelProducts,
    repairedCount,
  };
}

// Direct execution via CLI
if (process.argv[1]?.endsWith('audit-and-repair-categories.js')) {
  const isRepair = process.argv.includes('--repair');
  auditAndRepairCategories({ repair: isRepair })
    .catch((err) => {
      logger.error('Audit failed:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
