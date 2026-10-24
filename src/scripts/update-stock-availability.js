import fs from 'fs';
import path from 'path';

console.log('--- Updating leathermart-admin and leathermart for isInStock feature ---');

const ADMIN_DIR = path.resolve('../leathermart-admin');
const STOREFRONT_DIR = path.resolve('../leathermart');

// ==========================================
// 1. Update leathermart-admin/src/types/index.ts
// ==========================================
const adminTypesPath = path.join(ADMIN_DIR, 'src/types/index.ts');
if (fs.existsSync(adminTypesPath)) {
  let content = fs.readFileSync(adminTypesPath, 'utf8');
  if (!content.includes('isInStock?: boolean;')) {
    content = content.replace(
      'inStock?: boolean;',
      'isInStock?: boolean;\n  inStock?: boolean;'
    );
    fs.writeFileSync(adminTypesPath, content, 'utf8');
    console.log('[Admin] Updated types/index.ts with isInStock?: boolean;');
  } else {
    console.log('[Admin] types/index.ts already contains isInStock');
  }
}

// ==========================================
// 2. Update leathermart-admin/src/pages/products/ProductForm.tsx
// ==========================================
const adminFormPath = path.join(ADMIN_DIR, 'src/pages/products/ProductForm.tsx');
if (fs.existsSync(adminFormPath)) {
  let content = fs.readFileSync(adminFormPath, 'utf8');

  // Add state if missing
  if (!content.includes('const [isInStock, setIsInStock] = useState')) {
    content = content.replace(
      'const [isPublished, setIsPublished] = useState(true);',
      'const [isPublished, setIsPublished] = useState(true);\n  const [isInStock, setIsInStock] = useState(true);'
    );
  }

  // Populate state from existingProduct
  if (!content.includes('setIsInStock(Boolean(existingProduct.isInStock')) {
    content = content.replace(
      'setIsPublished(Boolean(existingProduct.isPublished));',
      `setIsPublished(Boolean(existingProduct.isPublished));\n      setIsInStock(existingProduct.isInStock !== undefined ? Boolean(existingProduct.isInStock) : (existingProduct.inStock !== undefined ? Boolean(existingProduct.inStock) : true));`
    );
  }

  // Add isInStock to submitted payload
  if (!content.includes('isInStock,') || !content.includes('isPublished,\n      isInStock,')) {
    content = content.replace(
      'isPublished,',
      'isPublished,\n      isInStock,'
    );
  }

  // Add UI Switch in Publishing & Merchandising card
  if (!content.includes('Stock Availability (Master)')) {
    const targetBlock = `<div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-primary block">Published Live</span>
                    <span className="text-[10px] text-muted">Visible on public storefront</span>
                  </div>
                  <Switch checked={isPublished} onChange={setIsPublished} />
                </div>`;

    const replacementBlock = `<div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-primary block">Stock Availability (Master)</span>
                    <span className="text-[10px] text-muted">Independent master stock status for the entire product</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={\`text-[10px] font-semibold uppercase tracking-wider \${isInStock ? 'text-emerald-500' : 'text-rose-500'}\`}>
                      {isInStock ? 'In Stock' : 'Out of Stock'}
                    </span>
                    <Switch checked={isInStock} onChange={setIsInStock} />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-theme">
                  <div>
                    <span className="text-xs font-bold text-primary block">Published Live</span>
                    <span className="text-[10px] text-muted">Visible on public storefront</span>
                  </div>
                  <Switch checked={isPublished} onChange={setIsPublished} />
                </div>`;

    if (content.includes(targetBlock)) {
      content = content.replace(targetBlock, replacementBlock);
      console.log('[Admin] Added Master Stock Availability switch to ProductForm.tsx');
    }
  }

  fs.writeFileSync(adminFormPath, content, 'utf8');
  console.log('[Admin] ProductForm.tsx updated successfully');
}

