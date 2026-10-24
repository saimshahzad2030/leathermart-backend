import fs from 'fs';
import path from 'path';

const STORE_DIR = path.resolve('../leathermart');

console.log('Targeting storefront directory:', STORE_DIR);

if (!fs.existsSync(STORE_DIR)) {
  console.error('Storefront directory does not exist:', STORE_DIR);
  process.exit(1);
}

// 1. Update types/product.ts
const productTypesFile = path.join(STORE_DIR, 'src/types/product.ts');
let productTypesContent = fs.readFileSync(productTypesFile, 'utf8');

// Update ProductVariant inStock boolean
productTypesContent = productTypesContent.replace(
  /export interface ProductVariant \{[\s\S]*?\}/,
  `export interface ProductVariant {
  id?: string;
  sku: string;
  size: string;
  color: string;
  colorHex?: string;
  inStock: boolean;
  stock?: number;
  priceOverride?: number | null;
}`
);

// Add ProductSize, ProductColor, ProductPolicy, ProductRegionalPrice if missing
if (!productTypesContent.includes('export interface ProductSize')) {
  const newTypes = `
export interface ProductSize {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface ProductColor {
  id: string;
  name: string;
  slug: string;
  hex: string;
  sortOrder: number;
  isActive: boolean;
}

export interface ProductPolicy {
  id: string;
  name: string;
  slug: string;
  description: string;
  bulletPoints?: string[];
  sortOrder: number;
  isActive: boolean;
}

export interface ProductRegionalPrice {
  id?: string;
  productId?: string;
  regionCode: 'GLOBAL' | 'PK' | 'IT';
  currency: 'EUR' | 'PKR';
  price: number;
  salePrice?: number | null;
  isActive: boolean;
}
`;
  productTypesContent = newTypes + productTypesContent;
}

// Add relational fields to Product interface
if (!productTypesContent.includes('regionalPrices?: ProductRegionalPrice[];')) {
  productTypesContent = productTypesContent.replace(
    'availableSizes: string[];',
    `availableSizes: string[];
  inStock?: boolean;
  sizes?: ProductSize[];
  colors?: ProductColor[];
  policies?: ProductPolicy[];
  regionalPrices?: ProductRegionalPrice[];
  resolvedPrice?: {
    market: 'GLOBAL' | 'PK' | 'IT';
    currency: 'EUR' | 'PKR';
    currencySymbol: string;
    price: number;
    salePrice: number | null;
    isDiscounted: boolean;
    formattedPrice: string;
    formattedSalePrice: string | null;
  };`
  );
}

fs.writeFileSync(productTypesFile, productTypesContent, 'utf8');
console.log('✓ Updated types/product.ts');

// 2. Update types/cart.ts
const cartTypesFile = path.join(STORE_DIR, 'src/types/cart.ts');
let cartTypesContent = fs.readFileSync(cartTypesFile, 'utf8');
if (!cartTypesContent.includes('currency?: string;')) {
  cartTypesContent = cartTypesContent.replace(
    'leatherType: string;',
    `leatherType: string;
  currency?: string;
  currencySymbol?: string;
  market?: string;`
  );
  fs.writeFileSync(cartTypesFile, cartTypesContent, 'utf8');
  console.log('✓ Updated types/cart.ts');
}

