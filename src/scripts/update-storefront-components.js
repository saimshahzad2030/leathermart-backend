import fs from 'fs';
import path from 'path';

const STORE_DIR = path.resolve('../leathermart');

// 1. Update ProductCard.tsx
const productCardPath = path.join(STORE_DIR, 'src/components/product/ProductCard.tsx');
let productCardContent = fs.readFileSync(productCardPath, 'utf8');

// Replace imports
if (!productCardContent.includes('useMarket')) {
  productCardContent = productCardContent.replace(
    'import { formatPrice } from "@/lib/currency";',
    `import { formatPrice, getProductDisplayPrice } from "@/lib/currency";\nimport { useMarket } from "@/context/MarketContext";`
  );

  // Hook and display price
  productCardContent = productCardContent.replace(
    'const { locale, t } = useTranslation();',
    `const { locale, t } = useTranslation();\n  const { market } = useMarket();\n  const displayPrice = getProductDisplayPrice(product, market);`
  );

  // Fallback for availableSizes and availableColors
  productCardContent = productCardContent.replace(
    `const [selectedSize, setSelectedSize] = useState(
    product.availableSizes[1] || product.availableSizes[0]
  );`,
    `const allSizes = (Array.isArray(product.sizes) && product.sizes.length > 0)
    ? product.sizes.map((s) => s.name)
    : (product.availableSizes || []);
  const [selectedSize, setSelectedSize] = useState(
    allSizes[1] || allSizes[0] || "Standard"
  );`
  );

  // Handle inStock status
  productCardContent = productCardContent.replace(
    `const isSaved = isInWishlist(product.id);`,
    `const isSaved = isInWishlist(product.id);
  const isInStock = product.inStock !== false;`
  );

  // In QuickAdd item payload, use displayPrice
  productCardContent = productCardContent.replace(
    `price: product.salePrice || product.price,`,
    `price: displayPrice.salePrice || displayPrice.price,
      currency: displayPrice.currency,
      currencySymbol: displayPrice.currencySymbol,
      market,`
  );

  // In badges overlay, show Out of Stock badge if !isInStock
  productCardContent = productCardContent.replace(
    `{product.isNewArrival && (`,
    `{!isInStock && (
            <span className="bg-rose-950/90 backdrop-blur-md text-rose-300 text-[9px] uppercase font-mono tracking-[0.2em] px-2.5 py-1 border border-rose-500/30 font-bold">
              Out of Stock
            </span>
          )}
          {product.isNewArrival && (`
  );

  // In Quick add size buttons, replace product.availableSizes with allSizes
  productCardContent = productCardContent.replaceAll('product.availableSizes', 'allSizes');

  // In Quick Add button, disable if not in stock
  productCardContent = productCardContent.replace(
    `<button
                onClick={handleQuickAdd}
                className="w-full bg-[#C5A47E] hover:bg-[#D7B793] text-[#0D0C0B] py-1.5 text-[10px] uppercase tracking-[0.2em] font-medium transition-colors"
              >
                {t("pdp.addToBag")}
              </button>`,
    `<button
                onClick={handleQuickAdd}
                disabled={!isInStock}
                className={\`w-full py-1.5 text-[10px] uppercase tracking-[0.2em] font-medium transition-colors \${
                  isInStock
                    ? 'bg-[#C5A47E] hover:bg-[#D7B793] text-[#0D0C0B]'
                    : 'bg-white/10 text-white/40 cursor-not-allowed'
                }\`}
              >
                {isInStock ? t("pdp.addToBag") : "Out of Stock"}
              </button>`
  );

  // In main price display, use displayPrice
  productCardContent = productCardContent.replace(
    `{product.salePrice ? (
              <>
                <span className="text-[#C5A47E] font-medium">
                  {formatPrice(product.salePrice)}
                </span>
                <span className="text-white/40 line-through text-xs">
                  {formatPrice(product.price)}
                </span>
              </>
            ) : (
              <span className="text-[#F7F4EE] font-medium">
                {formatPrice(product.price)}
              </span>
            )}`,
    `{displayPrice.isDiscounted && displayPrice.formattedSalePrice ? (
              <>
                <span className="text-[#C5A47E] font-medium">
                  {displayPrice.formattedSalePrice}
                </span>
                <span className="text-white/40 line-through text-xs">
                  {displayPrice.formattedPrice}
                </span>
              </>
            ) : (
              <span className="text-[#F7F4EE] font-medium">
                {displayPrice.formattedPrice}
              </span>
            )}`
  );

  fs.writeFileSync(productCardPath, productCardContent, 'utf8');
  console.log('✓ Updated ProductCard.tsx with regional pricing and stock check');
}

