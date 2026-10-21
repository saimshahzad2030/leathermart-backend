/**
 * Centralized Regional Pricing Service
 * Supports Pakistan (PKR), Italy (EUR), and Global (EUR) markets.
 * Never converts currencies automatically; uses explicitly configured amounts.
 */

export const MARKETS = {
  PK: 'PK',
  IT: 'IT',
  GLOBAL: 'GLOBAL',
};

export const MARKET_CURRENCIES = {
  PK: 'PKR',
  IT: 'EUR',
  GLOBAL: 'EUR',
};

export const CURRENCY_SYMBOLS = {
  PKR: 'Rs.',
  EUR: '€',
};

export const PricingService = {
  /**
   * Normalize an incoming market identifier into a standard region code: PK, IT, or GLOBAL.
   */
  normalizeMarket(marketInput) {
    if (!marketInput || typeof marketInput !== 'string') return MARKETS.GLOBAL;
    const clean = marketInput.trim().toUpperCase();
    if (clean === 'PK' || clean === 'PAK' || clean === 'PAKISTAN') return MARKETS.PK;
    if (clean === 'IT' || clean === 'ITA' || clean === 'ITALY') return MARKETS.IT;
    if (clean === 'GLOBAL' || clean === 'WORLD' || clean === 'ROW' || clean === 'EU') return MARKETS.GLOBAL;
    return MARKETS.GLOBAL;
  },

  /**
   * Format monetary amount in a region-specific style.
   */
  formatAmount(amount, currency = 'EUR') {
    if (amount === null || amount === undefined || isNaN(Number(amount))) return '';
    const num = Number(amount);
    if (currency === 'PKR') {
      return `Rs. ${num.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    // European EUR format: €349 or €1.250
    return `€${num.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  },

  /**
   * Resolves the market price for a product.
   * Priority:
   * 1. Market-specific price in Product.prices (PK -> PKR, IT -> EUR, GLOBAL -> EUR)
   * 2. Fallback to GLOBAL price in Product.prices (EUR)
   * 3. Fallback to legacy Product.price and Product.salePrice (EUR)
   */
  resolvePrice(product, requestedMarket = MARKETS.GLOBAL) {
    if (!product) return null;

    const targetRegion = this.normalizeMarket(requestedMarket);
    const expectedCurrency = MARKET_CURRENCIES[targetRegion];

    const rawPrices = Array.isArray(product.prices)
      ? product.prices
      : Array.isArray(product.prices?.create)
      ? product.prices.create
      : [];
    const activePrices = rawPrices.filter((p) => p && p.isActive !== false);

    // 1. Try finding requested regional price
    const regionalMatch = activePrices.find((p) => p.regionCode === targetRegion);

    if (regionalMatch && regionalMatch.price !== undefined && regionalMatch.price !== null) {
      const price = Number(regionalMatch.price);
      const salePrice = regionalMatch.salePrice !== null && regionalMatch.salePrice !== undefined
        ? Number(regionalMatch.salePrice)
        : null;

      return {
        market: targetRegion,
        currency: regionalMatch.currency || expectedCurrency,
        symbol: CURRENCY_SYMBOLS[regionalMatch.currency || expectedCurrency] || '€',
        price,
        salePrice,
        effectivePrice: salePrice !== null ? salePrice : price,
        isSale: salePrice !== null && salePrice < price,
        formattedPrice: this.formatAmount(price, regionalMatch.currency || expectedCurrency),
        formattedSalePrice: salePrice !== null ? this.formatAmount(salePrice, regionalMatch.currency || expectedCurrency) : null,
        isFallback: false,
      };
    }

    // 2. Try finding GLOBAL price
    const globalMatch = activePrices.find((p) => p.regionCode === MARKETS.GLOBAL);
    if (globalMatch && globalMatch.price !== undefined && globalMatch.price !== null) {
      const price = Number(globalMatch.price);
      const salePrice = globalMatch.salePrice !== null && globalMatch.salePrice !== undefined
        ? Number(globalMatch.salePrice)
        : null;

      return {
        market: MARKETS.GLOBAL,
        requestedMarket: targetRegion,
        currency: globalMatch.currency || 'EUR',
        symbol: CURRENCY_SYMBOLS[globalMatch.currency || 'EUR'] || '€',
        price,
        salePrice,
        effectivePrice: salePrice !== null ? salePrice : price,
        isSale: salePrice !== null && salePrice < price,
        formattedPrice: this.formatAmount(price, globalMatch.currency || 'EUR'),
        formattedSalePrice: salePrice !== null ? this.formatAmount(salePrice, globalMatch.currency || 'EUR') : null,
        isFallback: targetRegion !== MARKETS.GLOBAL,
      };
    }

    // 3. Fallback to product root fields (Global EUR)
    const basePrice = Number(product.price || 0);
    const baseSale = product.salePrice !== null && product.salePrice !== undefined
      ? Number(product.salePrice)
      : null;

    return {
      market: MARKETS.GLOBAL,
      requestedMarket: targetRegion,
      currency: 'EUR',
      symbol: '€',
      price: basePrice,
      salePrice: baseSale,
      effectivePrice: baseSale !== null ? baseSale : basePrice,
      isSale: baseSale !== null && baseSale < basePrice,
      formattedPrice: this.formatAmount(basePrice, 'EUR'),
      formattedSalePrice: baseSale !== null ? this.formatAmount(baseSale, 'EUR') : null,
      isFallback: true,
    };
  },

  /**
   * Validate and normalize a list of regional prices before saving.
   */
  validateRegionalPrices(prices) {
    if (!Array.isArray(prices)) return [];

    const validRegions = [MARKETS.PK, MARKETS.IT, MARKETS.GLOBAL];
    const seen = new Set();
    const result = [];

    for (const item of prices) {
      if (!item || !item.regionCode) continue;
      const reg = item.regionCode.toUpperCase();
      if (!validRegions.includes(reg)) {
        throw new Error(`Invalid region code '${item.regionCode}'. Valid regions are PK, IT, GLOBAL.`);
      }
      if (seen.has(reg)) {
        throw new Error(`Duplicate regional price for region '${reg}'. Each region can have at most one price definition.`);
      }
      seen.add(reg);

      const expectedCur = MARKET_CURRENCIES[reg];
      if (item.currency && item.currency.toUpperCase() !== expectedCur) {
        throw new Error(`Invalid currency '${item.currency}' for region '${reg}'. Expected '${expectedCur}'.`);
      }

      const pNum = Number(item.price);
      if (isNaN(pNum) || pNum <= 0) {
        throw new Error(`Price for region '${reg}' must be a positive number.`);
      }

      let saleNum = null;
      if (item.salePrice !== null && item.salePrice !== undefined && item.salePrice !== '') {
        saleNum = Number(item.salePrice);
        if (isNaN(saleNum) || saleNum <= 0) {
          throw new Error(`Sale price for region '${reg}' must be a positive number if provided.`);
        }
        if (saleNum >= pNum) {
          throw new Error(`Sale price (${saleNum}) for region '${reg}' must be less than regular price (${pNum}).`);
        }
      }

      result.push({
        regionCode: reg,
        currency: expectedCur,
        price: pNum,
        salePrice: saleNum,
        isActive: item.isActive !== undefined ? !!item.isActive : true,
      });
    }

    return result;
  },
};
