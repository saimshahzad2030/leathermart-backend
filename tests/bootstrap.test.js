import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { AuthService } from '../src/services/auth.service.js';
import { ROLES } from '../src/config/constants.js';

const { mockPrisma } = vi.hoisted(() => {
  const pMock = {
    adminUser: {
      count: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(pMock)),
  };

  return { mockPrisma: pMock };
});

vi.mock('../src/lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

describe('Super Admin Bootstrap Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AuthService.bootstrapSuperAdmin', () => {
    it('should create the first Super Admin when database has 0 users', async () => {
      mockPrisma.adminUser.count.mockResolvedValue(0);
      mockPrisma.adminUser.create.mockImplementation(({ data }) => ({
        id: 'super-admin-uuid-1',
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        permissions: data.permissions,
        isActive: data.isActive,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const result = await AuthService.bootstrapSuperAdmin({
        email: 'founder@ateliervalenti.com',
        password: 'SuperSecretPassword2026!',
        firstName: 'Alessandro',
        lastName: 'Valenti',
      });

      expect(mockPrisma.adminUser.count).toHaveBeenCalledTimes(1);
      expect(mockPrisma.adminUser.create).toHaveBeenCalledTimes(1);
      expect(result.role).toBe(ROLES.SUPER_ADMIN);
      expect(result.permissions).toEqual(['*']);
      expect(result.email).toBe('founder@ateliervalenti.com');
      expect(result.isActive).toBe(true);
    });

    it('should refuse to bootstrap if any user already exists', async () => {
      mockPrisma.adminUser.count.mockResolvedValue(1); // 1 user already exists

      await expect(
        AuthService.bootstrapSuperAdmin({
          email: 'founder@ateliervalenti.com',
          password: 'SuperSecretPassword2026!',
        })
      ).rejects.toThrow(/Bootstrap rejected: One or more administrator accounts already exist/);

      expect(mockPrisma.adminUser.create).not.toHaveBeenCalled();
    });

    it('should reject invalid or missing email', async () => {
      await expect(
        AuthService.bootstrapSuperAdmin({
          email: 'not-an-email',
          password: 'SuperSecretPassword2026!',
        })
      ).rejects.toThrow(/A valid email address is required/);
    });

    it('should reject passwords shorter than 8 characters', async () => {
      await expect(
        AuthService.bootstrapSuperAdmin({
          email: 'admin@ateliervalenti.com',
          password: 'short',
        })
      ).rejects.toThrow(/Password must be at least 8 characters/);
    });

    it('should hash the password with bcrypt before saving', async () => {
      mockPrisma.adminUser.count.mockResolvedValue(0);
      let savedData = null;
      mockPrisma.adminUser.create.mockImplementation(({ data }) => {
        savedData = data;
        return {
          id: 'super-admin-uuid-1',
          ...data,
          createdAt: new Date(),
        };
      });

      const rawPassword = 'SuperSecretPassword2026!';
      await AuthService.bootstrapSuperAdmin({
        email: 'founder@ateliervalenti.com',
        password: rawPassword,
      });

      expect(savedData).toBeDefined();
      expect(savedData.passwordHash).not.toBe(rawPassword);
      const isMatch = await bcrypt.compare(rawPassword, savedData.passwordHash);
      expect(isMatch).toBe(true);
    });

    it('should allow the bootstrapped admin to successfully log in and get JWT token', async () => {
      const rawPassword = 'SuperSecretPassword2026!';
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(rawPassword, salt);

      const fakeAdmin = {
        id: 'super-admin-uuid-1',
        email: 'founder@ateliervalenti.com',
        passwordHash,
        firstName: 'Alessandro',
        lastName: 'Valenti',
        role: ROLES.SUPER_ADMIN,
        permissions: ['*'],
        isActive: true,
      };

      mockPrisma.adminUser.findUnique.mockResolvedValue(fakeAdmin);
      mockPrisma.adminUser.update.mockResolvedValue(fakeAdmin);
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const loginResult = await AuthService.login(
        'founder@ateliervalenti.com',
        rawPassword
      );

      expect(loginResult).toBeDefined();
      expect(loginResult.tokens.accessToken).toBeDefined();
      expect(loginResult.tokens.refreshToken).toBeDefined();
      expect(loginResult.admin.role).toBe(ROLES.SUPER_ADMIN);
      expect(loginResult.admin.email).toBe('founder@ateliervalenti.com');
    });
  });
});