// ==========================================
// 3. Update leathermart-admin/src/pages/products/ProductList.tsx
// ==========================================
const adminListPath = path.join(ADMIN_DIR, 'src/pages/products/ProductList.tsx');
if (fs.existsSync(adminListPath)) {
  let content = fs.readFileSync(adminListPath, 'utf8');

  // Update availability column to respect isInStock first
  if (content.includes('const isInStock = item.inStock !== false;')) {
    content = content.replace(
      'const isInStock = item.inStock !== false;',
      'const isInStock = item.isInStock !== undefined ? item.isInStock : (item.inStock !== false);'
    );
  }

  // Update queryParams initial state & filters
  if (!content.includes("in_stock?: boolean | string;")) {
    content = content.replace(
      "status?: 'all' | 'published' | 'draft';",
      "status?: 'all' | 'published' | 'draft';\n    in_stock?: boolean | string;\n    isInStock?: boolean | string;"
    );
  }

  // Add stock filter Select dropdown in filters section if not present
  if (!content.includes('All Stock Status')) {
    const statusSelect = `<Select
              value={queryParams.status || 'all'}
              onChange={(e) =>
                setQueryParams((prev) => ({
                  ...prev,
                  status: e.target.value as any,
                  page: 1,
                }))
              }
              wrapperClassName="w-full lg:w-32"
            >
              <option value="all">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </Select>`;

    const statusWithStockSelect = `<Select
              value={queryParams.status || 'all'}
              onChange={(e) =>
                setQueryParams((prev) => ({
                  ...prev,
                  status: e.target.value as any,
                  page: 1,
                }))
              }
              wrapperClassName="w-full lg:w-32"
            >
              <option value="all">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </Select>

            {/* Stock Availability Filter */}
            <Select
              value={queryParams.in_stock !== undefined ? String(queryParams.in_stock) : 'all'}
              onChange={(e) => {
                const val = e.target.value;
                setQueryParams((prev) => ({
                  ...prev,
                  in_stock: val === 'all' ? undefined : (val === 'true' ? true : false),
                  isInStock: val === 'all' ? undefined : (val === 'true' ? true : false),
                  page: 1,
                }));
              }}
              wrapperClassName="w-full lg:w-36"
            >
              <option value="all">All Stock Status</option>
              <option value="true">In Stock</option>
              <option value="false">Out of Stock</option>
            </Select>`;

    if (content.includes(statusSelect)) {
      content = content.replace(statusSelect, statusWithStockSelect);
      console.log('[Admin] Added stock availability filter dropdown to ProductList.tsx');
    }
  }

  // Update resetFilters to clear in_stock
  if (content.includes("status: 'all',") && !content.includes("in_stock: undefined,")) {
    content = content.replace(
      "status: 'all',",
      "status: 'all',\n      in_stock: undefined,\n      isInStock: undefined,"
    );
  }

  // Update hasActiveFilters check
  if (content.includes("queryParams.status !== 'all' ||") && !content.includes("queryParams.in_stock !== undefined ||")) {
    content = content.replace(
      "queryParams.status !== 'all' ||",
      "queryParams.status !== 'all' ||\n    queryParams.in_stock !== undefined ||"
    );
  }

  fs.writeFileSync(adminListPath, content, 'utf8');
  console.log('[Admin] ProductList.tsx updated successfully');
}

// ==========================================
// 4. Update leathermart/src/types/product.ts
// ==========================================
const storefrontTypesPath = path.join(STOREFRONT_DIR, 'src/types/product.ts');
if (fs.existsSync(storefrontTypesPath)) {
  let content = fs.readFileSync(storefrontTypesPath, 'utf8');
  if (!content.includes('isInStock?: boolean;')) {
    content = content.replace(
      'inStock?: boolean;',
      'isInStock?: boolean;\n  inStock?: boolean;'
    );
    fs.writeFileSync(storefrontTypesPath, content, 'utf8');
    console.log('[Storefront] Updated types/product.ts with isInStock?: boolean;');
  }
}