// 3. Update lib/currency.ts with Regional Market Resolution
const currencyFile = path.join(STORE_DIR, 'src/lib/currency.ts');
const currencyContent = `export type MarketCode = 'GLOBAL' | 'PK' | 'IT';
export type SupportedCurrency = 'EUR' | 'PKR' | 'GBP' | 'CHF' | 'USD';

export interface MarketConfig {
  code: MarketCode;
  name: string;
  currency: 'EUR' | 'PKR';
  symbol: string;
  locale: string;
  flag: string;
}

export const MARKETS: Record<MarketCode, MarketConfig> = {
  GLOBAL: {
    code: 'GLOBAL',
    name: 'Global',
    currency: 'EUR',
    symbol: '€',
    locale: 'it-IT',
    flag: '🌐',
  },
  PK: {
    code: 'PK',
    name: 'Pakistan',
    currency: 'PKR',
    symbol: 'Rs.',
    locale: 'en-PK',
    flag: '🇵🇰',
  },
  IT: {
    code: 'IT',
    name: 'Italy',
    currency: 'EUR',
    symbol: '€',
    locale: 'it-IT',
    flag: '🇮🇹',
  },
};

export function getStoredMarket(): MarketCode {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('leathermart_market') as MarketCode;
    if (saved && MARKETS[saved]) {
      return saved;
    }
  }
  return 'GLOBAL';
}

/**
 * Format a price with its resolved market currency and European / PK formatting.
 * Never performs automated rate conversion between EUR and PKR.
 */
export function formatPrice(
  amount: number,
  currency?: string,
  market?: MarketCode
): string {
  const activeMarket = market || getStoredMarket();
  const config = MARKETS[activeMarket] || MARKETS.GLOBAL;
  const isPkr = currency === 'PKR' || (!currency && config.currency === 'PKR');

  const rounded = Math.round(Number(amount) || 0);

  if (isPkr) {
    return \`Rs. \${rounded.toLocaleString('en-PK')}\`;
  }

  // European fashion pricing format: €349 or €1.250
  return \`€\${rounded.toLocaleString('it-IT')}\`;
}

/**
 * Centrally resolves display price for a product based on customer's market.
 * Follows resolution hierarchy:
 * 1. Backend resolvedPrice for active market
 * 2. Explicit ProductRegionalPrice for active market
 * 3. Global EUR fallback
 */
export function getProductDisplayPrice(product: any, market?: MarketCode) {
  const activeMarket = market || getStoredMarket();

  // 1. If backend already resolved for this market
  if (product?.resolvedPrice && product.resolvedPrice.market === activeMarket) {
    return {
      price: product.resolvedPrice.price,
      salePrice: product.resolvedPrice.salePrice,
      currency: product.resolvedPrice.currency,
      currencySymbol: product.resolvedPrice.currencySymbol,
      formattedPrice: product.resolvedPrice.formattedPrice,
      formattedSalePrice: product.resolvedPrice.formattedSalePrice,
      isDiscounted: product.resolvedPrice.isDiscounted,
    };
  }

  // 2. Check regionalPrices array
  const rawPrices = product?.regionalPrices || [];
  const target = rawPrices.find((p: any) => p.regionCode === activeMarket && p.isActive !== false)
    || rawPrices.find((p: any) => p.regionCode === 'GLOBAL' && p.isActive !== false);

  if (target) {
    const isPkr = target.currency === 'PKR';
    const symbol = isPkr ? 'Rs.' : '€';
    const numPrice = Number(target.price) || 0;
    const numSale = target.salePrice !== null && target.salePrice !== undefined ? Number(target.salePrice) : null;
    return {
      price: numPrice,
      salePrice: numSale,
      currency: target.currency,
      currencySymbol: symbol,
      formattedPrice: formatPrice(numPrice, target.currency, activeMarket),
      formattedSalePrice: numSale !== null ? formatPrice(numSale, target.currency, activeMarket) : null,
      isDiscounted: Boolean(numSale !== null && numSale < numPrice),
    };
  }

  // 3. Fallback to product.price (Global EUR)
  const basePrice = Number(product?.price || 0);
  const baseSale = product?.salePrice ? Number(product.salePrice) : null;
  return {
    price: basePrice,
    salePrice: baseSale,
    currency: 'EUR',
    currencySymbol: '€',
    formattedPrice: formatPrice(basePrice, 'EUR', activeMarket),
    formattedSalePrice: baseSale ? formatPrice(baseSale, 'EUR', activeMarket) : null,
    isDiscounted: Boolean(baseSale && baseSale < basePrice),
  };
}
`;
fs.writeFileSync(currencyFile, currencyContent, 'utf8');
console.log('✓ Updated lib/currency.ts');