// 2. Update QuickViewModal.tsx
const quickViewPath = path.join(STORE_DIR, 'src/components/product/QuickViewModal.tsx');
let quickViewContent = fs.readFileSync(quickViewPath, 'utf8');

if (!quickViewContent.includes('useMarket')) {
  quickViewContent = quickViewContent.replace(
    'import { formatPrice } from "@/lib/currency";',
    `import { formatPrice, getProductDisplayPrice } from "@/lib/currency";\nimport { useMarket } from "@/context/MarketContext";`
  );

  quickViewContent = quickViewContent.replace(
    'const { t, currentLocale } = useTranslation();',
    `const { t, currentLocale } = useTranslation();\n  const { market } = useMarket();\n  const displayPrice = rawProduct ? getProductDisplayPrice(rawProduct, market) : null;`
  );

  // Handle sizes fallback
  quickViewContent = quickViewContent.replace(
    `setSelectedSize(product.availableSizes[1] || product.availableSizes[0] || "");`,
    `const sizesList = (Array.isArray(rawProduct?.sizes) && rawProduct.sizes.length > 0)
        ? rawProduct.sizes.map((s) => s.name)
        : (product.availableSizes || []);
      setSelectedSize(sizesList[1] || sizesList[0] || "");`
  );

  // In price render inside modal:
  quickViewContent = quickViewContent.replace(
    `{formatPrice(product.salePrice || product.price)}`,
    `{displayPrice?.isDiscounted ? displayPrice.formattedSalePrice : displayPrice?.formattedPrice}`
  );

  // Add in-stock status check
  quickViewContent = quickViewContent.replace(
    `const handleAddToCart = () => {`,
    `const matchedVariant = rawProduct?.variants?.find((v) => v.size === selectedSize);
  const isInStock = matchedVariant ? Boolean(matchedVariant.inStock) : (rawProduct?.inStock !== false);

  const handleAddToCart = () => {
    if (!isInStock) return;`
  );

  // Pass regional price to cart
  quickViewContent = quickViewContent.replace(
    `price: product.salePrice || product.price,`,
    `price: displayPrice?.salePrice || displayPrice?.price || product.price,
      currency: displayPrice?.currency,
      currencySymbol: displayPrice?.currencySymbol,
      market,`
  );

  // Disable Add to Bag button if not in stock
  quickViewContent = quickViewContent.replace(
    `<button
              onClick={handleAddToCart}
              disabled={!selectedSize}
              className="w-full bg-[#C5A47E] hover:bg-[#D7B793] text-[#0D0C0B] py-3 text-xs uppercase tracking-[0.2em] font-medium transition-colors flex items-center justify-center space-x-2"
            >
              {added ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>{t("pdp.addedToBag")}</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4" />
                  <span>{t("pdp.addToBag")}</span>
                </>
              )}
            </button>`,
    `<div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-mono">
                <span className={\`w-2 h-2 rounded-full \${isInStock ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}\`} />
                <span className={isInStock ? 'text-emerald-400' : 'text-rose-400'}>
                  {isInStock ? 'In Stock (Atelier Dispatch Ready)' : 'Out of Stock / Unavailable'}
                </span>
              </div>
              <button
                onClick={handleAddToCart}
                disabled={!selectedSize || !isInStock}
                className={\`w-full py-3 text-xs uppercase tracking-[0.2em] font-medium transition-colors flex items-center justify-center space-x-2 \${
                  !isInStock
                    ? 'bg-white/10 text-white/40 cursor-not-allowed'
                    : added
                    ? 'bg-[#2D6A4F] text-white'
                    : 'bg-[#C5A47E] hover:bg-[#D7B793] text-[#0D0C0B]'
                }\`}
              >
                {added ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{t("pdp.addedToBag")}</span>
                  </>
                ) : !isInStock ? (
                  <span>Out of Stock</span>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    <span>{t("pdp.addToBag")}</span>
                  </>
                )}
              </button>
            </div>`
  );

  fs.writeFileSync(quickViewPath, quickViewContent, 'utf8');
  console.log('✓ Updated QuickViewModal.tsx with availability and regional price');
}

// 3. Update PDP app/products/[slug]/page.tsx
const pdpPath = path.join(STORE_DIR, 'src/app/products/[slug]/page.tsx');
let pdpContent = fs.readFileSync(pdpPath, 'utf8');