// ==========================================
// 5. Update leathermart/src/components/product/ProductCard.tsx
// ==========================================
const productCardPath = path.join(STOREFRONT_DIR, 'src/components/product/ProductCard.tsx');
if (fs.existsSync(productCardPath)) {
  let content = fs.readFileSync(productCardPath, 'utf8');

  // Update isInStock calculation
  content = content.replace(
    'const isInStock = product.inStock !== false;',
    'const isInStock = product.isInStock !== undefined ? product.isInStock : (product.inStock !== false);'
  );

  // In quick add buttons, disable or prevent click if not in stock
  const quickAddBtnOld = `<button
                onClick={() => setShowQuickAdd(true)}
                className="flex items-center justify-center space-x-1.5 bg-[#C5A47E] hover:bg-[#D7B793] text-[#0D0C0B] py-2 text-[10px] font-medium uppercase tracking-[0.16em] transition-colors"
              >
                <ShoppingBag className="w-3 h-3" />
                <span>{t("cart.quickAdd")}</span>
              </button>`;

  const quickAddBtnNew = `{isInStock ? (
                <button
                  onClick={() => setShowQuickAdd(true)}
                  className="flex items-center justify-center space-x-1.5 bg-[#C5A47E] hover:bg-[#D7B793] text-[#0D0C0B] py-2 text-[10px] font-medium uppercase tracking-[0.16em] transition-colors"
                >
                  <ShoppingBag className="w-3 h-3" />
                  <span>{t("cart.quickAdd")}</span>
                </button>
              ) : (
                <button
                  disabled
                  className="flex items-center justify-center space-x-1.5 bg-white/10 text-white/40 border border-white/10 py-2 text-[10px] font-medium uppercase tracking-[0.16em] cursor-not-allowed"
                >
                  <span>Out of Stock</span>
                </button>
              )}`;

  if (content.includes(quickAddBtnOld)) {
    content = content.replace(quickAddBtnOld, quickAddBtnNew);
    console.log('[Storefront] Updated Quick Add button in ProductCard.tsx to respect master stock');
  }

  fs.writeFileSync(productCardPath, content, 'utf8');
  console.log('[Storefront] ProductCard.tsx updated successfully');
}

// ==========================================
// 6. Update leathermart/src/app/products/[slug]/page.tsx
// ==========================================
const pdpPath = path.join(STOREFRONT_DIR, 'src/app/products/[slug]/page.tsx');
if (fs.existsSync(pdpPath)) {
  let content = fs.readFileSync(pdpPath, 'utf8');

  // Replace stock calculation with master + variant availability
  const oldStockCalc = `  const matchedVariant = rawProduct.variants?.find((v) =>
    (v.size === selectedSize || v.size?.toLowerCase() === selectedSize?.toLowerCase()) &&
    (!selectedColor || v.color === selectedColor || v.color?.toLowerCase() === selectedColor?.toLowerCase())
  );
  const isVariantInStock = matchedVariant ? Boolean(matchedVariant.inStock) : (rawProduct.inStock !== false);`;

  const newStockCalc = `  // Product-level master availability
  const isProductInStock = rawProduct.isInStock !== undefined ? rawProduct.isInStock : (rawProduct.inStock !== false);

  // Variant matching
  const matchedVariant = rawProduct.variants?.find((v) =>
    (v.size === selectedSize || v.size?.toLowerCase() === selectedSize?.toLowerCase()) &&
    (!selectedColor || v.color === selectedColor || v.color?.toLowerCase() === selectedColor?.toLowerCase())
  );
  
  // Master Inventory Rule:
  // 1. If product is out of stock (isInStock = false), whole product is unavailable.
  // 2. If product is in stock, respect selected variant's inStock boolean.
  const isAvailableForPurchase = isProductInStock && (matchedVariant ? Boolean(matchedVariant.inStock) : true);`;

  if (content.includes(oldStockCalc)) {
    content = content.replace(oldStockCalc, newStockCalc);
    console.log('[Storefront] Updated stock calculation logic in PDP');
  }

  // Prevent handleAddToCart if not available
  if (content.includes('const handleAddToCart = () => {')) {
    content = content.replace(
      'const handleAddToCart = () => {',
      'const handleAddToCart = () => {\n    if (!isAvailableForPurchase) return;'
    );
  }

  // Update UI badge and status indicator
  const oldUiStatus = `<div className="flex items-center gap-2 pb-1 text-xs font-mono">
                  <span className={\`w-2 h-2 rounded-full \${isVariantInStock ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}\`} />
                  <span className={isVariantInStock ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
                    {isVariantInStock ? 'In Stock (Atelier Dispatch Ready)' : 'Out of Stock for Selected Variant'}
                  </span>
                </div>`;

  const newUiStatus = `<div className="flex items-center gap-2 pb-1 text-xs font-mono">
                  <span className={\`w-2 h-2 rounded-full \${isAvailableForPurchase ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}\`} />
                  <span className={isAvailableForPurchase ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
                    {!isProductInStock
                      ? 'Out of Stock (Product Unavailable)'
                      : isAvailableForPurchase
                      ? 'In Stock (Atelier Dispatch Ready)'
                      : 'Out of Stock for Selected Variant'}
                  </span>
                </div>`;

  if (content.includes(oldUiStatus)) {
    content = content.replace(oldUiStatus, newUiStatus);
    console.log('[Storefront] Updated stock status label in PDP');
  }

  // Update Add to Cart button
  content = content.replace(
    'disabled={!selectedSize || !isVariantInStock}',
    'disabled={!selectedSize || !isAvailableForPurchase}'
  );
  content = content.replace(
    '!isVariantInStock\n                      ? "bg-white/10 text-white/30 cursor-not-allowed border border-white/10"',
    '!isAvailableForPurchase\n                      ? "bg-white/10 text-white/30 cursor-not-allowed border border-white/10"'
  );
  content = content.replace(
    ') : !isVariantInStock ? (\n                    <span>Out of Stock</span>',
    `) : !isAvailableForPurchase ? (\n                    <span>{!isProductInStock ? 'Out of Stock' : 'Selected Variant Out of Stock'}</span>`
  );

  fs.writeFileSync(pdpPath, content, 'utf8');
  console.log('[Storefront] PDP page.tsx updated successfully');
}

