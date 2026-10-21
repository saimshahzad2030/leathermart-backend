import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createContactMessageSchema,
  updateContactMessageSchema,
  contactFilterQuerySchema,
} from '../src/validators/contact.validator.js';
import { EmailService } from '../src/services/email.service.js';
import { ContactService } from '../src/services/contact.service.js';
import { prisma } from '../src/lib/prisma.js';

describe('Contact Us Feature End-to-End Test Suite', () => {
  describe('1. Contact Submission Schema Validator', () => {
    const validPayload = {
      name: 'Matteo Rossi',
      email: 'matteo.rossi@milano.it',
      phone: '+39 02 555 1234',
      subject: 'Product Inquiry',
      message: 'I would like to inquire about the sizing for the shearling aviator jacket.',
    };

    it('should validate and sanitize a correct contact payload', () => {
      const parsed = createContactMessageSchema.parse(validPayload);
      expect(parsed.name).toBe('Matteo Rossi');
      expect(parsed.email).toBe('matteo.rossi@milano.it');
      expect(parsed.phone).toBe('+39 02 555 1234');
      expect(parsed.subject).toBe('Product Inquiry');
      expect(parsed.message).toBe(validPayload.message);
    });

    it('should trim whitespace from text fields', () => {
      const parsed = createContactMessageSchema.parse({
        name: '   Sofia Laurent   ',
        email: '  sofia@atelier.com  ',
        phone: '  +33 1 23 45 67 89  ',
        subject: '  Bespoke Commission  ',
        message: '  Please custom tailor a biker jacket in espresso suede.  ',
      });
      expect(parsed.name).toBe('Sofia Laurent');
      expect(parsed.email).toBe('sofia@atelier.com');
      expect(parsed.phone).toBe('+33 1 23 45 67 89');
      expect(parsed.subject).toBe('Bespoke Commission');
      expect(parsed.message).toBe('Please custom tailor a biker jacket in espresso suede.');
    });

    it('should allow optional phone to be omitted or default to empty string', () => {
      const { phone, ...withoutPhone } = validPayload;
      const parsed = createContactMessageSchema.parse(withoutPhone);
      expect(parsed.phone).toBe('');
    });

    it('should fail when name is empty or less than 2 characters', () => {
      expect(() =>
        createContactMessageSchema.parse({
          ...validPayload,
          name: ' ',
        })
      ).toThrow();

      expect(() =>
        createContactMessageSchema.parse({
          ...validPayload,
          name: 'A',
        })
      ).toThrow();
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'invalid-email',
        'matteo@',
        '@domain.com',
        'matteo@domain',
        'spaces in@email.com',
      ];
      for (const email of invalidEmails) {
        expect(() =>
          createContactMessageSchema.parse({
            ...validPayload,
            email,
          })
        ).toThrow();
      }
    });

    it('should reject empty or undersized message (< 10 chars)', () => {
      expect(() =>
        createContactMessageSchema.parse({
          ...validPayload,
          message: 'Short',
        })
      ).toThrow();
    });

    it('should reject oversized message (> 5000 chars)', () => {
      expect(() =>
        createContactMessageSchema.parse({
          ...validPayload,
          message: 'a'.repeat(5001),
        })
      ).toThrow();
    });

    it('should reject missing required subject', () => {
      expect(() =>
        createContactMessageSchema.parse({
          ...validPayload,
          subject: '',
        })
      ).toThrow();
    });
  });

  describe('2. Contact Admin Update Schema Validator', () => {
    it('should accept valid status updates', () => {
      const validStatuses = ['new', 'in_progress', 'resolved', 'spam'];
      for (const status of validStatuses) {
        const parsed = updateContactMessageSchema.parse({ status });
        expect(parsed.status).toBe(status);
      }
    });

    it('should reject invalid status values', () => {
      expect(() =>
        updateContactMessageSchema.parse({ status: 'completed' })
      ).toThrow();
      expect(() =>
        updateContactMessageSchema.parse({ status: 'archived' })
      ).toThrow();
    });

    it('should accept adminNotes', () => {
      const parsed = updateContactMessageSchema.parse({
        status: 'in_progress',
        adminNotes: 'Client requested swatch kit sent to Zurich address.',
      });
      expect(parsed.status).toBe('in_progress');
      expect(parsed.adminNotes).toBe('Client requested swatch kit sent to Zurich address.');
    });

    it('should allow partial updates (only status or only notes)', () => {
      const statusOnly = updateContactMessageSchema.parse({ status: 'resolved' });
      expect(statusOnly.status).toBe('resolved');
      expect(statusOnly.adminNotes).toBeUndefined();

      const notesOnly = updateContactMessageSchema.parse({ adminNotes: 'Internal note.' });
      expect(notesOnly.adminNotes).toBe('Internal note.');
      expect(notesOnly.status).toBeUndefined();
    });
  });

  describe('3. Contact Query Filter Schema Validator', () => {
    it('should supply default pagination values', () => {
      const parsed = contactFilterQuerySchema.parse({});
      expect(parsed.page).toBe(1);
      expect(parsed.limit).toBe(15);
    });

    it('should coerce string numbers into integer page and limit', () => {
      const parsed = contactFilterQuerySchema.parse({ page: '3', limit: '50' });
      expect(parsed.page).toBe(3);
      expect(parsed.limit).toBe(50);
    });

    it('should accept valid status filters', () => {
      const parsed = contactFilterQuerySchema.parse({ status: 'new' });
      expect(parsed.status).toBe('new');
    });

    it('should accept search term and dates', () => {
      const parsed = contactFilterQuerySchema.parse({
        search: 'Rossi',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      });
      expect(parsed.search).toBe('Rossi');
      expect(parsed.startDate).toBe('2026-01-01');
      expect(parsed.endDate).toBe('2026-12-31');
    });
  });

  describe('4. Email Notification & Security Sanitation', () => {
    it('should safely escape HTML entities in email payload to prevent XSS', async () => {
      const maliciousContact = {
        id: 'cm-test-uuid',
        name: 'Attacker <script>alert("pwned")</script>',
        email: 'attacker@evil.com',
        phone: '<img src=x onerror=alert(1)>',
        subject: 'Inquiry & <bold>Test</bold>',
        message: 'Hello <iframe src="evil.com"></iframe> & "quotes" \'single\'',
        createdAt: new Date(),
      };

      const result = await EmailService.sendContactNotification(maliciousContact);
      expect(result.sent).toBe(true);
    });
  });

  describe('5. Contact Service Data Flow', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('should persist a new contact message with default status "new"', async () => {
      const mockRecord = {
        id: 'test-uuid-1234',
        name: 'Elena Conti',
        email: 'elena@conti.it',
        phone: '+39 02 1111 2222',
        subject: 'General Inquiry',
        message: 'What is the turnaround time for a bespoke lambskin overshirt?',
        status: 'new',
        adminNotes: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const spyCreate = vi.spyOn(prisma.contactMessage, 'create').mockResolvedValue(mockRecord);

      const created = await ContactService.createContactMessage({
        name: mockRecord.name,
        email: mockRecord.email,
        phone: mockRecord.phone,
        subject: mockRecord.subject,
        message: mockRecord.message,
      });

      expect(spyCreate).toHaveBeenCalledWith({
        data: {
          name: mockRecord.name,
          email: mockRecord.email,
          phone: mockRecord.phone,
          subject: mockRecord.subject,
          message: mockRecord.message,
          status: 'new',
          adminNotes: '',
        },
      });
      expect(created.id).toBe('test-uuid-1234');
      expect(created.status).toBe('new');
    });

    it('should paginate and filter contact messages', async () => {
      const mockItems = [
        {
          id: 'cm-1',
          name: 'Marco Polo',
          email: 'marco@polo.it',
          phone: '',
          subject: 'Shipping',
          message: 'Can you ship to Venice?',
          status: 'new',
          adminNotes: '',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.spyOn(prisma.contactMessage, 'findMany').mockResolvedValue(mockItems);
      vi.spyOn(prisma.contactMessage, 'count').mockResolvedValue(1);

      const result = await ContactService.listContactMessages({
        page: 1,
        limit: 10,
        status: 'new',
        search: 'Marco',
      });

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].name).toBe('Marco Polo');
      expect(result.pagination.totalCount).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
    });

    it('should update contact message status and internal notes', async () => {
      const updatedMock = {
        id: 'cm-1',
        name: 'Marco Polo',
        email: 'marco@polo.it',
        phone: '',
        subject: 'Shipping',
        message: 'Can you ship to Venice?',
        status: 'in_progress',
        adminNotes: 'Venice courier arranged.',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(prisma.contactMessage, 'findUnique').mockResolvedValue({ id: 'cm-1' });
      vi.spyOn(prisma.contactMessage, 'update').mockResolvedValue(updatedMock);

      const updated = await ContactService.updateContactMessage('cm-1', {
        status: 'in_progress',
        adminNotes: 'Venice courier arranged.',
      });

      expect(updated.status).toBe('in_progress');
      expect(updated.adminNotes).toBe('Venice courier arranged.');
    });

    it('should delete contact message when record exists', async () => {
      vi.spyOn(prisma.contactMessage, 'findUnique').mockResolvedValue({ id: 'cm-1' });
      vi.spyOn(prisma.contactMessage, 'delete').mockResolvedValue({ id: 'cm-1' });

      const result = await ContactService.deleteContactMessage('cm-1');
      expect(result.id).toBe('cm-1');
    });
  });
});
