import { prisma } from '../lib/prisma.js';
import { HTTP_STATUS } from '../config/constants.js';

export const CmsService = {
  async getHomepageContent() {
    const [sections, settings, testimonials, socialLooks] = await Promise.all([
      prisma.cmsSection.findMany({ where: { isVisible: true } }),
      prisma.siteSetting.findUnique({ where: { singletonKey: 'global' } }),
      prisma.testimonial.findMany({
        where: { isPublished: true },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.socialLook.findMany({
        where: { isPublished: true },
        orderBy: { sortOrder: 'asc' },
      }),
    ]);

    const sectionMap = sections.reduce((acc, curr) => {
      acc[curr.sectionKey] = curr;
      return acc;
    }, {});

    const announcement = settings?.announcement || {
      enabled: true,
      message: 'Complimentary Express European Delivery on All Orders Over €250',
      badge: 'Milano Atelier',
      linkText: 'EXPLORE BESPOKE',
      linkHref: '/customize',
    };

    const hero = sectionMap.hero
      ? {
          eyebrow: sectionMap.hero.eyebrow,
          title: sectionMap.hero.title,
          subtitle: sectionMap.hero.subtitle,
          primaryCta: sectionMap.hero.primaryCta,
          secondaryCta: sectionMap.hero.secondaryCta,
          backgroundImage: sectionMap.hero.mediaUrl,
          videoUrl: sectionMap.hero.secondaryMediaUrl || undefined,
        }
      : {};

    const editorial = sectionMap.editorial
      ? {
          eyebrow: sectionMap.editorial.eyebrow,
          heading: sectionMap.editorial.title,
          subheading: sectionMap.editorial.subtitle,
          quote: sectionMap.editorial.extraPayload?.quote || '',
          body: Array.isArray(sectionMap.editorial.body) ? sectionMap.editorial.body : [],
          ctaText: sectionMap.editorial.primaryCta?.label || '',
          ctaHref: sectionMap.editorial.primaryCta?.href || '',
          mainImage: sectionMap.editorial.mediaUrl || '',
          detailImage: sectionMap.editorial.secondaryMediaUrl || '',
          caption: sectionMap.editorial.extraPayload?.caption || '',
        }
      : {};

    const craftsmanship = sectionMap.craftsmanship
      ? {
          eyebrow: sectionMap.craftsmanship.eyebrow,
          heading: sectionMap.craftsmanship.title,
          subheading: sectionMap.craftsmanship.subtitle,
          principles: sectionMap.craftsmanship.extraPayload?.principles || [],
        }
      : {};

    const macroTexture = sectionMap.macro_detail
      ? {
          eyebrow: sectionMap.macro_detail.eyebrow,
          heading: sectionMap.macro_detail.title,
          description: sectionMap.macro_detail.subtitle,
          grainImage: sectionMap.macro_detail.mediaUrl || '',
          detailBullets: sectionMap.macro_detail.extraPayload?.detailBullets || [],
        }
      : {};

    const signatureBanner = sectionMap.signature_banner
      ? {
          eyebrow: sectionMap.signature_banner.eyebrow,
          heading: sectionMap.signature_banner.title,
          subheading: sectionMap.signature_banner.subtitle,
          cta: sectionMap.signature_banner.primaryCta,
          image: sectionMap.signature_banner.mediaUrl || '',
        }
      : {};

    const story = sectionMap.brand_story
      ? {
          eyebrow: sectionMap.brand_story.eyebrow,
          heading: sectionMap.brand_story.title,
          paragraph1: sectionMap.brand_story.extraPayload?.paragraph1 || '',
          paragraph2: sectionMap.brand_story.extraPayload?.paragraph2 || '',
          signature: sectionMap.brand_story.extraPayload?.signature || '',
          image: sectionMap.brand_story.mediaUrl || '',
        }
      : {};

    const trustPerks = sectionMap.trust_quality?.extraPayload?.perks || [];

    const formattedTestimonials = testimonials.map((t) => ({
      id: t.id,
      _id: t.id,
      quote: t.quote,
      author: t.author,
      city: t.city,
      country: t.country,
      verifiedGarment: t.verifiedGarment,
      rating: t.rating,
    }));

    const formattedSocialLooks = socialLooks.map((s) => ({
      id: s.id,
      _id: s.id,
      imageUrl: s.imageUrl,
      caption: s.caption,
      tag: s.tag,
      instagramUrl: s.instagramUrl,
    }));

    return {
      announcement,
      hero,
      editorial,
      craftsmanship,
      macroTexture,
      signatureBanner,
      story,
      trustPerks,
      testimonials: formattedTestimonials,
      socialLooks: formattedSocialLooks,
    };
  },

  async getAllSections() {
    const sections = await prisma.cmsSection.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    return sections.map((s) => ({
      id: s.id,
      _id: s.id,
      sectionKey: s.sectionKey,
      title: s.title,
      subtitle: s.subtitle,
      eyebrow: s.eyebrow,
      body: s.body,
      primaryCta: s.primaryCta,
      secondaryCta: s.secondaryCta,
      mediaUrl: s.mediaUrl,
      secondaryMediaUrl: s.secondaryMediaUrl,
      extraPayload: s.extraPayload,
      isVisible: s.isVisible,
      sortOrder: s.sortOrder,
    }));
  },

  async getSection(sectionKey) {
    const section = await prisma.cmsSection.findUnique({
      where: { sectionKey },
    });

    if (!section) {
      const err = new Error(`Section '${sectionKey}' not found`);
      err.statusCode = HTTP_STATUS.NOT_FOUND;
      throw err;
    }

    return {
      id: section.id,
      _id: section.id,
      sectionKey: section.sectionKey,
      title: section.title,
      subtitle: section.subtitle,
      eyebrow: section.eyebrow,
      body: section.body,
      primaryCta: section.primaryCta,
      secondaryCta: section.secondaryCta,
      mediaUrl: section.mediaUrl,
      secondaryMediaUrl: section.secondaryMediaUrl,
      extraPayload: section.extraPayload,
      isVisible: section.isVisible,
      sortOrder: section.sortOrder,
    };
  },

  async updateSection(sectionKey, data) {
    const updates = {};
    if (data.title !== undefined) updates.title = data.title;
    if (data.subtitle !== undefined) updates.subtitle = data.subtitle;
    if (data.eyebrow !== undefined) updates.eyebrow = data.eyebrow;
    if (data.body !== undefined) updates.body = data.body;
    if (data.primaryCta !== undefined) updates.primaryCta = data.primaryCta;
    if (data.secondaryCta !== undefined) updates.secondaryCta = data.secondaryCta;
    if (data.mediaUrl !== undefined) updates.mediaUrl = data.mediaUrl;
    if (data.secondaryMediaUrl !== undefined) updates.secondaryMediaUrl = data.secondaryMediaUrl;
    if (data.extraPayload !== undefined) updates.extraPayload = data.extraPayload;
    if (data.isVisible !== undefined) updates.isVisible = data.isVisible;
    if (data.sortOrder !== undefined) updates.sortOrder = data.sortOrder;

    const section = await prisma.cmsSection.upsert({
      where: { sectionKey },
      update: updates,
      create: {
        sectionKey,
        ...updates,
      },
    });

    return {
      ...section,
      _id: section.id,
    };
  },

  async toggleVisibility(sectionKey, isVisible) {
    try {
      const section = await prisma.cmsSection.update({
        where: { sectionKey },
        data: { isVisible },
      });
      return {
        ...section,
        _id: section.id,
      };
    } catch (error) {
      const err = new Error(`Section '${sectionKey}' not found`);
      err.statusCode = HTTP_STATUS.NOT_FOUND;
      throw err;
    }
  },

  async reorderSections(items) {
    const updates = items.map((item) =>
      prisma.cmsSection.update({
        where: { sectionKey: item.id || item.sectionKey },
        data: { sortOrder: item.order },
      })
    );
    await prisma.$transaction(updates);
    return { message: 'Sections reordered successfully' };
  },

  // Testimonials
  async listTestimonials(isPublic = true) {
    const where = isPublic ? { isPublished: true } : {};
    const testimonials = await prisma.testimonial.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });

    return testimonials.map((t) => ({
      id: t.id,
      _id: t.id,
      quote: t.quote,
      author: t.author,
      city: t.city,
      country: t.country,
      verifiedGarment: t.verifiedGarment,
      rating: t.rating,
      sortOrder: t.sortOrder,
      isPublished: t.isPublished,
    }));
  },

  async createTestimonial(data) {
    const created = await prisma.testimonial.create({
      data: {
        quote: data.quote,
        author: data.author,
        city: data.city,
        country: data.country,
        verifiedGarment: data.verifiedGarment,
        rating: data.rating || 5,
        sortOrder: data.sortOrder || 0,
        isPublished: data.isPublished ?? true,
      },
    });

    return {
      ...created,
      _id: created.id,
    };
  },

  async updateTestimonial(id, data) {
    const updates = {};
    if (data.quote !== undefined) updates.quote = data.quote;
    if (data.author !== undefined) updates.author = data.author;
    if (data.city !== undefined) updates.city = data.city;
    if (data.country !== undefined) updates.country = data.country;
    if (data.verifiedGarment !== undefined) updates.verifiedGarment = data.verifiedGarment;
    if (data.rating !== undefined) updates.rating = data.rating;
    if (data.sortOrder !== undefined) updates.sortOrder = data.sortOrder;
    if (data.isPublished !== undefined) updates.isPublished = data.isPublished;

    try {
      const updated = await prisma.testimonial.update({
        where: { id },
        data: updates,
      });

      return {
        ...updated,
        _id: updated.id,
      };
    } catch (error) {
      const err = new Error('Testimonial not found');
      err.statusCode = HTTP_STATUS.NOT_FOUND;
      throw err;
    }
  },

  async deleteTestimonial(id) {
    try {
      const deleted = await prisma.testimonial.delete({
        where: { id },
      });
      return {
        ...deleted,
        _id: deleted.id,
      };
    } catch (error) {
      const err = new Error('Testimonial not found');
      err.statusCode = HTTP_STATUS.NOT_FOUND;
      throw err;
    }
  },

  async reorderTestimonials(items) {
    const updates = items.map((item) =>
      prisma.testimonial.update({
        where: { id: item.id },
        data: { sortOrder: item.order },
      })
    );
    await prisma.$transaction(updates);
    return { message: 'Testimonials reordered successfully' };
  },

  // Social Looks
  async listSocialLooks(isPublic = true) {
    const where = isPublic ? { isPublished: true } : {};
    const looks = await prisma.socialLook.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });

    return looks.map((s) => ({
      id: s.id,
      _id: s.id,
      imageUrl: s.imageUrl,
      caption: s.caption,
      tag: s.tag,
      instagramUrl: s.instagramUrl,
      sortOrder: s.sortOrder,
      isPublished: s.isPublished,
    }));
  },

  async createSocialLook(data) {
    const created = await prisma.socialLook.create({
      data: {
        imageUrl: data.imageUrl,
        caption: data.caption,
        tag: data.tag || '@ATELIERVALENTI',
        instagramUrl: data.instagramUrl || null,
        sortOrder: data.sortOrder || 0,
        isPublished: data.isPublished ?? true,
      },
    });

    return {
      ...created,
      _id: created.id,
    };
  },

  async updateSocialLook(id, data) {
    const updates = {};
    if (data.imageUrl) updates.imageUrl = data.imageUrl;
    if (data.caption) updates.caption = data.caption;
    if (data.tag) updates.tag = data.tag;
    if (data.instagramUrl !== undefined) updates.instagramUrl = data.instagramUrl;
    if (data.sortOrder !== undefined) updates.sortOrder = data.sortOrder;
    if (data.isPublished !== undefined) updates.isPublished = data.isPublished;

    try {
      const updated = await prisma.socialLook.update({
        where: { id },
        data: updates,
      });

      return {
        ...updated,
        _id: updated.id,
      };
    } catch (error) {
      const err = new Error('Social look not found');
      err.statusCode = HTTP_STATUS.NOT_FOUND;
      throw err;
    }
  },

  async deleteSocialLook(id) {
    try {
      const deleted = await prisma.socialLook.delete({
        where: { id },
      });
      return {
        ...deleted,
        _id: deleted.id,
      };
    } catch (error) {
      const err = new Error('Social look not found');
      err.statusCode = HTTP_STATUS.NOT_FOUND;
      throw err;
    }
  },

  async reorderSocialLooks(items) {
    const updates = items.map((item) =>
      prisma.socialLook.update({
        where: { id: item.id },
        data: { sortOrder: item.order },
      })
    );
    await prisma.$transaction(updates);
    return { message: 'Social looks reordered successfully' };
  },

  // Newsletter
  async subscribeNewsletter(email, locale = 'en') {
    const cleanEmail = email.toLowerCase().trim();

    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      if (!existing.isActive) {
        await prisma.newsletterSubscriber.update({
          where: { id: existing.id },
          data: { isActive: true },
        });
      }
      return { message: 'Thank you for re-subscribing to the Atelier newsletter.' };
    }

    await prisma.newsletterSubscriber.create({
      data: {
        email: cleanEmail,
        locale,
      },
    });

    return { message: 'Thank you for subscribing to the Atelier Valenti newsletter.' };
  },

  async listSubscribers() {
    const subscribers = await prisma.newsletterSubscriber.findMany({
      orderBy: { subscribedAt: 'desc' },
    });
    return subscribers.map((s) => ({
      ...s,
      _id: s.id,
    }));
  },
};