// 4. Create MarketContext.tsx in context/MarketContext.tsx
const marketContextFile = path.join(STORE_DIR, 'src/context/MarketContext.tsx');
const marketContextContent = `"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { MarketCode, MARKETS, MarketConfig, getStoredMarket } from '@/lib/currency';
import { publicApiClient } from '@/lib/api/publicClient';

interface MarketContextType {
  market: MarketCode;
  marketConfig: MarketConfig;
  setMarket: (market: MarketCode) => void;
}

const MarketContext = createContext<MarketContextType>({
  market: 'GLOBAL',
  marketConfig: MARKETS.GLOBAL,
  setMarket: () => {},
});

export const MarketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [market, setMarketState] = useState<MarketCode>('GLOBAL');

  useEffect(() => {
    const stored = getStoredMarket();
    setMarketState(stored);
    // Set axios default header for backend market resolution
    publicApiClient.defaults.headers.common['x-market'] = stored;
  }, []);

  const setMarket = (newMarket: MarketCode) => {
    setMarketState(newMarket);
    if (typeof window !== 'undefined') {
      localStorage.setItem('leathermart_market', newMarket);
      document.cookie = \`x-market=\${newMarket}; path=/; max-age=31536000\`;
    }
    publicApiClient.defaults.headers.common['x-market'] = newMarket;
    // Trigger window event so listeners can re-render if needed
    window.dispatchEvent(new Event('marketchange'));
  };

  const marketConfig = MARKETS[market] || MARKETS.GLOBAL;

  return (
    <MarketContext.Provider value={{ market, marketConfig, setMarket }}>
      {children}
    </MarketContext.Provider>
  );
};

export const useMarket = () => useContext(MarketContext);
`;
fs.writeFileSync(marketContextFile, marketContextContent, 'utf8');
console.log('✓ Created context/MarketContext.tsx');

// 5. Create MarketSelector.tsx in components/layout/MarketSelector.tsx
const marketSelectorFile = path.join(STORE_DIR, 'src/components/layout/MarketSelector.tsx');
const marketSelectorContent = `"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Globe } from 'lucide-react';
import { useMarket } from '@/context/MarketContext';
import { MarketCode, MARKETS } from '@/lib/currency';

interface MarketSelectorProps {
  variant?: 'desktop' | 'mobile';
  className?: string;
}

export function MarketSelector({
  variant = 'desktop',
  className = '',
}: MarketSelectorProps) {
  const { market, setMarket } = useMarket();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const currentConfig = MARKETS[market] || MARKETS.GLOBAL;

  if (variant === 'mobile') {
    return (
      <div className={\`flex items-center justify-between py-2 border-b border-white/[0.08] \${className}\`}>
        <div className="flex items-center space-x-2 text-xs font-mono tracking-widest uppercase text-white/60">
          <Globe className="w-3.5 h-3.5 text-[#C5A47E]" />
          <span>Market</span>
        </div>
        <div className="flex items-center gap-1.5">
          {(Object.keys(MARKETS) as MarketCode[]).map((mCode) => {
            const m = MARKETS[mCode];
            const isSelected = market === mCode;
            return (
              <button
                key={mCode}
                onClick={() => setMarket(mCode)}
                className={\`px-2.5 py-1 text-[11px] font-mono rounded transition-colors flex items-center gap-1 \${
                  isSelected
                    ? 'bg-[#C5A47E] text-[#0D0C0B] font-bold'
                    : 'text-white/60 hover:text-white bg-white/[0.04]'
                }\`}
              >
                <span>{m.flag}</span>
                <span>{m.code}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div ref={dropdownRef} className={\`relative inline-block text-left \${className}\`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1.5 py-1.5 px-2.5 rounded-sm hover:bg-white/[0.05] transition-colors text-white/70 hover:text-white group"
        aria-label="Select shopping market & currency"
      >
        <span className="text-xs">{currentConfig.flag}</span>
        <span className="text-xs font-mono tracking-wider uppercase text-[#C5A47E] group-hover:text-white transition-colors">
          {currentConfig.code} ({currentConfig.symbol})
        </span>
        <ChevronDown
          className={\`w-3 h-3 transition-transform duration-200 text-white/40 group-hover:text-white \${
            isOpen ? 'rotate-180' : ''
          }\`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-56 bg-[#141210] border border-white/[0.15] shadow-2xl z-50 py-1.5 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 border-b border-white/[0.08] mb-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-white/40 block">
              Select Market & Currency
            </span>
          </div>

          {(Object.keys(MARKETS) as MarketCode[]).map((mCode) => {
            const m = MARKETS[mCode];
            const isSelected = market === mCode;
            return (
              <button
                key={mCode}
                onClick={() => {
                  setMarket(mCode);
                  setIsOpen(false);
                }}
                className={\`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-white/[0.06] transition-colors \${
                  isSelected ? 'text-[#C5A47E] font-medium' : 'text-white/70'
                }\`}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-sm">{m.flag}</span>
                  <div>
                    <span className="block font-medium">{m.name}</span>
                    <span className="block text-[10px] font-mono text-white/40">
                      {m.currency} ({m.symbol})
                    </span>
                  </div>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-[#C5A47E]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
`;
fs.writeFileSync(marketSelectorFile, marketSelectorContent, 'utf8');
console.log('✓ Created components/layout/MarketSelector.tsx');

