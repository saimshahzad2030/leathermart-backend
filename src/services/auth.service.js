import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { HTTP_STATUS, ROLES } from '../config/constants.js';

export const AuthService = {
  generateTokens(user) {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions || [],
    };

    const accessToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    });

    const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    });

    return { accessToken, refreshToken };
  },

  async login(email, password) {
    const user = await prisma.adminUser.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      const err = new Error('Invalid email or password');
      err.statusCode = HTTP_STATUS.UNAUTHORIZED;
      err.errorCode = 'ERR_INVALID_CREDENTIALS';
      throw err;
    }

    if (!user.isActive) {
      const err = new Error('Your administrator account has been deactivated');
      err.statusCode = HTTP_STATUS.FORBIDDEN;
      err.errorCode = 'ERR_ACCOUNT_DEACTIVATED';
      throw err;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      const err = new Error('Invalid email or password');
      err.statusCode = HTTP_STATUS.UNAUTHORIZED;
      err.errorCode = 'ERR_INVALID_CREDENTIALS';
      throw err;
    }

    // Update last login
    await prisma.adminUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const { accessToken, refreshToken } = this.generateTokens(user);

    // Persist refresh token
    const decoded = jwt.decode(refreshToken);
    const expiresAt = new Date((decoded.exp || Date.now() / 1000 + 30 * 86400) * 1000);

    await prisma.refreshToken.create({
      data: {
        adminId: user.id,
        token: refreshToken,
        expiresAt,
      },
    });

    return {
      admin: {
        id: user.id,
        _id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        permissions: user.permissions || [],
        lastLoginAt: user.lastLoginAt,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  },

  async refresh(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);

      const tokenRecord = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
      });

      if (!tokenRecord) {
        const err = new Error('Invalid or revoked refresh token');
        err.statusCode = HTTP_STATUS.UNAUTHORIZED;
        err.errorCode = 'ERR_INVALID_REFRESH_TOKEN';
        throw err;
      }

      const user = await prisma.adminUser.findUnique({
        where: { id: decoded.id },
      });

      if (!user || !user.isActive) {
        const err = new Error('Invalid or revoked refresh token');
        err.statusCode = HTTP_STATUS.UNAUTHORIZED;
        err.errorCode = 'ERR_INVALID_REFRESH_TOKEN';
        throw err;
      }

      // Rotate refresh token
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });

      const { accessToken, refreshToken: newRefreshToken } = this.generateTokens(user);
      const newDecoded = jwt.decode(newRefreshToken);
      const expiresAt = new Date((newDecoded.exp || Date.now() / 1000 + 30 * 86400) * 1000);

      await prisma.refreshToken.create({
        data: {
          adminId: user.id,
          token: newRefreshToken,
          expiresAt,
        },
      });

      return {
        accessToken,
        refreshToken: newRefreshToken,
        admin: {
          id: user.id,
          _id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      };
    } catch (err) {
      const error = new Error('Refresh token is invalid or has expired');
      error.statusCode = HTTP_STATUS.UNAUTHORIZED;
      error.errorCode = 'ERR_INVALID_REFRESH_TOKEN';
      throw error;
    }
  },

  async logout(refreshToken) {
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });
    }
    return true;
  },

  async changePassword(userId, currentPassword, newPassword) {
    const user = await prisma.adminUser.findUnique({
      where: { id: userId },
    });

    if (!user) {
      const err = new Error('User not found');
      err.statusCode = HTTP_STATUS.NOT_FOUND;
      throw err;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      const err = new Error('Current password does not match');
      err.statusCode = HTTP_STATUS.BAD_REQUEST;
      err.errorCode = 'ERR_INCORRECT_PASSWORD';
      throw err;
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    await prisma.adminUser.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    return true;
  },

  async getProfile(userId) {
    const user = await prisma.adminUser.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        permissions: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      const err = new Error('User not found');
      err.statusCode = HTTP_STATUS.NOT_FOUND;
      throw err;
    }

    return {
      id: user.id,
      _id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      permissions: user.permissions || [],
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  },

  async listUsers() {
    const users = await prisma.adminUser.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        permissions: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((u) => ({
      id: u.id,
      _id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      permissions: u.permissions || [],
      isActive: u.isActive,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
    }));
  },

  async createUser(data) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(data.password, salt);

    try {
      const user = await prisma.adminUser.create({
        data: {
          email: data.email.toLowerCase().trim(),
          passwordHash: hash,
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role || 'store_manager',
          permissions: data.permissions || [],
          isActive: data.isActive ?? true,
        },
      });

      return {
        id: user.id,
        _id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        permissions: user.permissions,
        isActive: user.isActive,
      };
    } catch (error) {
      if (error.code === 'P2002') {
        const err = new Error(`Admin user with email '${data.email}' already exists`);
        err.statusCode = HTTP_STATUS.CONFLICT;
        err.errorCode = 'ERR_DUPLICATE_EMAIL';
        throw err;
      }
      throw error;
    }
  },

  /**
   * One-time secure bootstrap for the first Super Admin account.
   * Atomically verifies that no users currently exist before creation.
   * Refuses to run if any administrator account already exists.
   */
  async bootstrapSuperAdmin({ email, password, firstName, lastName }) {
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      const err = new Error('A valid email address is required for bootstrapping the Super Admin');
      err.statusCode = HTTP_STATUS.BAD_REQUEST;
      err.errorCode = 'ERR_INVALID_EMAIL';
      throw err;
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      const err = new Error('Password must be at least 8 characters long');
      err.statusCode = HTTP_STATUS.BAD_REQUEST;
      err.errorCode = 'ERR_WEAK_PASSWORD';
      throw err;
    }

    return await prisma.$transaction(async (tx) => {
      const count = await tx.adminUser.count();
      if (count > 0) {
        const err = new Error(
          'Bootstrap rejected: One or more administrator accounts already exist in the database. Bootstrap is only permitted on a completely empty user table.'
        );
        err.statusCode = HTTP_STATUS.CONFLICT;
        err.errorCode = 'ERR_BOOTSTRAP_NOT_ALLOWED';
        throw err;
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const user = await tx.adminUser.create({
        data: {
          email: email.toLowerCase().trim(),
          passwordHash,
          firstName: (firstName || 'Alessandro').trim(),
          lastName: (lastName || 'Valenti').trim(),
          role: ROLES.SUPER_ADMIN,
          permissions: ['*'],
          isActive: true,
        },
      });

      return {
        id: user.id,
        _id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        permissions: user.permissions,
        isActive: user.isActive,
        createdAt: user.createdAt,
      };
    });
  },

  async updateUser(id, data) {
    const updates = {};
    if (data.firstName) updates.firstName = data.firstName;
    if (data.lastName) updates.lastName = data.lastName;
    if (data.role) updates.role = data.role;
    if (data.permissions) updates.permissions = data.permissions;
    if (data.isActive !== undefined) updates.isActive = data.isActive;

    try {
      const user = await prisma.adminUser.update({
        where: { id },
        data: updates,
      });

      return {
        id: user.id,
        _id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        permissions: user.permissions,
        isActive: user.isActive,
      };
    } catch (error) {
      const err = new Error('Admin user not found');
      err.statusCode = HTTP_STATUS.NOT_FOUND;
      throw err;
    }
  },

  async deleteUser(id) {
    try {
      const user = await prisma.adminUser.delete({
        where: { id },
      });
      return user;
    } catch (error) {
      const err = new Error('Admin user not found');
      err.statusCode = HTTP_STATUS.NOT_FOUND;
      throw err;
    }
  },
};
