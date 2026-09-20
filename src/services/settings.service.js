import { prisma } from '../lib/prisma.js';
import { HTTP_STATUS } from '../config/constants.js';

export const SettingsService = {
  async getSettings() {
    const settings = await prisma.siteSetting.findUnique({
      where: { singletonKey: 'global' },
    });

    if (!settings) {
      const defaultSettings = {
        singletonKey: 'global',
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

      const created = await prisma.siteSetting.create({
        data: defaultSettings,
      });

      return {
        id: created.id,
        _id: created.id,
        announcement: created.announcement,
        shipping: created.shipping,
        footer: created.footer,
        searchKeywords: created.searchKeywords,
      };
    }

    return {
      id: settings.id,
      _id: settings.id,
      announcement: settings.announcement,
      shipping: settings.shipping,
      footer: settings.footer,
      searchKeywords: settings.searchKeywords,
    };
  },

  async updateSettings(data) {
    const updates = {};
    if (data.announcement) updates.announcement = data.announcement;
    if (data.shipping) updates.shipping = data.shipping;
    if (data.footer) updates.footer = data.footer;
    if (data.searchKeywords) updates.searchKeywords = data.searchKeywords;

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
      announcement: updated.announcement,
      shipping: updated.shipping,
      footer: updated.footer,
      searchKeywords: updated.searchKeywords,
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
    return {
      title: 'ATELIER VALENTI MILANO — Handcrafted European Leather Outerwear',
      description:
        'Luxury Italian calfskin and lambskin outerwear crafted by hand in our Milanese atelier. AZO-free certified leather with European express delivery.',
      canonical: `${baseUrl}${cleanPath}`,
      openGraph: {
        title: 'ATELIER VALENTI MILANO',
        description: 'Bespoke and ready-to-wear luxury leather outerwear.',
        image: `${baseUrl}/og-default.webp`,
        type: 'website',
      },
    };
  },
};