// 6. Update StoreProvider.tsx to wrap with MarketProvider
const storeProviderFile = path.join(STORE_DIR, 'src/components/providers/StoreProvider.tsx');
let storeProviderContent = fs.readFileSync(storeProviderFile, 'utf8');
if (!storeProviderContent.includes('MarketProvider')) {
  storeProviderContent = `import { MarketProvider } from "@/context/MarketContext";\n` + storeProviderContent;
  storeProviderContent = storeProviderContent.replace(
    '<CartProvider>',
    '<MarketProvider>\n      <CartProvider>'
  );
  storeProviderContent = storeProviderContent.replace(
    '</CartProvider>',
    '</CartProvider>\n    </MarketProvider>'
  );
  fs.writeFileSync(storeProviderFile, storeProviderContent, 'utf8');
  console.log('✓ Mounted MarketProvider in StoreProvider.tsx');
}

// 7. Update Navbar.tsx to add MarketSelector
const navbarFile = path.join(STORE_DIR, 'src/components/layout/Navbar.tsx');
let navbarContent = fs.readFileSync(navbarFile, 'utf8');
if (!navbarContent.includes('MarketSelector')) {
  navbarContent = navbarContent.replace(
    'import { LanguageSelector } from "./LanguageSelector";',
    `import { LanguageSelector } from "./LanguageSelector";\nimport { MarketSelector } from "./MarketSelector";`
  );
  navbarContent = navbarContent.replace(
    '<LanguageSelector variant="desktop" />',
    `<LanguageSelector variant="desktop" />\n            <MarketSelector variant="desktop" />`
  );
  fs.writeFileSync(navbarFile, navbarContent, 'utf8');
  console.log('✓ Added MarketSelector to Navbar.tsx');
}

// 8. Update MobileNavDrawer.tsx to add MarketSelector
const mobileNavFile = path.join(STORE_DIR, 'src/components/layout/MobileNavDrawer.tsx');
if (fs.existsSync(mobileNavFile)) {
  let mobileNavContent = fs.readFileSync(mobileNavFile, 'utf8');
  if (!mobileNavContent.includes('MarketSelector')) {
    mobileNavContent = mobileNavContent.replace(
      'import { LanguageSelector } from "./LanguageSelector";',
      `import { LanguageSelector } from "./LanguageSelector";\nimport { MarketSelector } from "./MarketSelector";`
    );
    mobileNavContent = mobileNavContent.replace(
      '<LanguageSelector variant="mobile" />',
      `<LanguageSelector variant="mobile" />\n        <MarketSelector variant="mobile" />`
    );
    fs.writeFileSync(mobileNavFile, mobileNavContent, 'utf8');
    console.log('✓ Added MarketSelector to MobileNavDrawer.tsx');
  }
}

console.log('Core storefront market services configured.');
