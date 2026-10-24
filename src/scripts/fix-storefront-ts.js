import fs from 'fs';
import path from 'path';

const STORE_DIR = path.resolve('../leathermart');

// 1. Fix types/product.ts: inStock?: boolean
const typesPath = path.join(STORE_DIR, 'src/types/product.ts');
let typesContent = fs.readFileSync(typesPath, 'utf8');
typesContent = typesContent.replace('inStock: boolean;', 'inStock?: boolean;');
fs.writeFileSync(typesPath, typesContent, 'utf8');
console.log('✓ Fixed types/product.ts');

// 2. Fix ProductCard.tsx
const productCardPath = path.join(STORE_DIR, 'src/components/product/ProductCard.tsx');
let cardContent = fs.readFileSync(productCardPath, 'utf8');
cardContent = cardContent.replace(
  `: (allSizes || []);`,
  `: (product.availableSizes || []);`
);
cardContent = cardContent.replace(
  `{allSizes.map((size) => (`,
  `{allSizes.map((size: string) => (`
);
fs.writeFileSync(productCardPath, cardContent, 'utf8');
console.log('✓ Fixed ProductCard.tsx');

// 3. Fix CartDrawer.tsx
const cartDrawerPath = path.join(STORE_DIR, 'src/components/cart/CartDrawer.tsx');
let drawerContent = fs.readFileSync(cartDrawerPath, 'utf8');
if (!drawerContent.includes('const { market } = useMarket();')) {
  drawerContent = drawerContent.replace(
    'const { t } = useTranslation();',
    `const { t } = useTranslation();\n  const { market } = useMarket();`
  );
  fs.writeFileSync(cartDrawerPath, drawerContent, 'utf8');
  console.log('✓ Fixed CartDrawer.tsx');
}
