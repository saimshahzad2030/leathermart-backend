import { prisma } from '../lib/prisma.js';
import { HTTP_STATUS } from '../config/constants.js';

export const SettingsService = {
  async getSettings() {
    let settings = await prisma.siteSetting.findUnique({
      where: { singletonKey: 'global' },
    });

    if (!settings) {
      const defaultSettings = {
        singletonKey: 'global',
        platformName: 'Atelier Valenti Milano',
        platformShortName: 'AVM',
        logoUrl: null,
        logoDarkUrl: null,
        logoLightUrl: null,
        faviconUrl: null,
        browserTitle: 'Atelier Valenti Milano — Handcrafted European Leather Outerwear',
        metaDescription:
          'Luxury Italian calfskin and lambskin outerwear crafted by hand in our Milanese atelier. AZO-free certified leather with European express delivery.',
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
          ],
        },
        footer: {
          certificationLine: '✔️ AZO-Free Leather · ✔️ EU REACH Compliant',
          atelierAddress: 'Via Montenapoleone, 27, 20121 Milano, Italy',
          instagramHandle: '@ATELIERVALENTI',
          copyrightText: '© 2026 Atelier Valenti Milano. All rights reserved.',
          cities: ['MILANO', 'PARIS', 'ZURICH', 'MUNICH'],
        },
        searchKeywords: ['Biker', 'Bomber', 'Shearling', 'Suede', 'Calfskin', 'Nappa', 'Trench'],
      };

      settings = await prisma.siteSetting.create({
        data: defaultSettings,
      });
    }

    return {
      id: settings.id,
      _id: settings.id,
      platformName: settings.platformName || 'Atelier Valenti Milano',
      platformShortName: settings.platformShortName || 'AVM',
      logoUrl: settings.logoUrl || null,
      logoDarkUrl: settings.logoDarkUrl || null,
      logoLightUrl: settings.logoLightUrl || null,
      faviconUrl: settings.faviconUrl || null,
      browserTitle: settings.browserTitle || 'Atelier Valenti Milano — Handcrafted European Leather Outerwear',
      metaDescription:
        settings.metaDescription ||
        'Luxury Italian calfskin and lambskin outerwear crafted by hand in our Milanese atelier. AZO-free certified leather with European express delivery.',
      announcement: settings.announcement,
      shipping: settings.shipping,
      footer: settings.footer,
      searchKeywords: settings.searchKeywords,
      updatedAt: settings.updatedAt,
    };
  },

  async getBranding() {
    const settings = await this.getSettings();
    return {
      platformName: settings.platformName || 'Atelier Valenti Milano',
      platformShortName: settings.platformShortName || 'AVM',
      logoUrl: settings.logoUrl || null,
      logoDarkUrl: settings.logoDarkUrl || null,
      logoLightUrl: settings.logoLightUrl || null,
      faviconUrl: settings.faviconUrl || null,
      browserTitle: settings.browserTitle || 'Atelier Valenti Milano — Handcrafted European Leather Outerwear',
      metaDescription:
        settings.metaDescription ||
        'Luxury Italian calfskin and lambskin outerwear crafted by hand in our Milanese atelier. AZO-free certified leather with European express delivery.',
      updatedAt: settings.updatedAt,
    };
  },

  async updateBranding(data) {
    const updates = {};
    if (data.platformName !== undefined) updates.platformName = data.platformName;
    if (data.platformShortName !== undefined) updates.platformShortName = data.platformShortName || null;
    if (data.logoUrl !== undefined) updates.logoUrl = data.logoUrl || null;
    if (data.logoDarkUrl !== undefined) updates.logoDarkUrl = data.logoDarkUrl || null;
    if (data.logoLightUrl !== undefined) updates.logoLightUrl = data.logoLightUrl || null;
    if (data.faviconUrl !== undefined) updates.faviconUrl = data.faviconUrl || null;
    if (data.browserTitle !== undefined) updates.browserTitle = data.browserTitle;
    if (data.metaDescription !== undefined) updates.metaDescription = data.metaDescription || null;

    const updated = await prisma.siteSetting.upsert({
      where: { singletonKey: 'global' },
      update: updates,
      create: {
        singletonKey: 'global',
        ...updates,
      },
    });

    return {
      platformName: updated.platformName || 'Atelier Valenti Milano',
      platformShortName: updated.platformShortName || 'AVM',
      logoUrl: updated.logoUrl || null,
      logoDarkUrl: updated.logoDarkUrl || null,
      logoLightUrl: updated.logoLightUrl || null,
      faviconUrl: updated.faviconUrl || null,
      browserTitle: updated.browserTitle || 'Atelier Valenti Milano — Handcrafted European Leather Outerwear',
      metaDescription:
        updated.metaDescription ||
        'Luxury Italian calfskin and lambskin outerwear crafted by hand in our Milanese atelier. AZO-free certified leather with European express delivery.',
      updatedAt: updated.updatedAt,
    };
  },

  async updateSettings(data) {
    const updates = {};
    if (data.announcement) updates.announcement = data.announcement;
    if (data.shipping) updates.shipping = data.shipping;
    if (data.footer) updates.footer = data.footer;
    if (data.searchKeywords) updates.searchKeywords = data.searchKeywords;

    if (data.platformName !== undefined) updates.platformName = data.platformName;
    if (data.platformShortName !== undefined) updates.platformShortName = data.platformShortName || null;
    if (data.logoUrl !== undefined) updates.logoUrl = data.logoUrl || null;
    if (data.logoDarkUrl !== undefined) updates.logoDarkUrl = data.logoDarkUrl || null;
    if (data.logoLightUrl !== undefined) updates.logoLightUrl = data.logoLightUrl || null;
    if (data.faviconUrl !== undefined) updates.faviconUrl = data.faviconUrl || null;
    if (data.browserTitle !== undefined) updates.browserTitle = data.browserTitle;
    if (data.metaDescription !== undefined) updates.metaDescription = data.metaDescription || null;

    const updated = await prisma.siteSetting.upsert({
      where: { singletonKey: 'global' },
      update: updates,
      create: {
        singletonKey: 'global',
        ...updates,
      },
    });

    return {
      id: updated.id,
      _id: updated.id,
      platformName: updated.platformName || 'Atelier Valenti Milano',
      platformShortName: updated.platformShortName || 'AVM',
      logoUrl: updated.logoUrl || null,
      logoDarkUrl: updated.logoDarkUrl || null,
      logoLightUrl: updated.logoLightUrl || null,
      faviconUrl: updated.faviconUrl || null,
      browserTitle: updated.browserTitle || 'Atelier Valenti Milano — Handcrafted European Leather Outerwear',
      metaDescription:
        updated.metaDescription ||
        'Luxury Italian calfskin and lambskin outerwear crafted by hand in our Milanese atelier. AZO-free certified leather with European express delivery.',
      announcement: updated.announcement,
      shipping: updated.shipping,
      footer: updated.footer,
      searchKeywords: updated.searchKeywords,
      updatedAt: updated.updatedAt,
    };
  },

  async getFooterSettings() {
    const settings = await this.getSettings();
    return settings.footer;
  },

  async getAnnouncement() {
    const settings = await this.getSettings();
    return settings.announcement;
  },

  async getShippingSettings() {
    const settings = await this.getSettings();
    return settings.shipping;
  },

  async getSearchKeywords() {
    const settings = await this.getSettings();
    return settings.searchKeywords || [];
  },

  async updateSearchKeywords(keywords) {
    const updated = await prisma.siteSetting.update({
      where: { singletonKey: 'global' },
      data: { searchKeywords: keywords },
    });
    return updated.searchKeywords;
  },

  async getNavigationMenu(menuKey) {
    if (menuKey) {
      const menu = await prisma.navigationMenu.findUnique({
        where: { menuKey },
      });
      return menu ? menu.payload : null;
    }

    const menus = await prisma.navigationMenu.findMany();
    const map = {};
    menus.forEach((m) => {
      map[m.menuKey] = m.payload;
    });
    return map;
  },

  async updateNavigationMenu(menuKey, payload) {
    const updated = await prisma.navigationMenu.upsert({
      where: { menuKey },
      update: { payload },
      create: { menuKey, payload },
    });
    return updated.payload;
  },

  async getSeoMetadata(requestPath = '/') {
    const baseUrl = 'https://ateliervalenti.com';
    const cleanPath = requestPath.split('?')[0];

    // Product PDP
    if (cleanPath.startsWith('/products/')) {
      const slug = cleanPath.replace('/products/', '').trim();
      const product = await prisma.product.findFirst({
        where: { slug, isPublished: true },
        include: { images: { orderBy: { sortOrder: 'asc' } } },
      });

      if (product) {
        const primaryImg = product.images?.[0]?.url || `${baseUrl}/og-default.webp`;

        return {
          title:
            product.seoTitle ||
            `${product.name} in ${product.leatherType} | ATELIER VALENTI MILANO`,
          description:
            product.seoDescription ||
            `${product.tagline}. Handcrafted in Milan. ${product.description.slice(0, 140)}...`,
          canonical: `${baseUrl}/products/${product.slug}`,
          openGraph: {
            title: `${product.name} | ATELIER VALENTI`,
            description: product.tagline || 'Handcrafted European luxury outerwear.',
            image: primaryImg,
            type: 'product',
          },
          jsonLd: {
            '@context': 'https://schema.org/',
            '@type': 'Product',
            name: product.name,
            image: primaryImg,
            offers: {
              '@type': 'Offer',
              priceCurrency: 'EUR',
              price: Number(product.price).toFixed(2),
              availability: 'https://schema.org/InStock',
            },
          },
        };
      }
    }

    // Category page
    if (cleanPath.startsWith('/men/') || cleanPath.startsWith('/women/')) {
      const slug = cleanPath.split('/')[2];
      const category = await prisma.category.findUnique({
        where: { slug },
      });

      if (category) {
        return {
          title: category.seoTitle || `${category.name} | ATELIER VALENTI MILANO`,
          description:
            category.seoDescription ||
            `Explore handcrafted ${category.name}. European luxury calfskin & lambskin garments.`,
          canonical: `${baseUrl}${cleanPath}`,
          openGraph: {
            title: `${category.name} | ATELIER VALENTI`,
            description: category.description,
            image: category.heroImage,
            type: 'website',
          },
        };
      }
    }

    // Fallback global metadata
    const branding = await this.getBranding();
    return {
      title: branding.browserTitle || 'ATELIER VALENTI MILANO — Handcrafted European Leather Outerwear',
      description:
        branding.metaDescription ||
        'Luxury Italian calfskin and lambskin outerwear crafted by hand in our Milanese atelier. AZO-free certified leather with European express delivery.',
      canonical: `${baseUrl}${cleanPath}`,
      openGraph: {
        title: branding.platformName || 'ATELIER VALENTI MILANO',
        description: branding.metaDescription || 'Bespoke and ready-to-wear luxury leather outerwear.',
        image: branding.logoUrl || `${baseUrl}/og-default.webp`,
        type: 'website',
      },
    };
  },
};