// ==========================================
// 7. Update leathermart/src/components/product/QuickViewModal.tsx
// ==========================================
const quickViewPath = path.join(STOREFRONT_DIR, 'src/components/product/QuickViewModal.tsx');
if (fs.existsSync(quickViewPath)) {
  let content = fs.readFileSync(quickViewPath, 'utf8');

  const oldQvStock = `  const matchedVariant = rawProduct?.variants?.find((v) => v.size === selectedSize);
  const isInStock = matchedVariant ? Boolean(matchedVariant.inStock) : (rawProduct?.inStock !== false);`;

  const newQvStock = `  const isProductInStock = rawProduct?.isInStock !== undefined ? rawProduct.isInStock : (rawProduct?.inStock !== false);
  const matchedVariant = rawProduct?.variants?.find((v) => v.size === selectedSize);
  const isAvailableForPurchase = isProductInStock && (matchedVariant ? Boolean(matchedVariant.inStock) : true);`;

  if (content.includes(oldQvStock)) {
    content = content.replace(oldQvStock, newQvStock);
    console.log('[Storefront] Updated QuickViewModal stock logic');
  }

  content = content.replace(
    'if (!isInStock) return;',
    'if (!isAvailableForPurchase) return;'
  );

  content = content.replace(
    'disabled={added}',
    'disabled={added || !isAvailableForPurchase}'
  );

  content = content.replace(
    'className="w-full bg-[#C5A47E] hover:bg-[#D7B793] text-[#0D0C0B] py-3 px-4 text-xs uppercase font-medium tracking-[0.2em] transition-all flex items-center justify-center space-x-2"',
    `className={\`w-full py-3 px-4 text-xs uppercase font-medium tracking-[0.2em] transition-all flex items-center justify-center space-x-2 \${
      !isAvailableForPurchase
        ? 'bg-white/10 text-white/30 cursor-not-allowed border border-white/10'
        : 'bg-[#C5A47E] hover:bg-[#D7B793] text-[#0D0C0B]'
    }\`}`
  );

  content = content.replace(
    `: (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    <span>{t("pdp.addToBag")}</span>
                  </>
                )}`,
    `: !isAvailableForPurchase ? (
                  <span>{!isProductInStock ? 'Out of Stock' : 'Selected Variant Out of Stock'}</span>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    <span>{t("pdp.addToBag")}</span>
                  </>
                )}`
  );

  fs.writeFileSync(quickViewPath, content, 'utf8');
  console.log('[Storefront] QuickViewModal.tsx updated successfully');
}

console.log('--- All admin and storefront updates completed! ---');