if (!pdpContent.includes('useMarket')) {
  pdpContent = pdpContent.replace(
    'import { formatPrice } from "@/lib/currency";',
    `import { formatPrice, getProductDisplayPrice } from "@/lib/currency";\nimport { useMarket } from "@/context/MarketContext";`
  );

  pdpContent = pdpContent.replace(
    'const { data: shippingSettings } = useShipping();',
    `const { data: shippingSettings } = useShipping();\n  const { market } = useMarket();`
  );

  // In PDP render, compute displayPrice
  pdpContent = pdpContent.replace(
    'const product = getLocalizedProduct(rawProduct, currentLocale);',
    `const product = getLocalizedProduct(rawProduct, currentLocale);
  const displayPrice = getProductDisplayPrice(rawProduct, market);

  // Variant matching
  const matchedVariant = rawProduct.variants?.find((v) =>
    (v.size === selectedSize || v.size?.toLowerCase() === selectedSize?.toLowerCase()) &&
    (!selectedColor || v.color === selectedColor || v.color?.toLowerCase() === selectedColor?.toLowerCase())
  );
  const isVariantInStock = matchedVariant ? Boolean(matchedVariant.inStock) : (rawProduct.inStock !== false);`
  );

  // In price display:
  pdpContent = pdpContent.replace(
    `<div className="flex items-baseline space-x-3 pt-2">
                <span className="font-serif text-2xl sm:text-3xl font-medium text-[#F7F4EE]">
                  {formatPrice(product.salePrice || product.price)}
                </span>
                {product.salePrice && (
                  <span className="font-serif text-lg text-white/40 line-through">
                    {formatPrice(product.price)}
                  </span>
                )}
                <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest pl-2">
                  {t("pdp.vatIncluded")}
                </span>
              </div>`,
    `<div className="flex items-baseline space-x-3 pt-2">
                <span className="font-serif text-2xl sm:text-3xl font-medium text-[#F7F4EE]">
                  {displayPrice.isDiscounted && displayPrice.formattedSalePrice
                    ? displayPrice.formattedSalePrice
                    : displayPrice.formattedPrice}
                </span>
                {displayPrice.isDiscounted && (
                  <span className="font-serif text-lg text-white/40 line-through">
                    {displayPrice.formattedPrice}
                  </span>
                )}
                <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest pl-2">
                  {market === 'PK' ? 'Inclusive of all taxes' : t("pdp.vatIncluded")}
                </span>
              </div>`
  );

  // In Add to Cart payload:
  pdpContent = pdpContent.replace(
    `price: product.salePrice || product.price,`,
    `price: displayPrice.salePrice || displayPrice.price,
        currency: displayPrice.currency,
        currencySymbol: displayPrice.currencySymbol,
        market,`
  );

  // Add Live Stock availability indicator above Add to Bag:
  pdpContent = pdpContent.replace(
    `<button
                  onClick={handleAddToCart}
                  disabled={!selectedSize}
                  className={\`flex-1 py-4 text-xs font-medium tracking-[0.2em] uppercase transition-all duration-300 flex items-center justify-center space-x-2 \${
                    isAdded
                      ? "bg-[#2D6A4F] text-white"
                      : "bg-[#C5A47E] hover:bg-[#D7B793] text-[#0D0C0B]"
                  }\`}
                >`,
    `<div className="flex items-center gap-2 pb-1 text-xs font-mono">
                  <span className={\`w-2 h-2 rounded-full \${isVariantInStock ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}\`} />
                  <span className={isVariantInStock ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
                    {isVariantInStock ? 'In Stock (Atelier Dispatch Ready)' : 'Out of Stock for Selected Variant'}
                  </span>
                </div>
                <button
                  onClick={handleAddToCart}
                  disabled={!selectedSize || !isVariantInStock}
                  className={\`flex-1 py-4 text-xs font-medium tracking-[0.2em] uppercase transition-all duration-300 flex items-center justify-center space-x-2 \${
                    !isVariantInStock
                      ? "bg-white/10 text-white/30 cursor-not-allowed border border-white/10"
                      : isAdded
                      ? "bg-[#2D6A4F] text-white"
                      : "bg-[#C5A47E] hover:bg-[#D7B793] text-[#0D0C0B]"
                  }\`}
                >`
  );

  pdpContent = pdpContent.replace(
    `: (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      <span>{t("pdp.addToBag")}</span>
                    </>
                  )}`,
    `: !isVariantInStock ? (
                    <span>Out of Stock</span>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      <span>{t("pdp.addToBag")}</span>
                    </>
                  )}`
  );

  // Insert Attached Reusable Policies Accordions
  const policyAccordions = `
              {/* Dynamic Reusable Atelier Policies */}
              {Array.isArray(rawProduct.policies) && rawProduct.policies.length > 0 && rawProduct.policies.map((pol) => (
                <div key={pol.id} className="py-4">
                  <button
                    onClick={() => toggleSection(\`policy-\${pol.id}\`)}
                    className="w-full flex justify-between items-center text-xs font-mono uppercase tracking-[0.2em] text-[#E7DFD5] hover:text-[#C5A47E] text-left"
                  >
                    <span>{pol.name}</span>
                    <ChevronDown
                      className={\`w-4 h-4 transition-transform \${
                        openAccordion === \`policy-\${pol.id}\` ? "rotate-180 text-[#C5A47E]" : ""
                      }\`}
                    />
                  </button>
                  {openAccordion === \`policy-\${pol.id}\` && (
                    <div className="mt-4 space-y-3 text-xs text-white/65 font-light leading-relaxed">
                      <p>{pol.description}</p>
                      {Array.isArray(pol.bulletPoints) && pol.bulletPoints.length > 0 && (
                        <ul className="space-y-1.5 list-disc list-inside text-white/60 pt-1">
                          {pol.bulletPoints.map((bp: string, bIdx: number) => (
                            <li key={bIdx}>{bp}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              ))}
  `;

  pdpContent = pdpContent.replace(
    `{/* Garment Specifications */}`,
    `${policyAccordions}\n              {/* Garment Specifications */}`
  );

  fs.writeFileSync(pdpPath, pdpContent, 'utf8');
  console.log('✓ Updated PDP page.tsx with variant stock check, regional pricing, and dynamic policies');
}

