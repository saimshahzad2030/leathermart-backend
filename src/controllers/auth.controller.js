import { AuthService } from '../services/auth.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../config/constants.js';
import { env } from '../config/env.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.isProd,
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export const AuthController = {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const { admin, tokens } = await AuthService.login(email, password);

      res.cookie('token', tokens.accessToken, COOKIE_OPTIONS);
      res.cookie('refreshToken', tokens.refreshToken, {
        ...COOKIE_OPTIONS,
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      return ApiResponse.success(res, {
        message: 'Admin authenticated successfully',
        data: {
          admin,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async refresh(req, res, next) {
    try {
      const refreshToken =
        req.body.refreshToken || req.cookies?.refreshToken;

      if (!refreshToken) {
        return ApiResponse.error(res, {
          message: 'Refresh token is required',
          errorCode: 'ERR_REFRESH_TOKEN_REQUIRED',
          statusCode: HTTP_STATUS.BAD_REQUEST,
        });
      }

      const result = await AuthService.refresh(refreshToken);

      res.cookie('token', result.accessToken, COOKIE_OPTIONS);
      res.cookie('refreshToken', result.refreshToken, {
        ...COOKIE_OPTIONS,
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      return ApiResponse.success(res, {
        message: 'Token refreshed successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  async logout(req, res, next) {
    try {
      res.clearCookie('token', COOKIE_OPTIONS);
      res.clearCookie('refreshToken', COOKIE_OPTIONS);

      return ApiResponse.success(res, {
        message: 'Logged out successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  async getMe(req, res, next) {
    try {
      const admin = await AuthService.getProfile(req.admin._id);
      return ApiResponse.success(res, {
        data: admin,
      });
    } catch (err) {
      next(err);
    }
  },

  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      await AuthService.changePassword(req.admin._id, currentPassword, newPassword);

      return ApiResponse.success(res, {
        message: 'Password changed successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  async listUsers(req, res, next) {
    try {
      const users = await AuthService.listUsers();
      return ApiResponse.success(res, { data: users });
    } catch (err) {
      next(err);
    }
  },

  async createUser(req, res, next) {
    try {
      const user = await AuthService.createUser(req.body);
      return ApiResponse.created(res, {
        message: 'Admin user created successfully',
        data: user,
      });
    } catch (err) {
      next(err);
    }
  },

  async updateUser(req, res, next) {
    try {
      const user = await AuthService.updateUser(req.params.id, req.body);
      return ApiResponse.success(res, {
        message: 'Admin user updated successfully',
        data: user,
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteUser(req, res, next) {
    try {
      await AuthService.deleteUser(req.params.id);
      return ApiResponse.success(res, {
        message: 'Admin user deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  },
};