// 4. Update CartDrawer.tsx to use market currency
const cartDrawerPath = path.join(STORE_DIR, 'src/components/cart/CartDrawer.tsx');
let cartDrawerContent = fs.readFileSync(cartDrawerPath, 'utf8');
if (!cartDrawerContent.includes('useMarket')) {
  cartDrawerContent = cartDrawerContent.replace(
    'import { formatPrice } from "@/lib/currency";',
    `import { formatPrice } from "@/lib/currency";\nimport { useMarket } from "@/context/MarketContext";`
  );
  cartDrawerContent = cartDrawerContent.replace(
    'const { locale, t } = useTranslation();',
    `const { locale, t } = useTranslation();\n  const { market } = useMarket();`
  );
  // Update formatPrice calls in CartDrawer to pass market
  cartDrawerContent = cartDrawerContent.replaceAll('formatPrice(subtotal)', 'formatPrice(subtotal, undefined, market)');
  cartDrawerContent = cartDrawerContent.replaceAll('formatPrice(freeShippingThreshold)', 'formatPrice(freeShippingThreshold, undefined, market)');
  cartDrawerContent = cartDrawerContent.replaceAll('formatPrice(amountUntilFreeShipping)', 'formatPrice(amountUntilFreeShipping, undefined, market)');
  cartDrawerContent = cartDrawerContent.replaceAll('formatPrice(item.price * item.quantity)', 'formatPrice(item.price * item.quantity, item.currency, market)');
  cartDrawerContent = cartDrawerContent.replaceAll('formatPrice(15)', 'formatPrice(market === "PK" ? 2500 : 15, undefined, market)');
  cartDrawerContent = cartDrawerContent.replaceAll('formatPrice(subtotal + (isFreeShipping ? 0 : 15))', 'formatPrice(subtotal + (isFreeShipping ? 0 : (market === "PK" ? 2500 : 15)), undefined, market)');

  fs.writeFileSync(cartDrawerPath, cartDrawerContent, 'utf8');
  console.log('✓ Updated CartDrawer.tsx with market currency support');
}

// 5. Update app/cart/page.tsx
const cartPagePath = path.join(STORE_DIR, 'src/app/cart/page.tsx');
if (fs.existsSync(cartPagePath)) {
  let cartPageContent = fs.readFileSync(cartPagePath, 'utf8');
  if (!cartPageContent.includes('useMarket')) {
    cartPageContent = cartPageContent.replace(
      'import { formatPrice } from "@/lib/currency";',
      `import { formatPrice } from "@/lib/currency";\nimport { useMarket } from "@/context/MarketContext";`
    );
    cartPageContent = cartPageContent.replace(
      'const { t } = useTranslation();',
      `const { t } = useTranslation();\n  const { market } = useMarket();`
    );
    cartPageContent = cartPageContent.replaceAll('formatPrice(subtotal)', 'formatPrice(subtotal, undefined, market)');
    cartPageContent = cartPageContent.replaceAll('formatPrice(item.price * item.quantity)', 'formatPrice(item.price * item.quantity, item.currency, market)');
    cartPageContent = cartPageContent.replaceAll('formatPrice(item.price)', 'formatPrice(item.price, item.currency, market)');
    cartPageContent = cartPageContent.replaceAll('formatPrice(15)', 'formatPrice(market === "PK" ? 2500 : 15, undefined, market)');
    cartPageContent = cartPageContent.replaceAll('formatPrice(subtotal + (isFreeShipping ? 0 : 15))', 'formatPrice(subtotal + (isFreeShipping ? 0 : (market === "PK" ? 2500 : 15)), undefined, market)');

    fs.writeFileSync(cartPagePath, cartPageContent, 'utf8');
    console.log('✓ Updated app/cart/page.tsx with market currency support');
  }
}
